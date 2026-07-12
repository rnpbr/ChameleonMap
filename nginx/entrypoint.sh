#!/bin/sh
set -e

export DJANGO_BASE_DOMAIN="${DJANGO_BASE_DOMAIN:-localhost}"

if [ "${ENABLE_MULTITENANT}" = "true" ]; then
    TEMPLATE="/etc/nginx/nginx.conf.multitenant.template"
    envsubst '${DJANGO_BASE_DOMAIN}' < "$TEMPLATE" > /etc/nginx/nginx.conf
else
    cp /etc/nginx/nginx.conf.single.template /etc/nginx/nginx.conf
fi

exec nginx -g 'daemon off;'
