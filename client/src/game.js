// Modulo do motor de jogo Phaser
// Responsavel por renderizacao, movimentacao, colisoes e eventos de outros jogadores

import { ui } from './ui.js';
import { initCall, cleanupPeer } from './webrtc.js';

const emojis = ['😀','😂','😍','😭','😡','👍','👎','👋','🔥','🎉','💀','💩','🤖','👾','👀','❤️','✅','⛔','🚀','☕'];

export function iniciarPhaser(dados, globalSocket, skinSelecionada) {
  const config = {
    type: Phaser.AUTO,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: 1280,
      height: 720
    },
    parent: 'app',
    backgroundColor: '#1a1a1a',
    pixelArt: true,
    physics: {
      default: 'arcade',
      arcade: { gravity: { y: 0 }, debug: false }
    },
    scene: { preload, create, update }
  };

  new Phaser.Game(config);

  let jogador;
  let outrosJogadores = null;
  let cursors;

  function preload() {
    this.load.image('sala', 'assets/maps/OfficeRoomModerna.png');
    for (let i = 0; i < 40; i++) {
      const id = i.toString().padStart(3, '0');
      this.load.spritesheet(
        'char_' + id,
        'assets/personagens/' + id + '.png',
        { frameWidth: 21, frameHeight: 32 }
      );
    }
  }

  function create() {
    this.input.keyboard.removeCapture('SPACE');
    this.input.keyboard.removeCapture('ENTER');

    const self = this;

    this.add.image(640, 360, 'sala').setDisplaySize(720, 720);
    this.physics.world.setBounds(280, 0, 720, 720);

    // Configuracao das paredes invisiveis de colisao
    self.paredes = this.physics.add.staticGroup();
    const addW = (x, y, w, h) => {
      const p = self.paredes.create(280 + (720 * x), 720 * y, null);
      p.setVisible(false);
      p.body.setSize(720 * w, 720 * h);
    };
    addW(0.045, 0.5,  0.09, 1);
    addW(0.955, 0.5,  0.09, 1);
    addW(0.5,   0.08, 1,    0.16);
    addW(0.5,   0.95, 1,    0.10);
    addW(0.26,  0.57, 0.26, 0.48);
    addW(0.70,  0.41, 0.12, 0.15);
    addW(0.70,  0.65, 0.12, 0.15);

    // Criacao das animacoes de todos os personagens
    for (let i = 0; i < 40; i++) {
      const k = 'char_' + i.toString().padStart(3, '0');
      const cf = (n, fs) => self.anims.create({
        key: k + '_' + n,
        frames: self.anims.generateFrameNumbers(k, { frames: fs }),
        frameRate: 6,
        repeat: -1,
        yoyo: true
      });
      cf('baixo', [0, 2]);
      cf('esq',   [3, 5]);
      cf('dir',   [6, 8]);
      cf('cima',  [9, 11]);
    }

    outrosJogadores = this.physics.add.group();

    // Cria sprite local ou remoto
    // Para sprites remotos, verifica duplicatas antes de criar
    const criarSprite = (i, isLocal) => {
      if (!isLocal) {
        let existe = false;
        outrosJogadores.getChildren().forEach(o => {
          if (o.playerId === i.playerId) existe = true;
        });
        if (existe) return;
      }

      const spr = self.physics.add.sprite(i.x, i.y, 'char_' + i.skin).setScale(1.5);
      if (spr.body) {
        spr.body.setSize(10, 8);
        spr.body.setOffset(5, 24);
        spr.setCollideWorldBounds(true);
      }

      spr.playerId  = i.playerId;
      spr.nomeTexto = self.add.text(0, 0, i.nome, {
        fontSize: '12px',
        fontFamily: 'monospace',
        fill: '#ffffff',
        stroke: '#000000',
        strokeThickness: 3
      }).setOrigin(0.5).setDepth(9999);

      spr.iconTalk = self.add.text(0, 0, '🔊', { fontSize: '16px' })
        .setOrigin(0.5).setVisible(false).setDepth(10000);

      // Correcao: propriedade balaoFala inicializada como null
      // Era: propriedade nao existia, causando erro em jogadorSaiu ao chamar
      // o.balaoFala.destroy() quando o jogador saia sem ter enviado nenhuma mensagem
      spr.balaoFala = null;

      if (isLocal) {
        jogador = spr;
        self.physics.add.collider(jogador, self.paredes);
      } else {
        outrosJogadores.add(spr);
      }
    };

    // Renderiza jogadores ja presentes na sala no momento do login
    Object.keys(dados.jogadores).forEach(id => {
      if (id === dados.id) criarSprite(dados.jogadores[id], true);
      else criarSprite(dados.jogadores[id], false);
    });

    // Renderiza jogadores que entram depois e inicia a chamada de audio
    // Correcao: apenas quem ja esta na sala inicia a chamada (evita race condition bilateral)
    globalSocket.on('novoJogador', i => {
      criarSprite(i, false);
      initCall(i.playerId);
    });

    // Remove sprite e encerra peer ao jogador sair
    globalSocket.on('jogadorSaiu', id => {
      cleanupPeer(id);
      outrosJogadores.getChildren().forEach(o => {
        if (o.playerId === id) {
          o.nomeTexto.destroy();
          // Correcao: verificacao de existencia antes de destruir balaoFala
          // Era: o.balaoFala.destroy() chamado sem verificar se o objeto existia
          if (o.balaoFala) o.balaoFala.destroy();
          if (o.iconTalk)  o.iconTalk.destroy();
          o.destroy();
        }
      });
    });

    globalSocket.on('jogadorMoveu', p => {
      outrosJogadores.getChildren().forEach(o => {
        if (o.playerId === p.playerId) {
          o.setPosition(p.x, p.y);
          updateUI(o);
          const k = 'char_' + p.skin + '_' + (p.anim || 'baixo');
          if (p.anim && o.anims.currentAnim?.key !== k) o.play(k, true);
          else if (!p.anim) o.anims.stop();
          o.setDepth(o.y);
        }
      });
    });

    globalSocket.on('usuarioFalando', d => {
      const target = (d.id === globalSocket.id) ? jogador : null;
      if (target) {
        toggleTalkIcon(target, d.falando);
      } else {
        outrosJogadores.getChildren().forEach(o => {
          if (o.playerId === d.id) toggleTalkIcon(o, d.falando);
        });
      }
    });

    globalSocket.on('chatMessage', m => {
      // Correcao: campos nome e texto inseridos via textContent, nao innerHTML
      // Era: d.innerHTML = `<strong>${m.nome}:</strong> ${m.texto}`
      // Qualquer html nos campos nome ou texto seria interpretado pelo navegador (xss)
      const wrapper = document.createElement('div');
      const nomeEl  = document.createElement('strong');
      const textoEl = document.createElement('span');
      nomeEl.textContent  = m.nome + ': ';
      textoEl.textContent = m.texto;
      wrapper.appendChild(nomeEl);
      wrapper.appendChild(textoEl);

      const chatMessages = document.getElementById('chat-messages');
      chatMessages.appendChild(wrapper);
      chatMessages.scrollTop = chatMessages.scrollHeight;

      let alvo = (m.playerId === globalSocket.id) ? jogador : null;
      if (!alvo) {
        outrosJogadores.getChildren().forEach(o => {
          if (o.playerId === m.playerId) alvo = o;
        });
      }
      if (alvo) showBubble(self, alvo, m.texto);
    });

    cursors = this.input.keyboard.createCursorKeys();
  }

  function update() {
    if (!jogador) return;
    updateUI(jogador);

    // Congela movimentacao enquanto o usuario esta digitando no chat
    if (document.activeElement === ui.chatInput) {
      jogador.setVelocity(0);
      jogador.anims.stop();
      if (jogador.oldPos && jogador.oldPos.anim !== null) {
        globalSocket.emit('movimentoJogador', { x: jogador.x, y: jogador.y, anim: null });
        jogador.oldPos.anim = null;
      }
      return;
    }

    jogador.setVelocity(0);
    let m = false;
    let d = 'baixo';

    if (cursors.left.isDown)       { jogador.setVelocityX(-200); d = 'esq';  m = true; }
    else if (cursors.right.isDown) { jogador.setVelocityX(200);  d = 'dir';  m = true; }
    if (cursors.up.isDown)         { jogador.setVelocityY(-200); if (!m) d = 'cima';  m = true; }
    else if (cursors.down.isDown)  { jogador.setVelocityY(200);  if (!m) d = 'baixo'; m = true; }

    if (m) {
      jogador.play('char_' + skinSelecionada + '_' + d, true);
    } else {
      jogador.anims.stop();
      const frameMap = { baixo: 1, esq: 4, dir: 7, cima: 10 };
      const direcaoAtual = jogador.anims.currentAnim
        ? jogador.anims.currentAnim.key.split('_')[2]
        : 'baixo';
      if (frameMap[direcaoAtual]) jogador.setFrame(frameMap[direcaoAtual]);
    }

    jogador.body.velocity.normalize().scale(200);
    jogador.setDepth(jogador.y);

    const x = jogador.x;
    const y = jogador.y;

    if (jogador.oldPos && (x !== jogador.oldPos.x || y !== jogador.oldPos.y || m)) {
      globalSocket.emit('movimentoJogador', { x, y, anim: m ? d : null });
    }
    jogador.oldPos = { x, y, anim: m ? d : null };
  }

  // Atualiza posicao dos elementos de texto vinculados ao sprite
  function updateUI(s) {
    if (s.nomeTexto) {
      s.nomeTexto.setPosition(s.x, s.y - 40);
      s.nomeTexto.setDepth(s.y + 1000);
    }
    if (s.balaoFala) {
      s.balaoFala.setPosition(s.x, s.y - 80);
      s.balaoFala.setDepth(s.y + 1001);
    }
    if (s.iconTalk) {
      s.iconTalk.setPosition(s.x, s.y - 60);
      s.iconTalk.setDepth(s.y + 1002);
    }
  }

  function toggleTalkIcon(sprite, isTalking) {
    if (sprite.iconTalk) sprite.iconTalk.setVisible(isTalking);
  }

  // Exibe balao de fala acima do sprite com estilo diferente para emojis
  function showBubble(s, sprite, txt) {
    if (sprite.balaoFala) sprite.balaoFala.destroy();

    const isEmoji = (txt.length <= 4 && /[\u{1F300}-\u{1F9FF}]/u.test(txt)) || emojis.includes(txt);
    const style = isEmoji
      ? {
          fontSize: '24px',
          fill: '#ffffff',
          stroke: '#000000',
          strokeThickness: 4,
          backgroundColor: null
        }
      : {
          fontSize: '14px',
          fontFamily: 'Segoe UI, Tahoma, sans-serif',
          fill: '#000000',
          backgroundColor: '#ffffff',
          padding: { x: 12, y: 8 },
          wordWrap: { width: 160 },
          align: 'center'
        };

    const b = s.add.text(sprite.x, sprite.y - 80, txt, style)
      .setOrigin(0.5)
      .setDepth(9999);

    sprite.balaoFala = b;

    s.time.delayedCall(4000, () => {
      if (sprite.balaoFala === b) {
        b.destroy();
        sprite.balaoFala = null;
      }
    });
  }
}