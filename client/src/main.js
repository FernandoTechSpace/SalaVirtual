// Ponto de entrada do frontend
// Inicializa a tela de login, carrega o grid de personagens e registra os eventos de UI

import { ui, fecharVideo } from './ui.js';
import { toggleMute, toggleDeafen } from './audio.js';
import { toggleScreenShare } from './screen.js';
import { conectar } from './socket.js';

const emojis = ['😀','😂','😍','😭','😡','👍','👎','👋','🔥','🎉','💀','💩','🤖','👾','👀','❤️','✅','⛔','🚀','☕'];

let skinSelecionada = null;
let skinsEmUso = [];

// Popula o picker de emojis
emojis.forEach(e => {
  const btn = document.createElement('button');
  btn.className = 'emoji-btn';
  btn.innerText = e;
  btn.onclick = () => { ui.chatInput.value += e; ui.chatInput.focus(); };
  ui.emoji.appendChild(btn);
});

// Eventos dos botoes do menu e chat
document.getElementById('btn-emoji').onclick = (e) => {
  e.stopPropagation();
  ui.emoji.style.display = ui.emoji.style.display === 'grid' ? 'none' : 'grid';
};
document.getElementById('btn-menu').onclick = (e) => {
  e.stopPropagation();
  const dd = document.getElementById('menu-dropdown');
  dd.style.display = dd.style.display === 'flex' ? 'none' : 'flex';
};
document.getElementById('btn-mute').onclick = toggleMute;
document.getElementById('btn-deafen').onclick = toggleDeafen;
document.getElementById('btn-screen').onclick = toggleScreenShare;
document.getElementById('btn-logout').onclick = () => { location.reload(); };

window.onclick = () => {
  ui.emoji.style.display = 'none';
  document.getElementById('menu-dropdown').style.display = 'none';
};

// Expoe fecharVideo para o botao inline do html
window.fecharVideo = fecharVideo;

// Gerenciamento de teclado: chat e atalhos de jogo
document.addEventListener('keydown', async (e) => {
  if (ui.login.style.display !== 'none') return;

  if (document.activeElement === ui.chatInput) {
    if (e.key === 'Tab') {
      e.preventDefault();
      ui.emoji.style.display = ui.emoji.style.display === 'grid' ? 'none' : 'grid';
      return;
    }
    e.stopPropagation();
    if (e.key === 'Enter') {
      e.preventDefault();
      const { globalSocket } = await import('./socket.js').catch(() => ({ globalSocket: null }));
      if (ui.chatInput.value.trim() && globalSocket) {
        globalSocket.emit('chatMessage', ui.chatInput.value.trim());
        ui.chatInput.value = '';
      }
      ui.chatInput.blur();
      ui.emoji.style.display = 'none';
    }
    return;
  }

  if (e.key === 'Enter') { e.preventDefault(); ui.chatInput.focus(); }
  else if (e.key.toLowerCase() === 'm') toggleMute();
});

// Carrega status e grid de personagens ao abrir a pagina
fetch('/api/status')
  .then(r => r.json())
  .then(d => { skinsEmUso = (d.skinsEmUso || []).map(s => String(s)); })
  .catch(() => {})
  .finally(() => {
    for (let i = 0; i < 40; i++) {
      const id = i.toString().padStart(3, '0');
      const div = document.createElement('div');
      div.className = 'char-option';
      if (skinsEmUso.includes(id)) {
        div.classList.add('taken');
        div.title = 'Em uso';
      } else {
        div.onclick = () => {
          document.querySelectorAll('.char-option').forEach(e => e.classList.remove('selected'));
          div.classList.add('selected');
          skinSelecionada = id;
        };
      }
      const sprite = document.createElement('div');
      sprite.className = 'char-sprite';
      sprite.style.backgroundImage = "url('assets/personagens/" + id + ".png')";
      div.appendChild(sprite);
      ui.grid.appendChild(div);
    }
  });

// Botao de reconectar com dados do localStorage
const lastS = localStorage.getItem('lastSkin');
const lastN = localStorage.getItem('lastName');
if (lastS && lastN && !skinsEmUso.includes(lastS)) {
  const btnR = document.getElementById('btn-reconnect');
  btnR.style.display = 'block';
  btnR.innerText = 'Reconectar (' + lastN + ')';
  btnR.onclick = () => { ui.nome.value = lastN; skinSelecionada = lastS; ui.senha.focus(); };
}

document.getElementById('btn-entrar').onclick = () => conectar(ui.nome.value.trim(), ui.senha.value.trim(), skinSelecionada);
ui.senha.onkeydown = (e) => { if (e.key === 'Enter') document.getElementById('btn-entrar').click(); };