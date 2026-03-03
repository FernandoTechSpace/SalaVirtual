# ============================================================
# Estagio 1: build do frontend (client)
# Compila os assets estaticos via Vite
# ============================================================
FROM node:18-alpine AS build-client

WORKDIR /app/client

# Copia apenas os arquivos de dependencia primeiro para aproveitar o cache do Docker
COPY client/package.json client/package-lock.json ./
RUN npm ci

# Copia o restante do codigo do cliente e executa o build
COPY client/ ./
RUN npm run build

# ============================================================
# Estagio 2: imagem final de producao (server)
# Serve apenas o backend com os assets estaticos ja compilados
# ============================================================
FROM node:18-alpine AS production

WORKDIR /app

# Copia apenas os arquivos de dependencia do servidor
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev

# Copia o codigo do servidor
COPY server/ ./

# Copia os assets estaticos compilados pelo Vite para a pasta publica do servidor
# O Express serve esta pasta via express.static
COPY --from=build-client /app/client/dist ./public

# Porta exposta pelo servidor (deve coincidir com process.env.PORT ou o padrao 8081)
EXPOSE 8081

# Variavel de ambiente de producao
ENV NODE_ENV=production

# Comando de inicializacao
CMD ["node", "index.js"]