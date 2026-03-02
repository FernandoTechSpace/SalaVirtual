// Variaveis Globais
let jogo; 
let socket;
let jogador;
let teclas;
let velocidade = 200;
let digitando = false; 

// Aguarda a pagina carregar
window.addEventListener('load', () => {
  console.log('Pagina carregada. Script iniciado.');
  
  const telaLogin = document.getElementById('tela-login');
  const btnEntrar = document.getElementById('btn-entrar');
  const inputNome = document.getElementById('input-nome');
  const chatContainer = document.getElementById('chat-container');

  if (!btnEntrar) {
    console.error('ERRO: Botao entrar nao encontrado!');
    return;
  }

  // Foco no input
  inputNome.focus();

  // Funcao de Login
  const realizarLogin = () => {
    console.log('Botao clicado.');
    const nome = inputNome.value.trim();
    
    if (nome.length === 0) {
      alert('Por favor, digite um nome!');
      return;
    }

    // VERIFICACAO CRITICA DE DEPENDENCIAS
    if (typeof window.Phaser === 'undefined') {
      alert('ERRO: A biblioteca Phaser ainda nao carregou. Verifique sua internet ou tente recarregar.');
      return;
    }
    if (typeof window.io === 'undefined') {
      alert('ERRO: A biblioteca Socket.IO nao carregou. O servidor esta rodando?');
      return;
    }

    console.log('Login aprovado para:', nome);
      
    // 1. Oculta login e mostra chat
    telaLogin.style.display = 'none';
    chatContainer.style.display = 'flex';
      
    // 2. Inicia o Phaser
    iniciarGame(nome);
  };

  // Eventos de clique e tecla
  btnEntrar.onclick = realizarLogin;
  
  inputNome.onkeydown = (e) => {
    if (e.key === 'Enter') realizarLogin();
  };
});

function iniciarGame(nomeUsuario) {
  // Guarda o nome globalmente
  window.NOME_USUARIO = nomeUsuario;
  
  // Configuracao do Phaser (Definida aqui dentro para garantir que Phaser existe)
  const configuracaoJogo = {
    type: window.Phaser.AUTO,
    scale: {
      mode: window.Phaser.Scale.FIT,
      autoCenter: window.Phaser.Scale.CENTER_BOTH,
      width: 1280,
      height: 720
    },
    parent: 'app',
    backgroundColor: '#1a1a1a', 
    pixelArt: true,
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { y: 0 },
        debug: false 
      }
    },
    scene: {
      preload: carregarRecursos,
      create: criarCena,
      update: atualizarCena
    }
  };

  jogo = new window.Phaser.Game(configuracaoJogo);
}

// --- FUNCOES DO JOGO ---

function carregarRecursos() {
  this.load.image('sala-reuniao', 'assets/maps/OfficeRoomModerna.png');
  this.load.spritesheet('jogador', 'assets/personagens/021.png', {
    frameWidth: 21,
    frameHeight: 32
  });
}

