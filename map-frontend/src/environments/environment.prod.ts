export const environment = {
  production: true,
  /** Filled at runtime from assets/env.js (MAP_TILE_KEY via env_file). */
  get mapTileKey(): string {
    return window.__env?.mapTileKey ?? '';
  }
};
