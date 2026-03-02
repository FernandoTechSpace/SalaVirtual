# Virtual Room - Debug com Café

Plataforma de interação virtual em tempo real, para colaboração entre a equipe tech, construída em ambiente 2D. O sistema permite que múltiplos usuários se conectem simultaneamente, naveguem pelo mapa, interajam via chat de texto, compartilhem áudio e transmitam a tela utilizando comunicação ponto a ponto (P2P).

## Funcionalidades Implementadas

* **Movimentação em Tempo Real:** Sincronização fluida da posição e animação dos personagens utilizando WebSockets.
* **Comunicação de Áudio P2P:** Transmissão de voz otimizada com cancelamento de eco e supressão de ruído, estabelecida via WebRTC.
* **Compartilhamento de Tela:** Recurso de apresentação de janelas ou tela cheia integrado diretamente à sessão de vídeo dos usuários.
* **Chat Global:** Bate-papo em texto com suporte a envio rápido via atalhos de teclado e integração nativa com emojis.
* **Gerenciamento de Estado:** Identificação visual de status de áudio (mutado/desmutado) e indicação de usuário falando em tempo real.
* **Controle de Acesso:** Sistema de autenticação simples e bloqueio automático de sala ao atingir a capacidade máxima configurada (30 usuários).

## Tecnologias Utilizadas

* **Frontend:** HTML5, CSS3, JavaScript (Vanilla).
* **Motor Gráfico:** Phaser 3 (Renderização 2D e Física Arcade).
* **Backend:** Node.js, Express.
* **Comunicação e Sinalização:** Socket.io (WebSockets puros).
* **Comunicação Multimídia:** WebRTC (RTCPeerConnection).
* **Infraestrutura:** Docker.

## Estrutura do Projeto

* `/server`: Contém a lógica de backend (Node.js/Socket.io), gerenciamento de usuários online e sinalização WebRTC.
* `/client`: Contém o código frontend (index.html), lógica do motor Phaser 3 e tratamento de mídias do usuário.
* `/public`: Diretório de arquivos estáticos servidos pelo Express (assets, imagens de personagens, mapas).

## Requisitos Prévios

Para executar o projeto localmente, é necessário ter instalado:

* Node.js (versão 18 ou superior)
* NPM (Gerenciador de pacotes)
* Docker (Opcional, para execução contêinerizada)

## Instruções de Execução

### Execução Local (Node.js)

1. Clone o repositório e acesse a pasta raiz.
2. Instale as dependências do servidor:
   npm install