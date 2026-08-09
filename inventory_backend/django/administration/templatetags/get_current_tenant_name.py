from django import template

register = template.Library()

@register.simple_tag(takes_context=True)
def get_current_tenant_name(context):
    request = context['request']
    return request.tenant.name
