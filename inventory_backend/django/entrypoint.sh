#!/bin/sh

fail_deploy() {
    if [ -n "$1" ]; then
        echo "Failing deployment: $1"
    else
        echo "Failing deployment"
    fi
    exit 1
}

python manage.py check_tenancy_mode || fail_deploy "Tenancy mode check failed"

if [ "${ENABLE_MULTITENANT}" = "true" ]; then
    python manage.py migrate_schemas --shared || fail_deploy "migrate_schemas failed"
    python manage.py setup_admin
else
    python manage.py migrate || fail_deploy "Migrate failed"

    if [ -z "${DJANGO_SUPERUSER_USERNAME}" ] || [ -z "${DJANGO_SUPERUSER_PASSWORD}" ] || [ -z "${DJANGO_SUPERUSER_EMAIL}" ]; then
        echo "Skipped superuser creation because required environment variables are missing"
    else
        echo "Create superuser"
        SUPERUSER_OUTPUT=$(python manage.py createsuperuser --no-input 2>&1)
        SUPERUSER_STATUS=$?
        echo "createsuperuser result: $SUPERUSER_STATUS - output: $SUPERUSER_OUTPUT"

        if [ $SUPERUSER_STATUS -ne 0 ]; then
            case "$SUPERUSER_OUTPUT" in
                *"already exists"*|*"already taken"*)
                    echo "Warning: superuser already exists, continuing"
                    ;;
                *)
                    fail_deploy "createsuperuser failed"
                    ;;
            esac
        fi
    fi
fi

exec python manage.py runserver 0.0.0.0:8000
