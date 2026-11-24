#!/bin/sh
# Runs the static collection once on startup.
# This is done here as well as iin the other container to avoid the other
# container modifying files on collect static, triggering inotifywait multiple times
python manage.py collectstatic --no-input

echo "Waiting for backend server..."

while ! nc -z 'backend' 8000; do
  sleep 0.1
done

echo "Web container started"

while inotifywait -r /home/dpdadm/web/*/static -e create,delete,modify; do {
    python manage.py collectstatic --no-input
}; done