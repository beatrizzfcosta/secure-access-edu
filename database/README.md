# Base de dados (PostgreSQL)

Configuração local da base **PostgreSQL** com Docker Compose.

## Pré-requisitos

- [Docker](https://docs.docker.com/get-docker/) e Docker Compose v2

## Arranque

```bash
cd database
cp .env.example .env
# Editar .env se quiseres user/password/port diferentes
docker compose up -d
```

Ver estado:

```bash
docker compose ps
```

O ficheiro `.env` não deve ser commitado; usa `.env.example` como modelo.

## Ligação manual

```bash
docker compose exec postgres psql -U secureacad -d secureacad
```

(Substitui `secureacad` se alteraste `POSTGRES_USER` / `POSTGRES_DB` no `.env`.)

## Modelo de dados (ERD)

O script `init/02-schema.sql` materializa o diagrama entidade–relação do projeto:

| Entidade (diagrama) | Tabela PostgreSQL | Notas |
|---------------------|-------------------|--------|
| User | `users` | `password_hash`, `is_blocked`, `created_by` (admin que criou a conta), `username`/`email` únicos |
| Role | `roles` | |
| Permission | `permissions` | |
| (atribuição) | `user_roles` | N:N utilizador ↔ papel |
| (concessão) | `role_permissions` | N:N papel ↔ permissão |
| Session | `sessions` | Ligada a `users` |
| PasswordHistory | `password_history` | Ligada a `users` |
| Task | `tasks` | `created_by` → `users` |
| TaskAssignment | `task_assignments` | `task_id`, `user_id`, `assigned_by` |
| AuditLog | `audit_logs` | `user_id` opcional; `resource_type` / `resource_id` para correlacionar recurso (A09) |
| (2FA) | `user_mfa_settings` | 2FA **registado pelo próprio utilizador** após login; admin cria a conta mas não define o segredo TOTP (A07) |

Colunas extra em **`users`**: `failed_login_count`, `locked_until`, `last_failed_login_at` (bloqueio após tentativas falhadas — A07). Em **`sessions`**: `last_activity_at` (inatividade — A02).

Chaves primárias em **UUID** (`gen_random_uuid()`). Timestamps em **UTC** (`TIMESTAMPTZ`).

## Init SQL

Ficheiros em `init/` (por ordem):

1. `01-extensions.sql` — extensões (ex.: `uuid-ossp`)
2. `02-schema.sql` — tabelas e índices
3. `03-seed-rbac.sql` — papéis `student` / `teacher` / `admin` e permissões (`user.create` / `user.update` / `user.manage_roles` só na prática para **admin**, via *cross join*; estudante e docente sem criação de utilizadores)

Executam-se **apenas na primeira criação** do volume (dados vazios). Para voltar a aplicar do zero: `docker compose down -v` (apaga dados) e `docker compose up -d`.

## Parar / apagar dados

```bash
docker compose down          # mantém o volume com dados
docker compose down -v       # remove volumes (apaga a base)
```
