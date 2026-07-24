from django.conf import settings
from django.contrib import admin
from django.utils.translation import gettext_lazy as _
from django.utils.html import format_html
from unfold.admin import ModelAdmin as BaseModelAdmin
from unfold.apps import UnfoldAdminSite

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
    class TenantAdminSite(UnfoldAdminSite):
        site_header = _("ChameleonMap Admin")
        site_title = _("ChameleonMap Portal")
        index_title = _("Welcome to ChameleonMap Admin Portal")

    tenant_admin_site = TenantAdminSite(name='tenant_admin')
    map_admin_site = tenant_admin_site
else:
    tenant_admin_site = None
    map_admin_site = admin.site


class MenuGroupAdmin(BaseModelAdmin):
    list_display = ("name",)


class MenuAdmin(BaseModelAdmin):
    list_display = ("name", "group", "hierarchy_level", "active")
    list_filter = ("hierarchy_level",)
    search_fields = ['name']


class LocationAdmin(BaseModelAdmin):
    list_display = ("name", "latitude", "longitude", "active")
    search_fields = ['name']


class Tag_relationshipInline(admin.TabularInline):
    model = Tag_relationship
    fk_name = "child_tag"
    search_fields = ['name']


class TagAdmin(BaseModelAdmin):
    inlines = [
        Tag_relationshipInline,
    ]
    list_display = ("name", "parent_menu", "active")
    filter_horizontal = ('related_locations',)
    list_filter = ("parent_menu",)
    search_fields = ['name']


class LinkAdmin(BaseModelAdmin):
    list_display = ("display_name", "location_1", "location_2", "links_group")
    list_filter = ("links_group",)
    search_fields = ['display_name']


class Links_groupAdmin(BaseModelAdmin):
    list_display = ("name",)
    list_filter = ("name",)
    search_fields = ['name']


class Kml_shapeAdmin(BaseModelAdmin):
    list_display = ("name",)
    list_filter = ("name",)
    search_fields = ['name']


class Map_configurationAdmin(BaseModelAdmin):
    model = Map_configuration

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
