# Internacionalização (i18n) — ChameleonMap Backend

## Visão Geral

O backend Django do ChameleonMap possui suporte a internacionalização (i18n) utilizando o sistema nativo do Django baseado em **GNU gettext**. Os idiomas configurados são:

| Código | Idioma     |
|--------|------------|
| `en`   | Inglês (padrão) |
| `pt`   | Português  |
| `es`   | Espanhol   |

O idioma pode ser alterado pelo usuário através do seletor de idiomas presente na tela de login e na página principal do admin.

---

## Estrutura de Arquivos

```
inventory_backend/django/
├── locale/
│   ├── pt/
│   │   └── LC_MESSAGES/
│   │       ├── django.po      ← Traduções em português
│   │       └── django.mo      ← Arquivo compilado (binário)
│   └── es/
│       └── LC_MESSAGES/
│           ├── django.po      ← Traduções em espanhol
│           └── django.mo      ← Arquivo compilado (binário)
├── inventory_backend/
│   ├── settings.py            ← Configurações de i18n
│   ├── apps_overrides.py      ← AppConfigs customizados (apps terceiros)
│   └── urls.py                ← Rota /i18n/ para troca de idioma
├── templates/
│   └── admin/
│       ├── login.html         ← Seletor de idioma na tela de login
│       └── index.html         ← Seletor de idioma na página principal
└── ...
```

---

## Como Foi Implementado

### 1. Configuração no `settings.py`

```python
from django.utils.translation import gettext_lazy as _

# Idiomas disponíveis
LANGUAGES = [
    ('en', _('English')),
    ('pt', _('Portuguese')),
    ('es', _('Spanish')),
]

# Diretório dos arquivos de tradução
LOCALE_PATHS = [
    os.path.join(BASE_DIR, 'locale'),
]

# Ativação do i18n (já vem habilitado por padrão)
USE_I18N = True
```

O `LocaleMiddleware` foi adicionado ao `MIDDLEWARE`, posicionado entre `SessionMiddleware` e `CommonMiddleware`:

```python
MIDDLEWARE = [
    ...
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.locale.LocaleMiddleware',       # ← Detecta o idioma
    'django.middleware.common.CommonMiddleware',
    ...
]
```

### 2. Marcação de Strings Traduzíveis

#### Em código Python (models, admin, apps, settings)

Usa-se `gettext_lazy` (importado como `_`) para strings que são avaliadas tardiamente (models, AppConfig, settings):

```python
from django.utils.translation import gettext_lazy as _

class MyModel(models.Model):
    name = models.CharField(_('name'), max_length=100)

    class Meta:
        verbose_name = _('my model')
        verbose_name_plural = _('my models')
```

#### Em views (avaliação imediata)

Usa-se `gettext` (sem `lazy`) para strings em views, pois são avaliadas no momento da requisição:

```python
from django.utils.translation import gettext as _

def my_view(request):
    message = _("No changes detected.")
```

#### Em templates

Usa-se as tags `{% trans %}` e `{% blocktrans %}`:

```html
{% load i18n %}

<h1>{% trans "Welcome" %}</h1>

{% blocktrans with name=user.name %}
    Hello, {{ name }}!
{% endblocktrans %}
```

### 3. Apps de Terceiros

Algumas bibliotecas (como `django-axes` e `django-tenant-users`) não envolvem seus nomes com `gettext_lazy`, então foi criado o arquivo `inventory_backend/apps_overrides.py` com AppConfigs customizados:

```python
from django.apps import AppConfig
from django.utils.translation import gettext_lazy as _

class AxesConfig(AppConfig):
    name = 'axes'
    default_auto_field = 'django.db.models.BigAutoField'
    verbose_name = _('Axes')

class TenantPermissionsConfig(AppConfig):
    name = 'tenant_users.permissions'
    verbose_name = _('Permissions')

    def ready(self):
        super().ready()
        from tenant_users.permissions.models import UserTenantPermissions
        UserTenantPermissions._meta.verbose_name = _('user tenant permission')
        UserTenantPermissions._meta.verbose_name_plural = _('user tenant permissions')
```

No `settings.py`, ao invés de referenciar o app diretamente (`'axes'`), referencia-se o AppConfig:

```python
'inventory_backend.apps_overrides.AxesConfig',
'inventory_backend.apps_overrides.TenantPermissionsConfig',
```

### 4. Seletor de Idioma

A view `set_language` do Django foi habilitada adicionando a rota nos dois arquivos de URLs:

**`inventory_backend/urls.py`** (ROOT_URLCONF):
```python
path('i18n/', include('django.conf.urls.i18n')),
```

**`clients/urls.py`** (TENANT_URLCONF):
```python
path('i18n/', include('django.conf.urls.i18n')),
```

A rota `/i18n/setlang/` também foi adicionada na configuração do **nginx** (`nginx/nginx.conf`):

```nginx
location /i18n {
    proxy_pass http://backend-map;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header Host $host;
    proxy_redirect off;
}
```

### 5. Arquivos de Tradução (`.po` / `.mo`)

Os arquivos `.po` contêm os pares de tradução no formato:

```po
msgid "Menu Group"
msgstr "Grupo de Menu"
```

Após editar, os arquivos `.po` devem ser **compilados** para `.mo` (formato binário que o Django lê em runtime).

