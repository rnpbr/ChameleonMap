from django.contrib import admin
from django.utils.translation import gettext_lazy as _
from administration.models import *
from django.utils.html import format_html
from unfold.admin import ModelAdmin
from unfold.apps import UnfoldAdminSite

class TenantAdminSite(UnfoldAdminSite):
    site_header = _("ChameleonMap Admin")
    site_title = _("ChameleonMap Portal")
    index_title = _("Welcome to ChameleonMap Admin Portal")

tenant_admin_site = TenantAdminSite(name='tenant_admin')

tenant_admin_site.register(MenuGroup, admin_class=ModelAdmin)
class MenuGroupAdmin(ModelAdmin):
    list_display = ("name",)

tenant_admin_site.register(Menu, admin_class=ModelAdmin)
class MenuAdmin(ModelAdmin):
    list_display = ("name", "group", "hierarchy_level", "active")
    list_filter = ("hierarchy_level",)
    search_fields = ['name']

tenant_admin_site.register(Location, admin_class=ModelAdmin)
class LocationAdmin(ModelAdmin):
    list_display = ("name", "latitude", "longitude", "active")
    search_fields = ['name']

class Tag_relationshipInline(admin.TabularInline):
    model = Tag_relationship
    fk_name = "child_tag"
    search_fields = ['name']

tenant_admin_site.register(Tag, admin_class=ModelAdmin)
class TagAdmin(ModelAdmin):
    inlines = [
        Tag_relationshipInline,
    ]
    list_display = ("name", "parent_menu", "active")
    filter_horizontal = ('related_locations',)
    list_filter = ("parent_menu",)
    search_fields = ['name']

tenant_admin_site.register(Link, admin_class=ModelAdmin)
class LinkAdmin(ModelAdmin):
    list_display = ("display_name", "location_1", "location_2", "links_group")
    list_filter = ("links_group",)
    search_fields = ['display_name']

tenant_admin_site.register(Links_group, admin_class=ModelAdmin)
class Links_groupAdmin(ModelAdmin):
    list_display = ("name",)
    list_filter = ("name",)
    search_fields = ['name']

tenant_admin_site.register(Kml_shape, admin_class=ModelAdmin)
class Kml_shapeAdmin(ModelAdmin):
    list_display = ("name",)
    list_filter = ("name",)
    search_fields = ['name']

tenant_admin_site.register(Map_configuration, admin_class=ModelAdmin)
class Map_configurationAdmin(ModelAdmin):
    model = Map_configuration

    def edit(self, obj):
        return format_html("<script src='https://kit.fontawesome.com/a076d05399.js' crossorigin='anonymous'></script><a class='fas fa-edit' href='/admin/administration/map_configuration/{}/change/'></a>", obj.id)

    list_display = ('__str__', 'edit')

    def has_delete_permission(self, request, obj=None): 
        return False
    def has_add_permission(self, request, obj=None): 
        return False
