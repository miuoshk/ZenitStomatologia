# syntax=docker/dockerfile:1.7
FROM node:22-bookworm-slim AS base
RUN corepack enable && corepack prepare pnpm@10.23.0 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY apps/worker/package.json apps/worker/
COPY packages/config/package.json packages/config/
COPY packages/shared/package.json packages/shared/
COPY packages/db/package.json packages/db/
COPY packages/testing/package.json packages/testing/
COPY packages/ui/package.json packages/ui/
COPY packages/i18n/package.json packages/i18n/
COPY packages/modules/platform/package.json packages/modules/platform/
COPY packages/modules/identity/package.json packages/modules/identity/
COPY packages/modules/org/package.json packages/modules/org/
COPY packages/modules/scheduling/package.json packages/modules/scheduling/
COPY packages/modules/analytics/package.json packages/modules/analytics/
COPY packages/modules/integrations/package.json packages/modules/integrations/
COPY tools/doctor/package.json tools/doctor/
COPY tools/gen/package.json tools/gen/
RUN pnpm install --frozen-lockfile --filter @crux/worker...

FROM base AS builder
COPY --from=deps /app /app
COPY . .
RUN pnpm --filter @crux/worker build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 worker
COPY --from=builder /app/apps/worker/dist ./dist
USER worker
CMD ["node", "dist/main.js"]
