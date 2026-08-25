from django.db import models

class LanguageCode(models.TextChoices):
    ENGLISH = 'en', '🇺🇸 English'
    PORTUGUESE_BR = 'pt', '🇧🇷 Português'
    SPANISH = 'es', '🇪🇸 Español'
    GERMAN = 'de', '🇩🇪 Deutsch'
    KOREAN = 'ko', '🇰🇷 한국어'
