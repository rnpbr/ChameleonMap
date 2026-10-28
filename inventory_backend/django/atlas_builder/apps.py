from django.apps import AppConfig
from django.utils.translation import gettext_lazy as _


class AtlasBuilderConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'atlas_builder'
    verbose_name = _("Atlas Builder")
