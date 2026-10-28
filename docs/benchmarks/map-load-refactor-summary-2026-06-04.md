# Map Load Refactor — Comparison Summary (2026-06-04)

Executive summary of the **pre-refactor** (`forkJoin`, 9 API calls) vs **post-refactor** (`GET /map-data/`, `MapDataService`) benchmarks on the `example` tenant.

For narrative context (issues, architecture, what moved where), see [`map-load-refactor-context.md`](map-load-refactor-context.md).

## Source benchmarks

| Scale | Before | After |
|------:|--------|-------|
| 10k | [`map-load-baseline-2026-06-04.md`](map-load-baseline-2026-06-04.md) | [`map-load-after-map-data-2026-06-04.md`](map-load-after-map-data-2026-06-04.md) |
| 20k | [`map-load-baseline-20k-2026-06-04.md`](map-load-baseline-20k-2026-06-04.md) | [`map-load-after-map-data-20k-2026-06-04.md`](map-load-after-map-data-20k-2026-06-04.md) |

All runs use `link_feature=true` and `inherit_children_tag_locations=true` on the same generator/load scripts; timings come from the browser `[MapLoad]` profiler unless noted.

---

## Headline: interactive load time reduction

| Dataset | Before (`interactive.total`) | After | Absolute savings | **Estimated reduction** |
|--------:|-----------------------------:|------:|-----------------:|------------------------:|
| 10k | 1054 ms | 412 ms | 642 ms | **~61%** |
| 20k | 2810 ms | 1121 ms | 1689 ms | **~60%** |

**Full load** (including KML step; no shapes in these datasets): same percentages at 10k (1054 → 412 ms); at 20k, 2811 → 1121 ms (**~60%**).

The refactor delivers a **consistent ~60% faster time-to-interactive map** at both benchmark scales, not just at 10k.

---

## Where the time went

### Data fetch (largest win)

| Dataset | Before (`forkJoin`) | After (`mapData`) | Savings | **Reduction** |
|--------:|--------------------:|------------------:|--------:|--------------:|
| 10k | 894 ms | 160 ms | 734 ms | **~82%** |
| 20k | 1524 ms | 394 ms | 1130 ms | **~74%** |

After refactor, data fetch is no longer the majority of load time at either scale:

| Dataset | Data fetch share of interactive total |
|--------:|--------------------------------------:|
| Before 10k | ~85% (894 / 1054) |
| After 10k | ~39% (160 / 412) |
| Before 20k | ~54% (1524 / 2810) |
| After 20k | ~35% (394 / 1121) |

**Bottleneck shift:** remaining cost is mostly **frontend DOM work** (`insertMarkersByMenu`, `markerPreConfigure`, `insertLinks`), especially at 20k.

### Frontend sync pipeline (`initializeMap`)

| Dataset | Before | After | Change |
|--------:|-------:|------:|-------:|
| 10k | 160 ms | 252 ms | +92 ms (+58%) |
| 20k | 1286 ms | 727 ms | −559 ms (**~43%** faster) |

At **10k**, sync steps ticked up slightly (likely boundary/measurement differences and more work in `initializeMapOptions` / marker insertion), but this is **far smaller than network savings**. At **20k**, the client still saves hundreds of milliseconds because server-side precomputation removed heavy paths (`insertTagRelations`, popup HTML assembly in `markerPreConfigure`).

| Step | 10k before → after | 20k before → after |
|------|-------------------|-------------------|
| `insertTagRelations` | 4 ms → *(removed)* | 33 ms → *(removed)* |
| `markerPreConfigure` | 126 → 110 ms | 897 → 376 ms |

---

## Cold vs warm backend (estimated)

Measured browser `mapData` times likely include a **warm** Django LocMem cache (~57 ms HTTP at 10k per server timing). Useful planning numbers:

