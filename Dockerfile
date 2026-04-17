# syntax=docker/dockerfile:1
FROM node:20-alpine AS deps
WORKDIR /app

COPY package*.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
# Explicit sources only (no COPY . .) — avoids shipping .env*, local secrets, or CI junk into the image.
COPY package.json package-lock.json ./
COPY next.config.ts tsconfig.json postcss.config.mjs eslint.config.mjs next-env.d.ts ./
COPY public ./public
COPY src ./src

RUN npm run build && npm prune --omit=dev

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Official node image includes user/group `node` (uid 1000). Run the app as non-root.
# package.json is read-only at runtime (Sonar: no write bit on copied manifest).
COPY --chown=node:node --chmod=444 --from=builder /app/package.json ./package.json
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/public ./public
COPY --chown=node:node --from=builder /app/.next ./.next

# Strip group/other write bits on shipped trees; owner (node) keeps write where Next needs cache under .next.
RUN chmod 444 /app/package.json \
  && find /app/public -type f -exec chmod 444 {} + \
  && find /app/public -type d -exec chmod 555 {} + \
  && chmod -R g-w,o-w /app/node_modules \
  && chmod -R g-w,o-w /app/.next

# WORKDIR is created as root; ensure the runtime user owns the app directory for any writes (e.g. cache).
RUN chown node:node /app

USER node

EXPOSE 3000

CMD ["./node_modules/.bin/next", "start", "-H", "0.0.0.0", "-p", "3000"]
