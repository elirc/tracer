# Build from the repo root:  docker build -f apps/api/Dockerfile -t tracer-api .
FROM node:20-slim AS base
RUN corepack enable
WORKDIR /app

FROM base AS build
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @tracer/db generate
RUN pnpm --filter @tracer/api build

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages ./packages
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
WORKDIR /app/apps/api
EXPOSE 3001
# /ready gates deploys once readiness checks the DB (Sprint 15 finalizes this).
CMD ["node", "dist/index.js"]
