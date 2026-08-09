# Map load refactor — context summary

Condensed narrative of the **map-data bundle** work (June 2026). Use this for onboarding or planning follow-up work. Numbers and tables live in [`map-load-refactor-summary-2026-06-04.md`](map-load-refactor-summary-2026-06-04.md) and the per-run benchmark files.

---

## Issues identified (pre-refactor)

1. **Too many HTTP round trips** — Initial load used Angular `forkJoin` over **nine parallel API calls** (menus, locations, tags, links, settings, KML, etc.). At 10k locations this alone was **~894 ms** (~85% of interactive load); at 20k, **~1524 ms** (~54%).
2. **Repeated backend work per request** — Each endpoint serialized and queried independently; no shared snapshot, no response cache.
3. **Heavy client-side graph work on the critical path** — Tag parent/child graph assembly, **`insertTagRelations`**, and **inherited location resolution** (`map-behavior`) ran in the browser during load (up to **33 ms** at 20k, with worse scaling potential).
4. **Popup HTML built during marker setup** — `markerPreConfigure` merged tag descriptions and overlay buttons into location popups on the client (**126 ms** at 10k, **897 ms** at 20k).
5. **KML fetched and converted client-side** — Extra async path and parsing when shapes exist (negligible in current benchmarks; untested at scale).
6. **Inconsistent data snapshot** — Nine responses could reflect slightly different DB states; harder to reason about failures and retries.

Profiler labels: `[MapLoad]` in `map-load-profiler.ts`; baseline captures in `map-load-baseline-*.md`.

---

## What changed

### Backend

| Piece | Role |
|-------|------|
| `administration/map_data/builder.py` | Builds one JSON bundle per tenant schema |
| `administration/map_data/cache.py` | `cache.get_or_set` key `map_data:v1:{schema}` |
| `administration/map_data/signals.py` | Invalidates cache on map model save/delete |
| `GET /map-data/` | Single tenant-scoped endpoint (nginx + `clients/urls.py`) |
| `kml2geojson` | KML files converted to GeoJSON in the bundle |

### Frontend

| Piece | Role |
|-------|------|
| `MapDataService` | One `getMapData()` call; hydrates indexes and UI flags |
| `PopupContentService` | Assembles popup HTML from **structured DTOs** (not raw DB strings) |
| `map.component.ts` | Load path uses `mapData` instead of `forkJoin`; thinner orchestration |
| `map-data.d.ts` | Types for the bundle |

**9 requests → 1.** Client merge logic for disparate API responses removed from the hot path.

---

## Logic transferred to the server

These used to run (fully or partly) in the browser during load; they now run in **`build_map_data()`** before the response is sent:

| Logic | Module | Notes |
|-------|--------|--------|
| Tag relationship graph | `builder._build_tag_graph` | `child_tags` / `parent_tags` on each tag |
| Inherited tag locations | `inheritance.py` | Port of `map-behavior`; gated by `inherit_children_tag_locations` |
| Location popup structure | `popups.py` | Sections per location (title, description, tag blocks, overlay flags) |
| KML → GeoJSON | `kml_geojson.py` | Inline `geojson` per layer in bundle |
| Entity serialization | `builder.py` | Menus, locations, tags, links, links groups, settings |

The API returns a **versioned snapshot** (`MAP_DATA_VERSION`) including `location_popups` keyed by location id.

### Still on the client (by design)

| Logic | Where | Why |
|-------|--------|-----|
| Popup HTML string assembly | `PopupContentService` | Preserves overlay button markup and DOM-specific layout; server sends DTOs only |
| Leaflet map init, layers, controls | `MapComponent` | Rendering and interaction stay in Angular |
| Marker insertion per menu | `insertMarkersByMenu` | DOM: create markers, bind popups, colors |
| Link polylines | `insertLinks` | DOM: curved/dashed lines between locations |
| Filter menu / visibility / clustering | `MapComponent` + filter menu | Runtime UX, not load-time bundle |
| Index maps (`locationsById`, etc.) | `MapDataService.hydrate` | Fast lookups for interactions |

**Removed from load:** `insertTagRelations` (client no longer walks the graph on startup).

---

## Measured gains

Warm backend cache (LocMem), `example` tenant, `link_feature` + `inherit_children_tag_locations` enabled:

| Metric | 10k | 20k |
|--------|----:|----:|
| **Interactive total** | 1054 → 412 ms (**~61%**) | 2810 → 1121 ms (**~60%**) |
| **Data fetch** | 894 → 160 ms (**~82%**) | 1524 → 394 ms (**~74%**) |
| **`markerPreConfigure`** | 126 → 110 ms | 897 → 376 ms |
| **`initializeMap` (sync)** | 160 → 252 ms* | 1286 → 727 ms (**~43%**) |

