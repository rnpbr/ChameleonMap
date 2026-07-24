from django.apps import AppConfig
from django.utils.translation import gettext_lazy as _


class AdministrationConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'administration'
    verbose_name = _("Map data")

    def ready(self):
        from administration.map_data.signals import connect_map_data_cache_signals
        connect_map_data_cache_signals()

