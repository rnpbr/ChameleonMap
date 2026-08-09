from django.core.cache import cache
from django.db import connection

from . import MAP_DATA_VERSION
from .builder import build_map_data


def map_data_cache_key(schema_name=None):
    schema = schema_name or connection.schema_name
    return f'map_data:v{MAP_DATA_VERSION}:{schema}'


def invalidate_map_data_cache(schema_name=None):
    cache.delete(map_data_cache_key(schema_name))


def get_map_data(schema_name=None):
    key = map_data_cache_key(schema_name)

    def _build():
        return build_map_data()

    return cache.get_or_set(key, _build, timeout=None)
