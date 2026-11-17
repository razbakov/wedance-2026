# PR preview image for the Hetzner dev server (RAZ-886) — production stays on Vercel.
# Built by .github/workflows/preview.yml on GitHub's runners (the server has 4 GB and
# can't build this app), pushed to ghcr.io, run by Dokploy. See ops/hetzner/README.md.
FROM oven/bun:1.3 AS build
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
ARG COMMIT_SHA=""
ENV NITRO_PRESET=node-server \
    VERCEL_GIT_COMMIT_SHA=$COMMIT_SHA \
    NODE_OPTIONS=--max-old-space-size=6144
RUN bun run build

FROM node:22-bookworm-slim
COPY --from=oven/bun:1.3 /usr/local/bin/bun /usr/local/bin/bun
WORKDIR /app
# Migrations + the Neon-HTTP stand-in (the preview's Postgres is plain Postgres).
RUN echo '{"name":"wedance-preview-ops","private":true}' > package.json && bun add pg@8 >/dev/null
COPY scripts/db-migrate.ts scripts/
COPY scripts/dev/neon-http-proxy.ts scripts/dev/
COPY server/database/migrations server/database/migrations
COPY --from=build /app/.output .output
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000
EXPOSE 3000
# The preview's own database is a copy of production: apply this branch's migrations, then serve.
CMD ["sh", "-c", "bun scripts/db-migrate.ts --force-env && exec node .output/server/index.mjs"]
