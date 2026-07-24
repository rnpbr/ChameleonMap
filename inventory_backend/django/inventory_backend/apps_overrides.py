from django.apps import AppConfig
from django.utils.translation import gettext_lazy as _


class AxesConfig(AppConfig):
    name = 'axes'
    default_auto_field = 'django.db.models.BigAutoField'
    verbose_name = _('Axes')


class TenantPermissionsConfig(AppConfig):
    name = 'tenant_users.permissions'
    verbose_name = _('Permissions')

    def ready(self):
        super().ready()
        from tenant_users.permissions.models import UserTenantPermissions
        UserTenantPermissions._meta.verbose_name = _('user tenant permission')
        UserTenantPermissions._meta.verbose_name_plural = _('user tenant permissions')

        from clients.models import Client
        owner_field = Client._meta.get_field('owner')
        owner_field.verbose_name = _('owner')
