# Development image: installs dependencies and runs the API with hot-reload
# (tsx watch). docker-compose bind-mounts the source over this, so the
# COPY step here only matters for a one-off `docker build`/`docker run`.
FROM node:20-alpine

# Prisma's query engine needs a real OpenSSL present to detect the correct
# binary target on Alpine (musl) -- without this it fails at runtime with
# "Could not parse schema engine response".
RUN apk add --no-cache openssl

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma
RUN npm install

COPY . .

EXPOSE 4000

# Applies any pending migrations before starting so a fresh `docker compose up`
# never requires a manual `prisma migrate` step.
CMD ["sh", "-c", "npx prisma migrate deploy && npm run dev"]
