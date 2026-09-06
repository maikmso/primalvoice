// Estado persistido do servidor (canais, cargos, quem tem qual cargo, dono,
// contas de usuário, perfil e histórico de mensagens).
//
// Guardado num banco Redis de verdade (Upstash) quando UPSTASH_REDIS_REST_URL
// e UPSTASH_REDIS_REST_TOKEN estão configurados — assim os dados sobrevivem
// a reinícios/"sono" do servidor (no plano gratuito do Render, por exemplo,
// o disco local é temporário e some quando o serviço reinicia). Sem essas
// variáveis configuradas, cai de volta pro arquivo local de sempre (útil
// rodando local/sem Upstash configurado ainda) — só que aí some no restart,
// como sempre foi.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const STATE_PATH = path.join(__dirname, '..', 'state.json');
const REDIS_KEY = 'primalvoice:state';

let redis = null;
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  const { Redis } = require('@upstash/redis');
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
  console.log('Persistência: usando Upstash Redis (dados sobrevivem a reinícios do servidor).');
} else {
  console.log(
    'Persistência: UPSTASH_REDIS_REST_URL/TOKEN não configurados — usando arquivo local ' +
      '(atenção: some se o disco do servidor for temporário, como no plano gratuito do Render).'
  );
}

const PERMISSION_KEYS = ['manageChannels', 'manageRoles', 'kickMembers', 'muteMembers', 'deafenMembers'];

// Tamanho máximo (em caracteres da data URL) pra foto/banner de perfil —
// fica salvo dentro do state.json, então não pode deixar crescer sem limite.
const MAX_IMAGE_LEN = 40000;

// Histórico de mensagens de texto, guardado de verdade no servidor — antes
// as mensagens só viviam na memória de cada app aberto (via canal de dados
// do LiveKit), então sumiam toda vez que alguém reconectava ou o app
// reiniciava. Agora ficam salvas aqui e são carregadas ao entrar no canal.
// Limita quantas mensagens guarda por canal/conversa pra não crescer sem fim.
const MAX_MESSAGES_PER_CHANNEL = 200;

function defaultState() {
  return {
    ownerIdentity: null,
    // foto do servidor (aparece no ícone da barra à esquerda) — data URL,
    // igual avatar/banner de usuário; vazio = usa só o logo padrão do app
    serverIcon: '',
    channels: {
      text: [{ id: 'geral', name: 'geral' }],
      voice: [{ id: 'voz-da-galera', name: 'Voz da galera' }],
    },
    roles: [],
    memberRoles: {},
    // chave = nome de usuário em minúsculo; identity guarda a grafia original
    users: {},
    // chave = id do canal de texto, ou "dm:identityA|identityB" (ordenado)
    // pra conversa privada; valor = array de mensagens, mais recente por último
    messages: {},
  };
}

function sanitizePermissions(input) {
  const perms = {};
  for (const key of PERMISSION_KEYS) {
    perms[key] = !!(input && input[key]);
  }
  return perms;
}

function normalizeState(parsed) {
  const base = defaultState();
  if (!parsed || typeof parsed !== 'object') return base;
  return {
    ownerIdentity: parsed.ownerIdentity ?? base.ownerIdentity,
    serverIcon: typeof parsed.serverIcon === 'string' ? parsed.serverIcon : base.serverIcon,
    channels: {
      text: Array.isArray(parsed.channels?.text) ? parsed.channels.text : base.channels.text,
      voice: Array.isArray(parsed.channels?.voice) ? parsed.channels.voice : base.channels.voice,
    },
    roles: Array.isArray(parsed.roles) ? parsed.roles : [],
    memberRoles: parsed.memberRoles && typeof parsed.memberRoles === 'object' ? parsed.memberRoles : {},
    users: parsed.users && typeof parsed.users === 'object' ? parsed.users : {},
    messages: parsed.messages && typeof parsed.messages === 'object' ? parsed.messages : {},
  };
}

function loadStateFromDisk() {
  try {
    const raw = fs.readFileSync(STATE_PATH, 'utf-8');
    return normalizeState(JSON.parse(raw));
  } catch {
    return defaultState();
  }
}

// Estado em memória — todas as leituras (getState/getPermissions/etc) usam
// isso direto, sem esperar rede nenhuma; só a gravação (persist) é que fala
// com o Redis, e faz isso em segundo plano.
let state = loadStateFromDisk();

// Carrega o estado de verdade do Redis (quando configurado) antes do
// servidor aceitar requisições. Chamado uma vez, no início do server.js.
async function init() {
  if (!redis) return;
  try {
    const raw = await redis.get(REDIS_KEY);
    if (raw) {
      // o cliente do Upstash às vezes já devolve o objeto parseado, às vezes
      // a string crua, dependendo da versão — aceita os dois
      state = normalizeState(typeof raw === 'string' ? JSON.parse(raw) : raw);
      console.log('Estado carregado do Redis.');
    } else {
      console.log('Redis vazio ainda (primeira vez) — começando com estado padrão.');
    }
  } catch (err) {
    console.error('Não consegui carregar o estado do Redis, usando o arquivo local por enquanto:', err.message);
  }
}

