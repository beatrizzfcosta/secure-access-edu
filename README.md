<div align="center">

# 🔐 SecureAcad

**Secure Academic Task Management System with RBAC and Security by Design**

[![Last commit](https://img.shields.io/github/last-commit/beatrizzfcosta/secure-access-edu?style=for-the-badge)](https://github.com/beatrizzfcosta/secure-access-edu/commits)
[![Top language](https://img.shields.io/github/languages/top/beatrizzfcosta/secure-access-edu?style=for-the-badge)](https://github.com/beatrizzfcosta/secure-access-edu)
[![Languages](https://img.shields.io/github/languages/count/beatrizzfcosta/secure-access-edu?style=for-the-badge)](https://github.com/beatrizzfcosta/secure-access-edu)
[![Issues](https://img.shields.io/github/issues/beatrizzfcosta/secure-access-edu?style=for-the-badge)](https://github.com/beatrizzfcosta/secure-access-edu/issues)
[![Stars](https://img.shields.io/github/stars/beatrizzfcosta/secure-access-edu?style=for-the-badge)](https://github.com/beatrizzfcosta/secure-access-edu/stargazers)

<br/>

**Built with the tools and technologies:**

<img alt="Python" src="https://img.shields.io/badge/Python-3776AB?logo=python&logoColor=white&style=for-the-badge">
<img alt="React" src="https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB&style=for-the-badge">
<img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-336791?logo=postgresql&logoColor=white&style=for-the-badge">
<img alt="JWT" src="https://img.shields.io/badge/JWT-000000?logo=jsonwebtokens&logoColor=white&style=for-the-badge">
<img alt="Argon2" src="https://img.shields.io/badge/Argon2-5A0FC8?style=for-the-badge">
<img alt="HTTPS" src="https://img.shields.io/badge/HTTPS-TLS-green?style=for-the-badge">
<img alt="OWASP" src="https://img.shields.io/badge/OWASP-Top%2010-red?style=for-the-badge">

</div>

---

## 📖 Overview

O **SecureAcad** é um sistema web seguro para gestão de tarefas em equipas académicas, desenvolvido com base no paradigma **Security by Design**.

A plataforma garante proteção de dados sensíveis através de:

* Autenticação robusta (2FA)
* Controlo de acesso baseado em papéis (RBAC)
* Mitigação de vulnerabilidades do OWASP Top 10 (2025)

O sistema suporta múltiplos perfis (estudantes, docentes e administradores), assegurando a aplicação do **Princípio do Menor Privilégio**.

---

## 🏗️ Architecture

O sistema segue uma arquitetura em **3 camadas (three-tier)**:

```text
Frontend (React / Next.js)
        ↓
Backend (Python - Flask API)
        ↓
Database (PostgreSQL)
```

### 🔒 Security Layers

* Autenticação via JWT
* RBAC aplicado no backend
* Validação de dados (client + server)
* Middlewares de segurança
* Comunicação segura via HTTPS/TLS

---

## ⚙️ Features

### 🔐 Authentication & Session

* Login com username/password
* Autenticação multifator (2FA)
* Políticas de password seguras
* Limitação de tentativas de login
* Sessões com timeout

---

### 🛂 Access Control (RBAC)

* Papéis:
  * Estudante
  * Docente
  * Administrador
* Permissões por papel
* Validação no backend
* Princípio do menor privilégio

---

### 🧪 Data Validation & Protection

* Validação frontend + backend
* Sanitização de inputs
* Queries parametrizadas (anti-SQL Injection)

---

### 🔐 Cryptography

* Hashing de passwords com **Argon2id**
* Proteção de dados sensíveis
* Comunicação segura (TLS)

---

### 📊 Logging & Monitoring

* Registo de:
  * Logins (sucesso/falha)
  * Acessos a recursos
  * Alterações 
* Sistema de auditoria
* Alertas de segurança

---

### ⚠️ Error Handling

* Tratamento centralizado de exceções
* Mensagens seguras (sem leaks)
* Fail Secure

---

## 🚀 Getting Started

### Clone the repository

```bash
git clone https://github.com/beatrizzfcosta/secure-access-edu
cd securetask
```

### Backend

```bash
cd backend
pip install -r requirements.txt
python manage.py runserver
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## 🔌 API

| Method | Endpoint    | Description            |
| ------ | ----------- | ---------------------- |


---

## 🛡️ Security (OWASP Top 10)

| Vulnerabilidade                | Mitigação              |
| ------------------------------ | ---------------------- |
| A01: Broken Access Control     | RBAC                   |
| A02: Security Misconfiguration | Configuração segura    |
| A04: Cryptographic Failures    | Hashing + TLS          |
| A05: Injection                 | Queries parametrizadas |
| A07: Authentication Failures   | 2FA + políticas        |
| A09: Logging Failures          | Sistema de logs        |
| A10: Exception Handling        | Fail Secure            |

---

## 🧠 Risk Model

O sistema segue uma abordagem baseada em:

* STRIDE Threat Modeling
* Zero Trust Architecture
* Defense in Depth

---

## 👥 Authors

* Beatriz Costa
* Letícia
* Frederico
* Pedro
* Josué



