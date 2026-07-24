"""
Validates CSV files for structure and field content before translation.
Collects all errors across all rows (non-fail-fast).
"""

import csv
import io
import re

from .numerics import parse_float_loose, parse_int_loose

COLOR_RE = re.compile(r'^#[0-9A-Fa-f]{6}$')

LOCATIONS_REQUIRED_COLUMNS = {'name', 'latitude', 'longitude'}
TAGS_REQUIRED_COLUMNS = {'name', 'menu_name'}
LINKS_REQUIRED_COLUMNS = {'name', 'location_1', 'location_2'}

LOCATIONS_ALL_COLUMNS = {'name', 'latitude', 'longitude', 'description', 'active'}
TAGS_ALL_COLUMNS = {'name', 'menu_name', 'menu_group_name', 'menu_hierarchy_level',
                    'color', 'description', 'related_locations', 'active'}
LINKS_ALL_COLUMNS = {'name', 'location_1', 'location_2', 'link_group_name',
                     'link_group_menu', 'link_group_color', 'link_group_opacity',
                     'curvature', 'weight', 'dashed', 'straight_link',
                     'invert_link', 'popup_description'}


def _err(filename, row_num, field, message):
    return {'file': filename, 'row': row_num, 'field': field, 'message': message}


def _parse_bool(value):
    if value.strip().lower() in ('true', '1', 'yes'):
        return True
    if value.strip().lower() in ('false', '0', 'no', ''):
        return False
    return None


def _validate_color(value):
    if not value:
        return True
    return bool(COLOR_RE.match(value.strip()))


def _read_csv(fileobj):
    raw = fileobj.read()
    if isinstance(raw, bytes):
        raw = raw.decode('utf-8-sig')
    fileobj.seek(0)
    reader = csv.DictReader(io.StringIO(raw))
    return reader


def validate_locations(filename, fileobj):
    errors = []
    try:
        reader = _read_csv(fileobj)
        columns = set(f.strip() for f in (reader.fieldnames or []))

        missing = LOCATIONS_REQUIRED_COLUMNS - columns
        if missing:
            errors.append(_err(filename, 'header', ', '.join(sorted(missing)),
                               f"Missing required column(s): {', '.join(sorted(missing))}"))
            return errors

        seen_names = {}
        for i, row in enumerate(reader, start=2):
            row = {k.strip(): v.strip() for k, v in row.items() if k}

            name = row.get('name', '')
            if not name:
                errors.append(_err(filename, i, 'name', "Field 'name' is required and cannot be empty."))

            lat = row.get('latitude', '')
            if not lat:
                errors.append(_err(filename, i, 'latitude', "Field 'latitude' is required and cannot be empty."))
            else:
                try:
                    lat_f = parse_float_loose(lat)
                    if not (-90 <= lat_f <= 90):
                        errors.append(_err(filename, i, 'latitude',
                                           f"Latitude '{lat}' is out of range (-90 to 90)."))
                except ValueError:
                    errors.append(_err(filename, i, 'latitude',
                                       f"Latitude '{lat}' is not a valid number."))

            lon = row.get('longitude', '')
            if not lon:
                errors.append(_err(filename, i, 'longitude', "Field 'longitude' is required and cannot be empty."))
            else:
                try:
                    lon_f = parse_float_loose(lon)
                    if not (-180 <= lon_f <= 180):
                        errors.append(_err(filename, i, 'longitude',
                                           f"Longitude '{lon}' is out of range (-180 to 180)."))
                except ValueError:
                    errors.append(_err(filename, i, 'longitude',
                                       f"Longitude '{lon}' is not a valid number."))

            active = row.get('active', '')
            if active and _parse_bool(active) is None:
                errors.append(_err(filename, i, 'active',
                                   f"Field 'active' must be 'True' or 'False', got '{active}'."))

            if name and name in seen_names:
                errors.append(_err(filename, i, 'name',
                                   f"Duplicate location name '{name}' (also on row {seen_names[name]})."))
            elif name:
                seen_names[name] = i

    except Exception as e:
        errors.append(_err(filename, '?', '?', f"Failed to read CSV: {e}"))

    fileobj.seek(0)
    return errors