function criarCena() {
  const self = this;
  const nomeUsuario = window.NOME_USUARIO;

  // 1. CENARIO
  const sala = this.add.image(640, 360, 'sala-reuniao');
  sala.setDisplaySize(720, 720);
  
  const inicioX = 280; 
  const inicioY = 0;
  const tamanhoSala = 720;

  this.physics.world.setBounds(inicioX, inicioY, tamanhoSala, tamanhoSala);
  this.paredes = this.physics.add.staticGroup();

  const criarBloqueio = (xPct, yPct, wPct, hPct) => {
    const centroX = inicioX + (tamanhoSala * xPct);
    const centroY = inicioY + (tamanhoSala * yPct);
    const largura = tamanhoSala * wPct;
    const altura = tamanhoSala * hPct;
    const p = self.paredes.create(centroX, centroY, null);
    p.setVisible(false); 
    p.body.setSize(largura, altura);
    return p;
  };

  // Paredes
  criarBloqueio(0.045, 0.5, 0.09, 1.0); 
  criarBloqueio(0.955, 0.5, 0.09, 1.0); 
  criarBloqueio(0.5, 0.08, 1.0, 0.16);  
  criarBloqueio(0.5, 0.95, 1.0, 0.10);  
  // Mesas
  criarBloqueio(0.26, 0.57, 0.26, 0.48);
  criarBloqueio(0.70, 0.41, 0.12, 0.15); 
  criarBloqueio(0.70, 0.65, 0.12, 0.15); 

  // 2. ANIMACOES
  const criarAnim = (chave, frames) => {
    this.anims.create({
      key: chave,
      frames: this.anims.generateFrameNumbers('jogador', { frames: frames }),
      frameRate: 6,
      repeat: -1,
      yoyo: true
    });
  };
  criarAnim('baixo', [0, 2]);
  criarAnim('esquerda', [3, 5]);
  criarAnim('direita', [6, 8]);
  criarAnim('cima', [9, 11]);

  // 3. SOCKET
  this.outrosJogadores = this.physics.add.group();
  
  // Conexao Socket usando a global window.io
  socket = window.io({
    query: { nome: nomeUsuario }
  });

  socket.on('jogadoresAtuais', (jogadores) => {
    Object.keys(jogadores).forEach((id) => {
      if (jogadores[id].playerId === socket.id) {
        adicionarJogadorLocal(self, jogadores[id]);
      } else {
        adicionarOutroJogador(self, jogadores[id]);
      }
    });
  });

  socket.on('novoJogador', (info) => adicionarOutroJogador(self, info));

  socket.on('jogadorSaiu', (playerId) => {
    self.outrosJogadores.getChildren().forEach((outro) => {
      if (playerId === outro.playerId) {
        if (outro.nomeTexto) outro.nomeTexto.destroy();
        if (outro.balaoFala) outro.balaoFala.destroy();
        outro.destroy();
      }
    });
  });

  socket.on('jogadorMoveu', (info) => {
    self.outrosJogadores.getChildren().forEach((outro) => {
      if (info.playerId === outro.playerId) {
        outro.setPosition(info.x, info.y);
        
        if (outro.nomeTexto) {
          outro.nomeTexto.setPosition(outro.x, outro.y - 25);
          outro.nomeTexto.setDepth(outro.y + 1000);
        }
        
        if (outro.balaoFala) {
          outro.balaoFala.setPosition(outro.x, outro.y - 50);
          outro.balaoFala.setDepth(outro.y + 1001);
        }

        if (info.anim) {
             if (outro.anims.currentAnim?.key !== info.anim) outro.play(info.anim, true);
        } else {
             outro.anims.stop();
        }
        outro.setDepth(outro.y);
      }
    });
  });

  configurarChat(self);

  // 4. CONTROLES
  teclas = this.input.keyboard.createCursorKeys();
  this.input.keyboard.removeCapture('SPACE'); 
  this.input.keyboard.removeCapture('ENTER'); 
}

function configurarChat(cena) {
  const inputChat = document.getElementById('chat-input');
  const divMensagens = document.getElementById('chat-messages');

  inputChat.addEventListener('focus', () => { digitando = true; });
  inputChat.addEventListener('blur', () => { digitando = false; });
  
  window.addEventListener('mousedown', (e) => {
    if (e.target !== inputChat) {
      inputChat.blur();
      digitando = false;
    }
  });
  
  inputChat.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Enter') {
      if (inputChat.value.trim() !== '') {
        socket.emit('chatMessage', inputChat.value.trim());
        inputChat.value = '';
      }
      inputChat.blur();
      digitando = false;
    }
  });

  socket.on('chatMessage', (msg) => {
    const linha = document.createElement('div');
    linha.innerHTML = `<strong>${msg.nome}:</strong> ${msg.texto}`;
    divMensagens.appendChild(linha);
    divMensagens.scrollTop = divMensagens.scrollHeight;

    let alvo = null;
    if (msg.playerId === socket.id) {
      alvo = jogador;
    } else {
      cena.outrosJogadores.getChildren().forEach(outro => {
        if (outro.playerId === msg.playerId) alvo = outro;
      });
    }

    if (alvo) {
      exibirBalaoFala(cena, alvo, msg.texto);
    }
  });
}

function exibirBalaoFala(cena, sprite, texto) {
  if (sprite.balaoFala) sprite.balaoFala.destroy();

  const balao = cena.add.text(sprite.x, sprite.y - 50, texto, {
    fontSize: '14px',
    fontFamily: 'Arial',
    color: '#000000',
    backgroundColor: '#ffffff',
    padding: { x: 8, y: 4 },
    align: 'center',
    wordWrap: { width: 150 }
  });
  balao.setOrigin(0.5);
  balao.setDepth(9999);
  sprite.balaoFala = balao;

  cena.time.delayedCall(4000, () => {
    if (sprite.balaoFala === balao) {
      balao.destroy();
      sprite.balaoFala = null;
    }
  });
}