| Scenario | 10k (approx.) | Notes |
|----------|-------------:|-------|
| Measured interactive (warm) | **412 ms** | Profiler on `example.localhost` |
| If `mapData` were cold (~666 ms HTTP + parse) | **~900–950 ms** | Still **~10–15% faster** than 1054 ms baseline |
| Backend build alone (in-process) | 541 ms cold / 0.06 ms cached | From after benchmark doc |

**Estimate:** with a **cold** `/map-data/` response, expect **~15–20%** interactive improvement at 10k vs baseline; with **cache warm**, **~60%** as measured. At 20k, cold `mapData` might land near **700–800 ms**, yielding **~70–75%** improvement vs 2810 ms baseline (still dominated by ~700+ ms of marker/link work).

---

## Scale behavior (2× locations)

Doubling locations (10k → 20k) on the **same stack**:

| Stack | 10k → 20k interactive total |
|-------|----------------------------:|
| Before refactor | 1054 → 2810 ms (**2.7×**) |
| After refactor | 412 → 1121 ms (**2.7×**) |

The refactor **does not change scaling exponent** for total load (~2.7× for 2× data in these tests) but **lowers the floor** by ~60% at each scale. Further gains require optimizing marker/link insertion (Phase 2+), not more API consolidation.

---

## Other benefits of the refactor

Beyond the **~60% interactive load reduction** (warm cache), the architecture change adds:

### Reliability and consistency

- **Single snapshot:** one response represents menus, tags, links, popups, and KML-derived GeoJSON at one point in time; no races between 9 parallel responses.
- **Fewer failure modes:** one HTTP status / retry instead of partial failure across `forkJoin` calls.

### Network and operations

- **9 requests → 1:** less connection overhead, TLS handshakes, and nginx/Django request handling per page load.
- **~82% / ~74% less client-reported fetch time** at 10k / 20k (warm); fewer concurrent DB hits on initial load.
- **Cache-friendly:** `map_data:v1:{schema}` with invalidation on map entity writes; warm hits ~**57 ms** HTTP at 10k (vs 894 ms `forkJoin`).

### Client complexity and CPU

- **Removed client paths:** `insertTagRelations` and tag-graph resolution on load; popup HTML largely pre-built server-side (`PopupContentService` assembles from DTOs).
- **Thinner load orchestration:** `MapDataService` replaces nine service calls and merge logic in `MapComponent`.
- **Predictable profiler:** one `map.load.mapData` step instead of `forkJoin` aggregation.

### Backend and future work

- **Centralized precomputation** in `map_data/builder.py` — easier to profile, optimize queries, and add **Redis** later without touching the Angular load path again.
- **KML → GeoJSON on server** (`kml2geojson`); client can consume inline layers when present.
- **Tests:** Django `test_map_data` + frontend `test:map-behavior` guard regressions.

### What this refactor does *not* solve

- **DOM-bound work at scale:** at 20k after refactor, ~65% of interactive time is still `initializeMap` (markers + links). Expect diminishing returns from API work alone.
- **Per-worker cache:** LocMem is not shared across Gunicorn/uwsgi workers; production should plan **Redis** for cross-process warm hits.
- **Cold first load:** first visitor after cache invalidation still pays full backend build (~541 ms measured in-process at 10k).

---

## Recommended next steps (by ROI)

1. **Production cache (Redis)** — realize warm-path gains (~57 ms API) for all workers and after deploys.
2. **Marker/link insertion** — largest remaining sync cost at 20k (375 + 376 + 248 ms).
3. **Tag relationship indexing** — small today at 10k but grew 4 → 33 ms pre-refactor at 20k; already server-side but worth keeping fast on rebuild.
4. **Re-benchmark with KML shapes** — current suite has ~0–1 ms KML; validate inline GeoJSON path under real layers.

---

## One-line takeaway

**Replacing nine parallel API calls with a single precomputed `/map-data/` bundle cuts interactive map load by about 60% at 10k and 20k (warm cache), with data-fetch time down ~74–82%; the main remaining cost is rendering markers and links on the client, which becomes the focus for the next optimization phase.**
