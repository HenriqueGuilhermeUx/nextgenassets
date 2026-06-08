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

# Copia TUDO (incluindo schema.prisma) ANTES do npm install
# Motivo: o postinstall do @prisma/client precisa do schema.prisma pra
# gerar os engines corretos (com binaryTargets certos)
COPY . .

# Cria diretório packages (vazio) pra evitar erros
RUN mkdir -p ./packages

# Instala dependências (raiz + api)
# IMPORTANTE: SEM --ignore-scripts porque o Prisma precisa rodar seu
# postinstall pra baixar o engine binary. Sem isso, prisma generate falha.
RUN npm install --legacy-peer-deps

# Gera Prisma Client do zero (schema.prisma já tá no lugar, binaryTargets corretos)
WORKDIR /app/apps/api
RUN rm -rf ../../node_modules/.prisma/client && npx prisma generate

# Build TypeScript
RUN npm run build

# Volta pro workdir raiz
WORKDIR /app

# ============================================
# Stage 2: Runtime
# ============================================
FROM node:20-bookworm-slim AS runner

ENV NODE_ENV=production
ENV PORT=3001

# Instala openssl + ca-certificates NO RUNTIME
# (engine do Prisma precisa do libssl em runtime pra resolver deps)
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

# Cria usuário não-root
RUN groupadd --system --gid 1001 nga && \
    useradd --system --uid 1001 --gid nga nga

WORKDIR /app/apps/api

# 1) Copia TODOS os artefatos do builder primeiro
COPY --from=builder --chown=nga:nga /app/apps/api/dist ./dist
COPY --from=builder --chown=nga:nga /app/node_modules ./node_modules
COPY --from=builder --chown=nga:nga /app/apps/api/prisma ./prisma
COPY --from=builder --chown=nga:nga /app/apps/api/package.json ./package.json

# 2) AGORA SIM: Limpa engines antigos e regenera do zero (camada FINAL)
# Isso garante que qualquer engine antiga (com libssl 1.1) seja substituída
# por engines compatíveis com o OpenSSL 3.0 do Debian Bookworm.
RUN rm -rf ./node_modules/.prisma/client && npx prisma generate

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

USER nga

EXPOSE 3001

CMD ["node", "dist/main.js"]
