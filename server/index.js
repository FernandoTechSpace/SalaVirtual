// Servidor principal: virtual room
// Correcoes aplicadas:
//   - senhas armazenadas com hash bcrypt (era texto puro)
//   - credenciais recebidas via evento socket autenticar, nao via query string
//   - content security policy (csp) habilitada (era contentSecurityPolicy: false)
//   - cors restrito ao dominio via variavel de ambiente (era origin: "*")
//   - validacao de nome com regex no servidor
//   - validacao de tipo e tamanho da mensagem de chat no servidor

import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import helmet from 'helmet';
import cors from 'cors';
import bcrypt from 'bcrypt';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const servidorHttp = createServer(app);

// Correcao: origem definida via variavel de ambiente para producao
// Era: cors({ origin: "*" })
const origemPermitida = process.env.CORS_ORIGIN || '*';

const io = new Server(servidorHttp, {
  cors: { origin: origemPermitida, methods: ['GET', 'POST'] },
  transports: ['websocket'],
  pingTimeout: 5000,
  pingInterval: 10000
});

// Correcao: csp habilitada com diretivas adequadas ao projeto
// Era: helmet({ contentSecurityPolicy: false })
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        'https://cdn.jsdelivr.net',
        // nota: remover unsafe-inline ao migrar todos os scripts para modulos externos
        "'unsafe-inline'"
      ],
      connectSrc: ["'self'", 'wss:', 'ws:', 'stun:stun.l.google.com:19302'],
      mediaSrc: ["'self'", 'blob:'],
      imgSrc: ["'self'", 'data:', 'blob:'],
      styleSrc: ["'self'", "'unsafe-inline'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"]
    }
  }
}));

