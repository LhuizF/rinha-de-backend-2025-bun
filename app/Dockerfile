FROM oven/bun:1.0-alpine

WORKDIR /app

COPY package*.json bun.lock ./

RUN apk add --no-cache curl

RUN bun install --frozen-lockfile

COPY . .

EXPOSE 3333

CMD ["bun", "run", "start"]
