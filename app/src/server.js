require('dotenv').config();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { AccessToken, RoomServiceClient } = require('livekit-server-sdk');
const store = require('./store');

const PORT = process.env.PORT || 3000;
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;
const LIVEKIT_URL = process.env.LIVEKIT_URL;
const ROOM_PASSWORD = process.env.ROOM_PASSWORD;
const OWNER_NAME = process.env.OWNER_NAME || '';
const OWNER_PASSWORD = process.env.OWNER_PASSWORD || '';
const ROOM_NAME = process.env.ROOM_NAME || 'galera';
// Assina os "crachás" de sessão usados nas rotas de administração (canais/cargos).
// Reaproveita o segredo do LiveKit pra não obrigar a criar mais uma variável.
const SESSION_SECRET = process.env.SESSION_SECRET || LIVEKIT_API_SECRET;

if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET || !LIVEKIT_URL || !ROOM_PASSWORD) {
  console.error(
    'Faltam variáveis de ambiente (LIVEKIT_API_KEY / LIVEKIT_API_SECRET / LIVEKIT_URL / ROOM_PASSWORD).\n' +
      'Rode ./setup.sh seudominio.com na raiz do projeto antes de subir o app.'
  );
  process.exit(1);
}

const roomServiceUrl = LIVEKIT_URL.replace(/^wss:\/\//, 'https://').replace(/^ws:\/\//, 'http://');
const roomService = new RoomServiceClient(roomServiceUrl, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);

const app = express();
// Libera chamadas de origens diferentes (o app desktop Electron roda num
// servidor local próprio, em outra origem, então precisa disso pra falar
// com este servidor). Não expõe nada sensível — a rota de token já é
// protegida pela senha da sala.
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// Upload de imagens/vídeos do chat de texto. Fica salvo no disco do próprio
// servidor — atenção: no plano gratuito do Render o disco é temporário
// (some quando o serviço reinicia ou "dorme" por muito tempo), então trate
// isso como um espaço de conversa do momento, não um arquivo permanente.
const uploadsDir = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname || '').slice(0, 10).replace(/[^a-zA-Z0-9.]/g, '');
      cb(null, `${crypto.randomUUID()}${ext}`);
    },
  }),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/^image\/|^video\//.test(file.mimetype)) cb(null, true);
    else cb(new Error('Só é permitido enviar imagens ou vídeos.'));
  },
});

// --- "Crachá" de sessão (não é login de verdade, só prova quem é quem nas
// rotas de administração depois do /api/token). Formato: base64(identity).assinatura
function makeSessionToken(identity) {
  const payload = Buffer.from(identity, 'utf-8').toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

function verifySessionToken(token) {
  if (typeof token !== 'string' || !token.includes('.')) return null;
  const [payload, sig] = token.split('.');
  const expected = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('hex');
  const sigBuf = Buffer.from(sig, 'hex');
  const expectedBuf = Buffer.from(expected, 'hex');
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;
  try {
    return Buffer.from(payload, 'base64url').toString('utf-8');
  } catch {
    return null;
  }
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  const identity = token && verifySessionToken(token);
  if (!identity) return res.status(401).json({ error: 'Sessão inválida. Entre de novo.' });
  req.identity = identity;
  next();
}

function requirePermission(key) {
  return (req, res, next) => {
    const perms = store.getPermissions(req.identity);
    if (!perms[key]) return res.status(403).json({ error: 'Você não tem permissão pra fazer isso.' });
    next();
  };
}

// URL do LiveKit que o frontend usa para conectar (não expõe API key/secret)
app.get('/api/config', (req, res) => {
  res.json({ livekitUrl: LIVEKIT_URL });
});

// Cria uma conta nova (usuário + senha própria), exigindo a senha de convite
// da sala (ROOM_PASSWORD) — assim só quem já tem o convite consegue criar
// conta, mas depois de criada a pessoa entra sempre com a própria senha.
app.post('/api/register', async (req, res) => {
  const { name, password, roomPassword } = req.body || {};

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'Informe um nome de usuário.' });
  }
  const cleanName = name.trim();
  if (cleanName.length > 24) {
    return res.status(400).json({ error: 'Nome muito longo (máx. 24 caracteres).' });
  }
  if (!password || typeof password !== 'string' || password.length < 4) {
    return res.status(400).json({ error: 'A senha precisa ter pelo menos 4 caracteres.' });
  }
  if (roomPassword !== ROOM_PASSWORD) {
    return res.status(401).json({ error: 'Senha de convite da sala incorreta.' });
  }
  if (OWNER_NAME && cleanName.toLowerCase() === OWNER_NAME.toLowerCase()) {
    return res.status(400).json({ error: 'Esse nome já é reservado pro dono do servidor.' });
  }
  if (store.findUser(cleanName)) {
    return res.status(409).json({ error: 'Esse nome de usuário já existe. Escolha outro ou faça login.' });
  }

  store.createUser(cleanName, password);
  await issueTokenAndRespond(cleanName, res);
});