---

## Como Adicionar Novas Strings de Tradução

### Passo 1: Marcar a string no código

Dependendo de onde a string será usada:

| Local | Importação | Exemplo |
|-------|-----------|---------|
| Models, AppConfig, Settings | `from django.utils.translation import gettext_lazy as _` | `verbose_name = _('my field')` |
| Views | `from django.utils.translation import gettext as _` | `msg = _('Success')` |
| Templates | `{% load i18n %}` | `{% trans "Hello" %}` |

### Passo 2: Adicionar a tradução nos arquivos `.po`

Edite os dois arquivos:
- `locale/pt/LC_MESSAGES/django.po` (Português)
- `locale/es/LC_MESSAGES/django.po` (Espanhol)

Adicione ao final do arquivo (antes de qualquer linha em branco final):

```po
msgid "My new string"
msgstr "Minha nova string"
```

> **Importante:** O `msgid` deve ser **exatamente igual** à string usada no código Python ou template.

### Passo 3: Compilar os arquivos `.mo`

Execute no diretório `inventory_backend/django/`:

```bash
msgfmt -o locale/pt/LC_MESSAGES/django.mo locale/pt/LC_MESSAGES/django.po
msgfmt -o locale/es/LC_MESSAGES/django.mo locale/es/LC_MESSAGES/django.po
```

Ou, se estiver usando Docker:

```bash
docker compose exec backend bash -c "cd /app && msgfmt -o locale/pt/LC_MESSAGES/django.mo locale/pt/LC_MESSAGES/django.po && msgfmt -o locale/es/LC_MESSAGES/django.mo locale/es/LC_MESSAGES/django.po"
```

> **Nota:** O pacote `gettext` precisa estar instalado. No Dockerfile, adicione `apt-get install -y gettext` se necessário.

### Passo 4: Reiniciar o servidor

Após compilar, reinicie o servidor Django para que as novas traduções sejam carregadas:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml -p map up --build
```

---

## Como o Django Escolhe o Idioma

O `LocaleMiddleware` determina o idioma do usuário na seguinte ordem de prioridade:

1. **URL prefix** (se estiver usando `i18n_patterns` — não utilizado neste projeto)
2. **Sessão** (`request.session[settings.LANGUAGE_SESSION_KEY]`) — definida pela view `set_language`
3. **Cookie** (`django_language`)
4. **Header HTTP** `Accept-Language` do navegador
5. **`LANGUAGE_CODE`** do `settings.py` (fallback: `en-us`)

Quando o usuário seleciona um idioma no seletor, a view `set_language` salva a preferência na sessão e no cookie.

---

## Lista de Arquivos Modificados

| Arquivo | Tipo de Alteração |
|---------|------------------|
| `inventory_backend/settings.py` | Adicionado `LANGUAGES`, `LOCALE_PATHS`, `LocaleMiddleware`, strings UNFOLD com `_()` |
| `inventory_backend/urls.py` | Adicionado rota `i18n/`, `site_header` com `_()` |
| `inventory_backend/apps_overrides.py` | **Criado** — AppConfigs para axes e tenant_users |
| `clients/urls.py` | Adicionado rota `i18n/` |
| `administration/models.py` | Todas as strings com `_()` |
| `administration/admin.py` | `site_header`, `site_title`, `index_title` com `_()` |
| `administration/apps.py` | `verbose_name` com `_()` |
| `clients/models.py` | Todas as strings com `_()` |
| `clients/admin.py` | Mensagens de erro com `_()` |
| `clients/apps.py` | `verbose_name` com `_()` |
| `importer/views.py` | Mensagem com `_()` |
| `importer/apps.py` | `verbose_name` com `_()` |
| `atlas_builder/apps.py` | `verbose_name` com `_()` |
| `templates/admin/login.html` | `{% trans %}`, seletor de idioma |
| `templates/admin/index.html` | `{% trans %}`, seletor de idioma |
| `templates/registration/*.html` | Todas as strings com `{% trans %}` |
| `templates/importer/*.html` | Todas as strings com `{% trans %}` |
| `nginx/nginx.conf` | Adicionado `location /i18n` |
| `locale/pt/LC_MESSAGES/django.po` | **Criado** — Traduções português |
| `locale/es/LC_MESSAGES/django.po` | **Criado** — Traduções espanhol |

---

## Adicionando um Novo Idioma

1. Adicione o idioma em `settings.py`:
   ```python
   LANGUAGES = [
       ('en', _('English')),
       ('pt', _('Portuguese')),
       ('es', _('Spanish')),
       ('fr', _('French')),  # Novo idioma
   ]
   ```

2. Crie o diretório e o arquivo `.po`:
   ```bash
   mkdir -p locale/fr/LC_MESSAGES
   ```

3. Copie um `.po` existente como base:
   ```bash
   cp locale/pt/LC_MESSAGES/django.po locale/fr/LC_MESSAGES/django.po
   ```

4. Edite o novo arquivo com as traduções para o idioma desejado.

5. Atualize o cabeçalho do `.po` (`Language`, `Language-Team`, etc.).

6. Compile:
   ```bash
   msgfmt -o locale/fr/LC_MESSAGES/django.mo locale/fr/LC_MESSAGES/django.po
   ```

7. Reinicie o servidor.
