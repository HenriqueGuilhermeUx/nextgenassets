# ============================================
#  NEXT.JS DOCKERFILE — Multi-app (admin, partner, consumer, marketing)
# ============================================
# Build args:
#   APP_PATH = apps/admin (or apps/partner, apps/consumer, apps/marketing)
#   APP_PORT = 3002 (or 3003, 3004, 3000)

ARG APP_PATH=apps/admin
ARG APP_PORT=3002

# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
COPY ${APP_PATH}/package.json ./${APP_PATH}/
RUN npm ci --ignore-scripts

# Stage 2: Build
FROM node:20-alpine AS builder
ARG APP_PATH
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/${APP_PATH}/node_modules ./${APP_PATH}/node_modules
COPY ${APP_PATH} ./${APP_PATH}
COPY tsconfig.json* ./
COPY next.config.js* ./${APP_PATH}/

# Build
WORKDIR /app/${APP_PATH}
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Stage 3: Runtime
FROM node:20-alpine AS runner
ARG APP_PATH
ARG APP_PORT

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=${APP_PORT}
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/${APP_PATH}/public ./public 2>/dev/null || true
COPY --from=builder --chown=nextjs:nodejs /app/${APP_PATH}/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/${APP_PATH}/.next/static ./.next/static 2>/dev/null || true

USER nextjs
EXPOSE ${APP_PORT}

HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${APP_PORT}/ || exit 1

CMD ["node", "server.js"]
