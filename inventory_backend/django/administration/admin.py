from django.conf import settings
from django.contrib import admin, messages
from django.utils.translation import gettext_lazy as _
from django.utils.html import format_html
from unfold.apps import UnfoldAdminSite
from django.urls import path
from django.template.response import TemplateResponse
from django.shortcuts import redirect
from tools.views import createTranslationsForAllTitles
from .language_codes import LanguageCode
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
    class TenantAdminSite(UnfoldAdminSite):
        site_header = _("ChameleonMap Admin")
        site_title = _("ChameleonMap Portal")
        index_title = _("Welcome to ChameleonMap Admin Portal")

        def get_urls(self):
            urls = super().get_urls()
            custom_urls = [
                path(
                    "generate-translations/",
                    self.admin_view(self.generate_translations_view),
                    name="generate_translations",
                ),
            ]
            return custom_urls + urls

        def generate_translations_view(self, request):
            if request.method == "POST":
                targetLanguage = request.POST.get("targetLanguage")
                try:
                    createTranslationsForAllTitles(targetLanguage)
                    messages.success(request, f"Translations generated successfully for: {LanguageCode(targetLanguage).label}")
                except Exception as e:
                    messages.error(request, f"Error generating translations: {str(e)}")
                return redirect("tenant_admin:generate_translations")

            context = dict(self.each_context(request))
            return TemplateResponse(request, "admin/generate_translations.html", context)

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
