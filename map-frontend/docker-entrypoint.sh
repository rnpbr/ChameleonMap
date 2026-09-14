#!/bin/sh
set -eu

KEY=${MAP_TILE_KEY:-}
ESCAPED=$(printf '%s' "$KEY" | sed "s/\\\\/\\\\\\\\/g; s/'/\\\\'/g")

mkdir -p /usr/local/apache2/htdocs/assets
cat > /usr/local/apache2/htdocs/assets/env.js <<EOF
window.__env = { mapTileKey: '${ESCAPED}' };
EOF

exec httpd-foreground
