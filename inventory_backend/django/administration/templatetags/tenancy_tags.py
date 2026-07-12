from django import template
from django.conf import settings

register = template.Library()

@register.simple_tag
def multitenant_enabled():
    return settings.ENABLE_MULTITENANT
