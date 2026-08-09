#!/bin/sh

# 1. Espera o banco ficar disponível (opcional, mas recomendado)
#    Pode usar algo como um "wait-for" script ou dj-database-url.
#    Exemplo: wait-for-db.sh

# 2. Aplica migrações para o schema público

python manage.py makemigrations
python manage.py migrate_schemas --shared

# 3. Aplica migrações para os schemas de tenants (se existirem)
# python manage.py migrate_schemas --executor=parallel

# 4. Executa nosso comando customizado que cria tenant+usuário
python manage.py setup_admin
# python manage.py setup_ufrgs

# 5. Finalmente, roda o servidor
exec python manage.py runserver 0.0.0.0:8000
