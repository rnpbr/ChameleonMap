#!/bin/sh
set -e
export DJANGO_BASE_DOMAIN="${DJANGO_BASE_DOMAIN:-localhost}"
envsubst '${DJANGO_BASE_DOMAIN}' < /etc/nginx/conf.d/nginx.conf.template > /etc/nginx/conf.d/default.conf
exec nginx -g 'daemon off;'
