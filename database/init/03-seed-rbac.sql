-- Dados iniciais RBAC (ambiente dev / referência para produção).
-- Executado após 02-schema.sql. Papéis: estudante, docente, administrador.

INSERT INTO roles (name) VALUES ('student'), ('teacher'), ('admin')
ON CONFLICT (name) DO NOTHING;

INSERT INTO permissions (name, description) VALUES
    ('task.create', 'Criar tarefas académicas'),
    ('task.read', 'Consultar tarefas'),
    ('task.update', 'Atualizar tarefas'),
    ('task.delete', 'Eliminar tarefas'),
    ('task.assign', 'Atribuir tarefas a utilizadores'),
    ('user.create', 'Criar utilizadores (conta criada pelo administrador)'),
    ('user.update', 'Atualizar utilizadores (ex.: bloqueio, dados administrativos)'),
    ('user.manage_roles', 'Atribuir ou remover papéis de utilizadores'),
    ('audit.read', 'Consultar logs de auditoria')
ON CONFLICT (name) DO NOTHING;

-- student: leitura (escopo filtrado na API — ex.: só tarefas atribuídas)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.name = 'task.read'
WHERE r.name = 'student'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- teacher: gestão de tarefas e atribuições
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.name IN (
    'task.create', 'task.read', 'task.update', 'task.delete', 'task.assign'
)
WHERE r.name = 'teacher'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- admin: todas as permissões definidas
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;


INSERT INTO users (username, password_hash, email, created_by)
VALUES (
    'devadmin',
    '$argon2id$v=19$m=65536,t=3,p=4$tJgiS4gxF64u1qxj6WPXDg$LWdWQHtN5XAD5Xw1OSoJT/AgVdZv3dhN4AHsQdoYTBk',
    'devadmin@local.test',
    NULL
)
ON CONFLICT (username) DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u
JOIN roles r ON r.name = 'admin'
WHERE u.username = 'devadmin'
ON CONFLICT DO NOTHING;
