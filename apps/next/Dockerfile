# ---------- Base ----------
FROM node:22-alpine AS base
RUN apk update && apk add --no-cache libc6-compat

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable pnpm \
  && corepack prepare pnpm@latest --activate \
  && pnpm --version

# ---------- Builder ----------
FROM base AS builder
WORKDIR /app

RUN pnpm add -g turbo@2.5.6
COPY . .
RUN turbo prune @acme/next --docker

# ---------- Installer ----------
FROM base AS installer
WORKDIR /app

COPY --from=builder /app/out/json/ ./
RUN pnpm install --frozen-lockfile

COPY --from=builder /app/out/full/ ./
COPY --from=builder /app/.env ./

RUN pnpm build -F @acme/next

# ---------- Runner ----------
FROM base AS runner
WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs
USER nextjs

# Copy standalone build output
COPY --from=installer --chown=nextjs:nodejs /app/apps/next/.next/standalone ./
COPY --from=installer --chown=nextjs:nodejs /app/apps/next/.next/static ./apps/next/.next/static
COPY --from=installer --chown=nextjs:nodejs /app/apps/next/public ./apps/next/public

# ✅ Copy node_modules for external packages
COPY --from=installer --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=installer --chown=nextjs:nodejs /app/apps/next/node_modules ./apps/next/node_modules

# Optionally copy package.json for runtime info
COPY --from=installer --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=installer --chown=nextjs:nodejs /app/apps/next/package.json ./apps/next/package.json

CMD ["node", "apps/next/server.js"]
