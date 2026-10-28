# Map Load After map-data Endpoint (20k) — 2026-06-04

Scale test after implementing `GET /map-data/` and frontend `MapDataService`, with the generator defaults doubled again to 20k locations.

Compare with the 10k run in [`map-load-after-map-data-2026-06-04.md`](map-load-after-map-data-2026-06-04.md), the 10k pre-refactor baseline in [`map-load-baseline-2026-06-04.md`](map-load-baseline-2026-06-04.md), and the 20k pre-refactor baseline in [`map-load-baseline-20k-2026-06-04.md`](map-load-baseline-20k-2026-06-04.md).

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

## Frontend load summary (browser `[MapLoad]` profiler)

Captured on `example.localhost` after deploy. Interactive and full totals are identical (no KML shapes in dataset).

### Interactive load

| Step | ms |
|------|---:|
| `map.load.mapData` | 394 |
| `map.load.initializeMapOptions` | 102 |
| `map.load.initLocations` | 1 |
| `map.load.insertMarkersByMenu` | 375 |
| `map.load.markerPreConfigure` | 376 |
| `map.load.insertLinks` | 248 |
| `map.load.initializeMap` | 727 |
| **`map.load.interactive.total`** | **1121** |

### Full load

| Step | ms |
|------|---:|
| `map.load.mapData` | 394 |
| `map.load.initializeMapOptions` | 102 |
| `map.load.initLocations` | 1 |
| `map.load.insertMarkersByMenu` | 375 |
| `map.load.markerPreConfigure` | 376 |
| `map.load.insertLinks` | 248 |
| `map.load.initializeMap` | 727 |
| `map.load.interactive.total` | 1121 |
| `map.load.kml` | 0 |
| **`map.load.full.total`** | **1121** |

## Refactor comparison (20k, baseline → after map-data)

| Step | Pre-refactor (ms) | After (ms) | Δ |
|------|------------------:|-----------:|--:|
| Data fetch | `map.load.forkJoin` 1524 | `map.load.mapData` 394 | −1130 |
| `map.load.initializeMap` | 1286 | 727 | −559 |
| **`map.load.interactive.total`** | **2810** | **1121** | **−1689 (−60%)** |

## Scale comparison (10k → 20k, same refactored stack)

| Step | 10k after (ms) | 20k (ms) | Ratio |
|------|---------------:|---------:|------:|
| `map.load.mapData` | 160 | 394 | 2.5× |
| `map.load.initializeMapOptions` | 76 | 102 | 1.3× |
| `map.load.insertMarkersByMenu` | 109 | 375 | 3.4× |
| `map.load.markerPreConfigure` | 110 | 376 | 3.4× |
| `map.load.insertLinks` | 66 | 248 | 3.8× |
| `map.load.initializeMap` | 252 | 727 | 2.9× |
| **`map.load.interactive.total`** | **412** | **1121** | **2.7×** |

## Observations

- **Total load ~2.7× at 2× locations:** 412 ms (10k) → 1121 ms (20k). Sub-linear on data fetch, super-linear on marker/link insertion.
- **Data fetch scales modestly:** `mapData` 160 → 394 ms (~2.5×). Likely warm backend cache on both runs; cold `/map-data/` will be higher.
- **DOM work dominates at scale:** `insertMarkersByMenu` (375 ms) and `markerPreConfigure` (376 ms) are the largest sync steps, followed by `insertLinks` (248 ms). These scale faster than location count and are the main targets for further optimization.
- **KML:** 0 ms — no KML shapes in the benchmark dataset.
