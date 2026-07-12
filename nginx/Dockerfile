FROM nginx:1.27.0-alpine

RUN apk -U upgrade && apk add --no-cache gettext && rm /etc/nginx/conf.d/default.conf
COPY nginx.conf.multitenant.template /etc/nginx/nginx.conf.multitenant.template
COPY nginx.conf.single.template /etc/nginx/nginx.conf.single.template
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]
