# Correção do Modo Single-Tenant — App `languages` (LanguageOption)

## Visão Geral

O backend não subia no modo single-tenant (`ENABLE_MULTITENANT=false`): o Django
morria durante a inicialização com o erro:

```
AttributeError: 'Settings' object has no attribute 'TENANT_MODEL'
```

A correção consistiu em **mover o modelo compartilhado `LanguageOption` para um
novo app `languages`**, removendo-o do app `clients` (que é o app dos tenants).
Com isso, o modo single-tenant volta a funcionar sem carregar o `django_tenants`,
e o modo multitenant permanece inalterado.

Branch/commit: `fix/single-tenant-languageoption` (`3c8692d`).

---

## Contexto / Motivação

O recurso de multi-idioma havia movido o `LanguageOption` do app `administration`
para o app `clients`. Como `clients` é o app dos tenants e só é instalado no modo
multitenant, o modo single-tenant passou a quebrar na inicialização — o
`administration` importava `LanguageOption` de `clients.models`, forçando o
carregamento do `django_tenants` em um modo onde ele não deveria existir.

## Causa raiz

Cadeia de imports que disparava o erro:

1. `administration/models.py` → `from clients.models import LanguageOption`
2. `clients/models.py` → `from django_tenants.models import TenantMixin, DomainMixin`
3. `django_tenants/models.py` define `DomainMixin` lendo `settings.TENANT_MODEL`
   **em tempo de importação**
4. `TENANT_MODEL` só é definido dentro de `if ENABLE_MULTITENANT:` em
   `settings.py`
5. Com `ENABLE_MULTITENANT=false`, a variável não existe → `AttributeError`

Como o erro ocorria no `django.setup()`, **qualquer** comando do `manage.py`
falhava (inclusive o `check_tenancy_mode` do entrypoint), fazendo o container
`backend` reiniciar em loop.

---

## Solução adotada

Mover `LanguageOption` para um app próprio e compartilhado (`languages`),
instalado nos dois modos. Assim o app `clients` volta a conter **apenas** os
modelos de tenant e só é carregado no modo multitenant.

### Novo app `languages`

| Arquivo | Conteúdo |
|---|---|
| `languages/__init__.py` | vazio |
| `languages/apps.py` | `LanguagesConfig` (`name = 'languages'`) |
| `languages/models.py` | modelo `LanguageOption` (`code`, `name`, `db_table = 'language_option'`) |
| `languages/migrations/0001_initial.py` | cria a tabela `language_option` |
| `languages/migrations/0002_populate_language_options.py` | popula os idiomas a partir de `LanguageCode` |

### `clients` (app de tenants) restaurado

- `clients/models.py`: apenas `Client`, `Domain` e `TenantUser` (removidos
  `LanguageOption` e o import de `StringConstraints`).
- `clients/admin.py`: voltou ao conteúdo original (registros de admin dos tenants).
- Migrações de `LanguageOption` removidas: `0005_languageoption`,
  `0006_alter_languageoption_table`, `0007_auto_20260420_1817`,
  `0008_rename_code2_languageoption_code_and_more`, `0009_auto_20260420_1828`.

### `administration`

- `administration/models.py`:
  - import: `from languages.models import LanguageOption`
  - campo `Map_configuration.automatic_translation_languages`:
    `to='languages.LanguageOption'`
- Migrações `0051`, `0055` e `0059`: dependência alterada de `clients.*` para
  `('languages', '0001_initial')` e alvo do M2M alterado para
  `languages.languageoption`.

### `settings.py`

- Nova constante: `LANGUAGES_APP = 'languages'`.
- Multitenant: `languages` adicionado ao tenant type `public`
  (`_unique_apps(portal_apps, [CLIENTS_APP, LANGUAGES_APP])`), mantendo o
  `LanguageOption` no schema público (compartilhado), como era antes.
- Single-tenant: `INSTALLED_APPS` inclui `[LANGUAGES_APP, ADMINISTRATION_APP]`.

---

## Migrações

- A tabela `language_option` passou a ser criada pelas migrações do app
  `languages` (não mais pelas do `clients`).
- As migrações `0051`/`0055`/`0059` do `administration` agora dependem de
  `languages.0001_initial`, resolvendo o grafo de migrações nos dois modos.
- No single-tenant, `clients` não é instalado, então nenhuma tabela `clients_*`
  é criada (o `check_tenancy_mode` continua funcionando corretamente).

---

## Impacto

- **Single-tenant (`ENABLE_MULTITENANT=false`)**: backend inicia normalmente;
  `language_option` é criada e populada com os 5 idiomas (`en`, `pt`, `es`, `de`,
  `ko`).
- **Multitenant (`ENABLE_MULTITENANT=true`)**: comportamento inalterado;
  `LanguageOption` continua no schema público, compartilhado entre os tenants.

---

## Considerações / Rollout

Como o código **nunca foi para produção**, a história de migrações pôde ser
reescrita com segurança. Bancos de desenvolvimento já migrados com a versão
anterior (que criavam `language_option` pelas migrações do `clients`) precisam
ser recriados do zero:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml -p map down -v
docker compose -f docker-compose.yml -f docker-compose.dev.yml -p map up --build
```

---

## Validação

- `python manage.py check` → sem erros nos dois modos.
- Migração do zero no single-tenant → cria apenas `language_option` (sem tabelas
  `clients_*`) e popula os idiomas corretamente.
- `showmigrations`/`migrate --plan` → grafo de migrações resolve sem erros nos
  dois modos.
