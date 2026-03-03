// Modulo responsavel pela captura, controle e analise do audio local do usuario

import { ui } from './ui.js';

let localStream = null;
let audioContext = null;
let isMuted = false;
let isDeafened = false;
let socketRef = null;

export function setSocketRef(socket) {
  socketRef = socket;
}

export function getLocalStream() {
  return localStream;
}

export function getMuted() {
  return isMuted;
}

export function getDeafened() {
  return isDeafened;
}

// Solicita permissao de audio e inicia analise de volume em tempo real
export async function setupAudio() {
  try {
    const constraints = {
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      video: false
    };
    localStream = await navigator.mediaDevices.getUserMedia(constraints);

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    audioContext = new AudioCtx();
    if (audioContext.state === 'suspended') await audioContext.resume();

    const source = audioContext.createMediaStreamSource(localStream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const checkVolume = () => {
      if (!localStream.getAudioTracks()[0].enabled) {
        if (socketRef) socketRef.emit('estouFalando', false);
      } else {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        if (socketRef) socketRef.emit('estouFalando', (sum / dataArray.length) > 15);
      }
      requestAnimationFrame(checkVolume);
    };

    checkVolume();
    return true;
  } catch (err) {
    console.error('Erro audio:', err);
    return false;
  }
}

// Atualiza os controles visuais do menu com o estado atual de mute/deafen
export function updateAudioControls() {
  document.getElementById('text-mute').innerText = isMuted ? 'Desmutar Mic' : 'Mutar Mic';
  document.getElementById('icon-mute').innerText = isMuted ? '🔇' : '🎤';
  document.getElementById('text-deafen').innerText = isDeafened ? 'Ativar Audio' : 'Desativar Audio';
  document.getElementById('icon-deafen').innerText = isDeafened ? '🔕' : '🎧';
}

// Sincroniza estado de audio com o servidor via socket
function syncStatus() {
  updateAudioControls();
  if (socketRef) socketRef.emit('updateStatus', { muted: isMuted, deafened: isDeafened });
}

export function toggleMute() {
  if (!localStream) return;
  isMuted = !isMuted;
  localStream.getAudioTracks()[0].enabled = !isMuted;
  syncStatus();
}

export function toggleDeafen() {
  isDeafened = !isDeafened;
  document.querySelectorAll('audio').forEach(a => { a.muted = isDeafened; });
  if (isDeafened && !isMuted) toggleMute(); else syncStatus();
}