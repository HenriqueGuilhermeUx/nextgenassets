# ============================================
#  API DOCKERFILE — Multi-stage prod-ready
# ============================================

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Dependências de sistema
RUN apk add --no-cache openssl

# Copia package files
COPY package.json package-lock.json* ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared-types/package.json ./packages/shared-types/ 2>/dev/null || true

# Instala dependências
RUN npm ci --only=production --ignore-scripts && \
    npm install -D typescript@5.3.3 ts-node@10.9.2 prisma@5.8.0 --ignore-scripts

# Copia código
COPY apps/api ./apps/api
COPY packages ./packages 2>/dev/null || true

# Gera Prisma Client
WORKDIR /app/apps/api
RUN npx prisma generate

# Build TypeScript
RUN npm run build

# Stage 2: Runtime
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

# Cria usuário não-root
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 orkest

# Copia artifacts do builder
COPY --from=builder --chown=orkest:nodejs /app/apps/api/dist ./dist
COPY --from=builder --chown=orkest:nodejs /app/apps/api/node_modules ./node_modules
COPY --from=builder --chown=orkest:nodejs /app/apps/api/prisma ./prisma
COPY --from=builder --chown=orkest:nodejs /app/apps/api/package.json ./package.json

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/v1/health || exit 1

USER orkest

EXPOSE 3001

CMD ["node", "dist/main.js"]
