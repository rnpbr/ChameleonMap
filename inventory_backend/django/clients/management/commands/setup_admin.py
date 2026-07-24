from django.core.management.base import BaseCommand
from clients.models import Client, Domain
from django.contrib.auth import get_user_model
from django_tenants.utils import (
    get_public_schema_name,
    get_tenant_domain_model,
    get_tenant_model,
)
from os import environ

class Command(BaseCommand):
    help = "Creates tenant and admin user if they do not already exist."

    def handle(self, *args, **options):
        if Client.objects.filter(schema_name='public').exists():
            self.stdout.write(self.style.WARNING("Tenant 'admin' already exists."))
            return
        
        superuser_email = environ.get('DJANGO_SUPERUSER_EMAIL')
        superuser_username = environ.get('DJANGO_SUPERUSER_USERNAME')
        superuser_password = environ.get('DJANGO_SUPERUSER_PASSWORD')
        base_domain = environ.get('DJANGO_BASE_DOMAIN')

        if not superuser_email or not superuser_username or not superuser_password or not base_domain:
            self.stdout.write(self.style.WARNING("Django environment variables missing"))
            return
        
        UserModel = get_user_model()
        TenantModel = get_tenant_model()
        public_schema_name = get_public_schema_name()
        
        profile = UserModel.objects.create(
            email=superuser_email,
            is_active=True,
            password=superuser_password,
            name=superuser_username
        )

        admin_tenant = TenantModel(
            schema_name=public_schema_name,
            name="Admin Tenant",
            owner=profile,
            tenancytype="root",
        )
        admin_tenant.save()

        get_tenant_domain_model().objects.create(
            domain=f"admin.{base_domain}",
            tenant=admin_tenant,
            is_primary=True,
        )

        admin_tenant.add_user(profile, is_superuser=True, is_staff=True)

        profile.set_password(superuser_password)
        profile.save(update_fields=["password"])

        self.stdout.write(self.style.SUCCESS("Tenant 'admin' created successfully!"))
        