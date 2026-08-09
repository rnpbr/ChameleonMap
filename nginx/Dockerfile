FROM nginx:1.27.0-alpine

RUN apk -U upgrade && apk add --no-cache gettext && rm /etc/nginx/conf.d/default.conf
COPY nginx.conf.template /etc/nginx/nginx.conf.template
COPY mode.multitenant.conf.template /etc/nginx/mode.multitenant.conf.template
COPY mode.single.conf /etc/nginx/mode.single.conf
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]
