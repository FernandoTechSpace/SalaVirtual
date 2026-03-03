# Virtual Room - Debug com Café

## Criei uma sala virtual para interação e colaboração, onde apliquei meu conhecimento técnico de JavaScript, Node.js, Express, Docker e Cloud.

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
* **Infraestrutura:** Docker e Cloud.

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
2. Instale as dependências do servidor: npm install


## Direitos autorais e diretrizes de uso

Este repositório armazena o código-fonte da sala virtual desenvolvida com JavaScript, Node.js, Express, HTML, CSS e Docker. O acesso é público para amostra de capacidade técnica e compartilhamento de conhecimento.

A autoria da arquitetura do projeto original é reservada a Fernando Henrique (copyright 2026).

**Termos de permissão e limite de uso:**

1. A cópia, o espelhamento, o download e a utilização de todo o código-fonte aqui disponível são permitidos, seja para uso em projetos pessoais, de estudo ou de mercado.
2. O uso da base estrutural do sistema e de sua interface visual para o desenvolvimento de novos trabalhos é autorizado.
3. Este repositório é estritamente fechado para contribuições externas. Qualquer envio de pacotes com alterações, correções ou novas funcionalidades (*pull requests*) para o código original deste repositório será sumariamente rejeitado, a fim de manter a versão original inalterada.