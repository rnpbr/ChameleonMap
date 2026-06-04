#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ROOT_DIR}/env/.env.dev"
SQL_FILE="${ROOT_DIR}/docs/examples/generated/example_map_data.sql"
CONTAINER_NAME="${DB_CONTAINER_NAME:-}"
if [[ -z "${CONTAINER_NAME}" ]]; then
  if docker ps --format '{{.Names}}' | grep -qx 'chameleonmap-db-1'; then
    CONTAINER_NAME='chameleonmap-db-1'
  else
    CONTAINER_NAME='map-db-1'
  fi
fi
REMOTE_SQL="/tmp/example_map_data.sql"

cd "${ROOT_DIR}"

python3 scripts/generate_example_map_data.py "$@"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing env file: ${ENV_FILE}" >&2
  exit 1
fi

read_env_var() {
  local key="$1"
  local default_value="$2"
  local value
  value="$(grep -E "^${key}=" "${ENV_FILE}" | tail -n 1 | cut -d= -f2- | tr -d "'\" ")"
  if [[ -n "${value}" ]]; then
    printf '%s' "${value}"
  else
    printf '%s' "${default_value}"
  fi
}

DB_USER="$(read_env_var POSTGRES_USER postgres)"
DB_NAME="$(read_env_var POSTGRES_DB postgres)"

if ! docker ps --format '{{.Names}}' | grep -qx "${CONTAINER_NAME}"; then
  echo "Postgres container '${CONTAINER_NAME}' is not running." >&2
  exit 1
fi

docker cp "${SQL_FILE}" "${CONTAINER_NAME}:${REMOTE_SQL}"
docker exec "${CONTAINER_NAME}" psql \
  -U "${DB_USER}" \
  -d "${DB_NAME}" \
  -v ON_ERROR_STOP=1 \
  -f "${REMOTE_SQL}"

echo "Loaded benchmark data from ${SQL_FILE} into schema example."
