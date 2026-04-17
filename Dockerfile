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
# package.json: mode 0444 only on COPY (no write for u/g/o); do not use --chown here so the layer is explicitly non-writable.
COPY --chmod=444 --from=builder /app/package.json ./package.json
# Dependencies: copy without --chown; chmod strips all write bits (u/g/o) after chown below (Sonar).
COPY --from=builder /app/node_modules ./node_modules
# Static assets: COPY without --chown; files 0444 / dirs 0555 in RUN (no write for u/g/o).
COPY --from=builder /app/public ./public
# Build output: COPY without --chown; chown + chmod in RUN (no g/o write; owner may write under .next for Next cache).
COPY --from=builder /app/.next ./.next

# Enforce read-only package.json; lock down public + node_modules (no write bits); .next owned by node, no g/o write.
RUN chmod 0444 /app/package.json \
  && chown node:node /app/package.json \
  && chown -R node:node /app/public \
  && find /app/public -type f -exec chmod 444 {} + \
  && find /app/public -type d -exec chmod 555 {} + \
  && chown -R node:node /app/node_modules \
  && find /app/node_modules \( -type f -o -type d \) -exec chmod a-w {} + \
  && chown -R node:node /app/.next \
  && chmod -R g-w,o-w /app/.next

# WORKDIR is created as root; ensure the runtime user owns the app directory for any writes (e.g. cache).
RUN chown node:node /app

USER node

EXPOSE 3000

CMD ["./node_modules/.bin/next", "start", "-H", "0.0.0.0", "-p", "3000"]
