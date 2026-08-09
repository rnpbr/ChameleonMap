"""
Admin configuration for multi-tenant client management.

This module handles the Django admin interface for Client, Domain, and TenantUser models,
including synchronization of permissions and relationships across tenant schemas.
"""

from django import forms
from django.contrib import admin
from django.core.exceptions import ObjectDoesNotExist, ValidationError

from django_tenants.admin import TenantAdminMixin
from django_tenants.utils import tenant_context
from tenant_users.permissions.models import UserTenantPermissions
from tenant_users.tenants.tasks import provision_tenant
from unfold.admin import ModelAdmin

from clients.models import Client, Domain, TenantUser

class TenantUserForm(forms.ModelForm):
    """
    Custom form for TenantUser to prevent removing tenants from their owners.
    
    Validates that a user cannot be removed from tenants they own, ensuring
    data consistency across the multi-tenant system.
    """
    
    class Meta:
        model = TenantUser
        fields = '__all__'
    
    def clean_tenants(self):
        """
        Validate that owned tenants cannot be removed from user's tenant list.
        
        Returns:
            QuerySet: The validated tenants.
            
        Raises:
            ValidationError: If attempting to remove a tenant the user owns.
        """
        tenants = self.cleaned_data.get('tenants')
        user = self.instance
        
        # Only validate existing users (skip validation for new user creation)
        if not user.pk:
            return tenants
        
        owned_tenants = self._get_owned_tenants(user)
        self._validate_owned_tenants_not_removed(owned_tenants, tenants)
        
        return tenants
    
    def _get_owned_tenants(self, user):
        """Get all tenants where the user is the owner."""
        return Client.objects.filter(owner=user)
    
    def _validate_owned_tenants_not_removed(self, owned_tenants, selected_tenants):
        """
        Ensure no owned tenants are being removed from the user's tenant list.
        
        Args:
            owned_tenants: QuerySet of tenants owned by the user.
            selected_tenants: QuerySet of tenants selected in the form.
            
        Raises:
            ValidationError: If any owned tenant is not in selected tenants.
        """
        for owned_tenant in owned_tenants:
            if owned_tenant not in selected_tenants:
                raise ValidationError(
                    f'Cannot remove tenant "{owned_tenant.name}" because this user is the owner. '
                    f'Please change the owner first before removing access.'
                )

@admin.register(Client)
class ClientAdmin(TenantAdminMixin, ModelAdmin):
    """
    Admin interface for Client (Tenant) management.
    
    Handles synchronization of owner relationships and permissions when
    a client's owner is changed.
    """
    
    list_display = ('name', 'owner')
    fields = ['name', 'slug', 'schema_name', 'owner', 'tenancytype']
    
    def save_model(self, request, obj, form, change):
        """
        Save client and synchronize owner relationships and permissions.
        
        When editing an existing client, checks if the owner has changed and
        synchronizes both the many-to-many relationship and tenant-specific
        permissions accordingly.
        """
        if change:
            self._update_existing_client(obj)
        else:
            self._create_new_client(obj)
    
    def _update_existing_client(self, obj):
        """Update existing client and sync owner if changed."""
        try:
            existing_client = Client.objects.get(schema_name=obj.schema_name)
            old_owner = existing_client.owner
            
            self._update_client_fields(existing_client, obj)
            existing_client.save()
            
            if self._owner_has_changed(old_owner, obj.owner):
                self._sync_owner_change(existing_client, old_owner, obj.owner)
                
        except ObjectDoesNotExist:
            # If client doesn't exist, treat as new creation
            self._create_new_client(obj)
    
    def _create_new_client(self, obj):
        """Provision a new tenant with schema and domain."""
        provision_tenant(
            obj.name,
            obj.slug,
            obj.owner,
            is_staff=True,
            schema_name=obj.schema_name,
            tenant_type=obj.tenancytype
        )
    
    def _update_client_fields(self, existing_client, new_data):
        """Update client fields with new data."""
        existing_client.slug = new_data.slug
        existing_client.owner = new_data.owner
        existing_client.name = new_data.name
        existing_client.tenancytype = new_data.tenancytype
    
    def _owner_has_changed(self, old_owner, new_owner):
        """Check if the owner has changed."""
        return old_owner != new_owner
    
    def _sync_owner_change(self, client, old_owner, new_owner):
        """
        Synchronize owner change across relationships and permissions.
        
        Removes old owner from tenant relationships and permissions,
        then adds new owner with appropriate privileges.
        """
        if old_owner:
            self._remove_old_owner(client, old_owner)
        
        if new_owner:
            self._add_new_owner(client, new_owner)
    
    def _remove_old_owner(self, client, old_owner):
        """Remove old owner from tenant relationships and permissions."""
        old_owner.tenants.remove(client)
        
        with tenant_context(client):
            UserTenantPermissions.objects.filter(profile=old_owner).delete()
    
    def _add_new_owner(self, client, new_owner):
        """Add new owner to tenant relationships and create permissions."""
        new_owner.tenants.add(client)
        
        with tenant_context(client):
            UserTenantPermissions.objects.update_or_create(
                profile=new_owner,
                defaults={
                    'is_staff': True,
                    'is_superuser': True,
                }
            )

