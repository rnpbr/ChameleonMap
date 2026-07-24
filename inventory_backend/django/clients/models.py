
from django_tenants.models import TenantMixin, DomainMixin
from django.db import models
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
        'Tenant Name',
        max_length=63,
        help_text='The domain will be generated automatically: if the Tenant Name is "wrnp-2026", the domain will be "wrnp-2026.mapa.rnp.br".'
    )
    name = models.CharField(max_length=100)
    created_on = models.DateField(auto_now_add=True)
    tenancytype = models.CharField(max_length=100, choices=[
        ('public', 'Public'),
        ('scoped', 'Scoped'),
        ('root', 'Root'),
    ], default='scoped')

    def clean(self):
        # Validate slug as main domain label
        slug = getattr(self, 'slug', None)
        if slug:
            slug = slug.split(':', 1)[0]
            # If there is a subdomain, get only the main label
            label = slug.split('.', 1)[0]
            if not is_valid_label(label):
                raise ValidationError({'slug': 'Invalid domain name: it must have 2-26 characters, letters, numbers, hyphens or accented characters, not only numbers, and must not start or end with a hyphen.'})
            self.slug = slug
        super().clean()

    def __str__(self):
        return self.name


class Domain(DomainMixin):
    domain = models.CharField(
        max_length=253,
        unique=True,
        db_index=True,
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
                raise ValidationError({'domain': 'Invalid domain name: it must have 2-26 characters, letters, numbers, hyphens or accented characters, not only numbers, and must not start or end with a hyphen.'})
        self.domain = domain
        super().clean()

class TenantUser(UserProfile):
    name = models.CharField(max_length=100)