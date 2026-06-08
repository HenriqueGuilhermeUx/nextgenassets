# ============================================
#  API DOCKERFILE — NextGen Assets
#  Base: Debian (tem libssl 1.1 E 3.0 nativamente)
#  Resolve compat issues do Alpine com Prisma
# ============================================

# Stage 1: Build
FROM node:20-bookworm-slim AS builder

WORKDIR /app

# Instala openssl + libssl-dev pro Prisma generate detectar a versão
RUN apt-get update && apt-get install -y openssl libssl-dev && rm -rf /var/lib/apt/lists/*

# Copia package files do monorepo
COPY package.json ./
COPY package-lock.json* ./
COPY apps/api/package.json ./apps/api/

# Cria diretório packages (vazio) pra evitar erros
RUN mkdir -p ./packages

# Instala dependências (raiz + api)
# IMPORTANTE: SEM --ignore-scripts porque o Prisma precisa rodar seu
# postinstall pra baixar o engine binary. Sem isso, prisma generate falha.
RUN npm install --legacy-peer-deps

# Copia código do backend
COPY apps/api ./apps/api

# Limpa QUALQUER rastro do Prisma Client antigo e gera do zero
# --no-engine-cache garante que nao usa cache local
WORKDIR /app/apps/api
RUN rm -rf ../../node_modules/.prisma/client && npx prisma generate --no-engine-cache

# Build TypeScript
RUN npm run build

# Volta pro workdir raiz
WORKDIR /app

# Stage 2: Runtime
FROM node:20-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

# Cria usuário não-root pra segurança
RUN groupadd --system --gid 1001 nga && \
    useradd --system --uid 1001 --gid nga nga

# Copia artifacts do builder
WORKDIR /app/apps/api
COPY --from=builder --chown=nga:nga /app/apps/api/dist ./dist
COPY --from=builder --chown=nga:nga /app/node_modules /app/apps/api/node_modules
COPY --from=builder --chown=nga:nga /app/apps/api/prisma ./prisma
COPY --from=builder --chown=nga:nga /app/apps/api/package.json ./package.json

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

USER nga

EXPOSE 3001

CMD ["node", "dist/main.js"]
