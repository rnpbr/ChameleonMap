
from django_tenants.models import TenantMixin, DomainMixin
from django.db import models
from django.utils.translation import gettext_lazy as _
from tenant_users.tenants.models import TenantBase, UserProfile
import re
from django.core.validators import RegexValidator
from django.core.exceptions import ValidationError


 # Regex for main label: letters, numbers, hyphen, accented, 2-26 characters, not only numbers, does not start/end with hyphen
label_regex = r'^(?!-)[a-z0-9àáâãéêíóôõúüç-]{2,26}(?<!-)$'
import unicodedata

def is_valid_label(label):
    # Normalize to NFC
    print(label)
    label = unicodedata.normalize('NFC', label)
    print(label)
    # Check regex
    import re
    if not re.match(label_regex, label, flags=re.IGNORECASE):
        return False
    # Cannot be only numbers
    if label.isdigit():
        return False
    return True

class Client(TenantBase):
    slug = models.CharField(
        _('Tenant Name'),
        max_length=63,
        help_text=_('The domain will be generated automatically: if the Tenant Name is "wrnp-2026", the domain will be "wrnp-2026.mapa.rnp.br".')
    )
    name = models.CharField(max_length=100, verbose_name=_("name"))
    created_on = models.DateField(auto_now_add=True, verbose_name=_("created on"))
    tenancytype = models.CharField(max_length=100, verbose_name=_("tenancy type"), choices=[
        ('public', _('Public')),
        ('scoped', _('Scoped')),
        ('root', _('Root')),
    ], default='scoped')

    def clean(self):
        # Validate slug as main domain label
        slug = getattr(self, 'slug', None)
        if slug:
            slug = slug.split(':', 1)[0]
            # If there is a subdomain, get only the main label
            label = slug.split('.', 1)[0]
            if not is_valid_label(label):
                raise ValidationError({'slug': _('Invalid domain name: it must have 2-26 characters, letters, numbers, hyphens or accented characters, not only numbers, and must not start or end with a hyphen.')})
            self.slug = slug
        super().clean()

    class Meta:
        verbose_name = _("Client")
        verbose_name_plural = _("Clients")

    def __str__(self):
        return self.name


class Domain(DomainMixin):
    domain = models.CharField(
        max_length=253,
        unique=True,
        db_index=True,
        verbose_name=_("domain"),
    )

    def clean(self):
        # Remove port if present (e.g.: admin.localhost:8888 -> admin.localhost)
        domain = self.domain
        if domain and ':' in domain:
            domain = domain.split(':', 1)[0]
        # Validate main label
        if domain:
            label = domain.split('.', 1)[0]
            if not is_valid_label(label):
                raise ValidationError({'domain': _('Invalid domain name: it must have 2-26 characters, letters, numbers, hyphens or accented characters, not only numbers, and must not start or end with a hyphen.')})
        self.domain = domain
        super().clean()

    class Meta:
        verbose_name = _("Domain")
        verbose_name_plural = _("Domains")

class TenantUser(UserProfile):
    name = models.CharField(max_length=100, verbose_name=_("name"))

    class Meta:
        verbose_name = _("User")
        verbose_name_plural = _("Users")