@admin.register(Domain)
class DomainAdmin(TenantAdminMixin, ModelAdmin):
    """Admin interface for Domain management (read-only)."""
    
    list_display = ('domain', 'tenant')
    
    def has_add_permission(self, request, obj=None):
        """Disable domain creation through admin (created automatically)."""
        return False

@admin.register(TenantUser)
class TenantUserAdmin(TenantAdminMixin, ModelAdmin):
    """
    Admin interface for TenantUser management.
    
    Ensures owned tenants are always associated with users and
    synchronizes permissions across tenant schemas.
    """
    
    form = TenantUserForm
    list_display = ('email', 'name')
    exclude = ('password',)
    
    def save_model(self, request, obj, form, change):
        """
        Save user model and ensure owned tenants remain associated.
        
        For existing users, ensures any tenants they own are always
        included in their tenant list.
        """
        super().save_model(request, obj, form, change)
        
        if obj.pk:
            self._ensure_owned_tenants_associated(obj)
    
    def save_related(self, request, form, formsets, change):
        """
        Save related objects and synchronize tenant permissions.
        
        Called after many-to-many relationships are saved, ensuring
        all tenant permissions are properly created or removed.
        """
        super().save_related(request, form, formsets, change)
        synchronize_tenant_permissions(form.instance)
    
    def _ensure_owned_tenants_associated(self, user):
        """
        Ensure all tenants owned by user are in their tenant list.
        
        Args:
            user: The TenantUser instance to check.
        """
        owned_tenants = Client.objects.filter(owner=user)
        user_tenants = set(user.tenants.all())
        
        for tenant in owned_tenants:
            if tenant not in user_tenants:
                user.tenants.add(tenant)

def synchronize_tenant_permissions(user):
    """
    Synchronize user permissions across all tenant schemas.
    
    For each tenant in the system:
    - If user has access: Creates/updates permissions with staff and superuser privileges
    - If user removed: Deletes permissions from that tenant's schema
    
    This ensures the permissions_usertenantpermissions table in each tenant schema
    accurately reflects the user's current tenant associations.
    
    Args:
        user: The TenantUser instance to synchronize permissions for.
    """
    user_tenants = set(user.tenants.all())
    all_tenants = Client.objects.all()
    
    for tenant in all_tenants:
        if _user_has_access_to_tenant(tenant, user_tenants):
            _grant_tenant_permissions(tenant, user)
        else:
            _revoke_tenant_permissions(tenant, user)


def _user_has_access_to_tenant(tenant, user_tenants):
    """Check if tenant is in user's tenant list."""
    return tenant in user_tenants


def _grant_tenant_permissions(tenant, user):
    """
    Grant or update user permissions in tenant schema.
    
    Creates permissions if they don't exist, or updates them to ensure
    staff and superuser privileges are set.
    """
    with tenant_context(tenant):
        permission, created = UserTenantPermissions.objects.get_or_create(
            profile=user,
            defaults={
                'is_staff': True,
                'is_superuser': True,
            }
        )
        
        if not created:
            _update_permission_privileges(permission)


def _update_permission_privileges(permission):
    """Ensure permission has staff and superuser privileges."""
    if not permission.is_staff or not permission.is_superuser:
        permission.is_staff = True
        permission.is_superuser = True
        permission.save()


def _revoke_tenant_permissions(tenant, user):
    """Remove user permissions from tenant schema."""
    with tenant_context(tenant):
        UserTenantPermissions.objects.filter(profile=user).delete()

@admin.register(UserTenantPermissions)
class UserTenantPermissionsAdmin(TenantAdminMixin, ModelAdmin):
    """Admin interface for UserTenantPermissions (managed automatically)."""
    pass
