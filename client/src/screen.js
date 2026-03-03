// Modulo responsavel pelo compartilhamento de tela via getDisplayMedia

import { addScreenTrackToPeers } from './webrtc.js';

let localScreenStream = null;
let isSharing = false;
let socketRef = null;

export function setSocketRef(socket) { socketRef = socket; }
export function getIsSharing() { return isSharing; }

export async function toggleScreenShare() {
  if (isSharing) {
    stopScreenShare();
  } else {
    try {
      localScreenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      const videoTrack = localScreenStream.getVideoTracks()[0];
      videoTrack.onended = () => stopScreenShare();

      // Correcao: adiciona track em vez de substituir, preserva audio dos peers
      addScreenTrackToPeers(videoTrack, localScreenStream);

      isSharing = true;
      document.getElementById('text-screen').innerText = 'Parar Tela';
      document.getElementById('icon-screen').innerText = 'STOP';
    } catch (e) {
      console.error('Erro tela:', e);
    }
  }
}

export function stopScreenShare() {
  if (localScreenStream) {
    localScreenStream.getTracks().forEach(track => track.stop());
    localScreenStream = null;
  }
  isSharing = false;
  document.getElementById('text-screen').innerText = 'Compartilhar Tela';
  document.getElementById('icon-screen').innerText = 'TELA';
  if (socketRef) socketRef.emit('pararCompartilhamento');
}