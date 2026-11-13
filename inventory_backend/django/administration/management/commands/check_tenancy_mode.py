from django.core.management.base import BaseCommand, CommandError
from django.conf import settings
from django.db import connection


class Command(BaseCommand):
    help = (
        "Refuse to start when ENABLE_MULTITENANT does not match the existing "
        "database layout."
    )

    def handle(self, *args, **options):
        enable_mt = settings.ENABLE_MULTITENANT

        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                cursor.execute(
                    """
                    SELECT schema_name
                    FROM information_schema.schemata
                    WHERE schema_name NOT IN ('information_schema', 'pg_catalog')
                      AND schema_name NOT LIKE 'pg_%'
                    """
                )
                schemas = {row[0] for row in cursor.fetchall()}

                cursor.execute(
                    """
                    SELECT table_name
                    FROM information_schema.tables
                    WHERE table_schema = 'public'
                      AND table_type = 'BASE TABLE'
                    """
                )
                public_tables = {row[0] for row in cursor.fetchall()}
        except Exception as exc:
            raise CommandError(
                "Unable to inspect the database for tenancy mode. "
                f"Is PostgreSQL ready? ({exc})"
            ) from exc

        if not public_tables:
            self.stdout.write(self.style.SUCCESS("Fresh database detected; tenancy mode OK."))
            return

        tenant_schemas = sorted(schemas - {'public'})
        has_client_tables = (
            'clients_client' in public_tables
            or 'clients_domain' in public_tables
        )
        looks_multitenant = has_client_tables or bool(tenant_schemas)
        looks_single_tenant = (
            any(table.startswith('administration_') for table in public_tables)
            and not has_client_tables
            and not tenant_schemas
        )

        if looks_multitenant and not enable_mt:
            details = []
            if has_client_tables:
                client_tables = sorted(
                    table for table in public_tables if table.startswith('clients_')
                )
                details.append(f"client tables in public: {', '.join(client_tables)}")
            if tenant_schemas:
                details.append(f"non-public schemas: {', '.join(tenant_schemas)}")
            raise CommandError(
                "Database appears to be multitenant, but ENABLE_MULTITENANT is not true. "
                f"Detected: {'; '.join(details)}. "
                "Remove the Postgres volume and start again (e.g. "
                "'docker compose ... down -v' for this project, then verify with "
                "'docker volume ls' that postgres_data is gone), or set ENABLE_MULTITENANT=true."
            )

        if looks_single_tenant and enable_mt:
            raise CommandError(
                "Database appears to be single-tenant (administration_* tables "
                "in public without clients_*), but ENABLE_MULTITENANT=true. "
                "Use a fresh Postgres volume for multitenancy, or disable the flag."
            )

        self.stdout.write(self.style.SUCCESS("Database tenancy mode matches ENABLE_MULTITENANT."))