app.use(cors({ origin: origemPermitida }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Persistencia
const DB_FILE = path.join(__dirname, 'users.json');
let usersDB = {};
if (fs.existsSync(DB_FILE)) {
  try { usersDB = JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); } catch (e) { usersDB = {}; }
}

function salvarBanco() {
  fs.writeFileSync(DB_FILE, JSON.stringify(usersDB, null, 2));
}

// Estado do jogo
const jogadoresOnline = {};
const MAX_JOGADORES = 30;

// Correcao: validacao de nome impede html e scripts via campo de entrada
// Aceita apenas letras (incluindo acentuadas), numeros, underline e hifen
function nomeValido(nome) {
  return (
    typeof nome === 'string' &&
    nome.length >= 2 &&
    nome.length <= 18 &&
    /^[\p{L}\p{N}_-]+$/u.test(nome)
  );
}

console.log(`[boot] servidor iniciado. limite: ${MAX_JOGADORES}`);

app.get('/api/status', (req, res) => {
  res.json({
    total: Object.keys(jogadoresOnline).length,
    max: MAX_JOGADORES,
    skinsEmUso: Object.values(jogadoresOnline).map(j => j.skin)
  });
});

io.on('connection', (socket) => {
  // Correcao: credenciais recebidas via evento 'autenticar', nao via query string
  // Era: const nome = socket.handshake.query.nome; const senha = socket.handshake.query.senha;
  // A query string expoe credenciais em logs de servidor, proxies e historico do navegador
  socket.on('autenticar', async ({ nome, senha, skin }) => {
    if (!nome || !senha || !skin) {
      socket.emit('erroConexao', 'Dados incompletos.');
      socket.disconnect();
      return;
    }

    // Correcao: validacao de formato do nome no servidor
    if (!nomeValido(nome)) {
      socket.emit('erroConexao', 'Nome invalido. Use letras, numeros, _ ou -.');
      socket.disconnect();
      return;
    }

    const skinStr = String(skin || '000');

    const totalJogadores = Object.keys(jogadoresOnline).length;
    const jaLogado = Object.values(jogadoresOnline).find(j => j.nome === nome);

    if (totalJogadores >= MAX_JOGADORES && !jaLogado) {
      console.log(`[bloqueio] sala cheia (${totalJogadores}). recusando ${nome}.`);
      socket.emit('erroConexao', 'A sala atingiu o limite maximo de 30 usuarios.');
      socket.disconnect();
      return;
    }

    if (senha.length < 6) {
      socket.emit('erroConexao', 'Senha curta (min 6).');
      socket.disconnect();
      return;
    }

    // Correcao: autenticacao com bcrypt
    // Era: comparacao direta usersDB[nome].senha !== senha (texto puro)
    if (usersDB[nome]) {
      const senhaCorreta = await bcrypt.compare(senha, usersDB[nome].senhaHash);
      if (!senhaCorreta) {
        socket.emit('erroConexao', 'Senha incorreta.');
        socket.disconnect();
        return;
      }
      usersDB[nome].skin = skinStr;
      salvarBanco();
    } else {
      // Correcao: hash com bcrypt antes de armazenar (saltRounds = 10)
      // Era: usersDB[nome] = { senha: senha, ... } armazenando texto puro
      const senhaHash = await bcrypt.hash(senha, 10);
      usersDB[nome] = { senhaHash, skin: skinStr, criadoEm: new Date() };
      salvarBanco();
    }

    // Kick: derruba sessao antiga se existir
    const socketIdAntigo = Object.keys(jogadoresOnline).find(
      id => jogadoresOnline[id].nome === nome
    );
    if (socketIdAntigo) {
      console.log(`[kick] substituindo sessao de ${nome}`);
      const socketAntigo = io.sockets.sockets.get(socketIdAntigo);
      if (socketAntigo) {
        socketAntigo.emit('kick', 'Voce conectou em outro local.');
        socketAntigo.disconnect(true);
      }
      delete jogadoresOnline[socketIdAntigo];
      io.emit('jogadorSaiu', socketIdAntigo);
      io.emit('usuarioParouCompartilhamento', socketIdAntigo);
      io.emit('listaUsuarios', jogadoresOnline);
    }

    entrarNoJogo(socket, nome, skinStr);
  });
});

function entrarNoJogo(socket, nome, skin) {
  const skinOcupada = Object.values(jogadoresOnline).find(
    j => j.skin === skin && j.nome !== nome
  );
  if (skinOcupada) {
    socket.emit('erroConexao', 'Skin em uso por outro jogador.');
    socket.disconnect();
    return;
  }

  console.log(`[entrou] ${nome} (total: ${Object.keys(jogadoresOnline).length + 1})`);

  jogadoresOnline[socket.id] = {
    x: 496, y: 180, playerId: socket.id, anim: 'baixo', nome, skin,
    falando: false, muted: false, deafened: false
  };

  socket.emit('loginSucesso', { id: socket.id, jogadores: jogadoresOnline });
  socket.broadcast.emit('novoJogador', jogadoresOnline[socket.id]);
  io.emit('listaUsuarios', jogadoresOnline);

  socket.on('movimentoJogador', (d) => {
    if (jogadoresOnline[socket.id]) {
      jogadoresOnline[socket.id].x = d.x;
      jogadoresOnline[socket.id].y = d.y;
      jogadoresOnline[socket.id].anim = d.anim;
      socket.broadcast.emit('jogadorMoveu', jogadoresOnline[socket.id]);
    }
  });

  socket.on('chatMessage', (msg) => {
    // Correcao: validacao de tipo e tamanho da mensagem no servidor
    // Era: sem nenhuma validacao, qualquer valor era retransmitido para todos
    if (!jogadoresOnline[socket.id]) return;
    if (typeof msg !== 'string' || msg.trim().length === 0 || msg.length > 300) return;
    io.emit('chatMessage', {
      playerId: socket.id,
      nome: jogadoresOnline[socket.id].nome,
      texto: msg
    });
  });

  socket.on('updateStatus', (s) => {
    if (jogadoresOnline[socket.id]) {
      jogadoresOnline[socket.id].muted = s.muted;
      jogadoresOnline[socket.id].deafened = s.deafened;
      io.emit('listaUsuarios', jogadoresOnline);
    }
  });

  socket.on('sinalAudio', (d) => io.to(d.to).emit('sinalAudio', { from: socket.id, signal: d.signal }));

  socket.on('estouFalando', (s) => {
    if (jogadoresOnline[socket.id]) {
      jogadoresOnline[socket.id].falando = s;
      socket.broadcast.emit('usuarioFalando', { id: socket.id, falando: s });
    }
  });

  socket.on('pararCompartilhamento', () => {
    socket.broadcast.emit('usuarioParouCompartilhamento', socket.id);
  });

  socket.on('disconnect', () => {
    if (jogadoresOnline[socket.id]) {
      console.log(`[saiu] ${nome}`);
      delete jogadoresOnline[socket.id];
      io.emit('jogadorSaiu', socket.id);
      io.emit('usuarioParouCompartilhamento', socket.id);
      io.emit('listaUsuarios', jogadoresOnline);
    }
  });
}

app.get(/(.*)/, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const portaServidor = process.env.PORT || 8081;
servidorHttp.listen(portaServidor, '0.0.0.0', () => {
  console.log(`servidor rodando na porta ${portaServidor}`);
});