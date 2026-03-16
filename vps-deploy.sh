#!/bin/bash
# ===========================================================
# Blog Painel Admin — VPS Deployment Script v2
# Deploys Express+tRPC server to VPS port 3040
# Run from repo root: bash vps-deploy.sh
# Requires: SSH access to 181.215.135.202
# ===========================================================
set -e

VPS="181.215.135.202"
VPS_DIR="/opt/blog-painel-admin"
PORT=3040
DB_PASS="Ben@Workspace2026!Secure"

echo "📦 Building server + frontend..."
npm ci --prefer-offline 2>/dev/null || npm install
# Build frontend (Vite) + server (esbuild)
npm run build

echo "🚀 Deploying to VPS $VPS:$VPS_DIR ..."
ssh root@$VPS "mkdir -p $VPS_DIR/dist/public"

# Enviar servidor compilado
rsync -az dist/index.js root@$VPS:$VPS_DIR/dist/
# Enviar frontend compilado
rsync -az dist/public/  root@$VPS:$VPS_DIR/dist/public/
# Enviar package.json para npm install no VPS
rsync -az package.json package-lock.json root@$VPS:$VPS_DIR/ 2>/dev/null || rsync -az package.json root@$VPS:$VPS_DIR/

# Instalar deps + configurar .env + PM2 no VPS
ssh root@$VPS << REMOTE
set -e
cd $VPS_DIR

# Instalar dependências de produção
npm install --production --legacy-peer-deps 2>&1 | tail -5

# Criar .env com credenciais corretas (sempre atualiza)
cat > .env << 'ENV'
DATABASE_URL=postgresql://blog_admin:${DB_PASS}@127.0.0.1:5432/blog_mauro?sslmode=disable
JWT_SECRET=$(openssl rand -hex 32 2>/dev/null || echo "ben-blog-jwt-2026-mauromoncao")
PORT=${PORT}
NODE_ENV=production
CORS_ORIGIN=https://blog-painel.mauromoncao.adv.br
ENV

echo "✅ .env configurado"

# PM2 restart
if command -v pm2 &> /dev/null; then
  if pm2 describe blog-painel &>/dev/null; then
    pm2 restart blog-painel
    echo "✅ PM2: blog-painel reiniciado"
  else
    pm2 start dist/index.js --name blog-painel --env production
    echo "✅ PM2: blog-painel iniciado"
  fi
else
  npm install -g pm2
  pm2 start dist/index.js --name blog-painel --env production
fi
pm2 save

sleep 4
CODE=\$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 "http://localhost:${PORT}/api/trpc" 2>/dev/null || echo "000")
echo "Blog Painel porta ${PORT}: HTTP \$CODE"
REMOTE

echo "✅ Blog Painel deployed on VPS port $PORT"
echo "   Testar: curl http://$VPS:$PORT/api/trpc"
echo "   Logs:   ssh root@$VPS 'pm2 logs blog-painel --lines 20'"
