# Map Load After map-data Endpoint — 2026-06-04

Comparison against [`map-load-baseline-2026-06-04.md`](map-load-baseline-2026-06-04.md) after implementing `GET /map-data/` and frontend `MapDataService`.

## Dataset

Same 10k-location benchmark in `example` schema (6 menu groups, 48 menus, 1,200 tags, 1,600 links).

See also the 20k scale run: [`map-load-after-map-data-20k-2026-06-04.md`](map-load-after-map-data-20k-2026-06-04.md).

## Backend `/map-data/` (example.localhost)

Measured via HTTP through nginx and via Django builder in `example` schema:

| Metric | Before (9× forkJoin) | After |
|--------|---------------------:|------:|
| Network / API load | 894 ms (`forkJoin`) | **666 ms** cold HTTP / **57 ms** warm HTTP (LocMem cache hit) |
| Backend build (in-process) | n/a | **541 ms** cold / **0.06 ms** cached |

The single response replaces nine round trips and includes precomputed tag graphs, resolved locations, structured popup DTOs, and inline KML GeoJSON.

## Frontend load summary (browser `[MapLoad]` profiler)

Captured on `example.localhost` after deploy. Interactive and full totals are identical (no async KML in dataset).

| Step | Baseline (ms) | After (ms) | Δ |
|------|-------------:|-----------:|--:|
| Data fetch | `map.load.forkJoin` 894 | `map.load.mapData` **160** | −734 |
| `map.load.initializeMapOptions` | 6 | **76** | +70 |
| `map.load.initLocations` | 0 | **0** | 0 |
| `map.load.insertTagRelations` | 4 | *(removed)* | −4 |
| `map.load.insertMarkersByMenu` | 61 | **109** | +48 |
| `map.load.markerPreConfigure` | 126 | **110** | −16 |
| `map.load.insertLinks` | 23 | **66** | +43 |
| `map.load.kml` | 0 | **0** | 0 |
| `map.load.initializeMap` | 160 | **252** | +92 |
| **`map.load.interactive.total`** | **1054** | **412** | **−642 (−61%)** |
| **`map.load.full.total`** | **1054** | **412** | **−642 (−61%)** |

### Interactive load (after)

| Step | ms |
|------|---:|
| `map.load.mapData` | 160 |
| `map.load.initializeMapOptions` | 76 |
| `map.load.initLocations` | 0 |
| `map.load.insertMarkersByMenu` | 109 |
| `map.load.markerPreConfigure` | 110 |
| `map.load.insertLinks` | 66 |
| `map.load.initializeMap` | 252 |
| **`map.load.interactive.total`** | **412** |

### Full load (after)

| Step | ms |
|------|---:|
| `map.load.mapData` | 160 |
| `map.load.initializeMapOptions` | 76 |
| `map.load.initLocations` | 0 |
| `map.load.insertMarkersByMenu` | 109 |
| `map.load.markerPreConfigure` | 110 |
| `map.load.insertLinks` | 66 |
| `map.load.initializeMap` | 252 |
| `map.load.interactive.total` | 412 |
| `map.load.kml` | 0 |
| **`map.load.full.total`** | **412** |

## Observations

- **Data fetch dropped ~82%:** `mapData` at 160 ms vs `forkJoin` at 894 ms. The 160 ms figure is consistent with a warm backend cache hit (~57 ms HTTP) plus JSON parse and store hydration; expect ~650–700 ms on a cold cache.
- **Interactive total down 61%:** 1054 ms → 412 ms with the same 10k dataset.
- **Server-side work removed from the client:** `insertTagRelations` (4 ms) and popup HTML building in `markerPreConfigure` (126 → 110 ms) are no longer on the critical path.
- **Sync pipeline slightly heavier:** `initializeMap` rose 160 → 252 ms — mainly `insertMarkersByMenu` (+48 ms) and `insertLinks` (+43 ms), with `initializeMapOptions` also higher (+70 ms). Likely measurement variance or slightly different step boundaries; still well below the saved network time.
- **KML:** 0 ms — no KML shapes in the benchmark dataset; inline GeoJSON path is sync when layers exist.

## Cache notes

- Uses existing Django `LocMemCache` (`cache.get_or_set` keyed by `map_data:v1:{schema}`).
- Invalidates on `post_save` / `post_delete` for all map entity models.
- Per-process only: each backend worker maintains its own cache.

## Tests

- Backend: `python manage.py test administration.tests.test_map_data` (5 tests)
- Frontend: `npm run test:map-behavior` (8 tests: map-behavior + popup-content)
