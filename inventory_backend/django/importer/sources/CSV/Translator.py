"""
Translates detected and validated CSV files into a MapData object.

Processing order:
  1. locations.csv  → mapData.locations
  2. tags.csv       → mapData.menu_groups, mapData.menus, mapData.tags
                      (MenuGroups and Menus are inferred from tag rows)
  3. links.csv      → mapData.links_groups, mapData.links
                      (LinksGroups are inferred from link rows)

All foreign-key references use names. If a referenced name is not found
in the imported data, a DB lookup is attempted as fallback.
"""

import csv
import io

from administration.models import MenuGroup, Menu, Location, Tag, Links_group, Link
from importer.models import (
    MapData,
    MenuGroupsType, MenusType, LocationsType, TagsType,
    LinksGroupsType, LinksType,
)


# ---------------------------------------------------------------------------
# ID assignment helpers (mirror pattern from InfraDPDI/Translator.py)
# ---------------------------------------------------------------------------

def _query_id_by_name(model_class, name, counter, name_field='name'):
    """
    Returns (id, counter). If the record exists in DB, returns its PK.
    Otherwise computes the next available ID using the latest PK + counter.
    """
    qs = model_class.objects.filter(**{name_field: name})
    if qs.exists():
        return qs.first().pk, counter
    try:
        latest_id = model_class.objects.latest('pk').pk
    except model_class.DoesNotExist:
        latest_id = 0
    counter += 1
    return latest_id + counter, counter


def _parse_bool(value, default=True):
    if not value or not value.strip():
        return default
    return value.strip().lower() in ('true', '1', 'yes')


def _parse_color(value, default='#FF0000'):
    if not value or not value.strip():
        return default
    v = value.strip()
    return v if v.startswith('#') else '#' + v


def _parse_float(value, default):
    if not value or not value.strip():
        return default
    try:
        return float(value.strip())
    except ValueError:
        return default


def _parse_int(value, default):
    if not value or not value.strip():
        return default
    try:
        return int(value.strip())
    except ValueError:
        return default


def _read_csv(fileobj):
    raw = fileobj.read()
    if isinstance(raw, bytes):
        raw = raw.decode('utf-8-sig')
    fileobj.seek(0)
    reader = csv.DictReader(io.StringIO(raw))
    rows = []
    for row in reader:
        rows.append({k.strip(): (v.strip() if v else '') for k, v in row.items() if k})
    return rows


def _find_by_name(collection, name):
    """Find an object with .name == name in a list."""
    for obj in collection:
        if obj.name == name:
            return obj
    return None


# ---------------------------------------------------------------------------
# Per-file translators
# ---------------------------------------------------------------------------

def _translate_locations(rows, mapData, id_counter):
    for row in rows:
        name = row.get('name', '')
        if not name:
            continue
        lat = _parse_float(row.get('latitude', ''), 0.0)
        lon = _parse_float(row.get('longitude', ''), 0.0)
        description = row.get('description', '') or ''
        active = _parse_bool(row.get('active', ''), default=True)

        loc_id, id_counter = _query_id_by_name(Location, name, id_counter)
        mapData.locations.append(LocationsType(loc_id, name, description, lat, lon, active))

    return mapData, id_counter


def _translate_tags(rows, mapData, menu_group_counter, menu_counter, tag_counter):
    """
    Infers MenuGroups and Menus from tag rows, then creates Tags.
    """
    for row in rows:
        tag_name = row.get('name', '')
        if not tag_name:
            continue

        menu_name = row.get('menu_name', '')
        menu_group_name = row.get('menu_group_name', '') or 'Default'
        hierarchy_level = _parse_int(row.get('menu_hierarchy_level', ''), default=0)

        # --- Infer MenuGroup ---
        menu_group = _find_by_name(mapData.menu_groups, menu_group_name)
        if menu_group is None:
            mg_id, menu_group_counter = _query_id_by_name(MenuGroup, menu_group_name, menu_group_counter)
            menu_group = MenuGroupsType(mg_id, menu_group_name, simultaneous_context=False)
            mapData.menu_groups.append(menu_group)

        # --- Infer Menu ---
        menu = _find_by_name(mapData.menus, menu_name)
        if menu is None:
            m_id, menu_counter = _query_id_by_name(Menu, menu_name, menu_counter)
            menu = MenusType(m_id, menu_name, menu_group.id, hierarchy_level, active=True)
            mapData.menus.append(menu)

        # --- Resolve related_locations ---
        related_location_ids = []
        related_raw = row.get('related_locations', '')
        if related_raw:
            for loc_name in related_raw.split(';'):
                loc_name = loc_name.strip()
                if not loc_name:
                    continue
                loc = _find_by_name(mapData.locations, loc_name)
                if loc:
                    related_location_ids.append(loc.id)
                else:
                    # DB fallback
                    try:
                        db_loc = Location.objects.get(name=loc_name)
                        related_location_ids.append(db_loc.pk)
                    except Location.DoesNotExist:
                        pass  # Silently skip; Validator ensures locations exist in the upload

        color = _parse_color(row.get('color', ''), default='#FF0000')
        description = row.get('description', '') or ''
        active = _parse_bool(row.get('active', ''), default=True)

        tag_id, tag_counter = _query_id_by_name(Tag, tag_name, tag_counter)
        mapData.tags.append(TagsType(
            tag_id, tag_name, menu.id, color, description,
            sidebar_content='', related_locations=related_location_ids, active=active
        ))

    return mapData, menu_group_counter, menu_counter, tag_counter


