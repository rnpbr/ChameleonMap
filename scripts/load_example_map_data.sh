#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ROOT_DIR}/env/.env.dev"
SQL_FILE="${ROOT_DIR}/docs/examples/generated/example_map_data.sql"
CONTAINER_NAME="${DB_CONTAINER_NAME:-}"
BACKEND_CONTAINER_NAME="${BACKEND_CONTAINER_NAME:-}"
REMOTE_SQL="/tmp/example_map_data.sql"
REQUIRED_TABLES=(
  link
  tag_related_locations
  tag_relationship
  tag
  links_group
  location
  kml_shapes
  menu
  menugroup
  map_config
)

cd "${ROOT_DIR}"

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

resolve_container() {
  local preferred="$1"
  shift
  local candidate
  if [[ -n "${preferred}" ]]; then
    if docker ps --format '{{.Names}}' | grep -qx "${preferred}"; then
      printf '%s' "${preferred}"
      return 0
    fi
    echo "Configured container '${preferred}' is not running." >&2
    return 1
  fi
  for candidate in "$@"; do
    if docker ps --format '{{.Names}}' | grep -qx "${candidate}"; then
      printf '%s' "${candidate}"
      return 0
    fi
  done
  return 1
}

SCHEMA_FROM_ARGS=""
GENERATOR_ARGS=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --schema)
      if [[ $# -lt 2 ]]; then
        echo "Missing value for --schema" >&2
        exit 1
      fi
      SCHEMA_FROM_ARGS="$2"
      GENERATOR_ARGS+=(--schema "$2")
      shift 2
      ;;
    --schema=*)
      SCHEMA_FROM_ARGS="${1#*=}"
      GENERATOR_ARGS+=("$1")
      shift
      ;;
    *)
      GENERATOR_ARGS+=("$1")
      shift
      ;;
  esac
done

ENABLE_MULTITENANT="$(read_env_var ENABLE_MULTITENANT false | tr '[:upper:]' '[:lower:]')"
DB_USER="$(read_env_var POSTGRES_USER postgres)"
DB_NAME="$(read_env_var POSTGRES_DB postgres)"

if [[ -n "${SCHEMA_FROM_ARGS}" ]]; then
  SCHEMA="${SCHEMA_FROM_ARGS}"
elif [[ "${ENABLE_MULTITENANT}" == "true" ]]; then
  SCHEMA="example"
else
  # Single-tenant mode stores map tables in public.
  SCHEMA="public"
fi

if [[ -z "${SCHEMA_FROM_ARGS}" ]]; then
  GENERATOR_ARGS+=(--schema "${SCHEMA}")
fi

if ! CONTAINER_NAME="$(resolve_container "${CONTAINER_NAME}" chameleonmap-db-1 map-db-1)"; then
  echo "Postgres container is not running (tried chameleonmap-db-1, map-db-1)." >&2
  exit 1
fi

psql_query() {
  docker exec "${CONTAINER_NAME}" psql \
    -U "${DB_USER}" \
    -d "${DB_NAME}" \
    -v ON_ERROR_STOP=1 \
    -tAc "$1"
}

schema_exists() {
  local schema="$1"
  [[ "$(psql_query "SELECT 1 FROM information_schema.schemata WHERE schema_name = '${schema}'")" == "1" ]]
}

missing_tables() {
  local schema="$1"
  local table
  local missing=()
  for table in "${REQUIRED_TABLES[@]}"; do
    if [[ "$(psql_query \
      "SELECT 1 FROM information_schema.tables WHERE table_schema = '${schema}' AND table_name = '${table}'")" != "1" ]]; then
      missing+=("${table}")
    fi
  done
  if [[ ${#missing[@]} -gt 0 ]]; then
    printf '%s' "${missing[*]}"
    return 1
  fi
  return 0
}

ensure_tenant_schema() {
  local schema="$1"
  local backend_container

  if [[ "${ENABLE_MULTITENANT}" != "true" ]]; then
    return 1
  fi
  if [[ "${schema}" == "public" ]]; then
    return 1
  fi

  if ! backend_container="$(resolve_container "${BACKEND_CONTAINER_NAME}" chameleonmap-backend-1 map-backend-1)"; then
    echo "Backend container is not running; cannot auto-create tenant schema '${schema}'." >&2
    return 1
  fi

  echo "Schema '${schema}' is missing; creating tenant via Django..."
  docker exec -i "${backend_container}" python manage.py shell <<EOF
from django.conf import settings
from django.contrib.auth import get_user_model
from django_tenants.utils import get_tenant_model
from tenant_users.tenants.tasks import provision_tenant
import os

if not settings.ENABLE_MULTITENANT:
    raise SystemExit("ENABLE_MULTITENANT is false inside the backend container")

schema = "${schema}"
TenantModel = get_tenant_model()
if TenantModel.objects.filter(schema_name=schema).exists():
    print(f"Tenant '{schema}' already exists")
else:
    UserModel = get_user_model()
    owner = UserModel.objects.filter(is_active=True).order_by("id").first()
    if owner is None:
        email = os.environ.get("DJANGO_SUPERUSER_EMAIL") or f"{schema}@localhost"
        owner = UserModel.objects.create(
            email=email,
            is_active=True,
            name=schema,
        )
        password = os.environ.get("DJANGO_SUPERUSER_PASSWORD") or "admin"
        owner.set_password(password)
        owner.save()

    provision_tenant(
        f"{schema.title()} Tenant",
        schema,
        owner,
        is_staff=True,
        schema_name=schema,
        tenant_type="scoped",
    )
    print(f"Created tenant schema '{schema}'")
EOF
}

ensure_target_schema() {
  local schema="$1"
  local missing

  if ! schema_exists "${schema}"; then
    if ! ensure_tenant_schema "${schema}"; then
      if [[ "${ENABLE_MULTITENANT}" == "true" ]]; then
        echo "Schema '${schema}' does not exist and could not be created." >&2
        echo "Create the tenant in Django admin, or pass --schema for an existing tenant." >&2
      else
        echo "Schema '${schema}' does not exist." >&2
        echo "Multitenancy is disabled, so map tables live in 'public'." >&2
        echo "Re-run without --schema, or pass --schema public." >&2
      fi
      exit 1
    fi
  fi

  if ! missing="$(missing_tables "${schema}")"; then
    if [[ "${ENABLE_MULTITENANT}" == "true" && "${schema}" != "public" ]]; then
      echo "Schema '${schema}' exists but is missing tables: ${missing}" >&2
      echo "Run tenant migrations (migrate_schemas) for that schema, then retry." >&2
    else
      echo "Schema '${schema}' is missing required tables: ${missing}" >&2
      echo "Start the backend so migrations create map tables, then retry." >&2
    fi
    exit 1
  fi
}

python3 scripts/generate_example_map_data.py "${GENERATOR_ARGS[@]}"

ensure_target_schema "${SCHEMA}"

docker cp "${SQL_FILE}" "${CONTAINER_NAME}:${REMOTE_SQL}"
docker exec "${CONTAINER_NAME}" psql \
  -U "${DB_USER}" \
  -d "${DB_NAME}" \
  -v ON_ERROR_STOP=1 \
  -f "${REMOTE_SQL}"

echo "Loaded benchmark data from ${SQL_FILE} into schema ${SCHEMA}."
