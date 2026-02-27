# Painel Administrativo — Mauro Monção Advogados

Painel admin standalone para gerenciamento do blog jurídico.

## Stack

- **Frontend**: React 19, Vite, Tailwind CSS v4, tRPC client
- **Backend**: Express, tRPC server, Drizzle ORM, PostgreSQL
- **Auth**: JWT (httpOnly cookie), bcrypt

## Quickstart

```bash
# 1. Instalar dependências
npm install

# 2. Configurar variáveis de ambiente
cp .env.example .env
# Edite .env com sua DATABASE_URL e JWT_SECRET

# 3. Iniciar em desenvolvimento (frontend + servidor em paralelo)
npm run dev
# Frontend: http://localhost:5173
# API: http://localhost:3001

# 4. Criar primeiro admin (apenas quando DB está vazio)
# Acesse http://localhost:5173/setup
```

## Primeiro acesso

1. Acesse `/setup` para criar o admin inicial.
2. Faça login em `/login`.
3. Use o painel em `/dashboard`.

## Build para produção

```bash
npm run build
npm start
```

## Variáveis de Ambiente

| Variável | Obrigatório | Descrição |
|---|---|---|
| `DATABASE_URL` | Sim | PostgreSQL connection string |
| `JWT_SECRET` | Sim | Segredo JWT (min 32 chars) |
| `PORT` | Não | Porta do servidor (padrão: 3001) |
| `NODE_ENV` | Não | `development` ou `production` |

## Funcionalidades

- 🔐 Login seguro (JWT httpOnly cookie)
- 📊 Dashboard com estatísticas em tempo real
- ✍️ CRUD completo de posts (rascunho, publicado, agendado, arquivado)
- 🏷️ Gestão de categorias jurídicas (importação automática de 13 categorias)
- 🖼️ Biblioteca de mídia com drag-and-drop
- ❓ Gerenciamento de FAQ
- 👥 Gestão de leads com atualização de status
- ⚙️ Configurações do site (contato, redes sociais, SEO, rastreamento)
- 🔍 SEO por post: meta title, meta description, OG image, SERP preview
- 👁️ Preview do post antes de publicar
- 📱 Design responsivo (desktop, tablet, mobile)