function criarTextoNome(cena, x, y, nome) {
  const texto = cena.add.text(x, y - 25, nome, {
    fontSize: '12px',
    fontFamily: 'monospace',
    fill: '#ffffff',
    backgroundColor: '#00000080',
    padding: { x: 4, y: 2 }
  });
  texto.setOrigin(0.5);
  texto.setDepth(9999); 
  return texto;
}

function adicionarJogadorLocal(cena, info) {
  jogador = cena.physics.add.sprite(info.x, info.y, 'jogador');
  jogador.setScale(1.5);
  jogador.body.setSize(10, 8);
  jogador.body.setOffset(5, 24);
  jogador.setCollideWorldBounds(true);
  jogador.nomeTexto = criarTextoNome(cena, info.x, info.y, info.nome);
  cena.physics.add.collider(jogador, cena.paredes);
}

function adicionarOutroJogador(cena, info) {
  const outro = cena.add.sprite(info.x, info.y, 'jogador');
  outro.playerId = info.playerId;
  outro.setScale(1.5);
  outro.setDepth(info.y);
  outro.nomeTexto = criarTextoNome(cena, info.x, info.y, info.nome);
  if(info.anim) {
      outro.play(info.anim);
      outro.anims.stop();
  }
  cena.outrosJogadores.add(outro);
}

function atualizarCena() {
  if (!jogador) return;

  if (jogador.nomeTexto) {
    jogador.nomeTexto.setPosition(jogador.x, jogador.y - 25);
    jogador.nomeTexto.setDepth(jogador.y + 1000);
  }
  if (jogador.balaoFala) {
    jogador.balaoFala.setPosition(jogador.x, jogador.y - 50);
    jogador.balaoFala.setDepth(jogador.y + 1001);
  }

  if (digitando) {
    jogador.setVelocity(0);
    jogador.anims.stop();
    if (jogador.oldPosition && jogador.oldPosition.anim !== null) {
       socket.emit('movimentoJogador', { x: jogador.x, y: jogador.y, anim: null });
       jogador.oldPosition.anim = null;
    }
    return;
  }

  jogador.setVelocity(0);
  let moveu = false;
  let animacaoAtual = jogador.anims.currentAnim ? jogador.anims.currentAnim.key : 'baixo';

  if (teclas.left.isDown) {
    jogador.setVelocityX(-velocidade);
    jogador.anims.play('esquerda', true);
    moveu = true;
    animacaoAtual = 'esquerda';
  } else if (teclas.right.isDown) {
    jogador.setVelocityX(velocidade);
    jogador.anims.play('direita', true);
    moveu = true;
    animacaoAtual = 'direita';
  }

  if (teclas.up.isDown) {
    jogador.setVelocityY(-velocidade);
    if (!moveu) {
        jogador.anims.play('cima', true);
        animacaoAtual = 'cima';
    }
    moveu = true;
  } else if (teclas.down.isDown) {
    jogador.setVelocityY(velocidade);
    if (!moveu) {
        jogador.anims.play('baixo', true);
        animacaoAtual = 'baixo';
    }
    moveu = true;
  }

  if (!moveu) {
    jogador.anims.stop();
    if (jogador.anims.currentAnim) {
      const chave = jogador.anims.currentAnim.key;
      animacaoAtual = chave;
      if (chave === 'baixo') jogador.setFrame(1);
      if (chave === 'esquerda') jogador.setFrame(4);
      if (chave === 'direita') jogador.setFrame(7);
      if (chave === 'cima') jogador.setFrame(10);
    }
  }

  jogador.body.velocity.normalize().scale(velocidade);
  jogador.setDepth(jogador.y);

  const x = jogador.x;
  const y = jogador.y;
  
  if (jogador.oldPosition && 
      (x !== jogador.oldPosition.x || y !== jogador.oldPosition.y || moveu)) {
      
      socket.emit('movimentoJogador', {
          x: x,
          y: y,
          anim: moveu ? animacaoAtual : null 
      });
  }
  
  jogador.oldPosition = { x, y, anim: animacaoAtual };
}