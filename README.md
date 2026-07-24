# ChameleonMap

ChameleonMap is a tool for creating and visualizing interactive maps. It allows users to easily explore and understand the network infrastructure, making it easier to identify resources and manage the network inventory.

For more information about ChameleonMap, please consult the following resources:
- **Manuals and documentation:** [https://rnp-inf-collab.github.io/ChameleonMap-guide/](https://rnp-inf-collab.github.io/ChameleonMap-guide/)
- **Installation, functionalities & intended demonstration**: [https://youtu.be/f8eMwwNLlmk](https://youtu.be/f8eMwwNLlmk)

## Installation

### Requirements:
* <a href="https://docs.docker.com/install">Docker</a>
* <a href="https://docs.docker.com/compose/install">Docker Compose</a>
* Any computer with Linux, Windows, Mac or another OS that can run Docker, and, at least, 2GB Free HDD & 4GB RAM


### Instructions to run:


1- Set up thhe enviromment files:
After pulling the code from the repository, copy the file
	- env/env_example.prod
  - env/env_example.dev
to a new file
	- env/.env.prod
  - env/.env.dev
and replace/insert values for the keys listed below with your own.

 - **SECRET_KEY** - Can be any value, should be random
   - ```shell
        python3 -c "import secrets; print(secrets.token_urlsafe(50))"   
     ```
 - **DJANGO_ALLOWED_HOSTS** - The list of names to which this server will respond (defaults sufficient for local/dev installations; add/replace for public access)
 - **DJANGO_SUPERUSER_USERNAME** - A username for the admin user
 - **DJANGO_SUPERUSER_PASSWORD** - A password for the admin user
 - **DJANGO_SUPERUSER_EMAIL** - The email address for the admin user
 - **SQL_DATABASE** - The preferred name of the created database
 - **SQL_USER** - The username for the database
 - **SQL_PASSWORD** - The password for the database

If you want to use pgAdmin to access PostgreSQL, you must configure the following items (only in dev mode):
  - **PGADMIN_DEFAULT_EMAIL**
  - **PGADMIN_DEFAULT_PASSWORD**
  - **PGADMIN_PORT**

<br />
        
2- Run the following command:

  - **Development mode** - docker-compose -f docker-compose.yml -f docker-compose.dev.yml -p map up --build
  - **Production mode** - docker-compose -f docker-compose.yml -f docker-compose.prod.yml -p map up --build
  - **Production mode with ssl** - docker-compose -f docker-compose.yml -f docker-compose.prod.ssl.yml -p map up --build

<br />
<br />


## Accessing pgAdmin:
1- After installing, pgAdmin will be available at localhost on the port configured in `PGADMIN_PORT`. You can login with the credentials entered in `PGADMIN_DEFAULT_EMAIL` and `PGADMIN_DEFAULT_PASSWORD`

<br />

2- To connect to the database, you must click on "Add New Server".
  - In the "General" tab, enter:
    - In "Name" a name for your server.

  - In the "Connection" tab, enter:
    - In "Host Name", the word "db" (without quotes)
    - In "Port", the port 5432
    - In "Username, the value set in `POSTGRES_USER`
    - In "Password", the value set in `POSTGRES_PASSWORD`

<br />

3- Click "Save", and your database server will be configured.


----------------------------------------------------------------

To apply ssl to the inventory map it is necessary to change some nginx settings so that it adapts to your site.

1. Change the name of the site in the file nginx_ssl/nginx.conf:

```
  server {
      listen 80;
      server_name <site_name.com>;
      return 301 https://<site_name.com>$request_uri;
  }
```

to

```
  server {
      listen 80;
      server_name mysite.com;
      return 301 https://mysite.com$request_uri;
  }
```

Still in the nginx_ssl/nginx.conf file, change the server clause:

```
  server {
      listen 443 ssl;
      server_name <site_name.com>;
      ssl_certificate <certificate.crt>;
      ssl_certificate_key <certificate_key.key>;
    ...
   }
```

to

```
  server {
      listen 443 ssl;
      server_name mysite.com;
      ssl_certificate mycertificate.crt;
      ssl_certificate_key mycertificate_key.key;
    
    ...
  }
```
   
2. Add the certificate and key to the nginx_ssl directory. Then you need to edit the nginx_ssl/Dockerfile adding the certificate name.

```
  COPY <certificate.crt> <certificate.crt>
  COPY <certificate_key.key> <certificate_key.key>
```

to

```
  COPY mycertificate.crt mycertificate.crt
  COPY mycertificate_key.key mycertificate_key.key
```

To finish, use the command **Production mode with ssl** describe on the first section of this readme

## Extended Guide
An extended user/admin manual can be found in the following url: [https://github.com/RNP-INF-Collab/ChameleonMap-guide](https://github.com/RNP-INF-Collab/ChameleonMap-guide)
