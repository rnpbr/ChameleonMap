from django import template
from django.conf import settings

register = template.Library()

@register.simple_tag(takes_context=True)
def get_current_tenant_name(context):
    if not settings.ENABLE_MULTITENANT:
        return ""
    request = context['request']
    return request.tenant.name
