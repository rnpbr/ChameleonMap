from django.db import connection
from django.db.models.signals import post_delete, post_save

from administration.models import (
    Kml_shape,
    Link,
    Links_group,
    Location,
    Map_configuration,
    Menu,
    MenuGroup,
    Tag,
    Tag_relationship,
)

from .cache import invalidate_map_data_cache

MAP_DATA_MODELS = (
    MenuGroup,
    Menu,
    Tag,
    Location,
    Tag_relationship,
    Link,
    Links_group,
    Kml_shape,
    Map_configuration,
)


def _invalidate_map_data_cache(**kwargs):
    invalidate_map_data_cache(connection.schema_name)


def connect_map_data_cache_signals():
    for model in MAP_DATA_MODELS:
        post_save.connect(_invalidate_map_data_cache, sender=model, dispatch_uid=f'map_data_save_{model.__name__}')
        post_delete.connect(_invalidate_map_data_cache, sender=model, dispatch_uid=f'map_data_delete_{model.__name__}')
