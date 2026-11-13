from django import template
from administration.language_codes import *

register = template.Library()

@register.simple_tag
def getLanguageOptions():
    languageOptions = LanguageCode.values
    return languageOptions

@register.simple_tag
def getLanguageLabelFromCode(languageCode):
    return LanguageCode(languageCode).label
