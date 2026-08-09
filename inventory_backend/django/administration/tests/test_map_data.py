from django.core.cache import cache
from django.test import SimpleTestCase, TestCase, override_settings

from administration.map_data.cache import invalidate_map_data_cache, map_data_cache_key
from administration.map_data.inheritance import apply_inherited_locations
from administration.map_data.kml_geojson import convert_kml_file_to_geojson
from administration.map_data.popups import build_location_popups


class InheritedLocationsTests(SimpleTestCase):
    def test_inherits_direct_child_locations(self):
        parent = {
            'id': 1,
            'parent_menu': 1,
            'active': True,
            'related_locations': [1],
            'child_tags': [{'id': 1, 'parent_tag': 1, 'child_tag': 2, 'cluster_id': 1}],
            'parent_tags': [],
        }
        child = {
            'id': 2,
            'parent_menu': 2,
            'active': True,
            'related_locations': [2, 3],
            'child_tags': [],
            'parent_tags': [{'id': 1, 'parent_tag': 1, 'child_tag': 2, 'cluster_id': 1}],
        }
        tags = [parent, child]
        menus_by_id = {
            1: {'id': 1, 'group': 1, 'hierarchy_level': 0},
            2: {'id': 2, 'group': 1, 'hierarchy_level': 1},
        }

        apply_inherited_locations(tags, menus_by_id, True)

        self.assertEqual(sorted(parent['related_locations']), [1, 2, 3])


class PopupBuilderTests(SimpleTestCase):
    def test_builds_tag_sections_per_location(self):
        locations = [
            {'id': 1, 'name': 'Loc 1', 'description': 'Desc', 'active': True, 'overlayed_popup_content': ''},
        ]
        tags = [
            {
                'id': 5,
                'name': 'Tag 5',
                'description': '<p>Tag desc</p>',
                'active': True,
                'overlayed_popup_content': '',
                'related_locations': [1],
            }
        ]

        popups = build_location_popups(locations, tags)

        self.assertEqual(popups['1']['title'], 'Loc 1')
        self.assertEqual(len(popups['1']['tags']), 1)
        self.assertEqual(popups['1']['tags'][0]['tag_id'], 5)


class KmlConversionTests(SimpleTestCase):
    def test_returns_none_for_missing_file(self):
        self.assertIsNone(convert_kml_file_to_geojson(None))


@override_settings(
    CACHES={
        'default': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
            'LOCATION': 'map-data-tests',
        }
    }
)
class MapDataCacheTests(TestCase):
    def setUp(self):
        cache.clear()

    def test_cache_key_includes_schema(self):
        self.assertEqual(map_data_cache_key('example'), 'map_data:v1:example')

    def test_invalidate_removes_cached_entry(self):
        key = map_data_cache_key('example')
        cache.set(key, {'cached': True})
        invalidate_map_data_cache('example')
        self.assertIsNone(cache.get(key))
