import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import helmet from 'helmet';
import cors from 'cors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const servidorHttp = createServer(app);

// Configuração WebRTC/Socket (Websocket Puro)
const io = new Server(servidorHttp, {
  cors: { origin: "*", methods: ["GET", "POST"] },
  transports: ['websocket'], 
  pingTimeout: 5000, 
  pingInterval: 10000
});

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Persistência
const DB_FILE = path.join(__dirname, 'users.json');
let usersDB = {};
if (fs.existsSync(DB_FILE)) { try { usersDB = JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); } catch (e) { usersDB = {}; } }
function salvarBanco() { fs.writeFileSync(DB_FILE, JSON.stringify(usersDB, null, 2)); }

// ESTADO DO JOGO
const jogadoresOnline = {}; 
const MAX_JOGADORES = 30; // Limite Rígido

console.log(`[BOOT] Servidor Iniciado. Limite: ${MAX_JOGADORES}`);

app.get('/api/status', (req, res) => {
  res.json({
    total: Object.keys(jogadoresOnline).length,
    max: MAX_JOGADORES,
    skinsEmUso: Object.values(jogadoresOnline).map(j => j.skin)
  });
});

io.on('connection', (socket) => {
  const nome = socket.handshake.query.nome;
  const senha = socket.handshake.query.senha;
  const skin = String(socket.handshake.query.skin || '000');

  if (!nome || !senha) return;

  // 1. VERIFICAÇÃO DE CAPACIDADE (SEM FILA)
  const totalJogadores = Object.keys(jogadoresOnline).length;
  const jaLogado = Object.values(jogadoresOnline).find(j => j.nome === nome);

  // Se a sala está cheia E não é uma reconexão do mesmo usuário
  if (totalJogadores >= MAX_JOGADORES && !jaLogado) {
      console.log(`[BLOQUEIO] Sala cheia (${totalJogadores}). Recusando ${nome}.`);
      socket.emit('erroConexao', 'A sala atingiu o limite máximo de 30 usuários.');
      socket.disconnect();
      return;
  }

  // 2. Validação
  if (senha.length < 6) { socket.emit('erroConexao', 'Senha curta (min 6).'); socket.disconnect(); return; }

  // 3. Autenticação
  if (usersDB[nome]) {
    if (usersDB[nome].senha !== senha) { socket.emit('erroConexao', 'Senha incorreta.'); socket.disconnect(); return; }
    usersDB[nome].skin = skin; salvarBanco();
  } else {
    usersDB[nome] = { senha: senha, skin: skin, criadoEm: new Date() }; salvarBanco();
  }

  // 4. KICK (Derruba sessão antiga se existir)
  const socketIdAntigo = Object.keys(jogadoresOnline).find(id => jogadoresOnline[id].nome === nome);
  if (socketIdAntigo) {
    console.log(`[KICK] Substituindo sessão de ${nome}`);
    const socketAntigo = io.sockets.sockets.get(socketIdAntigo);
    if (socketAntigo) {
        socketAntigo.emit('kick', 'Você conectou em outro local.');
        socketAntigo.disconnect(true);
    }
    delete jogadoresOnline[socketIdAntigo];
    
    // Limpeza crucial
    io.emit('jogadorSaiu', socketIdAntigo);
    io.emit('usuarioParouCompartilhamento', socketIdAntigo);
    io.emit('listaUsuarios', jogadoresOnline);
  }

  entrarNoJogo(socket, nome, skin);
});

function entrarNoJogo(socket, nome, skin) {
  // Verifica skin (exceto se for reconexão do mesmo usuário)
  const skinOcupada = Object.values(jogadoresOnline).find(j => j.skin === skin && j.nome !== nome);
  if (skinOcupada) {
    socket.emit('erroConexao', 'Skin em uso por outro jogador.'); socket.disconnect(); return;
  }

  console.log(`[ENTROU] ${nome} (Total: ${Object.keys(jogadoresOnline).length + 1})`);

  jogadoresOnline[socket.id] = {
    x: 496, y: 180, playerId: socket.id, anim: 'baixo', nome: nome, skin: skin,
    falando: false, muted: false, deafened: false
  };

  socket.emit('loginSucesso', { id: socket.id, jogadores: jogadoresOnline });
  socket.broadcast.emit('novoJogador', jogadoresOnline[socket.id]);
  io.emit('listaUsuarios', jogadoresOnline);

  // Handlers
  socket.on('movimentoJogador', (d) => { if (jogadoresOnline[socket.id]) { jogadoresOnline[socket.id].x = d.x; jogadoresOnline[socket.id].y = d.y; jogadoresOnline[socket.id].anim = d.anim; socket.broadcast.emit('jogadorMoveu', jogadoresOnline[socket.id]); } });
  socket.on('chatMessage', (msg) => { if (jogadoresOnline[socket.id]) io.emit('chatMessage', { playerId: socket.id, nome: jogadoresOnline[socket.id].nome, texto: msg }); });
  socket.on('updateStatus', (s) => { if (jogadoresOnline[socket.id]) { jogadoresOnline[socket.id].muted = s.muted; jogadoresOnline[socket.id].deafened = s.deafened; io.emit('listaUsuarios', jogadoresOnline); } });
  socket.on('sinalAudio', (d) => io.to(d.to).emit('sinalAudio', { from: socket.id, signal: d.signal }));
  socket.on('estouFalando', (s) => { if (jogadoresOnline[socket.id]) { jogadoresOnline[socket.id].falando = s; socket.broadcast.emit('usuarioFalando', { id: socket.id, falando: s }); } });
  
  // FIX: Evento explícito de parada de vídeo
  socket.on('pararCompartilhamento', () => { 
      socket.broadcast.emit('usuarioParouCompartilhamento', socket.id); 
  });

  socket.on('disconnect', () => {
    if (jogadoresOnline[socket.id]) {
        console.log(`[SAIU] ${nome}`);
        delete jogadoresOnline[socket.id];
        io.emit('jogadorSaiu', socket.id);
        io.emit('usuarioParouCompartilhamento', socket.id);
        io.emit('listaUsuarios', jogadoresOnline);
    }
  });
}

app.get(/(.*)/, (req, res) => { res.sendFile(path.join(__dirname, 'public', 'index.html')); });
const portaServidor = process.env.PORT || 8081;
servidorHttp.listen(portaServidor, '0.0.0.0', () => { console.log(`Servidor rodando na porta ${portaServidor}`); });