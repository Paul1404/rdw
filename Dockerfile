FROM oven/bun:1.3.14 AS builder
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

FROM oven/bun:1.3.14 AS prod-deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

FROM oven/bun:1.3.14 AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/src/server/db ./src/server/db
COPY --from=builder /app/drizzle ./drizzle
COPY --from=prod-deps /app/node_modules ./node_modules
COPY package.json ./
EXPOSE 3000
CMD ["bun", "--bun", "dist/server/server.js"]
