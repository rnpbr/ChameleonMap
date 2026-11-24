#!/bin/sh

## Function to be called if any step of the deployment fails.
fail_deploy() {
    if [ -n "$1" ]; then
        echo "Failing deployment: $1"
    else
        echo "Failing deployment"
    fi
    exit 1  # proceed no further!
}

python manage.py migrate || fail_deploy "Migrate Failed"

if [ -z "${DJANGO_SUPERUSER_USERNAME:-}" ] || [ -z "${DJANGO_SUPERUSER_PASSWORD:-}" ] || [ -z "${DJANGO_SUPERUSER_EMAIL:-}" ]; then
  echo "Skipped Superuser creation because required environment variables are missing"
else
  echo "Create superuser"

  # 2>&1 redirects stderr to stdout; this lets us capture error messages.
  SUPERUSER_OUTPUT=$(python manage.py createsuperuser --no-input 2>&1)

  # Assign the exit status to a variable.
  SUPERUSER_STATUS=$?

  echo "createsuperuser result: $SUPERUSER_STATUS - output: $SUPERUSER_OUTPUT"

  if [ $SUPERUSER_STATUS -ne 0 ]; then
    # Manage.py createsuperuser did not finish with success:

    if [ "$SUPERUSER_OUTPUT" = "$SUPERUSER_EXISTS_MSG" ]; then
      # The message it printed in stderr was SUPERUSER_EXISTS_MSG.
      # This means the superuser already exists, so we continue.
      echo "Superuser already exists"
    fi
  fi
fi

python manage.py runserver 0.0.0.0:8000