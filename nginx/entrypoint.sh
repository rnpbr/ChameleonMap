#!/bin/sh
set -e
export DJANGO_BASE_DOMAIN="${DJANGO_BASE_DOMAIN:-localhost}"
envsubst '${DJANGO_BASE_DOMAIN}' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf
exec nginx -g 'daemon off;'
