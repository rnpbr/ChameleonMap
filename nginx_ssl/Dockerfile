FROM nginx:1.27.0-alpine

RUN apk -U upgrade && apk add --no-cache gettext && rm /etc/nginx/conf.d/default.conf
COPY mapa.rnp.br-crt.crt /etc/nginx/crt.crt
COPY mapa.rnp.br-key.key /etc/nginx/key.key
COPY nginx.conf.multitenant.template /etc/nginx/conf.d/nginx.conf.multitenant.template
COPY nginx.conf.single.template /etc/nginx/conf.d/nginx.conf.single.template
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]
