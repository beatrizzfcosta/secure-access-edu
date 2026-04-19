-- Schema: Sistema Web de Gestão de Tarefas Académicas (RBAC + auditoria).

-- TODO rever políticas RLS (Row Level Security) na BD.
-- TODO fluxo 2FA — o administrador cria a conta; o próprio utilizador autentica-se e regista o 2FA (TOTP/backup).

-- ---------------------------------------------------------------------------
-- RBAC: papéis e permissões (N:N) — mitigação A01
-- ---------------------------------------------------------------------------
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL UNIQUE,
    description TEXT
);

CREATE TABLE role_permissions (
    role_id UUID NOT NULL REFERENCES roles (id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions (id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- ---------------------------------------------------------------------------
-- Utilizadores e atribuição de papéis (N:N)
-- ---------------------------------------------------------------------------
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(80) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    is_blocked BOOLEAN NOT NULL DEFAULT FALSE,
    -- Conta criada pelo administrador (rastreio A01/A09). NULL no primeiro utilizador ou bootstrap.
    created_by UUID REFERENCES users (id) ON DELETE SET NULL,
    -- A07: limitação de tentativas / bloqueio temporário (valores atualizados pelo backend auth)
    failed_login_count INT NOT NULL DEFAULT 0 CHECK (failed_login_count >= 0),
    locked_until TIMESTAMPTZ,
    last_failed_login_at TIMESTAMPTZ
    -- TODO (Letícia / A04): custo Argon2id diferenciado por papel é lógica na app;
    --       opcional: coluna argon2_profile VARCHAR(32) se quiserem persistir perfil de hashing.
);

CREATE TABLE user_roles (
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles (id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

-- ---------------------------------------------------------------------------
-- 2FA — A07 (configuração pelo próprio utilizador, não pelo admin)
-- O administrador cria o utilizador; após login, o titular da conta regista o 2FA.
-- O admin não deve gravar o segredo TOTP — apenas o utilizador autenticado no fluxo de "enrollment".
-- ---------------------------------------------------------------------------
CREATE TABLE user_mfa_settings (
    user_id UUID PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    totp_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    totp_secret_encrypted BYTEA,
    backup_codes_hash TEXT,
    enrolled_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Sessões (complemento a JWT: revogação / inatividade — A02)
-- ---------------------------------------------------------------------------
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_active BOOLEAN NOT NULL DEFAULT TRUE
    -- TODO (backend): atualizar last_activity_at em cada pedido autenticado; encerrar sessão após inatividade.
);

CREATE TABLE password_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    password_hash TEXT NOT NULL,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Tarefas e atribuições — autorização task.create via RBAC na app (A01 + A05)
-- ---------------------------------------------------------------------------
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    created_by UUID NOT NULL REFERENCES users (id) ON DELETE RESTRICT
    -- TODO (backend/rbac): antes de INSERT, verificar permissão task.create (docente/admin); nunca confiar no cliente.
    -- TODO (A05): usar ORM ou SQL parametrizado; nunca interpolar strings SQL com input do utilizador.
);

CREATE TABLE task_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks (id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    assigned_by UUID NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    UNIQUE (task_id, user_id)
);

-- ---------------------------------------------------------------------------
-- Auditoria — A09
-- ---------------------------------------------------------------------------
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users (id) ON DELETE SET NULL,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    event_type VARCHAR(100) NOT NULL,
    details TEXT,
    ip_address VARCHAR(45),
    resource_type VARCHAR(80),
    resource_id UUID
    -- TODO (Pedro): definir enum/códigos estáveis para event_type (login_success, login_failure, task_create, rbac_deny, ...).
);

-- ---------------------------------------------------------------------------
-- Índices
-- ---------------------------------------------------------------------------
CREATE INDEX idx_sessions_user_id ON sessions (user_id);
CREATE INDEX idx_sessions_expires_at ON sessions (expires_at) WHERE is_active = TRUE;
CREATE INDEX idx_sessions_last_activity ON sessions (last_activity_at) WHERE is_active = TRUE;
CREATE INDEX idx_password_history_user_id ON password_history (user_id);
CREATE INDEX idx_users_created_by ON users (created_by);
CREATE INDEX idx_tasks_created_by ON tasks (created_by);
CREATE INDEX idx_task_assignments_task_id ON task_assignments (task_id);
CREATE INDEX idx_task_assignments_user_id ON task_assignments (user_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs (user_id);
CREATE INDEX idx_audit_logs_occurred_at ON audit_logs (occurred_at);
CREATE INDEX idx_audit_logs_event_type ON audit_logs (event_type);
CREATE INDEX idx_audit_logs_resource ON audit_logs (resource_type, resource_id);
