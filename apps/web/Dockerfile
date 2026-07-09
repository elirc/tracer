# Build from the repo root:  docker build -f apps/web/Dockerfile -t tracer-web .
FROM node:20-slim AS build
RUN corepack enable
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
# VITE_* are build-time; set them as build args in the deploy pipeline.
RUN pnpm --filter @tracer/web build

FROM nginx:alpine AS runtime
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
