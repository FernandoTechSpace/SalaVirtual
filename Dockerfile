# Estagio de construcao do cliente.
from node:22-slim as builder

workdir /app/client

copy client/package*.json ./
run npm ci

copy client/ ./
run npm run build

# Estagio final de producao.
from node:22-slim

workdir /app

run chown node:node /app

user node

workdir /app/server
copy --chown=node:node server/package*.json ./
run npm ci --omit=dev

copy --chown=node:node server/ ./

run mkdir -p public
copy --chown=node:node --from=builder /app/client/dist/ ./public/

workdir /app
expose 8081

cmd ["node", "server/index.js"]