def _translate_links(rows, mapData, links_group_counter, link_counter):
    """
    Infers LinksGroups from link rows, then creates Links.
    """
    for row in rows:
        link_name = row.get('name', '')
        if not link_name:
            continue

        loc1_name = row.get('location_1', '')
        loc2_name = row.get('location_2', '')

        # Resolve location IDs (uploaded data first, then DB)
        def resolve_location_id(name):
            loc = _find_by_name(mapData.locations, name)
            if loc:
                return loc.id
            try:
                return Location.objects.get(name=name).pk
            except Location.DoesNotExist:
                return None

        loc1_id = resolve_location_id(loc1_name)
        loc2_id = resolve_location_id(loc2_name)

        if loc1_id is None or loc2_id is None:
            continue  # Skip links whose locations can't be resolved

        # --- Infer LinksGroup ---
        lg_name = row.get('link_group_name', '') or 'Default Links'
        lg = _find_by_name(mapData.links_groups, lg_name)
        if lg is None:
            lg_menu_name = row.get('link_group_menu', '')
            lg_color = _parse_color(row.get('link_group_color', ''), default='#FF0000')
            lg_opacity = _parse_float(row.get('link_group_opacity', ''), default=0.6)

            # Resolve menu FK for LinksGroup
            lg_menu_id = None
            if lg_menu_name:
                menu = _find_by_name(mapData.menus, lg_menu_name)
                if menu:
                    lg_menu_id = menu.id
                else:
                    try:
                        lg_menu_id = Menu.objects.get(name=lg_menu_name).pk
                    except Menu.DoesNotExist:
                        lg_menu_id = None

            lg_id, links_group_counter = _query_id_by_name(Links_group, lg_name, links_group_counter)
            lg = LinksGroupsType(lg_id, lg_name, lg_menu_id, lg_color, lg_opacity)
            mapData.links_groups.append(lg)

        curvature = _parse_float(row.get('curvature', ''), default=2.0)
        weight = _parse_int(row.get('weight', ''), default=3)
        dashed = _parse_bool(row.get('dashed', ''), default=False)
        straight_link = _parse_bool(row.get('straight_link', ''), default=False)
        invert_link = _parse_bool(row.get('invert_link', ''), default=False)
        popup_description = row.get('popup_description', '') or ''

        link_id, link_counter = _query_id_by_name(Link, link_name, link_counter, name_field='display_name')
        mapData.links.append(LinksType(
            link_id, link_name, loc1_id, loc2_id, lg.id,
            curvature, weight, dashed, straight_link, invert_link, popup_description
        ))

    return mapData, links_group_counter, link_counter


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------

def run(detected_files):
    """
    Receives the dict returned by Detector.detect():
      {file_type -> (filename, fileobj)}
    Returns a populated MapData object.
    """
    mapData = MapData()
    loc_counter = 0
    mg_counter = 0
    menu_counter = 0
    tag_counter = 0
    lg_counter = 0
    link_counter = 0

    # 1. Locations
    if 'locations' in detected_files:
        _, fileobj = detected_files['locations']
        rows = _read_csv(fileobj)
        mapData, loc_counter = _translate_locations(rows, mapData, loc_counter)

    # 2. Tags (infers MenuGroups and Menus)
    if 'tags' in detected_files:
        _, fileobj = detected_files['tags']
        rows = _read_csv(fileobj)
        mapData, mg_counter, menu_counter, tag_counter = _translate_tags(
            rows, mapData, mg_counter, menu_counter, tag_counter
        )

    # 3. Links (infers LinksGroups)
    if 'links' in detected_files:
        _, fileobj = detected_files['links']
        rows = _read_csv(fileobj)
        mapData, lg_counter, link_counter = _translate_links(
            rows, mapData, lg_counter, link_counter
        )

    return mapData
