# Map Load Baseline — 2026-06-04

Phase 1 benchmark results captured from the browser console (`[MapLoad]` profiler) after loading the doubled `example` schema dataset.

See also the 20k pre-refactor run: [`map-load-baseline-20k-2026-06-04.md`](map-load-baseline-20k-2026-06-04.md).

## Dataset

| Entity | Count |
|--------|------:|
| Menu groups | 6 |
| Menus | 48 |
| Locations | 10,000 |
| Tags | 1,200 |
| Tag–location associations | 2,411 |
| Tag relationships | 586 |
| Links groups | 48 |
| Links | 1,600 |

Generated via `scripts/generate_example_map_data.py` (defaults doubled) and loaded with `scripts/load_example_map_data.sh`.

**Map config flags:** `link_feature=true`, `inherit_children_tag_locations=true`

## Interactive load summary

Time to markers + links on map (sync pipeline complete).

| Step | ms |
|------|---:|
| `map.load.forkJoin` | 894 |
| `map.load.initializeMapOptions` | 6 |
| `map.load.initLocations` | 0 |
| `map.load.insertTagRelations` | 4 |
| `map.load.insertMarkersByMenu` | 61 |
| `map.load.markerPreConfigure` | 126 |
| `map.load.insertLinks` | 23 |
| `map.load.initializeMap` | 160 |
| **`map.load.interactive.total`** | **1054** |

## Full load summary

Includes async KML loading (no KML shapes in this dataset).

| Step | ms |
|------|---:|
| `map.load.forkJoin` | 894 |
| `map.load.initializeMapOptions` | 6 |
| `map.load.initLocations` | 0 |
| `map.load.insertTagRelations` | 4 |
| `map.load.insertMarkersByMenu` | 61 |
| `map.load.markerPreConfigure` | 126 |
| `map.load.insertLinks` | 23 |
| `map.load.initializeMap` | 160 |
| `map.load.interactive.total` | 1054 |
| `map.load.kml` | 0 |
| **`map.load.full.total`** | **1054** |

## Observations

- **Network dominates:** `forkJoin` (9 parallel API calls) accounts for ~85% of total load time (894 / 1054 ms).
- **Frontend processing is modest:** the entire sync pipeline (`initializeMap`) takes 160 ms; the heaviest frontend step is `markerPreConfigure` at 126 ms (includes popup HTML building and first marker insertion).
- **Tag relationships:** `insertTagRelations` is 4 ms at this scale (still O(relationships × tags) — a Phase 2 indexing target).
- **KML:** 0 ms — no KML shapes in the benchmark dataset.

Use this file as the pre-refactor baseline when comparing Phase 2+ improvements.
