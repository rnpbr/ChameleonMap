/**
 * Writes src/assets/env.js from MAP_TILE_KEY (used by ng serve / local builds).
 * Production containers overwrite the served env.js at startup from env_file.
 */
const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, 'src/assets/env.js');
const key = process.env.MAP_TILE_KEY || '';
const escaped = String(key).replace(/\\/g, '\\\\').replace(/'/g, "\\'");

fs.writeFileSync(target, `window.__env = { mapTileKey: '${escaped}' };\n`);
console.log(
  key
    ? 'Wrote src/assets/env.js from MAP_TILE_KEY'
    : 'Wrote src/assets/env.js with empty mapTileKey'
);
