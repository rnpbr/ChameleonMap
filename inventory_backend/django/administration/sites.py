from contextlib import nullcontext

from django.contrib import messages
from django.http import JsonResponse
from django.shortcuts import redirect
from django.template.response import TemplateResponse
from django.urls import path
from unfold.sites import UnfoldAdminSite

from tools.translation_jobs import getTranslationJob, startTranslationJob
from .language_codes import LanguageCode


class MapAdminSite(UnfoldAdminSite):

    def get_translation_job_key(self):
        return 'default'

    def get_translation_job_context(self):
        return nullcontext

    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path(
                "generate-translations/",
                self.admin_view(self.generate_translations_view),
                name="generate_translations",
            ),
            path(
                "generate-translations/status/",
                self.admin_view(self.generate_translations_status_view),
                name="generate_translations_status",
            ),
        ]
        return custom_urls + urls

    def generate_translations_view(self, request):
        if request.method == "POST":
            targetLanguage = request.POST.get("targetLanguage")
            job = startTranslationJob(
                self.get_translation_job_key(), targetLanguage, self.get_translation_job_context()
            )
            if request.headers.get("Accept") == "application/json":
                return JsonResponse(job)
            messages.info(request, f"Generating translations in background for: {LanguageCode(job['language']).label}")
            return redirect(f"{self.name}:generate_translations")

        context = dict(self.each_context(request))
        return TemplateResponse(request, "admin/generate_translations.html", context)

    def generate_translations_status_view(self, request):
        return JsonResponse(getTranslationJob(self.get_translation_job_key()) or {"state": "idle"})
