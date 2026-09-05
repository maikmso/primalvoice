// Estado persistido do servidor (canais, cargos, quem tem qual cargo, dono).
// Guardado em disco como JSON simples — é pouca coisa e poucas pessoas usando,
// não precisa de banco de dados de verdade.
const fs = require('fs');
const path = require('path');

const STATE_PATH = path.join(__dirname, '..', 'state.json');

const PERMISSION_KEYS = ['manageChannels', 'manageRoles', 'kickMembers', 'muteMembers', 'deafenMembers'];

function defaultState() {
  return {
    ownerIdentity: null,
    channels: {
      text: [{ id: 'geral', name: 'geral' }],
      voice: [{ id: 'voz-da-galera', name: 'Voz da galera' }],
    },
    roles: [],
    memberRoles: {},
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

module.exports = { getState, mutate, getPermissions, sanitizePermissions, PERMISSION_KEYS };
