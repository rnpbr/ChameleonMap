from django.template.response import TemplateResponse
from django.urls import path
from django.shortcuts import redirect
from django.contrib import messages
from unfold.apps import UnfoldAdminSite
from tools.views import createTranslationsForAllTitles
from administration.language_codes import LanguageCode

class TenantAdminSite(UnfoldAdminSite):
    site_header = "ChameleonMap Admin"
    site_title = "ChameleonMap Portal"
    index_title = "Welcome to ChameleonMap Admin Portal"
    
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
    