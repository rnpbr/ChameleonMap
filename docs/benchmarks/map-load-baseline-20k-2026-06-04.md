# Map Load Baseline (20k) — 2026-06-04

Pre-refactor benchmark (9× `forkJoin` API calls) captured from the browser console (`[MapLoad]` profiler) on the 20k `example` schema dataset.

Compare with the 10k pre-refactor run in [`map-load-baseline-2026-06-04.md`](map-load-baseline-2026-06-04.md) and the post-refactor 20k run in [`map-load-after-map-data-20k-2026-06-04.md`](map-load-after-map-data-20k-2026-06-04.md).

## Dataset

| Entity | Count |
|--------|------:|
| Menu groups | 6 |
| Menus | 48 |
| Locations | 20,000 |
| Tags | 2,400 |
| Tag–location associations | 4,797 |
| Tag relationships | 1,189 |
| Links groups | 48 |
| Links | 3,200 |

Generated via `scripts/generate_example_map_data.py` (defaults: `--locations 20000 --tags 2400 --links 3200`) and loaded with `scripts/load_example_map_data.sh` into the `example` schema.

**Map config flags:** `link_feature=true`, `inherit_children_tag_locations=true`

## Interactive load summary

Time to markers + links on map (sync pipeline complete).

| Step | ms |
|------|---:|
| `map.load.forkJoin` | 1524 |
| `map.load.initializeMapOptions` | 72 |
| `map.load.initLocations` | 1 |
| `map.load.insertTagRelations` | 33 |
| `map.load.insertMarkersByMenu` | 359 |
| `map.load.markerPreConfigure` | 897 |
| `map.load.insertLinks` | 282 |
| `map.load.initializeMap` | 1286 |
| **`map.load.interactive.total`** | **2810** |

## Full load summary

Includes async KML loading (no KML shapes in this dataset).

| Step | ms |
|------|---:|
| `map.load.forkJoin` | 1524 |
| `map.load.initializeMapOptions` | 72 |
| `map.load.initLocations` | 1 |
| `map.load.insertTagRelations` | 33 |
| `map.load.insertMarkersByMenu` | 359 |
| `map.load.markerPreConfigure` | 897 |
| `map.load.insertLinks` | 282 |
| `map.load.initializeMap` | 1286 |
| `map.load.interactive.total` | 2810 |
| `map.load.kml` | 1 |
| **`map.load.full.total`** | **2811** |

## Scale comparison (10k → 20k, pre-refactor)

| Step | 10k baseline (ms) | 20k baseline (ms) | Ratio |
|------|------------------:|------------------:|------:|
| `map.load.forkJoin` | 894 | 1524 | 1.7× |
| `map.load.insertTagRelations` | 4 | 33 | 8.3× |
| `map.load.insertMarkersByMenu` | 61 | 359 | 5.9× |
| `map.load.markerPreConfigure` | 126 | 897 | 7.1× |
| `map.load.insertLinks` | 23 | 282 | 12.3× |
| `map.load.initializeMap` | 160 | 1286 | 8.0× |
| **`map.load.interactive.total`** | **1054** | **2810** | **2.7×** |

## Observations

- **Network still dominates, but less sharply:** `forkJoin` is 1524 ms (~54% of interactive total) vs ~85% at 10k. Frontend sync work grows faster with scale.
- **Frontend sync is now the majority of non-network time:** `initializeMap` is 1286 ms; `markerPreConfigure` alone is 897 ms (popup HTML + marker setup at 20k scale).
- **Tag relationships:** `insertTagRelations` rises to 33 ms (vs 4 ms at 10k) — still small vs marker/link steps but worth indexing in later phases.
- **KML:** 1 ms — negligible; no KML shapes in the benchmark dataset.

Use this file as the pre-refactor 20k baseline when comparing the `map-data` endpoint and later optimizations.
