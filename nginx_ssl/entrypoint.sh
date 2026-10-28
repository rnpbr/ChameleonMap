#!/bin/sh
set -e

export DJANGO_BASE_DOMAIN="${DJANGO_BASE_DOMAIN:-localhost}"

if [ "${ENABLE_MULTITENANT}" = "true" ]; then
    export NGINX_SSL_HTTP_LINES="server_name *.${DJANGO_BASE_DOMAIN};
    return 301 https://\$host\$request_uri;"
    export NGINX_SSL_SERVER_NAME="server_name *.${DJANGO_BASE_DOMAIN};"
else
    export NGINX_SSL_HTTP_LINES="return 301 https://\$host\$request_uri;"
    export NGINX_SSL_SERVER_NAME=""
fi

envsubst '${NGINX_SSL_HTTP_LINES} ${NGINX_SSL_SERVER_NAME}' \
    < /etc/nginx/conf.d/default.conf.template \
    > /etc/nginx/conf.d/default.conf

exec nginx -g 'daemon off;'
