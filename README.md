# Virtual Room - Debug com Café

## Criei essa sala virtual aplicando meu conhecimento técnico de JavaScript, Node.js, Express, Docker e Cloud

Plataforma de interação virtual em tempo real, para colaboração entre a equipe tech, construída em ambiente 2D. O sistema permite que múltiplos usuários se conectem simultaneamente, naveguem pelo mapa, interajam via chat de texto, compartilhem áudio e transmitam a tela utilizando comunicação ponto a ponto (P2P).

---

## Funcionalidades

- **Movimentacao em Tempo Real** — Sincronizacao fluida de posicao e animacao dos personagens via WebSockets.
- **Comunicacao de Audio P2P** — Transmissao de voz com cancelamento de eco e supressao de ruido estabelecida via WebRTC.
- **Compartilhamento de Tela** — Apresentacao de janelas ou tela cheia integrada diretamente a sessao de video dos usuarios.
- **Chat Global** — Bate-papo em texto com envio rapido por atalhos de teclado e suporte a emojis.
- **Gerenciamento de Estado** — Indicacao visual de status de audio (mutado/desmutado) e deteccao de fala em tempo real.
- **Controle de Acesso** — Autenticacao com senha protegida por hash (bcrypt) e bloqueio automatico da sala ao atingir o limite de 30 usuarios.

---

## Tecnologias

| Camada | Tecnologias |
|---|---|
| Frontend | HTML5, CSS3, JavaScript (ES Modules) |
| Motor Grafico | Phaser 3 — renderizacao 2D e fisica arcade |
| Backend | Node.js, Express |
| Comunicacao em Tempo Real | Socket.io (WebSockets) |
| Comunicacao Multimidia | WebRTC (RTCPeerConnection) |
| Seguranca | bcrypt, Helmet (CSP), CORS configuravel |
| Infraestrutura | Docker (multi-stage build), Cloud |

---

## Estrutura do Projeto

```
virtual-room/
├── client/                  # Frontend
│   ├── public/
│   │   └── assets/
│   │       ├── maps/        # Mapa da sala
│   │       ├── personagens/ # Spritesheets dos avatares
│   │       └── tilesets/
│   ├── src/
│   │   ├── main.js          # Ponto de entrada — inicializa login e eventos de UI
│   │   ├── socket.js        # Conexao e autenticacao via Socket.io
│   │   ├── game.js          # Motor Phaser — sprites, movimentacao, colisoes
│   │   ├── audio.js         # Captura e controle de audio local
│   │   ├── webrtc.js        # Gerenciamento de peers P2P (offer/answer/ICE)
│   │   ├── screen.js        # Compartilhamento de tela via getDisplayMedia
│   │   └── ui.js            # Referencias ao DOM e renderizacao da lista de usuarios
│   ├── index.html
│   ├── style.css
│   └── package.json
│
├── server/
│   ├── index.js             # Servidor Express + Socket.io + logica de autenticacao
│   └── package.json
│
├── Dockerfile
├── .dockerignore
└── README.md
```

---

## Pre-requisitos

- Node.js **22 ou superior**
- npm
- Docker (opcional, para execucao contêinerizada)

> A versao minima do Node.js e 22 devido ao Vite 7, utilizado no build do frontend.

---

## Execucao Local

### 1. Instalar dependencias

A partir da raiz do projeto:

```bash
# Servidor
cd server
npm install

# Cliente
cd ../client
npm install
```

### 2. Iniciar o servidor

```bash
cd server
node index.js
```

### 3. Iniciar o cliente (modo desenvolvimento)

Em outro terminal:

```bash
cd client
npm run dev
```

O cliente estara disponivel no endereco exibido pelo Vite, normalmente `http://localhost:5173`.
O servidor estara em `http://localhost:8081`.

---

## Execucao com Docker

### Build da imagem

A partir da raiz do projeto, onde o `Dockerfile` esta localizado:

```bash
docker build -t virtual-room .
```

O processo utiliza multi-stage build:
- **Estagio 1** — compila o frontend com Vite e gera os assets estaticos.
- **Estagio 2** — sobe o servidor Node.js servindo os assets compilados via `express.static`.

### Executar o container

```bash
docker run -p 8081:8081 virtual-room
```

A aplicacao estara disponivel em `http://localhost:8081`.

### Variaveis de ambiente

| Variavel | Descricao | Padrao |
|---|---|---|
| `PORT` | Porta do servidor | `8081` |
| `CORS_ORIGIN` | Origem permitida pelo CORS | `*` |

Exemplo com variaveis em producao:

```bash
docker run -p 8081:8081 \
  -e PORT=8081 \
  -e CORS_ORIGIN=https://seu-dominio.com \
  virtual-room
```

### Persistencia de dados

O arquivo `users.json` (banco de usuarios) e criado dentro do container e perdido ao recria-lo. Para persistir entre deploys, montar um volume:

```bash
docker run -p 8081:8081 \
  -v $(pwd)/data:/app/data \
  virtual-room
```

E ajustar o caminho no `server/index.js`:

```js
const DB_FILE = path.join(__dirname, '..', 'data', 'users.json');
```

---

## Atalhos de Teclado

| Tecla | Acao |
|---|---|
| `Enter` | Abre o chat |
| `Enter` (no chat) | Envia a mensagem e fecha o chat |
| `Tab` (no chat) | Abre o seletor de emojis |
| `M` | Mutar / desmutar microfone |

---

## Direitos Autorais e Diretrizes de Uso

Este repositorio armazena o codigo-fonte da sala virtual desenvolvida com JavaScript, Node.js, Express, HTML, CSS e Docker. O acesso e publico para amostra de capacidade tecnica e compartilhamento de conhecimento.

A autoria da arquitetura do projeto original e reservada a Fernando Henrique (copyright 2026).

**Termos de permissao e limite de uso:**

1. A copia, o espelhamento, o download e a utilizacao de todo o codigo-fonte aqui disponivel sao permitidos, seja para uso em projetos pessoais, de estudo ou de mercado.
2. O uso da base estrutural do sistema e de sua interface visual para o desenvolvimento de novos trabalhos e autorizado.
3. Este repositorio e estritamente fechado para contribuicoes externas. Qualquer envio de pacotes com alteracoes, correcoes ou novas funcionalidades (pull requests) para o codigo original sera sumariamente rejeitado, a fim de manter a versao original inalterada.
