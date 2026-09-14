interface EnvConfig {
  mapTileKey?: string;
}

interface Window {
  __env?: EnvConfig;
}
