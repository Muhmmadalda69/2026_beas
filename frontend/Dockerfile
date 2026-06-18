# Next.js production image using the standalone output for a minimal footprint.
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# Use `npm install` rather than `npm ci`: the lockfile is generated on the host
# (Windows) and npm omits some Linux-only optional native deps (e.g. the
# @tailwindcss/oxide wasm runtime), which makes the strict `npm ci` check fail
# inside this Linux image. `npm install` resolves the correct platform deps.
RUN --mount=type=cache,target=/root/.npm \
    npm install --no-audit --no-fund

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN --mount=type=cache,target=/app/.next/cache \
    npm run build

FROM node:22-alpine AS run
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup -g 10001 nodejs && adduser -D -u 10001 -G nodejs nextjs
COPY --from=build /app/public ./public
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
ENV PORT=3000 HOSTNAME=0.0.0.0
CMD ["node", "server.js"]