// Gera um token de acesso à sala, se usuário e senha baterem. Quem entra com
// o usuário+senha do dono (OWNER_NAME + OWNER_PASSWORD) vira (ou continua
// sendo) o dono do servidor — o dono manda em cargos/canais independente de
// qual senha usar depois. Pra todo mundo, é login de conta de verdade agora
// (senha própria verificada contra o hash salvo), não mais uma senha
// compartilhada da sala.
app.post('/api/token', async (req, res) => {
  const { name, password } = req.body || {};

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'Informe seu nome.' });
  }
  if (name.trim().length > 24) {
    return res.status(400).json({ error: 'Nome muito longo (máx. 24 caracteres).' });
  }

  const cleanName = name.trim();
  const isOwnerLogin =
    OWNER_PASSWORD &&
    OWNER_NAME &&
    password === OWNER_PASSWORD &&
    cleanName.toLowerCase() === OWNER_NAME.toLowerCase();

  if (isOwnerLogin) {
    store.mutate((state) => {
      state.ownerIdentity = OWNER_NAME;
    });
    // O dono também ganha um registro de perfil (foto/banner/nome/status),
    // só que sem senha própria — o login do dono sempre passa pelo
    // OWNER_PASSWORD do .env, nunca pela senha guardada aqui.
    if (!store.findUser(OWNER_NAME)) store.createUser(OWNER_NAME, crypto.randomBytes(24).toString('hex'));
    return issueTokenAndRespond(OWNER_NAME, res);
  }

  const user = store.findUser(cleanName);
  if (!user) {
    return res.status(401).json({ error: 'Usuário não encontrado. Crie uma conta primeiro.' });
  }
  if (!store.verifyUserPassword(cleanName, password)) {
    return res.status(401).json({ error: 'Senha incorreta.' });
  }

  await issueTokenAndRespond(user.identity, res);
});

// Identidade fixa por nome (não aleatória): se a mesma pessoa clicar em
// "Entrar" de novo ou reconectar, o LiveKit reconhece que é a mesma
// identidade e derruba a sessão antiga sozinho, em vez de deixar "fantasmas"
// acumulando na sala.
async function issueTokenAndRespond(identity, res) {
  const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity,
    name: identity,
    ttl: '10h',
  });
  at.addGrant({
    roomJoin: true,
    room: ROOM_NAME,
    canPublish: true,
    canSubscribe: true,
  });

  try {
    const token = await at.toJwt();
    res.json({ token, identity, sessionToken: makeSessionToken(identity) });
  } catch (err) {
    console.error('Erro ao gerar token:', err);
    res.status(500).json({ error: 'Erro interno ao gerar o token.' });
  }
}

