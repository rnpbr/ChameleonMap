from django.contrib import admin
from django.utils.html import format_html
from unfold.admin import ModelAdmin
from administration.models import *
from administration.admin_inlines import Tag_relationshipInline, NameTranslationInline
from administration.admin_custom_site import TenantAdminSite
from administration.admin_translatable_model import TranslatableModelAdmin

tenant_admin_site = TenantAdminSite(name='tenant_admin') 

@admin.register(MenuGroup, site=tenant_admin_site)    
class MenuGroupAdmin(TranslatableModelAdmin):
    list_display = ("name",)
    compressed_fields = True
      
@admin.register(Menu, site=tenant_admin_site)
class MenuAdmin(TranslatableModelAdmin):
    list_display = ("name", "group", "hierarchy_level", "active")
    list_filter = ("hierarchy_level",)
    search_fields = ['name']
    
@admin.register(Location, site=tenant_admin_site)          
class LocationAdmin(TranslatableModelAdmin):
    list_display = ("name", "latitude", "longitude", "active")
    search_fields = ['name']

@admin.register(Tag, site=tenant_admin_site)
class TagAdmin(TranslatableModelAdmin):
    inlines = [Tag_relationshipInline]
    list_display = ("name", "parent_menu", "active")
    filter_horizontal = ('related_locations',)
    list_filter = ("parent_menu",)
    search_fields = ['name']
    
@admin.register(Link, site=tenant_admin_site)
class LinkAdmin(TranslatableModelAdmin):
    inlines = [NameTranslationInline]
    list_display = ("display_name", "location_1", "location_2", "links_group")
    list_filter = ("links_group",)
    search_fields = ['display_name']
    
@admin.register(Links_group, site=tenant_admin_site)
class Links_groupAdmin(TranslatableModelAdmin):
    inlines = [NameTranslationInline]
    list_display = ("name",)
    list_filter = ("name",)
    search_fields = ['name']
    
@admin.register(Kml_shape, site=tenant_admin_site)
class Kml_shapeAdmin(TranslatableModelAdmin):
    inlines = [NameTranslationInline]
    list_display = ("name",)
    list_filter = ("name",)
    search_fields = ['name']
    
@admin.register(Map_configuration, site=tenant_admin_site)
class Map_configurationAdmin(TranslatableModelAdmin):
    model = Map_configuration
    filter_horizontal = ('automatic_translation_languages',)
    compressed_fields = True
    def edit(self, obj):
        return format_html("<script src='https://kit.fontawesome.com/a076d05399.js' crossorigin='anonymous'></script><a class='fas fa-edit' href='/admin/administration/map_configuration/{}/change/'></a>", obj.id)

    list_display = ('__str__', 'edit')

    def has_delete_permission(self, request, obj=None): 
        return False
    def has_add_permission(self, request, obj=None): 
        return False
