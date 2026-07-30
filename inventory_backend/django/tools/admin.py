from django.shortcuts import redirect
from unfold.admin import ModelAdmin
from administration.admin import tenant_admin_site
from .models import TranslationsGeneratorTool


class TranslationsGeneratorToolAdmin(ModelAdmin):
    icon = "translate"

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    def has_module_permission(self, request):
        return True

    def has_view_permission(self, request, obj=None):
        return True

    def changelist_view(self, request, extra_context=None):
        return redirect("admin:generate_translations")


tenant_admin_site.register(
    TranslationsGeneratorTool,
    TranslationsGeneratorToolAdmin
)