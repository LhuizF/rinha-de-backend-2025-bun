FROM oven/bun AS builder

WORKDIR /app

COPY package.json bun.lock ./

RUN bun install --frozen-lockfile --production

COPY . .

RUN bun build src/index.ts --outdir dist --target bun --minify


FROM oven/bun:1.0-alpine

WORKDIR /app

COPY package.json .

COPY --from=builder /app/node_modules ./node_modules

COPY --from=builder /app/dist ./dist

COPY .env .

EXPOSE 3333

CMD ["bun", "dist/index.js"]
