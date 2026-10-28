from django.core.cache import cache
from django.db import connection

from . import MAP_DATA_VERSION
from .builder import build_map_data

MAP_DATA_CACHE_TIMEOUT = 60 * 60 * 24  # 24h

def current_schema_name(schema_name=None):
    if schema_name:
        return schema_name
    return getattr(connection, 'schema_name', None) or 'public'


def map_data_cache_key(schema_name=None):
    return f'map_data:v{MAP_DATA_VERSION}:{current_schema_name(schema_name)}'


def invalidate_map_data_cache(schema_name=None):
    cache.delete(map_data_cache_key(schema_name))


def get_map_data(schema_name=None):
    key = map_data_cache_key(schema_name)

    def _build():
        return build_map_data()

    return cache.get_or_set(key, _build, timeout=MAP_DATA_CACHE_TIMEOUT)
