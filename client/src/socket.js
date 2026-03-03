// Modulo de conexao e autenticacao via socket
// Responsavel por iniciar a conexao, autenticar via evento dedicado
// e registrar os listeners de eventos globais do servidor

import { ui, renderUserList, setSocketRef as setUiSocketRef } from './ui.js';
import { setSocketRef as setAudioSocketRef, setupAudio } from './audio.js';
import { setSocketRef as setWebrtcSocketRef, handleSignal } from './webrtc.js';
import { setSocketRef as setScreenSocketRef } from './screen.js';
import { iniciarPhaser } from './game.js';

// Referencia global ao socket exportada para uso nos modulos de audio e webrtc
export let globalSocket = null;

// Inicia a conexao com o servidor e executa o fluxo de autenticacao
// Correcao: credenciais enviadas via evento 'autenticar' apos conexao
// Era: globalSocket = io({ query: { nome, senha, skin } }) expondo senha na url/query
export async function conectar(nome, senha, skinSelecionada) {
  if (!nome || senha.length < 6 || !skinSelecionada) {
    ui.status.innerText = 'Dados incompletos!';
    return;
  }

  ui.status.innerText = 'Inicializando Audio...';
  await setupAudio();

  ui.status.innerText = 'Conectando...';

  // Conexao sem credenciais na query string
  globalSocket = io({
    reconnection: false,
    forceNew: true,
    transports: ['websocket']
  });

  // Injeta a referencia do socket em todos os modulos que precisam emitir eventos
  setUiSocketRef(globalSocket);
  setAudioSocketRef(globalSocket);
  setWebrtcSocketRef(globalSocket);
  setScreenSocketRef(globalSocket);

  // Correcao: autenticacao ocorre apos a conexao ser estabelecida, via evento dedicado
  // Nenhuma credencial trafega na url ou nos headers da conexao websocket
  globalSocket.on('connect', () => {
    globalSocket.emit('autenticar', { nome, senha, skin: skinSelecionada });
  });

  globalSocket.on('erroConexao', (msg) => {
    alert(msg);
    globalSocket.disconnect();
    ui.status.innerText = msg;
  });

  globalSocket.on('kick', (msg) => {
    alert(msg);
    location.reload();
  });

  globalSocket.on('loginSucesso', (dados) => {
    localStorage.setItem('lastName', nome);
    localStorage.setItem('lastSkin', skinSelecionada);
    ui.login.style.display = 'none';
    ui.chat.style.display = 'flex';
    ui.menuTrigger.style.display = 'block';
    ui.sidebar.style.display = 'flex';
    renderUserList(dados.jogadores);
    iniciarPhaser(dados, globalSocket, skinSelecionada);
  });

  globalSocket.on('sinalAudio', (dados) => handleSignal(dados));
  globalSocket.on('listaUsuarios', (users) => renderUserList(users));

  globalSocket.on('usuarioParouCompartilhamento', (remoteId) => {
    const el = document.getElementById(`video-${remoteId}`);
    if (el) el.remove();
    ui.videoModal.classList.remove('show');
  });

  window.addEventListener('beforeunload', () => {
    if (globalSocket) globalSocket.disconnect();
  });
}