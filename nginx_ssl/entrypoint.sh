#!/bin/sh
set -e

export DJANGO_BASE_DOMAIN="${DJANGO_BASE_DOMAIN:-localhost}"

if [ "${ENABLE_MULTITENANT}" = "true" ]; then
    TEMPLATE="/etc/nginx/conf.d/nginx.conf.multitenant.template"
    envsubst '${DJANGO_BASE_DOMAIN}' < "$TEMPLATE" > /etc/nginx/conf.d/default.conf
else
    cp /etc/nginx/conf.d/nginx.conf.single.template /etc/nginx/conf.d/default.conf
fi

exec nginx -g 'daemon off;'
