# ============================================
#  API DOCKERFILE — NextGen Assets
#  Multi-stage build otimizado pra Render
# ============================================

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Dependências de sistema
# - openssl: pro Prisma 3.x
# - openssl1.1-compat: pro Prisma 1.1 (libs antigas precisam)
RUN apk add --no-cache openssl openssl1.1-compat libc6-compat

# Copia package files do monorepo
COPY package.json ./
COPY package-lock.json* ./
COPY apps/api/package.json ./apps/api/

# Cria diretório packages (vazio) pra evitar erros
RUN mkdir -p ./packages

# Instala dependências (raiz + api)
RUN npm install --legacy-peer-deps --ignore-scripts

# Copia código do backend
COPY apps/api ./apps/api

# Gera Prisma Client
WORKDIR /app/apps/api
RUN npx prisma generate

# Build TypeScript
RUN npm run build

# Volta pro workdir raiz
WORKDIR /app

# Stage 2: Runtime
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

# Cria usuário não-root pra segurança
RUN addgroup --system --gid 1001 nga && \
    adduser --system --uid 1001 nga

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