// Token pra entrar num canal de voz específico. Cada canal de voz vira uma
// sala LiveKit separada de verdade (não só uma etiqueta visual) — assim
// ninguém escuta quem está em outro canal de voz. Exige já ter feito login
// (sessionToken emitido pelo /api/token).
app.post('/api/voice-token', requireAuth, async (req, res) => {
  const { channelId } = req.body || {};
  const s = store.getState();
  const channel = s.channels.voice.find((c) => c.id === channelId);
  if (!channel) return res.status(404).json({ error: 'Canal de voz não encontrado.' });

  const livekitRoom = `${ROOM_NAME}--voice--${channel.id}`;
  const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity: req.identity,
    name: req.identity,
    ttl: '10h',
  });
  at.addGrant({ roomJoin: true, room: livekitRoom, canPublish: true, canSubscribe: true });

  try {
    const token = await at.toJwt();
    res.json({ token, livekitRoom });
  } catch (err) {
    console.error('Erro ao gerar token de voz:', err);
    res.status(500).json({ error: 'Erro interno ao gerar o token de voz.' });
  }
});

// Estado do servidor: canais, cargos, quem tem qual cargo, minhas permissões
// e o perfil (foto/banner/nome/status) de todo mundo que já tem conta — assim
// dá pra ver o perfil de alguém mesmo que a pessoa não esteja online agora.
app.get('/api/state', requireAuth, (req, res) => {
  const s = store.getState();
  res.json({
    channels: s.channels,
    roles: s.roles,
    memberRoles: s.memberRoles,
    ownerIdentity: s.ownerIdentity,
    myIdentity: req.identity,
    myPermissions: store.getPermissions(req.identity),
    profiles: store.getPublicProfiles(),
  });
});

// Perfil salvo no servidor (segue a conta entre PCs/dispositivos).
app.get('/api/profile', requireAuth, (req, res) => {
  const user = store.findUser(req.identity);
  if (!user) return res.status(404).json({ error: 'Conta não encontrada.' });
  res.json({
    displayName: user.displayName || '',
    avatar: user.avatar || '',
    banner: user.banner || '',
    status: user.status || '',
  });
});

app.patch('/api/profile', requireAuth, (req, res) => {
  const { displayName, status, avatar, banner } = req.body || {};
  if (typeof avatar === 'string' && avatar.length > store.MAX_IMAGE_LEN) {
    return res.status(400).json({ error: 'Foto de perfil grande demais.' });
  }
  if (typeof banner === 'string' && banner.length > store.MAX_IMAGE_LEN) {
    return res.status(400).json({ error: 'Banner grande demais.' });
  }
  const updated = store.updateUserProfile(req.identity, { displayName, status, avatar, banner });
  if (!updated) return res.status(404).json({ error: 'Conta não encontrada (o dono do servidor não guarda perfil aqui).' });
  res.json({
    displayName: updated.displayName || '',
    avatar: updated.avatar || '',
    banner: updated.banner || '',
    status: updated.status || '',
  });
});

app.post('/api/channels', requireAuth, requirePermission('manageChannels'), (req, res) => {
  const { type, name } = req.body || {};
  if (type !== 'text' && type !== 'voice') return res.status(400).json({ error: 'Tipo de canal inválido.' });
  const cleanName = String(name || '').trim().slice(0, 40);
  if (!cleanName) return res.status(400).json({ error: 'Dê um nome pro canal.' });

  const channel = { id: crypto.randomUUID(), name: cleanName };
  const s = store.mutate((state) => {
    state.channels[type].push(channel);
  });
  res.json({ channels: s.channels });
});

app.delete('/api/channels/:type/:id', requireAuth, requirePermission('manageChannels'), (req, res) => {
  const { type, id } = req.params;
  if (type !== 'text' && type !== 'voice') return res.status(400).json({ error: 'Tipo de canal inválido.' });

  const s = store.mutate((state) => {
    state.channels[type] = state.channels[type].filter((c) => c.id !== id);
  });
  res.json({ channels: s.channels });
});

app.post('/api/roles', requireAuth, requirePermission('manageRoles'), (req, res) => {
  const { name, color, permissions } = req.body || {};
  const cleanName = String(name || '').trim().slice(0, 30);
  if (!cleanName) return res.status(400).json({ error: 'Dê um nome pro cargo.' });

  const role = {
    id: crypto.randomUUID(),
    name: cleanName,
    color: typeof color === 'string' && /^#[0-9a-fA-F]{6}$/.test(color) ? color : '#ff5e3a',
    permissions: store.sanitizePermissions(permissions),
  };
  const s = store.mutate((state) => {
    state.roles.push(role);
  });
  res.json({ roles: s.roles });
});

