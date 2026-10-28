from functools import partial
from django.conf import settings
from django.contrib import admin
from django.db import connection
from django.utils.translation import gettext_lazy as _
from django.utils.html import format_html
from .sites import MapAdminSite
from .admin_translatable_model import TranslatableModelAdmin
from .admin_inlines import NameTranslationInline, Tag_relationshipInline

from administration.models import (
    MenuGroup,
    Menu,
    Location,
    Tag,
    Tag_relationship,
    Link,
    Links_group,
    Kml_shape,
    Map_configuration,
)

if settings.ENABLE_MULTITENANT:
    from django_tenants.utils import tenant_context

    class TenantAdminSite(MapAdminSite):
        site_header = _("ChameleonMap Admin")
        site_title = _("ChameleonMap Portal")
        index_title = _("Welcome to ChameleonMap Admin Portal")

        def get_translation_job_key(self):
            return connection.schema_name

        def get_translation_job_context(self):
            return partial(tenant_context, connection.tenant)

    tenant_admin_site = TenantAdminSite(name='tenant_admin')
    map_admin_site = tenant_admin_site
else:
    tenant_admin_site = None
    map_admin_site = admin.site

class MenuGroupAdmin(TranslatableModelAdmin):
    list_display = ("name","simultaneous_context")

class MenuAdmin(TranslatableModelAdmin):
    list_display = ("name", "group", "hierarchy_level", "active")
    list_filter = ("hierarchy_level",)
    search_fields = ['name']

class LocationAdmin(TranslatableModelAdmin):
    list_display = ("name", "latitude", "longitude", "active")
    search_fields = ['name']

class TagAdmin(TranslatableModelAdmin):
    inlines = [Tag_relationshipInline]
    list_display = ("name", "parent_menu", "active")
    filter_horizontal = ('related_locations',)
    list_filter = ("parent_menu",)
    search_fields = ['name']

class LinkAdmin(TranslatableModelAdmin):
    list_display = ("name", "location_1", "location_2", "links_group")
    list_filter = ("links_group",)
    search_fields = ['name']

class Links_groupAdmin(TranslatableModelAdmin):
    list_display = ("name","parent_menu")
    list_filter = ("name","parent_menu")
    search_fields = ['name']

class Kml_shapeAdmin(TranslatableModelAdmin):
    list_display = ("name","parent_menu")
    list_filter = ("name","parent_menu")
    search_fields = ['name']

class Map_configurationAdmin(TranslatableModelAdmin):
    model = Map_configuration
    filter_horizontal = ('automatic_translation_languages',)
    compressed_fields = True
    def edit(self, obj):
        return format_html(
            "<script src='https://kit.fontawesome.com/a076d05399.js' crossorigin='anonymous'></script>"
            "<a class='fas fa-edit' href='/admin/administration/map_configuration/{}/change/'></a>",
            obj.id,
        )

    list_display = ('__str__', 'edit')

    def has_delete_permission(self, request, obj=None):
        return False

    def has_add_permission(self, request, obj=None):
        return False

def _register_map_models(site):
    site.register(MenuGroup, MenuGroupAdmin)
    site.register(Menu, MenuAdmin)
    site.register(Location, LocationAdmin)
    site.register(Tag, TagAdmin)
    site.register(Link, LinkAdmin)
    site.register(Links_group, Links_groupAdmin)
    site.register(Kml_shape, Kml_shapeAdmin)
    site.register(Map_configuration, Map_configurationAdmin)

_register_map_models(map_admin_site)
