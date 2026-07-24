from decimal import Decimal

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

from . import MAP_DATA_VERSION
from .inheritance import apply_inherited_locations
from .kml_geojson import convert_kml_file_to_geojson, serialize_geojson
from .popups import build_location_popups


def _decimal_to_float(value):
    if isinstance(value, Decimal):
        return float(value)
    return value


def _serialize_settings(config):
    footer_file = config.footer_file.url if config.footer_file else ''
    return {
        'id': config.id,
        'map_name': config.map_name,
        'map_style': config.map_style,
        'inherit_children_tag_locations': config.inherit_children_tag_locations,
        'cluster_close_tags': config.cluster_close_tags,
        'initial_zoom_level': config.initial_zoom_level,
        'initial_latitude': _decimal_to_float(config.initial_latitude),
        'initial_longitude': _decimal_to_float(config.initial_longitude),
        'link_feature': config.link_feature,
        'hide_menu_group_when_unique': config.hide_menu_group_when_unique,
        'footer_file': footer_file,
    }


def _relationship_dict(relation):
    return {
        'id': relation.id,
        'parent_tag': relation.parent_tag_id,
        'child_tag': relation.child_tag_id,
        'cluster_id': relation.cluster_id,
    }


def _build_tag_graph(tags, relationships):
    tags_by_id = {tag['id']: tag for tag in tags}
    for tag in tags:
        tag['child_tags'] = []
        tag['parent_tags'] = []

    for relation in relationships:
        relation_dict = {
            'id': relation['id'],
            'parent_tag': relation['parent_tag'],
            'child_tag': relation['child_tag'],
            'cluster_id': relation['cluster_id'],
        }
        parent = tags_by_id.get(relation['parent_tag'])
        child = tags_by_id.get(relation['child_tag'])
        if parent:
            parent['child_tags'].append(relation_dict)
        if child:
            child['parent_tags'].append(relation_dict)


def build_map_data():
    menu_groups = [
        {
            'id': group.id,
            'name': group.name,
            'simultaneous_context': group.simultaneous_context,
        }
        for group in MenuGroup.objects.all().order_by('id')
    ]

    menus = [
        {
            'id': menu.id,
            'name': menu.name,
            'group': menu.group_id,
            'hierarchy_level': menu.hierarchy_level,
            'active': menu.active,
        }
        for menu in Menu.objects.select_related('group').order_by('hierarchy_level', 'id')
    ]
    menus_by_id = {menu['id']: menu for menu in menus}

    locations = [
        {
            'id': location.id,
            'name': location.name,
            'description': location.description or '',
            'latitude': _decimal_to_float(location.latitude),
            'longitude': _decimal_to_float(location.longitude),
            'overlayed_popup_content': location.overlayed_popup_content or '',
            'active': location.active,
        }
        for location in Location.objects.all().order_by('name', 'id')
    ]

    tag_queryset = Tag.objects.prefetch_related('related_locations').select_related('parent_menu')
    tags = [
        {
            'id': tag.id,
            'name': tag.name,
            'color': tag.color,
            'description': tag.description or '',
            'parent_menu': tag.parent_menu_id,
            'related_locations': list(tag.related_locations.values_list('id', flat=True)),
            'active': tag.active,
            'sidebar_content': tag.sidebar_content or '',
            'overlayed_popup_content': tag.overlayed_popup_content or '',
            'child_tags': [],
            'parent_tags': [],
        }
        for tag in tag_queryset
    ]

    relationships = [
        _relationship_dict(relation)
        for relation in Tag_relationship.objects.select_related('child_tag', 'parent_tag').all()
    ]
    _build_tag_graph(tags, relationships)

    settings = Map_configuration.objects.first()
    inherit_enabled = bool(settings and settings.inherit_children_tag_locations)
    apply_inherited_locations(tags, menus_by_id, inherit_enabled)

    location_popups = build_location_popups(locations, tags)

    links_groups = [
        {
            'id': group.id,
            'name': group.name,
            'links_color': group.links_color,
            'sidebar_content': group.sidebar_content or '',
            'opacity': _decimal_to_float(group.opacity),
            'parent_menu': group.parent_menu_id,
        }
        for group in Links_group.objects.select_related('parent_menu').order_by('name', 'id')
    ]

    links = [
        {
            'id': link.id,
            'display_name': link.display_name,
            'popup_description': link.popup_description or '',
            'location_1': link.location_1_id,
            'location_2': link.location_2_id,
            'links_group': link.links_group_id,
            'curvature': _decimal_to_float(link.curvature),
            'invert_link': link.invert_link,
            'straight_link': link.straight_link,
            'dashed': link.dashed,
            'weight': link.weight,
        }
        for link in Link.objects.select_related(
            'location_1', 'location_2', 'links_group'
        ).order_by('id')
    ]

    kml_layers = []
    for shape in Kml_shape.objects.select_related('parent_menu').order_by('name', 'id'):
        geojson = serialize_geojson(convert_kml_file_to_geojson(shape.kml_file))
        kml_layers.append({
            'id': shape.id,
            'name': shape.name,
            'parent_menu': shape.parent_menu_id,
            'links_color': shape.links_color,
            'opacity': _decimal_to_float(shape.opacity),
            'geojson': geojson,
        })

    return {
        'version': MAP_DATA_VERSION,
        'settings': _serialize_settings(settings) if settings else None,
        'menu_groups': menu_groups,
        'menus': menus,
        'locations': locations,
        'tags': tags,
        'links': links,
        'links_groups': links_groups,
        'kml_layers': kml_layers,
        'location_popups': location_popups,
    }
