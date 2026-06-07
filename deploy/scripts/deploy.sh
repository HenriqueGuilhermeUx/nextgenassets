#!/bin/bash
# ============================================
#  DEPLOY SCRIPT — Orquestrador simples
# ============================================
# Uso: ./deploy.sh [staging|prod]

set -e

ENV=${1:-staging}
echo "🚀 Deploying to $ENV..."

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Validação
if [ "$ENV" != "staging" ] && [ "$ENV" != "prod" ]; then
  echo -e "${RED}❌ Environment deve ser 'staging' ou 'prod'${NC}"
  exit 1
fi

# Confirmação pra prod
if [ "$ENV" == "prod" ]; then
  echo -e "${YELLOW}⚠️  Você está prestes a fazer deploy em PRODUÇÃO.${NC}"
  read -p "Tem certeza? (digite 'sim' pra continuar): " confirm
  if [ "$confirm" != "sim" ]; then
    echo "Cancelado."
    exit 0
  fi
fi

# Carrega env vars
if [ -f ".env.$ENV" ]; then
  export $(cat .env.$ENV | grep -v '^#' | xargs)
  echo "✅ Env vars carregadas de .env.$ENV"
else
  echo -e "${RED}❌ Arquivo .env.$ENV não encontrado${NC}"
  exit 1
fi

# Escolhe o docker-compose file
COMPOSE_FILE="deploy/docker-compose.$ENV.yml"
if [ ! -f "$COMPOSE_FILE" ]; then
  COMPOSE_FILE="deploy/docker-compose.prod.yml"
fi

echo "📦 Building images..."
docker-compose -f $COMPOSE_FILE build --no-cache

echo "🛑 Stopping old containers..."
docker-compose -f $COMPOSE_FILE down

echo "▶️  Starting new containers..."
docker-compose -f $COMPOSE_FILE up -d

echo "⏳ Waiting for health checks..."
sleep 30

# Health check
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/v1/health || echo "000")
if [ "$HEALTH" == "200" ]; then
  echo -e "${GREEN}✅ Deploy bem-sucedido!${NC}"
  echo "🌐 API:     http://localhost:3001"
  echo "🌐 Site:    http://localhost:3000"
  echo "🌐 Admin:   http://localhost:3002"
else
  echo -e "${RED}❌ Health check falhou (status: $HEALTH)${NC}"
  echo "Veja os logs: docker-compose -f $COMPOSE_FILE logs api"
  exit 1
fi

# Cleanup
echo "🧹 Limpando imagens antigas..."
docker image prune -f

echo -e "${GREEN}✅ Done!${NC}"