def validate_tags(filename, fileobj):
    errors = []
    try:
        reader = _read_csv(fileobj)
        columns = set(f.strip() for f in (reader.fieldnames or []))

        missing = TAGS_REQUIRED_COLUMNS - columns
        if missing:
            errors.append(_err(filename, 'header', ', '.join(sorted(missing)),
                               f"Missing required column(s): {', '.join(sorted(missing))}"))
            return errors

        seen_names = {}
        for i, row in enumerate(reader, start=2):
            row = {k.strip(): v.strip() for k, v in row.items() if k}

            name = row.get('name', '')
            if not name:
                errors.append(_err(filename, i, 'name', "Field 'name' is required and cannot be empty."))

            menu_name = row.get('menu_name', '')
            if not menu_name:
                errors.append(_err(filename, i, 'menu_name', "Field 'menu_name' is required and cannot be empty."))

            color = row.get('color', '')
            if color and not _validate_color(color):
                errors.append(_err(filename, i, 'color',
                                   f"Color '{color}' is not a valid hex color. Use format #RRGGBB."))

            hierarchy = row.get('menu_hierarchy_level', '')
            if hierarchy:
                try:
                    parse_int_loose(hierarchy)
                except ValueError:
                    errors.append(_err(filename, i, 'menu_hierarchy_level',
                                       f"Field 'menu_hierarchy_level' must be an integer, got '{hierarchy}'."))

            active = row.get('active', '')
            if active and _parse_bool(active) is None:
                errors.append(_err(filename, i, 'active',
                                   f"Field 'active' must be 'True' or 'False', got '{active}'."))

            if name and name in seen_names:
                errors.append(_err(filename, i, 'name',
                                   f"Duplicate tag name '{name}' (also on row {seen_names[name]})."))
            elif name:
                seen_names[name] = i

    except Exception as e:
        errors.append(_err(filename, '?', '?', f"Failed to read CSV: {e}"))

    fileobj.seek(0)
    return errors


def validate_links(filename, fileobj):
    errors = []
    try:
        reader = _read_csv(fileobj)
        columns = set(f.strip() for f in (reader.fieldnames or []))

        missing = LINKS_REQUIRED_COLUMNS - columns
        if missing:
            errors.append(_err(filename, 'header', ', '.join(sorted(missing)),
                               f"Missing required column(s): {', '.join(sorted(missing))}"))
            return errors

        seen_names = {}
        for i, row in enumerate(reader, start=2):
            row = {k.strip(): v.strip() for k, v in row.items() if k}

            name = row.get('name', '')
            if not name:
                errors.append(_err(filename, i, 'name', "Field 'name' is required and cannot be empty."))

            for loc_field in ('location_1', 'location_2'):
                if not row.get(loc_field, ''):
                    errors.append(_err(filename, i, loc_field,
                                       f"Field '{loc_field}' is required and cannot be empty."))

            for color_field in ('link_group_color',):
                val = row.get(color_field, '')
                if val and not _validate_color(val):
                    errors.append(_err(filename, i, color_field,
                                       f"Color '{val}' is not a valid hex color. Use format #RRGGBB."))

            opacity = row.get('link_group_opacity', '')
            if opacity:
                try:
                    op_f = parse_float_loose(opacity)
                    if not (0.0 <= op_f <= 1.0):
                        errors.append(_err(filename, i, 'link_group_opacity',
                                           f"Opacity '{opacity}' is out of range (0.0 to 1.0)."))
                except ValueError:
                    errors.append(_err(filename, i, 'link_group_opacity',
                                       f"Opacity '{opacity}' is not a valid number."))

            curvature = row.get('curvature', '')
            if curvature:
                try:
                    cur_f = parse_float_loose(curvature)
                    if not (1.0 <= cur_f <= 4.0):
                        errors.append(_err(filename, i, 'curvature',
                                           f"Curvature '{curvature}' is out of range (1.0 to 4.0)."))
                except ValueError:
                    errors.append(_err(filename, i, 'curvature',
                                       f"Curvature '{curvature}' is not a valid number."))

            weight = row.get('weight', '')
            if weight:
                try:
                    parse_int_loose(weight)
                except ValueError:
                    errors.append(_err(filename, i, 'weight',
                                       f"Weight '{weight}' must be an integer."))

            for bool_field in ('dashed', 'straight_link', 'invert_link'):
                val = row.get(bool_field, '')
                if val and _parse_bool(val) is None:
                    errors.append(_err(filename, i, bool_field,
                                       f"Field '{bool_field}' must be 'True' or 'False', got '{val}'."))

            if name and name in seen_names:
                errors.append(_err(filename, i, 'name',
                                   f"Duplicate link name '{name}' (also on row {seen_names[name]})."))
            elif name:
                seen_names[name] = i

    except Exception as e:
        errors.append(_err(filename, '?', '?', f"Failed to read CSV: {e}"))

    fileobj.seek(0)
    return errors


def validate(detected_files):
    """
    Receives the dict returned by Detector.detect():
      {file_type -> (filename, fileobj)}
    Returns a list of error dicts. Empty list means all files are valid.
    """
    errors = []
    validators = {
        'locations': validate_locations,
        'tags': validate_tags,
        'links': validate_links,
    }
    for file_type, (filename, fileobj) in detected_files.items():
        validator = validators.get(file_type)
        if validator:
            errors.extend(validator(filename, fileobj))
    return errors
