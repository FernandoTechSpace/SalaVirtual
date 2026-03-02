FROM node:22-slim

WORKDIR /app

# 1. Instala dependencias
COPY server/package*.json ./server/
COPY client/package*.json ./client/

WORKDIR /app/server
RUN npm ci --omit=dev

WORKDIR /app/client
RUN npm ci

# 2. Argumento para quebrar o cache (CACHEBUST)
ARG CACHEBUST=1

# 3. Copia o código fonte
WORKDIR /app
COPY server/ ./server/
COPY client/ ./client/

# 4. Build do Frontend
WORKDIR /app/client
RUN npm run build

# 5. Mover arquivos para o lugar CERTO (CORREÇÃO DE CAMINHO)
WORKDIR /app
# Garante que a pasta publica do servidor esteja limpa
RUN rm -rf server/public
RUN mkdir -p server/public
# Copia do CLIENTE/DIST para SERVIDOR/PUBLIC
RUN cp -r client/dist/* server/public/

# 6. Permissões e Execução
RUN chown -R node:node /app
USER node
EXPOSE 8081

CMD ["node", "server/index.js"]