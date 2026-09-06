// Estado persistido do servidor (canais, cargos, quem tem qual cargo, dono,
// contas de usuário e perfil). Guardado em disco como JSON simples — é pouca
// coisa e poucas pessoas usando, não precisa de banco de dados de verdade.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const STATE_PATH = path.join(__dirname, '..', 'state.json');

const PERMISSION_KEYS = ['manageChannels', 'manageRoles', 'kickMembers', 'muteMembers', 'deafenMembers'];

// Tamanho máximo (em caracteres da data URL) pra foto/banner de perfil —
// fica salvo dentro do state.json, então não pode deixar crescer sem limite.
const MAX_IMAGE_LEN = 40000;

function defaultState() {
  return {
    ownerIdentity: null,
    channels: {
      text: [{ id: 'geral', name: 'geral' }],
      voice: [{ id: 'voz-da-galera', name: 'Voz da galera' }],
    },
    roles: [],
    memberRoles: {},
    // chave = nome de usuário em minúsculo; identity guarda a grafia original
    users: {},
  };
}

function sanitizePermissions(input) {
  const perms = {};
  for (const key of PERMISSION_KEYS) {
    perms[key] = !!(input && input[key]);
  }
  return perms;
}

function loadState() {
  try {
    const raw = fs.readFileSync(STATE_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    const base = defaultState();
    return {
      ownerIdentity: parsed.ownerIdentity ?? base.ownerIdentity,
      channels: {
        text: Array.isArray(parsed.channels?.text) ? parsed.channels.text : base.channels.text,
        voice: Array.isArray(parsed.channels?.voice) ? parsed.channels.voice : base.channels.voice,
      },
      roles: Array.isArray(parsed.roles) ? parsed.roles : [],
      memberRoles: parsed.memberRoles && typeof parsed.memberRoles === 'object' ? parsed.memberRoles : {},
      users: parsed.users && typeof parsed.users === 'object' ? parsed.users : {},
    };
  } catch {
    return defaultState();
  }
}

let state = loadState();

function persist() {
  // escreve em arquivo temporário e renomeia por cima — evita corromper o
  // state.json se o processo morrer no meio de uma escrita
  const tmp = STATE_PATH + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
  fs.renameSync(tmp, STATE_PATH);
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

function createUser(identity, password) {
  const key = identity.toLowerCase().trim();
  if (state.users[key]) return null; // já existe
  const { salt, hash } = hashPassword(password);
  const user = {
    identity,
    salt,
    hash,
    displayName: '',
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
    };
  }
  return out;
}

module.exports = {
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
  MAX_IMAGE_LEN,
};
