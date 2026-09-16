from django import template
from django.conf import settings

register = template.Library()

@register.simple_tag
def multitenant_enabled():
    return settings.ENABLE_MULTITENANT


@register.simple_tag(takes_context=True)
def is_root_tenant(context):
    """True when multitenancy is on and the current tenant is the root/admin tenant."""
    if not settings.ENABLE_MULTITENANT:
        return False
    request = context.get('request')
    tenant = getattr(request, 'tenant', None) if request else None
    if tenant is None:
        return False
    return getattr(tenant, 'tenancytype', None) == 'root'
