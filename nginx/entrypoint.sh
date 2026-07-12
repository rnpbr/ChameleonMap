#!/bin/sh
set -e

export DJANGO_BASE_DOMAIN="${DJANGO_BASE_DOMAIN:-localhost}"

if [ "${ENABLE_MULTITENANT}" = "true" ]; then
    envsubst '${DJANGO_BASE_DOMAIN}' \
        < /etc/nginx/mode.multitenant.conf.template \
        > /etc/nginx/mode.conf
else
    cp /etc/nginx/mode.single.conf /etc/nginx/mode.conf
fi

cp /etc/nginx/nginx.conf.template /etc/nginx/nginx.conf

exec nginx -g 'daemon off;'
