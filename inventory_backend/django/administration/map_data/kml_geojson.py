import json

try:
    import kml2geojson as kml_converter
except ImportError:  # pragma: no cover - exercised when dependency missing
    kml_converter = None


def convert_kml_file_to_geojson(kml_file):
    if not kml_file:
        return None

    if kml_converter is None:
        return None

    try:
        if hasattr(kml_file, 'path'):
            converted = kml_converter.convert(kml_file.path)
        else:
            converted = kml_converter.convert(kml_file)
    except Exception:
        return None

    if not converted:
        return None

    if len(converted) == 1:
        return converted[0]

    return {
        'type': 'FeatureCollection',
        'features': [
            feature
            for collection in converted
            for feature in collection.get('features', [])
        ],
    }


def serialize_geojson(geojson):
    if geojson is None:
        return None
    return json.loads(json.dumps(geojson))
