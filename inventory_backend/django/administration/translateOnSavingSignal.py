from django.db.models.signals import post_save
from django.dispatch import receiver
from administration.models import *
from tools.views import createTitleTranslation

TRANSLATABLE_MODELS = [
    Menu, 
    MenuGroup, 
    Link, 
    Links_group, 
    Location,
    Tag, 
    Kml_shape
]

@receiver(post_save)
def translatingOnSaving(sender, instance, created, **kwargs):
    if created:
        if sender in TRANSLATABLE_MODELS:
            originalLanguage = Map_configuration.objects.first().default_content_language
            automaticTranslationLanguages = Map_configuration.objects.first().automatic_translation_languages.all()
        
            for language in automaticTranslationLanguages:
                createTitleTranslation(element = instance, sourceLanguageCode = originalLanguage, targetLanguageCode = language.code)
