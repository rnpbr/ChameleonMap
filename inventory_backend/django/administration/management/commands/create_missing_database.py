from django.core.management.base import BaseCommand
from django.db import connection


class Command(BaseCommand):
    help = (
        "Creates the configured database when it does not exist yet: the Postgres image only creates "
        "POSTGRES_DB, not the multitenant database of development (POSTGRES_DB_MULTITENANT)."
    )

    def handle(self, *args, **options):
        name = connection.settings_dict['NAME']
        with connection._nodb_cursor() as cursor:
            cursor.execute("SELECT 1 FROM pg_database WHERE datname = %s", [name])
            if cursor.fetchone():
                return
            cursor.execute(f"CREATE DATABASE {connection.ops.quote_name(name)}")
        self.stdout.write(self.style.SUCCESS(f"Created database {name}."))
