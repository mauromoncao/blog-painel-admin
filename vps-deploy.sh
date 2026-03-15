#!/bin/bash
# ===========================================================
# Blog Painel Admin — VPS Deployment Script
# Deploys the Express+tRPC server to VPS port 3040
# Run from repo root: bash vps-deploy.sh
# Requires: SSH access to 181.215.135.202
# ===========================================================
set -e

VPS="181.215.135.202"
VPS_DIR="/opt/blog-painel-admin"
PORT=3040

echo "📦 Building server..."
npm ci --prefer-offline 2>/dev/null || npm install
npx tsc -p tsconfig.server.json 2>/dev/null || true
node_modules/.bin/esbuild server/index.ts \
    --platform=node --packages=external --bundle \
    --format=esm --outdir=dist --out-extension:.js=.js

echo "🚀 Deploying to VPS..."
ssh root@$VPS "mkdir -p $VPS_DIR"
rsync -az --exclude node_modules --exclude .git \
    dist/ root@$VPS:$VPS_DIR/dist/
rsync -az package.json root@$VPS:$VPS_DIR/

# Install and restart
ssh root@$VPS << REMOTE
cd $VPS_DIR
npm install --production --legacy-peer-deps
# ⚠️ SEGURANÇA: .env deve existir no VPS com as chaves reais.
# Não sobrescrever se já existir (chaves já configuradas manualmente).
if [ ! -f .env ]; then
  echo "⚠️  .env não encontrado. Criando template — preencha as chaves reais!"
  cat > .env << 'ENV'
DATABASE_URL=postgresql://blog_admin:PREENCHER_SENHA@181.215.135.202:5432/blog_mauro?sslmode=disable
JWT_SECRET=PREENCHER_JWT_SECRET
GOOGLE_CLIENT_ID=PREENCHER_GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET=PREENCHER_GOOGLE_CLIENT_SECRET
PORT=$PORT
NODE_ENV=production
CORS_ORIGIN=https://blog-painel.mauromoncao.adv.br
ENV
fi

# PM2 restart
if command -v pm2 &> /dev/null; then
    pm2 describe blog-painel 2>/dev/null && pm2 restart blog-painel || \
    pm2 start dist/index.js --name blog-painel
else
    npm install -g pm2
    pm2 start dist/index.js --name blog-painel
fi
pm2 save
REMOTE

echo "✅ Blog Painel deployed on VPS port $PORT"
echo "   Test: curl http://$VPS:$PORT/api/trpc"
