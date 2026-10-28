import os
import tempfile
import time

from django.apps import apps
from django.conf import settings
from django.core import serializers
from django.core.management import call_command
from django.core.management.base import BaseCommand, CommandError
from django.db import OperationalError, connections
from django.db.migrations.executor import MigrationExecutor
from django_tenants.utils import get_public_schema_name, tenant_context
from tenant_users.tenants.tasks import provision_tenant

from administration.models import (
    Kml_shape,
    Link,
    Links_group,
    Location,
    Map_configuration,
    Menu,
    MenuGroup,
    Tag,
)
from clients.models import Client
from languages.models import LanguageOption

MAP_CONTENT_MODELS = (MenuGroup, Menu, Tag, Location, Links_group, Link, Kml_shape)
MAP_APPS = ('administration', 'languages')


class Command(BaseCommand):
    help = (
        "Creates a tenant with the single-tenant map when multitenant mode has no tenant yet. "
        "The single-tenant database (POSTGRES_DB) is read, read only, when multitenant has its own (POSTGRES_DB_MULTITENANT)."
    )

    def handle(self, *args, **options):
        source = settings.SINGLE_TENANT_SOURCE_DATABASE
        if source not in settings.DATABASES:
            self.stdout.write("No single-tenant database configured; skipping map import.")
            return

        public_schema_name = get_public_schema_name()
        if Client.objects.exclude(schema_name=public_schema_name).exists():
            self.stdout.write("Multitenant already has tenants; skipping single-tenant map import.")
            return

        public_tenant = Client.objects.filter(schema_name=public_schema_name).first()
        if public_tenant is None:
            self.stdout.write(self.style.WARNING("No public tenant (see setup_admin); skipping single-tenant map import."))
            return

        self._wait_for(source)
        if not self._has_map(source):
            self.stdout.write("Single-tenant database has no map; nothing to import.")
            return
        if self._has_pending_migrations(source):
            raise CommandError(
                "Single-tenant database is not fully migrated: start single-tenant mode once, then multitenant again."
            )

        slug = os.environ.get('SINGLE_TENANT_IMPORT_SLUG', 'single')
        schema_name = slug.replace('-', '_')
        source_configuration = Map_configuration.objects.using(source).first()
        tenant_name = source_configuration.map_name if source_configuration else "Single-tenant map"

        with tempfile.NamedTemporaryFile('w', suffix='.json') as fixture:
            self._dump_map(source, fixture)
            fixture.flush()

            try:
                tenant, domain = provision_tenant(
                    tenant_name,
                    slug,
                    public_tenant.owner,
                    is_staff=True,
                    schema_name=schema_name,
                    tenant_type='scoped',
                )
                with tenant_context(tenant):
                    call_command('loaddata', fixture.name, verbosity=0)
                    if source_configuration:
                        self._copy_configuration(source_configuration)
            except Exception as exc:
                for tenant in Client.objects.filter(schema_name=schema_name):
                    tenant.delete(force_drop=True)
                raise CommandError(f"Single-tenant map import failed: {exc}") from exc

        self.stdout.write(self.style.SUCCESS(
            f"Single-tenant map imported as tenant '{tenant_name}' at {domain.domain}. "
            f"Single-tenant users are not imported: the tenant belongs to {public_tenant.owner.email}."
        ))

    def _wait_for(self, database, timeout=30):
        deadline = time.monotonic() + timeout
        while True:
            try:
                connections[database].ensure_connection()
                return
            except OperationalError:
                if time.monotonic() > deadline:
                    raise
                time.sleep(1)

    def _has_map(self, database):
        tables = connections[database].introspection.table_names()
        if not all(model._meta.db_table in tables for model in MAP_CONTENT_MODELS):
            return False
        return any(model.objects.using(database).exists() for model in MAP_CONTENT_MODELS)

    def _has_pending_migrations(self, database):
        executor = MigrationExecutor(connections[database])
        targets = [node for node in executor.loader.graph.leaf_nodes() if node[0] in MAP_APPS]
        return bool(executor.migration_plan(targets))

    def _dump_map(self, database, stream):
        models = serializers.sort_dependencies([(apps.get_app_config('administration'), None)], allow_cycles=True)
        objects = (
            obj
            for model in models
            if model is not Map_configuration
            for obj in model._base_manager.using(database).order_by(model._meta.pk.name).iterator()
        )
        serializers.serialize('json', objects, stream=stream, use_natural_foreign_keys=True)

    def _copy_configuration(self, source_configuration):
        configuration = Map_configuration.objects.first() or Map_configuration()
        for field in Map_configuration._meta.concrete_fields:
            if not field.primary_key:
                setattr(configuration, field.attname, getattr(source_configuration, field.attname))
        configuration.save()
        language_codes = source_configuration.automatic_translation_languages.values_list('code', flat=True)
        configuration.automatic_translation_languages.set(LanguageOption.objects.filter(code__in=list(language_codes)))
