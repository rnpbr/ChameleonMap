###########
# BUILDER #
###########

# pull official base image
FROM python:3.11-alpine as builder

# set work directory
WORKDIR /usr/src/app

# install the dependencies
RUN apk update; \
    apk add less openssh postgresql-dev gcc python3-dev musl-dev git npm

# install dependencies
COPY ./requirements.txt .
RUN pip install --upgrade pip
RUN pip wheel --no-cache-dir --wheel-dir /usr/src/app/wheels -r requirements.txt

##############
# DEPLOYMENT #
##############

# Create the deployable container, this will be targeted as 'deployment' in the docker compose files
# For production deployment, we can build the specific layer we want:
#     https://docs.docker.com/develop/develop-images/multistage-build/#stop-at-a-specific-build-stage
#
#     docker build --target deployment -t django_deploy .

# pull official base image
FROM python:3.11-alpine as deployment

# set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1
ENV HOME=/home/dpdadm
ENV APP_HOME=/home/dpdadm/web

RUN apk -U upgrade; \
    apk add libpq gettext-dev dos2unix inotify-tools; \
    addgroup -S dpdadm; \
    adduser -S dpdadm -G dpdadm; \
    mkdir -p $APP_HOME/staticfiles

WORKDIR $APP_HOME

# Install dependencies
COPY --from=builder /usr/src/app/wheels /wheels
COPY --from=builder /usr/src/app/requirements.txt .
RUN pip install --no-cache --upgrade pip; \
    pip install --no-cache /wheels/*


# copy project
COPY . $APP_HOME

# Converts windows style line endings to unix style if the host is windows
RUN dos2unix /home/dpdadm/web/entrypoint.sh; 

# run entrypoint.sh
ENTRYPOINT ["/home/dpdadm/web/entrypoint.sh"]

###############
# DEVELOPMENT #
###############

# Create a version of the deployable container with optimisations for local development.
# This will be targeted as 'development' in the docker compose files

FROM deployment as development

ENV PATH="/home/dpdadm/.local/bin:$PATH"
RUN pip install -r requirements.txt


ENTRYPOINT ["/home/dpdadm/web/entrypoint.sh"]
