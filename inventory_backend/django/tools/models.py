from django.db import models

class TranslationsGeneratorTool(models.Model):
    class Meta:
        verbose_name = "Generate Translations"
        verbose_name_plural = "Generate Translations"
        managed = False  