app.patch('/api/roles/:id', requireAuth, requirePermission('manageRoles'), (req, res) => {
  const { id } = req.params;
  const { name, color, permissions } = req.body || {};
  let found = false;

  const s = store.mutate((state) => {
    const role = state.roles.find((r) => r.id === id);
    if (!role) return;
    found = true;
    if (typeof name === 'string' && name.trim()) role.name = name.trim().slice(0, 30);
    if (typeof color === 'string' && /^#[0-9a-fA-F]{6}$/.test(color)) role.color = color;
    if (permissions && typeof permissions === 'object') role.permissions = store.sanitizePermissions(permissions);
  });

  if (!found) return res.status(404).json({ error: 'Cargo não encontrado.' });
  res.json({ roles: s.roles });
});

app.delete('/api/roles/:id', requireAuth, requirePermission('manageRoles'), (req, res) => {
  const { id } = req.params;
  const s = store.mutate((state) => {
    state.roles = state.roles.filter((r) => r.id !== id);
    for (const identity of Object.keys(state.memberRoles)) {
      state.memberRoles[identity] = state.memberRoles[identity].filter((rid) => rid !== id);
    }
  });
  res.json({ roles: s.roles, memberRoles: s.memberRoles });
});

app.post('/api/members/:identity/roles', requireAuth, requirePermission('manageRoles'), (req, res) => {
  const targetIdentity = req.params.identity;
  const { roleId, action } = req.body || {};
  if (!roleId || (action !== 'add' && action !== 'remove')) {
    return res.status(400).json({ error: 'Requisição inválida.' });
  }

  const s = store.mutate((state) => {
    const current = new Set(state.memberRoles[targetIdentity] || []);
    if (action === 'add') current.add(roleId);
    else current.delete(roleId);
    if (current.size > 0) state.memberRoles[targetIdentity] = Array.from(current);
    else delete state.memberRoles[targetIdentity];
  });
  res.json({ memberRoles: s.memberRoles });
});

// Expulsa alguém agora (a pessoa consegue entrar de novo depois — isso não
// é um banimento, só tira ela na hora). Se vier channelId, tira só daquele
// canal de voz; sem channelId, tira do app inteiro (sala principal).
app.post('/api/moderation/kick', requireAuth, requirePermission('kickMembers'), async (req, res) => {
  const { identity, channelId } = req.body || {};
  if (!identity || typeof identity !== 'string') {
    return res.status(400).json({ error: 'Identidade obrigatória.' });
  }
  const targetRoom = channelId ? `${ROOM_NAME}--voice--${channelId}` : ROOM_NAME;
  try {
    await roomService.removeParticipant(targetRoom, identity);
    res.json({ ok: true });
  } catch (err) {
    console.error('Erro ao expulsar participante:', err);
    res.status(500).json({ error: 'Não consegui expulsar essa pessoa (talvez ela já tenha saído).' });
  }
});

// Recebe uma imagem/vídeo do chat de texto e devolve a URL pra ser mandada
// como mensagem (o arquivo em si não passa pelo canal de dados do LiveKit,
// só a URL — assim não trava com arquivos grandes).
app.post('/api/upload', requireAuth, (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      const msg =
        err.code === 'LIMIT_FILE_SIZE' ? 'Arquivo muito grande (máx. 25MB).' : err.message || 'Erro ao enviar arquivo.';
      return res.status(400).json({ error: msg });
    }
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
    const type = req.file.mimetype.startsWith('video/') ? 'video' : 'image';
    res.json({ url: `/uploads/${req.file.filename}`, type, name: req.file.originalname });
  });
});

app.listen(PORT, () => {
  console.log(`PrimalVoice app rodando na porta ${PORT} (sala: ${ROOM_NAME})`);
});
