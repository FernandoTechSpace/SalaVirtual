// Modulo de referencias de elementos da ui e funcoes de renderizacao
// Centraliza todos os seletores do dom para evitar repeticao nos outros modulos

let socketRef = null;

export function setSocketRef(socket) {
  socketRef = socket;
}

// Mapa de elementos do dom utilizados pelos modulos do frontend
export const ui = {
  login: document.getElementById('tela-login'),
  chat: document.getElementById('chat-container'),
  menuTrigger: document.getElementById('menu-trigger'),
  sidebar: document.getElementById('sidebar'),
  userList: document.getElementById('user-list'),
  nome: document.getElementById('input-nome'),
  senha: document.getElementById('input-senha'),
  status: document.getElementById('status-msg'),
  grid: document.getElementById('char-grid'),
  emoji: document.getElementById('emoji-picker'),
  chatInput: document.getElementById('chat-input'),
  audioContainer: document.getElementById('audio-remoto-container'),
  videoModal: document.getElementById('video-modal'),
  videoContainer: document.getElementById('video-container')
};

// Renderiza a lista de usuarios conectados na barra lateral
// Correcao: campos nome e avatar inseridos via textContent em vez de innerHTML
// Era: li.innerHTML com template literal contendo u.nome diretamente (vulneravel a xss)
export function renderUserList(users) {
  ui.userList.innerHTML = '';
  Object.values(users).forEach(u => {
    const li = document.createElement('li');
    li.className = `user-item ${u.playerId === socketRef?.id ? 'me' : ''}`;

    const avatarDiv = document.createElement('div');
    avatarDiv.className = 'user-avatar-ph';
    avatarDiv.textContent = u.nome.charAt(0).toUpperCase();

    const nameSpan = document.createElement('span');
    nameSpan.className = 'user-name';
    nameSpan.textContent = u.nome;

    const infoDiv = document.createElement('div');
    infoDiv.className = 'user-info';
    infoDiv.appendChild(avatarDiv);
    infoDiv.appendChild(nameSpan);

    const micSpan = document.createElement('span');
    micSpan.className = 'icon-status';
    micSpan.title = 'Mic';
    micSpan.textContent = u.muted ? '🔴' : '🟢';

    const headSpan = document.createElement('span');
    headSpan.className = 'icon-status';
    headSpan.title = 'Fone';
    headSpan.textContent = u.deafened ? '🔇' : '🎧';

    const iconsDiv = document.createElement('div');
    iconsDiv.className = 'user-icons';
    iconsDiv.appendChild(micSpan);
    iconsDiv.appendChild(headSpan);

    li.appendChild(infoDiv);
    li.appendChild(iconsDiv);
    ui.userList.appendChild(li);
  });
}

// Fecha o modal de video do compartilhamento de tela
export function fecharVideo() {
  ui.videoModal.classList.remove('show');
}