function persist() {
  // guarda local sempre (rápido, síncrono, serve de cache) — escreve em
  // arquivo temporário e renomeia por cima pra não corromper o state.json
  // se o processo morrer no meio de uma escrita
  try {
    const tmp = STATE_PATH + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
    fs.renameSync(tmp, STATE_PATH);
  } catch (err) {
    console.error('Não consegui escrever o state.json local:', err.message);
  }
  // e manda pro Redis em segundo plano (é isso que sobrevive de verdade a
  // reinícios do servidor) — não trava a resposta da rota por causa disso
  if (redis) {
    redis.set(REDIS_KEY, JSON.stringify(state)).catch((err) => {
      console.error('Não consegui salvar o estado no Redis:', err.message);
    });
  }
}

function getState() {
  return state;
}

function mutate(fn) {
  fn(state);
  persist();
  return state;
}

function getPermissions(identity) {
  if (state.ownerIdentity && identity === state.ownerIdentity) {
    const all = {};
    for (const key of PERMISSION_KEYS) all[key] = true;
    return all;
  }
  const roleIds = state.memberRoles[identity] || [];
  const perms = {};
  for (const rid of roleIds) {
    const role = state.roles.find((r) => r.id === rid);
    if (!role) continue;
    for (const key of PERMISSION_KEYS) {
      if (role.permissions?.[key]) perms[key] = true;
    }
  }
  return perms;
}

// --- contas de usuário (cadastro de verdade: usuário + senha própria,
// perfil salvo no servidor em vez de só no PC de cada um) ---

function hashPassword(password, salt) {
  const useSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, useSalt, 64).toString('hex');
  return { salt: useSalt, hash };
}

function findUser(name) {
  if (!name) return null;
  return state.users[name.toLowerCase().trim()] || null;
}

function createUser(identity, password, displayName) {
  const key = identity.toLowerCase().trim();
  if (state.users[key]) return null; // já existe
  const { salt, hash } = hashPassword(password);
  const user = {
    identity,
    salt,
    hash,
    // nome de exibição — pedido já na criação da conta (separado do nome de
    // usuário/login, que só serve pra entrar); pode ser trocado depois a
    // qualquer momento em "Editar perfil".
    displayName: (displayName || '').trim().slice(0, 32),
    avatar: '',
    banner: '',
    status: '',
    createdAt: Date.now(),
  };
  mutate((s) => {
    s.users[key] = user;
  });
  return user;
}

function verifyUserPassword(name, password) {
  const user = findUser(name);
  if (!user) return false;
  const { hash } = hashPassword(password, user.salt);
  const a = Buffer.from(hash, 'hex');
  const b = Buffer.from(user.hash, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function updateUserProfile(identity, patch) {
  const key = identity.toLowerCase().trim();
  let updated = null;
  mutate((s) => {
    const user = s.users[key];
    if (!user) return;
    if (typeof patch.displayName === 'string') user.displayName = patch.displayName.trim().slice(0, 32);
    if (typeof patch.status === 'string') user.status = patch.status.trim().slice(0, 60);
    if (typeof patch.avatar === 'string' && patch.avatar.length <= MAX_IMAGE_LEN) user.avatar = patch.avatar;
    if (typeof patch.banner === 'string' && patch.banner.length <= MAX_IMAGE_LEN) user.banner = patch.banner;
    updated = user;
  });
  return updated;
}

// Mapa identity -> perfil público (sem hash/salt), pra mandar pro cliente
// assim que ele conecta — inclui gente que não está online agora.
function getPublicProfiles() {
  const out = {};
  for (const user of Object.values(state.users)) {
    out[user.identity] = {
      avatar: user.avatar || '',
      banner: user.banner || '',
      status: user.status || '',
      displayName: user.displayName || '',
      // desde quando a conta existe — usado pra mostrar "Entrou em ..." no
      // cartão de perfil, igual ao "membro desde" do Discord
      createdAt: user.createdAt || null,
    };
  }
  return out;
}

function updateServerIcon(icon) {
  mutate((s) => {
    s.serverIcon = icon || '';
  });
  return state.serverIcon;
}

// --- histórico de mensagens (canais de texto e DMs) ---

function dmKey(identityA, identityB) {
  return `dm:${[identityA, identityB].sort().join('|')}`;
}

function getMessages(channelKey) {
  return state.messages[channelKey] || [];
}

function addMessage(channelKey, { identity, name, text, attachment }) {
  const msg = {
    id: crypto.randomBytes(8).toString('hex'),
    identity,
    name: name || identity,
    text: typeof text === 'string' ? text.slice(0, 2000) : '',
    ts: Date.now(),
    attachment: attachment || null,
  };
  mutate((s) => {
    if (!s.messages[channelKey]) s.messages[channelKey] = [];
    s.messages[channelKey].push(msg);
    if (s.messages[channelKey].length > MAX_MESSAGES_PER_CHANNEL) {
      s.messages[channelKey] = s.messages[channelKey].slice(-MAX_MESSAGES_PER_CHANNEL);
    }
  });
  return msg;
}

module.exports = {
  init,
  getState,
  mutate,
  getPermissions,
  sanitizePermissions,
  PERMISSION_KEYS,
  findUser,
  createUser,
  verifyUserPassword,
  updateUserProfile,
  getPublicProfiles,
  updateServerIcon,
  MAX_IMAGE_LEN,
  dmKey,
  getMessages,
  addMessage,
};
