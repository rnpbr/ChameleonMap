###########
# BUILDER #
###########
FROM node:20-alpine as builder
WORKDIR /app
COPY ./package*.json /app/
RUN npm install
COPY . /app
ARG configuration=production
# Ensure assets/env.js exists for the build (key is injected at container start).
RUN node set-env.js \
 && npm run build -- --output-path=./dist/out --configuration $configuration


##############
# DEPLOYMENT #
##############
FROM httpd:2.4.51-alpine as deployment
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh
COPY --from=builder /app/dist/out/ /usr/local/apache2/htdocs
ENTRYPOINT ["/docker-entrypoint.sh"]


###############
# DEVELOPMENT #
###############
FROM node:20-alpine as development

WORKDIR /usr/src/app

CMD npm install -g @angular/cli && npm install \
 && npm start
