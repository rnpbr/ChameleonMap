"""
Detects which uploaded CSV file corresponds to each entity type
(locations, tags, links) by filename heuristic first, then by
column-signature fallback.
"""

import csv
import io

LOCATIONS_SIGNATURE = {'latitude', 'longitude'}
TAGS_SIGNATURE = {'menu_name'}
LINKS_SIGNATURE = {'location_1', 'location_2'}

FILE_TYPE_LOCATIONS = 'locations'
FILE_TYPE_TAGS = 'tags'
FILE_TYPE_LINKS = 'links'


def _detect_by_filename(name):
    lower = name.lower()
    if 'location' in lower:
        return FILE_TYPE_LOCATIONS
    if 'tag' in lower:
        return FILE_TYPE_TAGS
    if 'link' in lower:
        return FILE_TYPE_LINKS
    return None


def _detect_by_columns(columns):
    col_set = {c.strip().lower() for c in columns}
    if LOCATIONS_SIGNATURE.issubset(col_set):
        return FILE_TYPE_LOCATIONS
    if TAGS_SIGNATURE.issubset(col_set):
        return FILE_TYPE_TAGS
    if LINKS_SIGNATURE.issubset(col_set):
        return FILE_TYPE_LINKS
    return None


def detect(named_files):
    """
    Receives a list of (filename, file_like_object) pairs.
    Returns a dict: {FILE_TYPE_* -> (filename, file_like_object)}
    and a list of errors for unrecognized files.

    Raises ValueError on duplicate type assignments.
    """
    result = {}
    errors = []

    for filename, fileobj in named_files:
        file_type = _detect_by_filename(filename)

        if file_type is None:
            # Read header row to detect by columns
            try:
                raw = fileobj.read()
                if isinstance(raw, bytes):
                    raw = raw.decode('utf-8-sig')
                first_line = raw.split('\n')[0]
                columns = next(csv.reader([first_line]))
                file_type = _detect_by_columns(columns)
                fileobj.seek(0)
            except Exception:
                fileobj.seek(0)

        if file_type is None:
            errors.append(
                f"Could not determine the type of '{filename}'. "
                "Expected a file with columns for locations (latitude, longitude), "
                "tags (menu_name), or links (location_1, location_2). "
                "You can also name the file with 'location', 'tag', or 'link' in the filename."
            )
            continue

        if file_type in result:
            errors.append(
                f"Duplicate file type '{file_type}': both '{result[file_type][0]}' and "
                f"'{filename}' appear to be {file_type} files. Please upload only one file per type."
            )
            continue

        result[file_type] = (filename, fileobj)

    return result, errors
