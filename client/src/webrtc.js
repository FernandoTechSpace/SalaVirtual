// Modulo responsavel pela comunicacao P2P via WebRTC
// Gerencia criacao de peers, sinalizacao (offer/answer/candidate) e recebimento de midia

import { ui } from './ui.js';
import { getLocalStream, getDeafened } from './audio.js';

const peers = {};

// Fila de candidatos ICE que chegam antes do remote description estar pronto
const iceCandidatesQueue = {};

const rtcConfig = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
};

let socketRef = null;

export function setSocketRef(socket) { socketRef = socket; }

export function initCall(remoteId) {
  if (!peers[remoteId]) peers[remoteId] = createPeer(remoteId);
}

export function cleanupPeer(id) {
  if (peers[id]) { peers[id].close(); delete peers[id]; }
  if (iceCandidatesQueue[id]) delete iceCandidatesQueue[id];
  const v = document.getElementById('video-' + id); if (v) v.remove();
  const a = document.getElementById('audio-' + id); if (a) a.remove();
}

export async function handleSignal(d) {
  if (!peers[d.from]) peers[d.from] = createPeer(d.from);
  const peer = peers[d.from];
  try {
    if (d.signal.sdp) {
      await peer.setRemoteDescription(new RTCSessionDescription(d.signal.sdp));
      if (d.signal.type === 'offer') {
        const ans = await peer.createAnswer();
        await peer.setLocalDescription(ans);
        socketRef.emit('sinalAudio', { to: d.from, signal: { type: 'answer', sdp: ans } });
      }
      if (iceCandidatesQueue[d.from]) {
        iceCandidatesQueue[d.from].forEach(c => peer.addIceCandidate(new RTCIceCandidate(c)));
        delete iceCandidatesQueue[d.from];
      }
    } else if (d.signal.candidate) {
      if (peer.remoteDescription) {
        await peer.addIceCandidate(new RTCIceCandidate(d.signal.candidate));
      } else {
        if (!iceCandidatesQueue[d.from]) iceCandidatesQueue[d.from] = [];
        iceCandidatesQueue[d.from].push(d.signal.candidate);
      }
    }
  } catch (e) {}
}

function createPeer(id) {
  const p = new RTCPeerConnection(rtcConfig);
  const localStream = getLocalStream();
  if (localStream) localStream.getTracks().forEach(t => p.addTrack(t, localStream));

  p.onicecandidate = e => {
    if (e.candidate) socketRef.emit('sinalAudio', { to: id, signal: { type: 'candidate', candidate: e.candidate } });
  };

  p.ontrack = e => {
    const stream = e.streams[0];
    if (e.track.kind === 'video') {
      const v = document.createElement('video');
      v.srcObject = stream; v.id = 'video-' + id;
      v.autoplay = true; v.playsInline = true; v.controls = false;
      ui.videoContainer.innerHTML = '';
      ui.videoContainer.appendChild(v);
      ui.videoModal.classList.add('show');
      v.play().catch(() => {});
    } else {
      const a = document.createElement('audio');
      a.srcObject = stream; a.id = 'audio-' + id;
      a.autoplay = true; a.muted = getDeafened();
      ui.audioContainer.appendChild(a);
      a.play().catch(() => {});
    }
  };

  p.onnegotiationneeded = async () => {
    try {
      const off = await p.createOffer();
      await p.setLocalDescription(off);
      socketRef.emit('sinalAudio', { to: id, signal: { type: 'offer', sdp: off } });
    } catch (e) {}
  };

  return p;
}

// Adiciona track de video de tela em todos os peers ativos
// Correcao: usa addTrack em vez de substituir a conexao existente
export function addScreenTrackToPeers(videoTrack, screenStream) {
  Object.keys(peers).forEach(id => { peers[id].addTrack(videoTrack, screenStream); });
}