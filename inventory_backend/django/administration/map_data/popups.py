"""Structured popup sections keyed by location id."""


def _has_overlay_content(value):
    return bool(value and str(value).strip())


def build_location_popups(locations, tags):
    location_popups = {}

    for location in locations:
        if not location['active']:
            continue

        location_popups[str(location['id'])] = {
            'location_id': location['id'],
            'title': location['name'],
            'description_html': location.get('description') or '',
            'has_overlay': _has_overlay_content(location.get('overlayed_popup_content')),
            'tags': [],
        }

    for tag in tags:
        if not tag['active'] or not tag.get('description'):
            continue

        tag_section = {
            'tag_id': tag['id'],
            'name': tag['name'],
            'description_html': tag['description'] or '',
            'has_overlay': _has_overlay_content(tag.get('overlayed_popup_content')),
        }

        for location_id in tag['related_locations']:
            popup = location_popups.get(str(location_id))
            if popup is not None:
                popup['tags'].append(tag_section)

    return location_popups
