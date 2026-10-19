# ── Dependencies (full install, shared by build and migrator)
FROM node:24-alpine AS deps
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.34.6 --activate
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ── Build the Next.js standalone server
FROM node:24-alpine AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.34.6 --activate
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_OUTPUT=standalone
# Placeholder so modules that read it at import time load during the build; the real URL comes at runtime.
ENV DATABASE_URL=postgres://build:build@localhost:5432/build
RUN pnpm build

# ── One-shot migrator: applies Drizzle migrations, then the idempotent seed (exercise catalog + profile if empty)
FROM node:24-alpine AS migrator
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json tsconfig.json drizzle.config.ts ./
COPY drizzle ./drizzle
COPY src/server/db ./src/server/db
CMD ["sh", "-c", "node_modules/.bin/drizzle-kit migrate && node_modules/.bin/tsx src/server/db/seed.ts"]

# ── Runtime: minimal standalone server
FROM node:24-alpine AS run
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
RUN addgroup -S app && adduser -S app -G app
COPY --from=build --chown=app:app /app/.next/standalone ./
COPY --from=build --chown=app:app /app/.next/static ./.next/static
COPY --from=build --chown=app:app /app/public ./public
USER app
EXPOSE 3000
CMD ["node", "server.js"]
