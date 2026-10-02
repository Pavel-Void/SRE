# ========================================================
# 1. Dependencies stage
# ========================================================
FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json* ./
COPY .npmrc ./
RUN npm ci --legacy-peer-deps

# ========================================================
# 2. Builder stage
# ========================================================
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_API_URL=http://localhost:8080
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ========================================================
# 3. Runner stage (minimal immutable runtime)
# ========================================================
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

# Exec form: node runs as PID 1 directly, handling SIGTERM properly
CMD ["node", "server.js"]