\*At 10k, sync sub-steps rose slightly; network savings dominate.

**Cold cache (estimated):** first load after invalidation still pays ~**541 ms** backend build (10k, in-process); browser `mapData` may be **~650–800 ms** at scale — roughly **15–20%** faster than baseline at 10k vs **~60%** warm. Production should use **Redis** so all workers share warm responses (~**57 ms** HTTP observed at 10k).

### Non-timing benefits

- Single consistent snapshot per load
- One failure/retry surface
- Fewer DB round trips and nginx requests per page view
- Central place to optimize queries and add cache tiers
- Tests: `administration.tests.test_map_data`, `npm run test:map-behavior`

---

## What the frontend still processes on load

After `MapDataService.load()` returns, **`MapComponent`** runs two phases:

### Interactive (static paint) — ends `map.load.interactive.end`

1. **`initializeMapOptions`** — Map settings, default menu, layer setup
2. **`initLocations`** — Location state on the store (minimal)
3. **`markerPreConfigure`** → **`insertMarkersByMenu`** — Marker **shells** only (icon + cluster; no popup/tooltip/hover)
4. **`insertLinks`** — Link **geometry** only (polylines/curves; no tooltips)
5. **`kml`** — GeoJSON layers on map (geometry; tooltips deferred)
6. User sees pins, links, and shapes; popups/tooltips/hover attach in the background (no UI block — interactions simply do nothing until enrich finishes)

`MapDataService.hydrate` stores `popupDto` per location (HTML built lazily). Profiler label unchanged for link step: `map.load.insertLinks` (geometries only).

### Full load (interactions) — ends `map.load.full.end`

7. **`map.load.enrichInteractions`** — Batched idle work: `bindPopup`, tooltips, hover, link tooltips, KML tooltips, cluster tooltips
8. Optional sub-step: `map.load.attachClusterInteractions`

**Compare benchmarks using `interactive.total` for time-to-visible-map and `full.total` for complete UX.**

**Share of time after map-data refactor (20k, before this phase):** ~**35%** fetch (`mapData`), ~**65%** `initializeMap` (mostly markers + links). After deferral, expect a lower `interactive.total` and a new gap to `full.total`.

---

## Current bottlenecks

| Bottleneck | Scale | Notes |
|------------|-------|--------|
| **Marker insertion** | 20k: **375 ms** `insertMarkersByMenu` | Scales faster than location count (~3.4× from 10k→20k after refactor) |
| **Marker pre-configure** | 20k: **376 ms** `markerPreConfigure` | Popup bind + first-pass marker setup |
| **Link insertion** | 20k: **248 ms** `insertLinks` | Grows ~3.8× 10k→20k |
| **Cold `/map-data/` build** | 10k: **~541 ms** server | LocMem per worker; no cross-process warmth |
| **KML path** | Not stressed in benchmarks | Validate when real shapes exist |

Network is **no longer the primary bottleneck** at either scale after warm cache. Next ROI is **DOM/rendering** and **shared production cache**, not more API splitting.

---

## Scaling note

Doubling dataset size (10k → 20k) still yields **~2.7×** interactive time on both stacks; the refactor **lowers the baseline** (~60%) but does not change super-linear marker/link cost. Further phases should target batching, virtualization, or deferred layer insertion.

---

## Recommended follow-ups

1. **Redis (or shared cache)** for `map_data:v1:{schema}` across workers
2. **Marker/link pipeline** — largest remaining sync cost
3. **Benchmark with real KML** layers
4. Keep **tag graph + inheritance** optimized in `builder.py` on cache miss

---

## Key paths

```
inventory_backend/django/administration/map_data/
  builder.py, cache.py, inheritance.py, popups.py, kml_geojson.py, signals.py, views.py

map-frontend/src/app/map/
  map-data.service.ts, popup-content.service.ts, map.component.ts, map-behavior.ts,
  map-interaction-scheduler.ts

docs/benchmarks/
  map-load-baseline-*.md, map-load-after-map-data-*.md, map-load-refactor-summary-2026-06-04.md
```

---

## One-line summary

**Profiling showed load was dominated by nine API calls and client-side tag/popup work; consolidating into `GET /map-data/` with server-side precomputation cut interactive load ~60% (warm), moved the bottleneck to Leaflet marker/link rendering, and left the map UI responsible for display and interaction only.**
