const { Room, RoomEvent, ConnectionQuality } = LivekitClient;

const settingsScreen = document.getElementById('settings-screen');
const joinScreen = document.getElementById('join-screen');
const roomScreen = document.getElementById('room-screen');

const settingsForm = document.getElementById('settings-form');
const serverUrlInput = document.getElementById('server-url-input');
const settingsError = document.getElementById('settings-error');
const settingsCancelBtn = document.getElementById('settings-cancel-btn');
const gearBtn = document.getElementById('gear-btn');

const joinForm = document.getElementById('join-form');
const nameInput = document.getElementById('name-input');
const passwordInput = document.getElementById('password-input');
const joinError = document.getElementById('join-error');
const joinSubmitBtn = joinForm.querySelector('button[type="submit"]');

const grid = document.getElementById('grid');
const participantCount = document.getElementById('participant-count');
const micBtn = document.getElementById('mic-btn');
const camBtn = document.getElementById('cam-btn');
const shareBtn = document.getElementById('share-btn');
const hangupBtn = document.getElementById('hangup-btn');
const exitAppBtn = document.getElementById('exit-app-btn');
const memberListItems = document.getElementById('member-list-items');
const selfAvatar = document.getElementById('self-avatar');
const selfName = document.getElementById('self-name');
const channelSidebar = document.querySelector('.channel-sidebar');
const memberList = document.querySelector('.member-list');
const resizeLeft = document.getElementById('resize-left');
const resizeRight = document.getElementById('resize-right');
const userPanelControls = document.querySelector('.user-panel-controls');
const voiceStatusBar = document.getElementById('voice-status-bar');
const voiceStatusChannel = document.getElementById('voice-status-channel');
const voiceQualityIcon = document.getElementById('voice-quality-icon');
const channelHeaderIcon = document.getElementById('channel-header-icon');
const channelHeaderName = document.getElementById('channel-header-name');
const textView = document.getElementById('text-view');
const chatMessages = document.getElementById('chat-messages');
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');

const addTextChannelBtn = document.getElementById('add-text-channel-btn');
const addVoiceChannelBtn = document.getElementById('add-voice-channel-btn');
const textChannelsList = document.getElementById('text-channels-list');
const voiceChannelsList = document.getElementById('voice-channels-list');

const appSettingsBtn = document.getElementById('app-settings-btn');
const settingsModalOverlay = document.getElementById('settings-modal-overlay');
const settingsModalClose = document.getElementById('settings-modal-close');
const modalTabs = document.querySelectorAll('.modal-tab');
const modalPanes = document.querySelectorAll('.modal-pane');
const micSelect = document.getElementById('mic-select');
const speakerSelect = document.getElementById('speaker-select');
const cameraSelect = document.getElementById('camera-select');
const keybindMuteBtn = document.getElementById('keybind-mute-btn');
const keybindDeafenBtn = document.getElementById('keybind-deafen-btn');
const manageTextChannelsEl = document.getElementById('manage-text-channels');
const manageVoiceChannelsEl = document.getElementById('manage-voice-channels');
const rolesListEl = document.getElementById('roles-list');
const createRoleBtn = document.getElementById('create-role-btn');
const roleEditorEl = document.getElementById('role-editor');
const rolesMembersListEl = document.getElementById('roles-members-list');

const HASH_ICON_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="9" x2="20" y2="9"></line><line x1="4" y1="15" x2="20" y2="15"></line><line x1="10" y1="3" x2="8" y2="21"></line><line x1="16" y1="3" x2="14" y2="21"></line></svg>';
const VOICE_ICON_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>';

const PERMISSION_LABELS = {
  manageChannels: 'Gerenciar canais (criar/apagar)',
  manageRoles: 'Gerenciar cargos e atribuir a membros',
  kickMembers: 'Expulsar membros da chamada',
  muteMembers: 'Silenciar membros (pede pro app deles mutar)',
  deafenMembers: 'Ensurdecer membros (pede pro app deles parar de ouvir)',
};
const PERMISSION_KEYS = Object.keys(PERMISSION_LABELS);

// ---------- estado ----------
let serverUrl = '';
let livekitUrl = '';
let sessionToken = '';
let myIdentity = '';
let myName = '';
let myPermissions = {};
let serverState = { channels: { text: [], voice: [] }, roles: [], memberRoles: {}, ownerIdentity: null };

let lobbyRoom = null; // conexão sempre ativa: presença (lista de membros) + chat de texto
let voiceRoom = null; // conexão separada, só enquanto estiver dentro de um canal de voz

let activeTextChannelId = null;
let activeVoiceChannelId = null;
let selectedRoleId = null;
let isDeafened = false;
let voiceQualityInterval = null;

// ---------- indicador de qualidade da conexão (barrinhas + ping) ----------
function setVoiceQuality(quality) {
  voiceQualityIcon.classList.remove('quality-excellent', 'quality-good', 'quality-poor', 'quality-lost', 'quality-unknown');
  voiceQualityIcon.classList.add(`quality-${quality}`);
}

function updateVoiceQualityTooltip() {
  if (!voiceRoom) return;
  const rtt = voiceRoom.engine && voiceRoom.engine.client && voiceRoom.engine.client.rtt;
  voiceQualityIcon.title = typeof rtt === 'number' && rtt > 0 ? `Ping: ${rtt}ms` : 'Qualidade da conexão';
}

function stopVoiceQualityMonitor() {
  if (voiceQualityInterval) {
    clearInterval(voiceQualityInterval);
    voiceQualityInterval = null;
  }
  setVoiceQuality('unknown');
  voiceQualityIcon.title = 'Qualidade da conexão';
}
let joining = false;

const chatHistoryByChannel = new Map(); // channelId -> [{name,text,ts,isSelf}]
const voicePresence = new Map(); // channelId -> Map(identity -> name)

const chatEncoder = new TextEncoder();
const chatDecoder = new TextDecoder();

const audioElsByIdentity = new Map();
const participantVolumes = new Map();
const mutedForMe = new Set();
const videoHiddenForMe = new Set();

let devicePrefs = { micId: '', speakerId: '', cameraId: '' };
let keybinds = { muteSelf: '', deafen: '' };

const joinSound = new Audio('assets/sound-join.wav');
const leaveSound = new Audio('assets/sound-leave.wav');
function playSound(el) {
  try {
    el.currentTime = 0;
    el.play().catch(() => {});
  } catch {
    // ambiente sem suporte a áudio — ignora
  }
}

function sanitizeId(str) {
  return String(str).replace(/[^a-zA-Z0-9_-]/g, '_');
}

// ---------- API ----------
async function apiFetch(path, options = {}) {
  const headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers || {});
  if (sessionToken) headers['Authorization'] = `Bearer ${sessionToken}`;
  const res = await fetch(`${serverUrl}${path}`, Object.assign({}, options, { headers }));
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Erro na requisição.');
  return data;
}

async function fetchServerState() {
  const data = await apiFetch('/api/state');
  serverState = data;
  myPermissions = data.myPermissions || {};
  renderChannelLists();
  renderPermissionGates();
}

function broadcastStateChanged() {
  if (!lobbyRoom) return;
  lobbyRoom.localParticipant.publishData(chatEncoder.encode(JSON.stringify({ type: 'state-changed' })), {
    reliable: true,
  });
}

function broadcastVoicePresence(action, channelId) {
  if (!lobbyRoom) return;
  const payload = { type: 'voice-presence', action, channelId, identity: myIdentity, name: myName };
  lobbyRoom.localParticipant.publishData(chatEncoder.encode(JSON.stringify(payload)), { reliable: true });
}

function renderPermissionGates() {
  addTextChannelBtn.hidden = !myPermissions.manageChannels;
  addVoiceChannelBtn.hidden = !myPermissions.manageChannels;
  document.querySelectorAll('.modal-tab[data-perm]').forEach((tab) => {
    tab.hidden = !myPermissions[tab.dataset.perm];
  });
}

function normalizeServerUrl(value) {
  return value.trim().replace(/\/+$/, '');
}

function showSettings() {
  settingsScreen.hidden = false;
  joinScreen.hidden = true;
  roomScreen.hidden = true;
}

function showJoin() {
  settingsScreen.hidden = true;
  joinScreen.hidden = false;
  roomScreen.hidden = true;
}

async function saveDevicePrefs() {
  const cfg = (await window.vortex.getConfig()) || {};
  cfg.devicePrefs = devicePrefs;
  cfg.keybinds = keybinds;
  await window.vortex.setConfig(cfg);
}

async function loadPrefsFromConfig(cfg) {
  devicePrefs = Object.assign({ micId: '', speakerId: '', cameraId: '' }, cfg.devicePrefs || {});
  keybinds = Object.assign({ muteSelf: '', deafen: '' }, cfg.keybinds || {});
  keybindMuteBtn.textContent = keybinds.muteSelf || 'Definir atalho';
  keybindDeafenBtn.textContent = keybinds.deafen || 'Definir atalho';
  if (keybinds.muteSelf) await window.vortex.setShortcut('muteSelf', keybinds.muteSelf);
  if (keybinds.deafen) await window.vortex.setShortcut('deafen', keybinds.deafen);
}

async function init() {
  const cfg = (await window.vortex.getConfig()) || {};
  await loadPrefsFromConfig(cfg);
  if (cfg.serverUrl) {
    serverUrl = cfg.serverUrl;
    showJoin();
  } else {
    showSettings();
  }
}

settingsForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  settingsError.hidden = true;
  const value = normalizeServerUrl(serverUrlInput.value);

  if (!/^https?:\/\/.+/.test(value)) {
    settingsError.textContent = 'Informe uma URL válida, começando com http:// ou https://';
    settingsError.hidden = false;
    return;
  }

  try {
    const res = await fetch(`${value}/api/config`);
    if (!res.ok) throw new Error();
  } catch {
    settingsError.textContent = 'Não consegui falar com esse servidor. Confira o endereço.';
    settingsError.hidden = false;
    return;
  }

  const cfg = (await window.vortex.getConfig()) || {};
  cfg.serverUrl = value;
  await window.vortex.setConfig(cfg);
  serverUrl = value;
  showJoin();
});

gearBtn.addEventListener('click', () => {
  serverUrlInput.value = serverUrl;
  settingsError.hidden = true;
  settingsCancelBtn.hidden = !serverUrl;
  showSettings();
});

settingsCancelBtn.addEventListener('click', () => {
  settingsError.hidden = true;
  showJoin();
});

// Painéis redimensionáveis: arraste a borda para mudar a largura, ou
// clique nela (sem arrastar) para recolher/expandir de vez.
const rootEl = document.documentElement;

const SIDEBAR_MIN = 180;
const SIDEBAR_MAX = 360;
const SIDEBAR_DEFAULT = 240;
const MEMBERLIST_MIN = 180;
const MEMBERLIST_MAX = 320;
const MEMBERLIST_DEFAULT = 240;

let sidebarWidth = SIDEBAR_DEFAULT;
let lastSidebarWidth = SIDEBAR_DEFAULT;
let sidebarCollapsed = false;

let memberListWidthPx = MEMBERLIST_DEFAULT;
let lastMemberListWidth = MEMBERLIST_DEFAULT;
let memberListCollapsedState = false;

function applySidebarWidth(px) {
  sidebarWidth = px;
  rootEl.style.setProperty('--sidebar-w', `${px}px`);
}
function applyMemberListWidth(px) {
  memberListWidthPx = px;
  rootEl.style.setProperty('--memberlist-w', `${px}px`);
}
applySidebarWidth(SIDEBAR_DEFAULT);
applyMemberListWidth(MEMBERLIST_DEFAULT);

function setSidebarCollapsed(collapsed) {
  sidebarCollapsed = collapsed;
  channelSidebar.classList.toggle('collapsed', collapsed);
  resizeLeft.classList.toggle('collapsed', collapsed);
  if (collapsed) {
    if (sidebarWidth > 20) lastSidebarWidth = sidebarWidth;
    applySidebarWidth(0);
  } else {
    applySidebarWidth(lastSidebarWidth || SIDEBAR_DEFAULT);
  }
}

function setMemberListCollapsed(collapsed) {
  memberListCollapsedState = collapsed;
  memberList.classList.toggle('collapsed', collapsed);
  resizeRight.classList.toggle('collapsed', collapsed);
  if (collapsed) {
    if (memberListWidthPx > 20) lastMemberListWidth = memberListWidthPx;
    applyMemberListWidth(0);
  } else {
    applyMemberListWidth(lastMemberListWidth || MEMBERLIST_DEFAULT);
  }
}

function setupResizeHandle(handle, panelEl, { invert, min, max, getWidth, applyWidth, isCollapsed, setCollapsed }) {
  let dragging = false;
  let startX = 0;
  let startWidth = 0;
  let moved = false;

  handle.addEventListener('mousedown', (e) => {
    dragging = true;
    moved = false;
    startX = e.clientX;
    startWidth = isCollapsed() ? 0 : getWidth();
    handle.classList.add('dragging');
    panelEl.classList.add('no-transition');
    document.body.style.userSelect = 'none';
    e.preventDefault();
  });

  window.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - startX;
    if (Math.abs(dx) > 3) moved = true;
    const delta = invert ? -dx : dx;
    let next = startWidth + delta;

    if (next < min * 0.55) {
      if (!isCollapsed()) setCollapsed(true);
      return;
    }
    if (isCollapsed()) setCollapsed(false);
    next = Math.max(min, Math.min(max, next));
    applyWidth(next);
  });

  window.addEventListener('mouseup', () => {
    if (!dragging) return;
    dragging = false;
    handle.classList.remove('dragging');
    panelEl.classList.remove('no-transition');
    document.body.style.userSelect = '';
    if (!moved) {
      setCollapsed(!isCollapsed());
    }
  });
}

setupResizeHandle(resizeLeft, channelSidebar, {
  invert: false,
  min: SIDEBAR_MIN,
  max: SIDEBAR_MAX,
  getWidth: () => sidebarWidth,
  applyWidth: applySidebarWidth,
  isCollapsed: () => sidebarCollapsed,
  setCollapsed: setSidebarCollapsed,
});

setupResizeHandle(resizeRight, memberList, {
  invert: true,
  min: MEMBERLIST_MIN,
  max: MEMBERLIST_MAX,
  getWidth: () => memberListWidthPx,
  applyWidth: applyMemberListWidth,
  isCollapsed: () => memberListCollapsedState,
  setCollapsed: setMemberListCollapsed,
});

// ---------- canais (texto e voz) ----------
function showTextView() {
  grid.hidden = true;
  textView.hidden = false;
}
function showVoiceView() {
  textView.hidden = true;
  grid.hidden = false;
}

function channelMemberRowId(identity) {
  return `voice-presence-${sanitizeId(identity)}`;
}

function buildChannelItemEl(channel, type) {
  const el = document.createElement('div');
  el.className = `channel-item ${type}-channel`;
  el.dataset.channelId = channel.id;
  el.setAttribute('role', 'button');
  el.tabIndex = 0;

  const icon = document.createElement('span');
  icon.innerHTML = type === 'text' ? HASH_ICON_SVG : VOICE_ICON_SVG;
  el.appendChild(icon.firstElementChild);

  const label = document.createElement('span');
  label.className = 'channel-label';
  label.textContent = channel.name;
  el.appendChild(label);

  if (myPermissions.manageChannels) {
    const delBtn = document.createElement('button');
    delBtn.className = 'channel-delete-btn';
    delBtn.title = 'Apagar canal';
    delBtn.textContent = '✕';
    delBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (serverState.channels[type].length <= 1) {
        alert('Precisa deixar pelo menos um canal desse tipo.');
        return;
      }
      if (!confirm(`Apagar o canal "${channel.name}"?`)) return;
      try {
        const data = await apiFetch(`/api/channels/${type}/${channel.id}`, { method: 'DELETE' });
        serverState.channels = data.channels;
        renderChannelLists();
        renderManageChannels();
        broadcastStateChanged();
      } catch (err) {
        alert(err.message);
      }
    });
    el.appendChild(delBtn);
  }

  return el;
}

function renderChannelLists() {
  textChannelsList.innerHTML = '';
  serverState.channels.text.forEach((ch) => {
    const el = buildChannelItemEl(ch, 'text');
    el.classList.toggle('active', ch.id === activeTextChannelId && !textView.hidden);
    el.addEventListener('click', () => switchTextChannel(ch.id));
    textChannelsList.appendChild(el);
  });

  voiceChannelsList.innerHTML = '';
  serverState.channels.voice.forEach((ch) => {
    const wrap = document.createElement('div');
    const el = buildChannelItemEl(ch, 'voice');
    const isActiveVoice = ch.id === activeVoiceChannelId;
    el.classList.toggle('active', isActiveVoice && !grid.hidden);
    el.classList.toggle('in-voice', isActiveVoice);
    el.addEventListener('click', () => {
      if (activeVoiceChannelId === ch.id) {
        if (grid.hidden) {
          channelHeaderIcon.innerHTML = VOICE_ICON_SVG;
          channelHeaderName.textContent = ch.name;
          showVoiceView();
          renderChannelLists();
        } else {
          leaveVoiceChannel();
        }
      } else {
        joinVoiceChannel(ch.id);
      }
    });
    wrap.appendChild(el);

    const membersEl = document.createElement('div');
    membersEl.className = 'voice-members-list';
    membersEl.dataset.channelId = ch.id;
    const presence = voicePresence.get(ch.id);
    if (presence) {
      presence.forEach((name, identity) => {
        const row = buildMemberRow({ identity, name });
        row.id = channelMemberRowId(identity);
        membersEl.appendChild(row);
      });
    }
    wrap.appendChild(membersEl);
    voiceChannelsList.appendChild(wrap);
  });
}

function switchTextChannel(channelId) {
  activeTextChannelId = channelId;
  const channel = serverState.channels.text.find((c) => c.id === channelId);
  channelHeaderIcon.innerHTML = HASH_ICON_SVG;
  channelHeaderName.textContent = channel ? channel.name : '';
  chatInput.placeholder = `Conversar em #${channel ? channel.name : ''}`;
  showTextView();
  renderChannelLists();
  renderChatForActiveChannel();
}

async function joinVoiceChannel(channelId) {
  const channel = serverState.channels.voice.find((c) => c.id === channelId);
  if (!channel) return;

  if (activeVoiceChannelId) {
    await leaveVoiceChannel({ silent: true });
  }

  let data;
  try {
    data = await apiFetch('/api/voice-token', { method: 'POST', body: JSON.stringify({ channelId }) });
  } catch (err) {
    alert(err.message || 'Não consegui entrar no canal de voz.');
    return;
  }

  const vr = new Room({
    adaptiveStream: true,
    dynacast: true,
    audioCaptureDefaults: {
      deviceId: devicePrefs.micId || undefined,
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
    videoCaptureDefaults: {
      deviceId: devicePrefs.cameraId || undefined,
      resolution: { width: 1280, height: 720, frameRate: 30 },
    },
    publishDefaults: {
      screenShareEncoding: { maxBitrate: 3_000_000, maxFramerate: 30 },
      videoEncoding: { maxBitrate: 2_500_000, maxFramerate: 30 },
      audioPreset: { maxBitrate: 64_000 },
      dtx: true,
      red: true,
    },
  });

  vr.on(RoomEvent.TrackSubscribed, (track, _pub, participant) => {
    attachTrack(track, participant);
  });
  vr.on(RoomEvent.TrackUnsubscribed, (track, _pub, participant) => {
    detachTrack(track, participant);
  });
  vr.on(RoomEvent.ParticipantConnected, () => {
    playSound(joinSound);
  });
  vr.on(RoomEvent.ParticipantDisconnected, (participant) => {
    removeTile(participant);
    playSound(leaveSound);
  });
  vr.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
    const speakingIds = new Set(speakers.map((p) => p.identity));
    const all = [vr.localParticipant, ...vr.remoteParticipants.values()];
    all.forEach((p) => setSpeaking(p.identity, speakingIds.has(p.identity)));
  });
  vr.on(RoomEvent.ConnectionQualityChanged, (quality, participant) => {
    if (participant === vr.localParticipant) setVoiceQuality(quality);
  });

  try {
    await vr.connect(livekitUrl, data.token);
  } catch (err) {
    alert('Não consegui conectar no canal de voz.');
    return;
  }

  voiceRoom = vr;
  activeVoiceChannelId = channelId;

  await setOutputDeviceForRoom();
  ensureTile(vr.localParticipant);
  await vr.localParticipant.setMicrophoneEnabled(true);

  micBtn.dataset.on = 'true';
  micBtn.classList.remove('off');
  micBtn.title = 'Microfone';
  userPanelControls.classList.remove('voice-disabled');
  voiceStatusChannel.textContent = channel.name;
  voiceStatusBar.hidden = false;
  setVoiceQuality(ConnectionQuality ? ConnectionQuality.Unknown : 'unknown');
  updateVoiceQualityTooltip();
  voiceQualityInterval = setInterval(updateVoiceQualityTooltip, 3000);

  if (!voicePresence.has(channelId)) voicePresence.set(channelId, new Map());
  voicePresence.get(channelId).set(myIdentity, myName);
  broadcastVoicePresence('join', channelId);

  channelHeaderIcon.innerHTML = VOICE_ICON_SVG;
  channelHeaderName.textContent = channel.name;
  showVoiceView();
  renderChannelLists();
  playSound(joinSound);
}

async function leaveVoiceChannel(opts = {}) {
  if (!voiceRoom) return;
  const channelId = activeVoiceChannelId;
  broadcastVoicePresence('leave', channelId);
  voicePresence.get(channelId)?.delete(myIdentity);

  try {
    await voiceRoom.disconnect();
  } catch {
    // já pode ter caído sozinho
  }
  voiceRoom = null;
  activeVoiceChannelId = null;

  grid.innerHTML = '';
  grid.classList.remove('has-expanded');
  resetAudioState();
  resetVoiceControlsUI();
  playSound(leaveSound);

  if (!opts.silent) {
    const fallback = serverState.channels.text.find((c) => c.id === activeTextChannelId) || serverState.channels.text[0];
    if (fallback) switchTextChannel(fallback.id);
    else showTextView();
  }
  renderChannelLists();
}

function resetVoiceControlsUI() {
  micBtn.dataset.on = 'false';
  micBtn.classList.add('off');
  micBtn.title = 'Microfone (clique num canal de voz pra entrar)';
  camBtn.dataset.on = 'false';
  camBtn.classList.add('off');
  shareBtn.dataset.on = 'false';
  shareBtn.classList.add('off');
  setDeafened(false, { silent: true });
  userPanelControls.classList.add('voice-disabled');
  voiceStatusBar.hidden = true;
  stopVoiceQualityMonitor();
}

// ---------- chat de texto ----------
function renderChatForActiveChannel() {
  chatMessages.innerHTML = '';
  const history = chatHistoryByChannel.get(activeTextChannelId) || [];
  if (history.length === 0) {
    chatMessages.innerHTML = '<p class="chat-empty">Nenhuma mensagem ainda. Comece a conversa.</p>';
    return;
  }
  history.forEach((msg) => appendChatMessageEl(msg));
}

function appendChatMessageEl({ name, text, isSelf }) {
  const empty = chatMessages.querySelector('.chat-empty');
  if (empty) empty.remove();

  const row = document.createElement('div');
  row.className = isSelf ? 'chat-message self' : 'chat-message';

  const avatar = document.createElement('span');
  avatar.className = 'avatar';
  avatar.textContent = (name || '?').charAt(0).toUpperCase();
  row.appendChild(avatar);

  const body = document.createElement('div');
  body.className = 'body';

  const meta = document.createElement('div');
  meta.className = 'meta';
  const author = document.createElement('span');
  author.className = 'author';
  author.textContent = name || 'Alguém';
  meta.appendChild(author);
  const time = document.createElement('span');
  time.className = 'time';
  time.textContent = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  meta.appendChild(time);
  body.appendChild(meta);

  const textEl = document.createElement('div');
  textEl.className = 'text';
  textEl.textContent = text;
  body.appendChild(textEl);

  row.appendChild(body);
  chatMessages.appendChild(row);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function pushChatMessage(channelId, msg) {
  if (!channelId) return;
  if (!chatHistoryByChannel.has(channelId)) chatHistoryByChannel.set(channelId, []);
  chatHistoryByChannel.get(channelId).push(msg);
  if (channelId === activeTextChannelId) appendChatMessageEl(msg);
}

chatForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = chatInput.value.trim();
  if (!text || !lobbyRoom || !activeTextChannelId) return;
  chatInput.value = '';

  const ts = Date.now();
  const payload = { type: 'chat', channelId: activeTextChannelId, name: myName, text, ts };
  lobbyRoom.localParticipant.publishData(chatEncoder.encode(JSON.stringify(payload)), { reliable: true });
  pushChatMessage(activeTextChannelId, { name: myName, text, ts, isSelf: true });
});

// ---------- grade de vídeo/tela ----------
function tileId(identity) {
  return `tile-${sanitizeId(identity)}`;
}

function ensureTile(participant) {
  let tile = document.getElementById(tileId(participant.identity));
  if (!tile) {
    tile = document.createElement('div');
    tile.className = 'tile';
    tile.id = tileId(participant.identity);
    tile.dataset.identity = participant.identity;
    tile.dataset.name = participant.name || participant.identity;

    const initial = document.createElement('span');
    initial.className = 'initial';
    initial.textContent = (participant.name || participant.identity).charAt(0).toUpperCase();
    tile.appendChild(initial);

    const label = document.createElement('div');
    label.className = 'label';
    label.textContent = participant.name || participant.identity;
    tile.appendChild(label);

    const expandHint = document.createElement('div');
    expandHint.className = 'expand-hint';
    expandHint.innerHTML =
      '<svg class="icon-maximize" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3"></path><path d="M21 8V5a2 2 0 0 0-2-2h-3"></path><path d="M3 16v3a2 2 0 0 0 2 2h3"></path><path d="M16 21h3a2 2 0 0 0 2-2v-3"></path></svg>' +
      '<svg class="icon-minimize" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3"></path><path d="M21 8h-3a2 2 0 0 1-2-2V3"></path><path d="M3 16h3a2 2 0 0 1 2 2v3"></path><path d="M16 21v-3a2 2 0 0 1 2-2h3"></path></svg>';
    tile.appendChild(expandHint);

    grid.appendChild(tile);
  }
  return tile;
}

function attachTrack(track, participant) {
  const tile = ensureTile(participant);
  const el = track.attach();
  if (track.kind === 'video') {
    el.classList.add('video-el');
    const old = tile.querySelector('video');
    if (old) old.remove();
    tile.appendChild(el);
    tile.classList.add('has-video');
    applyVideoVisibility(participant.identity);
  } else {
    el.classList.add('audio-el');
    tile.appendChild(el);
    registerAudioEl(participant.identity, el);
  }
}

function detachTrackFromTile(track, tile, identity) {
  const detached = track.detach();
  detached.forEach((el) => {
    if (identity) unregisterAudioEl(identity, el);
    el.remove();
  });
  if (tile && track.kind === 'video' && !tile.querySelector('video')) {
    tile.classList.remove('has-video');
  }
}

function detachTrack(track, participant) {
  const tile = participant ? document.getElementById(tileId(participant.identity)) : null;
  detachTrackFromTile(track, tile, participant?.identity);
}

function removeTile(participant) {
  const tile = document.getElementById(tileId(participant.identity));
  if (tile && tile.classList.contains('expanded')) {
    grid.classList.remove('has-expanded');
  }
  if (tile) tile.remove();
}

function collapseExpandedTile() {
  grid.querySelectorAll('.tile.expanded').forEach((t) => t.classList.remove('expanded'));
  grid.classList.remove('has-expanded');
}

grid.addEventListener('click', (e) => {
  const tile = e.target.closest('.tile');
  if (!tile) return;

  const wasExpanded = tile.classList.contains('expanded');
  collapseExpandedTile();

  if (!wasExpanded) {
    tile.classList.add('expanded');
    grid.classList.add('has-expanded');
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && grid.classList.contains('has-expanded')) {
    collapseExpandedTile();
  }
});

// ---------- áudio (volume por pessoa, mute local, ensurdecer) ----------
function registerAudioEl(identity, el) {
  if (!audioElsByIdentity.has(identity)) audioElsByIdentity.set(identity, new Set());
  audioElsByIdentity.get(identity).add(el);
  applyVolume(identity);
}

function unregisterAudioEl(identity, el) {
  audioElsByIdentity.get(identity)?.delete(el);
}

function applyVolume(identity) {
  const volume = mutedForMe.has(identity) || isDeafened ? 0 : participantVolumes.get(identity) ?? 1;
  audioElsByIdentity.get(identity)?.forEach((el) => {
    el.volume = volume;
  });
}

function resetAudioState() {
  audioElsByIdentity.clear();
  participantVolumes.clear();
  mutedForMe.clear();
  videoHiddenForMe.clear();
}

function applyVideoVisibility(identity) {
  const tile = document.getElementById(tileId(identity));
  if (tile) tile.classList.toggle('video-hidden-for-me', videoHiddenForMe.has(identity));
}

function setDeafened(value, opts = {}) {
  isDeafened = value;
  const deafenBtn = document.getElementById('deafen-btn');
  if (deafenBtn) {
    deafenBtn.dataset.on = String(!value);
    deafenBtn.classList.toggle('off', value);
  }
  audioElsByIdentity.forEach((_els, identity) => applyVolume(identity));
  if (value && !opts.silent && voiceRoom && micBtn.dataset.on === 'true') {
    voiceRoom.localParticipant.setMicrophoneEnabled(false);
    micBtn.dataset.on = 'false';
    micBtn.classList.add('off');
  }
}

// ---------- lista de membros do servidor ----------
function memberRowId(identity) {
  return `member-${sanitizeId(identity)}`;
}

function buildMemberRow(participant) {
  const row = document.createElement('div');
  row.className = 'member-row';
  row.dataset.identity = participant.identity;
  row.dataset.name = participant.name || participant.identity;

  const avatar = document.createElement('span');
  avatar.className = 'avatar';
  avatar.textContent = (participant.name || participant.identity).charAt(0).toUpperCase();
  row.appendChild(avatar);

  const name = document.createElement('span');
  name.className = 'member-name';
  name.textContent = participant.name || participant.identity;
  row.appendChild(name);

  return row;
}

function addMember(participant) {
  const id = memberRowId(participant.identity);
  if (!document.getElementById(id)) {
    const row = buildMemberRow(participant);
    row.id = id;
    memberListItems.appendChild(row);
  }
}

function removeMember(participant) {
  document.getElementById(memberRowId(participant.identity))?.remove();
}

function clearMembers() {
  memberListItems.innerHTML = '';
}

function updateParticipantCount() {
  if (!lobbyRoom) return;
  participantCount.textContent = String(lobbyRoom.numParticipants + 1);
}

function setSpeaking(identity, isSpeaking) {
  document.getElementById(tileId(identity))?.classList.toggle('speaking', isSpeaking);
  document.getElementById(memberRowId(identity))?.classList.toggle('speaking', isSpeaking);
  document.getElementById(channelMemberRowId(identity))?.classList.toggle('speaking', isSpeaking);
}

// ---------- menu de botão direito ----------
let contextMenuEl = null;

function closeContextMenu() {
  if (contextMenuEl) {
    contextMenuEl.remove();
    contextMenuEl = null;
  }
}

document.addEventListener('click', closeContextMenu);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeContextMenu();
});
window.addEventListener('blur', closeContextMenu);

function buildToggleItem(label, initialChecked, onToggle) {
  const item = document.createElement('div');
  item.className = 'context-menu-item';

  const labelEl = document.createElement('span');
  labelEl.className = 'label';
  labelEl.textContent = label;
  item.appendChild(labelEl);

  const checkbox = document.createElement('span');
  checkbox.className = 'context-menu-checkbox';
  checkbox.classList.toggle('checked', initialChecked);
  checkbox.innerHTML =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
  item.appendChild(checkbox);

  item.addEventListener('click', (e) => {
    e.stopPropagation();
    const nowChecked = !checkbox.classList.contains('checked');
    checkbox.classList.toggle('checked', nowChecked);
    onToggle(nowChecked);
  });

  return item;
}

function dividerEl() {
  const d = document.createElement('div');
  d.className = 'context-menu-divider';
  return d;
}

function participantFromRow(el) {
  return { identity: el.dataset.identity, name: el.dataset.name };
}

function openContextMenu(x, y, participant, opts = {}) {
  closeContextMenu();
  const identity = participant.identity;
  if (!identity) return;
  if (identity === myIdentity) return;

  const menu = document.createElement('div');
  menu.className = 'context-menu';
  menu.addEventListener('click', (e) => e.stopPropagation());

  const header = document.createElement('div');
  header.className = 'context-menu-header';
  header.textContent = participant.name || identity;
  menu.appendChild(header);

  const volumeWrap = document.createElement('div');
  volumeWrap.className = 'context-menu-volume';
  const volumeLabel = document.createElement('span');
  volumeLabel.className = 'label';
  volumeLabel.textContent = 'Volume';
  volumeWrap.appendChild(volumeLabel);
  const volumeSlider = document.createElement('input');
  volumeSlider.type = 'range';
  volumeSlider.min = '0';
  volumeSlider.max = '100';
  volumeSlider.value = String(Math.round((participantVolumes.get(identity) ?? 1) * 100));
  volumeWrap.appendChild(volumeSlider);
  menu.appendChild(volumeWrap);

  menu.appendChild(dividerEl());

  const muteItem = buildToggleItem('Silenciar', mutedForMe.has(identity), (checked) => {
    if (checked) mutedForMe.add(identity);
    else mutedForMe.delete(identity);
    applyVolume(identity);
  });
  menu.appendChild(muteItem);

  volumeSlider.addEventListener('input', () => {
    const v = Number(volumeSlider.value) / 100;
    participantVolumes.set(identity, v);
    if (v > 0 && mutedForMe.has(identity)) {
      mutedForMe.delete(identity);
      muteItem.querySelector('.context-menu-checkbox').classList.remove('checked');
    }
    applyVolume(identity);
  });

  const videoItem = buildToggleItem('Desativar vídeo', videoHiddenForMe.has(identity), (checked) => {
    if (checked) videoHiddenForMe.add(identity);
    else videoHiddenForMe.delete(identity);
    applyVideoVisibility(identity);
  });
  menu.appendChild(videoItem);

  if (opts.allowKick && myPermissions.kickMembers && activeVoiceChannelId) {
    menu.appendChild(dividerEl());
    const kickItem = document.createElement('div');
    kickItem.className = 'context-menu-item';
    const kickLabel = document.createElement('span');
    kickLabel.className = 'label';
    kickLabel.style.color = 'var(--danger)';
    kickLabel.textContent = 'Expulsar da chamada';
    kickItem.appendChild(kickLabel);
    kickItem.addEventListener('click', async (e) => {
      e.stopPropagation();
      closeContextMenu();
      if (!confirm(`Expulsar ${participant.name || identity} da chamada?`)) return;
      try {
        await apiFetch('/api/moderation/kick', {
          method: 'POST',
          body: JSON.stringify({ identity, channelId: activeVoiceChannelId }),
        });
      } catch (err) {
        alert(err.message);
      }
    });
    menu.appendChild(kickItem);
  }

  document.body.appendChild(menu);
  contextMenuEl = menu;

  const rect = menu.getBoundingClientRect();
  let left = x;
  let top = y;
  if (left + rect.width > window.innerWidth) left = window.innerWidth - rect.width - 8;
  if (top + rect.height > window.innerHeight) top = window.innerHeight - rect.height - 8;
  menu.style.left = `${Math.max(8, left)}px`;
  menu.style.top = `${Math.max(8, top)}px`;
}

memberListItems.addEventListener('contextmenu', (e) => {
  const row = e.target.closest('.member-row');
  if (!row || !row.dataset.identity) return;
  e.preventDefault();
  openContextMenu(e.clientX, e.clientY, participantFromRow(row));
});

voiceChannelsList.addEventListener('contextmenu', (e) => {
  const row = e.target.closest('.member-row');
  if (!row || !row.dataset.identity) return;
  e.preventDefault();
  openContextMenu(e.clientX, e.clientY, participantFromRow(row));
});

grid.addEventListener('contextmenu', (e) => {
  const tile = e.target.closest('.tile');
  if (!tile || !tile.dataset.identity) return;
  e.preventDefault();
  openContextMenu(e.clientX, e.clientY, participantFromRow(tile), { allowKick: true });
});

// ---------- entrar/sair do app ----------
function handleFullDisconnect() {
  if (voiceRoom) {
    try {
      voiceRoom.disconnect();
    } catch {
      // ignora
    }
    voiceRoom = null;
  }
  grid.innerHTML = '';
  grid.classList.remove('has-expanded');
  clearMembers();
  resetAudioState();
  resetVoiceControlsUI();
  voicePresence.clear();
  chatHistoryByChannel.clear();
  activeVoiceChannelId = null;
  activeTextChannelId = null;
  joining = false;
  joinSubmitBtn.disabled = false;
  joinSubmitBtn.textContent = 'Entrar';
  joinScreen.hidden = false;
  roomScreen.hidden = true;
  closeSettingsModal();
}

joinForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (joining) return;
  joining = true;
  joinError.hidden = true;
  joinSubmitBtn.disabled = true;
  joinSubmitBtn.textContent = 'Entrando...';

  const name = nameInput.value.trim();
  const password = passwordInput.value;

  try {
    const configRes = await fetch(`${serverUrl}/api/config`);
    if (!configRes.ok) throw new Error('Não foi possível falar com o servidor.');
    const configData = await configRes.json();
    livekitUrl = configData.livekitUrl;

    const tokenRes = await fetch(`${serverUrl}/api/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, password }),
    });

    if (!tokenRes.ok) {
      const data = await tokenRes.json().catch(() => ({}));
      throw new Error(data.error || 'Não foi possível entrar.');
    }

    const { token, identity, sessionToken: st } = await tokenRes.json();
    sessionToken = st;
    myIdentity = identity;
    myName = identity;

    lobbyRoom = new Room({ adaptiveStream: true, dynacast: true });

    lobbyRoom.on(RoomEvent.ParticipantConnected, (participant) => {
      addMember(participant);
      updateParticipantCount();
      if (activeVoiceChannelId) broadcastVoicePresence('join', activeVoiceChannelId);
    });
    lobbyRoom.on(RoomEvent.ParticipantDisconnected, (participant) => {
      removeMember(participant);
      updateParticipantCount();
      voicePresence.forEach((map) => map.delete(participant.identity));
      renderChannelLists();
    });
    lobbyRoom.on(RoomEvent.Disconnected, () => {
      handleFullDisconnect();
    });
    lobbyRoom.on(RoomEvent.DataReceived, (payload, participant) => {
      let msg;
      try {
        msg = JSON.parse(chatDecoder.decode(payload));
      } catch {
        return;
      }
      if (!msg || !msg.type) return;

      if (msg.type === 'chat') {
        pushChatMessage(msg.channelId, {
          name: msg.name || participant?.name || participant?.identity,
          text: msg.text,
          ts: msg.ts,
          isSelf: false,
        });
      } else if (msg.type === 'voice-presence') {
        if (!voicePresence.has(msg.channelId)) voicePresence.set(msg.channelId, new Map());
        const map = voicePresence.get(msg.channelId);
        if (msg.action === 'join') map.set(msg.identity, msg.name || msg.identity);
        else map.delete(msg.identity);
        renderChannelLists();
      } else if (msg.type === 'state-changed') {
        fetchServerState().catch(() => {});
      }
    });

    await lobbyRoom.connect(livekitUrl, token);

    selfAvatar.textContent = identity.charAt(0).toUpperCase();
    selfName.textContent = identity;
    addMember(lobbyRoom.localParticipant);
    lobbyRoom.remoteParticipants.forEach((participant) => addMember(participant));

    await fetchServerState();
    chatHistoryByChannel.clear();
    activeTextChannelId = serverState.channels.text[0]?.id || null;
    resetVoiceControlsUI();
    if (activeTextChannelId) switchTextChannel(activeTextChannelId);

    joinScreen.hidden = true;
    roomScreen.hidden = false;
    updateParticipantCount();
  } catch (err) {
    joinError.textContent = err.message || 'Erro ao entrar na sala.';
    joinError.hidden = false;
    joining = false;
    joinSubmitBtn.disabled = false;
    joinSubmitBtn.textContent = 'Entrar';
  }
});

micBtn.addEventListener('click', async () => {
  if (!voiceRoom) return;
  const newOn = micBtn.dataset.on !== 'true';
  await voiceRoom.localParticipant.setMicrophoneEnabled(newOn);
  micBtn.dataset.on = String(newOn);
  micBtn.classList.toggle('off', !newOn);
});

const deafenBtn = document.getElementById('deafen-btn');
deafenBtn.addEventListener('click', () => {
  if (!voiceRoom) return;
  setDeafened(!isDeafened);
});

camBtn.addEventListener('click', async () => {
  if (!voiceRoom) return;
  const newOn = camBtn.dataset.on !== 'true';
  const publication = await voiceRoom.localParticipant.setCameraEnabled(newOn);
  camBtn.dataset.on = String(newOn);
  camBtn.classList.toggle('off', !newOn);

  if (newOn && publication && publication.track) {
    attachTrack(publication.track, voiceRoom.localParticipant);
  } else if (!newOn) {
    const tile = document.getElementById(tileId(voiceRoom.localParticipant.identity));
    tile?.querySelectorAll('video').forEach((el) => el.remove());
    if (tile && !tile.querySelector('video')) tile.classList.remove('has-video');
  }
});

shareBtn.addEventListener('click', async () => {
  if (!voiceRoom) return;
  const newOn = shareBtn.dataset.on !== 'true';
  const publication = await voiceRoom.localParticipant.setScreenShareEnabled(newOn);
  shareBtn.dataset.on = String(newOn);
  shareBtn.classList.toggle('off', !newOn);

  if (newOn && publication && publication.track) {
    attachTrack(publication.track, voiceRoom.localParticipant);
  } else if (!newOn) {
    const tile = document.getElementById(tileId(voiceRoom.localParticipant.identity));
    tile?.querySelectorAll('video').forEach((el) => el.remove());
    if (tile && !tile.querySelector('video')) tile.classList.remove('has-video');
  }
});

hangupBtn.addEventListener('click', async () => {
  if (!voiceRoom) return;
  await leaveVoiceChannel();
});

exitAppBtn.addEventListener('click', async () => {
  if (!confirm('Sair do PrimalVoice? Você volta pra tela de login.')) return;
  if (voiceRoom) await leaveVoiceChannel({ silent: true });
  if (lobbyRoom) await lobbyRoom.disconnect();
  handleFullDisconnect();
});

// ---------- atalhos de teclado (silenciar / ensurdecer) ----------
function acceleratorFromEvent(e) {
  if (['Control', 'Meta', 'Alt', 'Shift'].includes(e.key)) return null;
  const parts = [];
  if (e.ctrlKey) parts.push('Control');
  if (e.metaKey) parts.push('Super');
  if (e.altKey) parts.push('Alt');
  if (e.shiftKey) parts.push('Shift');
  let key = e.key;
  if (key === ' ') key = 'Space';
  else if (key.length === 1) key = key.toUpperCase();
  parts.push(key);
  return parts.join('+');
}

function startRecordingKeybind(button, action) {
  button.textContent = 'Aperte a tecla...';
  button.classList.add('recording');
  const onKeydown = async (e) => {
    e.preventDefault();
    const accelerator = acceleratorFromEvent(e);
    if (!accelerator) return;
    document.removeEventListener('keydown', onKeydown, true);
    button.classList.remove('recording');
    const result = await window.vortex.setShortcut(action, accelerator);
    if (result && result.ok) {
      keybinds[action] = accelerator;
      button.textContent = accelerator;
      saveDevicePrefs();
    } else {
      button.textContent = keybinds[action] || 'Definir atalho';
      alert((result && result.error) || 'Não consegui registrar esse atalho.');
    }
  };
  document.addEventListener('keydown', onKeydown, true);
}

keybindMuteBtn.addEventListener('click', () => startRecordingKeybind(keybindMuteBtn, 'muteSelf'));
keybindDeafenBtn.addEventListener('click', () => startRecordingKeybind(keybindDeafenBtn, 'deafen'));

window.vortex.onShortcut((action) => {
  if (action === 'muteSelf') {
    if (!voiceRoom) return;
    const newOn = micBtn.dataset.on !== 'true';
    voiceRoom.localParticipant.setMicrophoneEnabled(newOn);
    micBtn.dataset.on = String(newOn);
    micBtn.classList.toggle('off', !newOn);
  } else if (action === 'deafen') {
    if (!voiceRoom) return;
    setDeafened(!isDeafened);
  }
});

// ---------- dispositivos de áudio/vídeo ----------
function fillSelect(select, list, selectedId, fallbackLabel) {
  select.innerHTML = '';
  list.forEach((d, i) => {
    const opt = document.createElement('option');
    opt.value = d.deviceId;
    opt.textContent = d.label || `${fallbackLabel} ${i + 1}`;
    select.appendChild(opt);
  });
  if (selectedId && list.some((d) => d.deviceId === selectedId)) select.value = selectedId;
}

async function populateDeviceSelects() {
  try {
    const tmpStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true }).catch(() => null);
    const devices = await navigator.mediaDevices.enumerateDevices();
    if (tmpStream) tmpStream.getTracks().forEach((t) => t.stop());

    fillSelect(micSelect, devices.filter((d) => d.kind === 'audioinput'), devicePrefs.micId, 'Microfone');
    fillSelect(cameraSelect, devices.filter((d) => d.kind === 'videoinput'), devicePrefs.cameraId, 'Câmera');
    const outputs = devices.filter((d) => d.kind === 'audiooutput');
    if (outputs.length > 0) {
      speakerSelect.disabled = false;
      fillSelect(speakerSelect, outputs, devicePrefs.speakerId, 'Saída de áudio');
    } else {
      speakerSelect.innerHTML = '<option>Não suportado neste sistema</option>';
      speakerSelect.disabled = true;
    }
  } catch {
    // sem permissão de mídia ainda — os selects ficam vazios até a pessoa entrar num canal de voz
  }
}

async function setOutputDeviceForRoom() {
  if (!voiceRoom || !devicePrefs.speakerId) return;
  try {
    await voiceRoom.switchActiveDevice('audiooutput', devicePrefs.speakerId);
  } catch {
    // setSinkId pode não ser suportado dependendo do SO/navegador
  }
}

micSelect.addEventListener('change', async () => {
  devicePrefs.micId = micSelect.value;
  await saveDevicePrefs();
  if (voiceRoom) {
    try {
      await voiceRoom.switchActiveDevice('audioinput', micSelect.value);
    } catch {
      // ignora
    }
  }
});
cameraSelect.addEventListener('change', async () => {
  devicePrefs.cameraId = cameraSelect.value;
  await saveDevicePrefs();
  if (voiceRoom) {
    try {
      await voiceRoom.switchActiveDevice('videoinput', cameraSelect.value);
    } catch {
      // ignora
    }
  }
});
speakerSelect.addEventListener('change', async () => {
  devicePrefs.speakerId = speakerSelect.value;
  await saveDevicePrefs();
  await setOutputDeviceForRoom();
});

// ---------- modal de configurações ----------
function switchModalTab(tab) {
  modalTabs.forEach((btn) => btn.classList.toggle('active', btn.dataset.tab === tab));
  modalPanes.forEach((pane) => pane.classList.toggle('active', pane.dataset.pane === tab));
}
modalTabs.forEach((btn) => btn.addEventListener('click', () => switchModalTab(btn.dataset.tab)));

function openSettingsModal(defaultTab) {
  settingsModalOverlay.hidden = false;
  populateDeviceSelects();
  if (myPermissions.manageChannels) renderManageChannels();
  if (myPermissions.manageRoles) renderRolesTab();
  switchModalTab(defaultTab || 'voice');
}
function closeSettingsModal() {
  settingsModalOverlay.hidden = true;
}

appSettingsBtn.addEventListener('click', () => openSettingsModal('voice'));
addTextChannelBtn.addEventListener('click', () => openSettingsModal('channels'));
addVoiceChannelBtn.addEventListener('click', () => openSettingsModal('channels'));
settingsModalClose.addEventListener('click', closeSettingsModal);
settingsModalOverlay.addEventListener('click', (e) => {
  if (e.target === settingsModalOverlay) closeSettingsModal();
});

// ---------- gerenciar canais (dentro do modal) ----------
function buildManageChannelRow(channel, type) {
  const row = document.createElement('div');
  row.className = 'manage-channel-row';
  const name = document.createElement('span');
  name.className = 'name';
  name.textContent = channel.name;
  row.appendChild(name);

  const delBtn = document.createElement('button');
  delBtn.textContent = 'Apagar';
  delBtn.addEventListener('click', async () => {
    if (serverState.channels[type].length <= 1) {
      alert('Precisa deixar pelo menos um canal desse tipo.');
      return;
    }
    if (!confirm(`Apagar o canal "${channel.name}"?`)) return;
    try {
      const data = await apiFetch(`/api/channels/${type}/${channel.id}`, { method: 'DELETE' });
      serverState.channels = data.channels;
      renderChannelLists();
      renderManageChannels();
      broadcastStateChanged();
    } catch (err) {
      alert(err.message);
    }
  });
  row.appendChild(delBtn);
  return row;
}

function buildCreateChannelRow(type) {
  const row = document.createElement('div');
  row.className = 'create-channel-row';
  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = type === 'text' ? 'nome-do-canal' : 'Nome da sala de voz';
  input.maxLength = 40;
  const btn = document.createElement('button');
  btn.className = 'secondary-btn';
  btn.textContent = 'Criar';
  btn.addEventListener('click', async () => {
    const name = input.value.trim();
    if (!name) return;
    try {
      const data = await apiFetch('/api/channels', { method: 'POST', body: JSON.stringify({ type, name }) });
      serverState.channels = data.channels;
      input.value = '';
      renderChannelLists();
      renderManageChannels();
      broadcastStateChanged();
    } catch (err) {
      alert(err.message);
    }
  });
  row.appendChild(input);
  row.appendChild(btn);
  return row;
}

function renderManageChannels() {
  manageTextChannelsEl.innerHTML = '';
  serverState.channels.text.forEach((ch) => manageTextChannelsEl.appendChild(buildManageChannelRow(ch, 'text')));
  manageTextChannelsEl.appendChild(buildCreateChannelRow('text'));

  manageVoiceChannelsEl.innerHTML = '';
  serverState.channels.voice.forEach((ch) => manageVoiceChannelsEl.appendChild(buildManageChannelRow(ch, 'voice')));
  manageVoiceChannelsEl.appendChild(buildCreateChannelRow('voice'));
}

// ---------- cargos (dentro do modal) ----------
function renderRolesTab() {
  rolesListEl.innerHTML = '';
  serverState.roles.forEach((role) => {
    const item = document.createElement('div');
    item.className = 'role-list-item';
    item.classList.toggle('active', role.id === selectedRoleId);
    const dot = document.createElement('span');
    dot.className = 'role-color-dot';
    dot.style.background = role.color;
    item.appendChild(dot);
    const label = document.createElement('span');
    label.textContent = role.name;
    item.appendChild(label);
    item.addEventListener('click', () => {
      selectedRoleId = role.id;
      renderRolesTab();
    });
    rolesListEl.appendChild(item);
  });

  renderRoleEditor();
  renderRoleMembers();
}

function renderRoleEditor() {
  roleEditorEl.innerHTML = '';
  const role = serverState.roles.find((r) => r.id === selectedRoleId);
  if (!role) {
    const p = document.createElement('p');
    p.className = 'modal-hint';
    p.textContent = 'Selecione um cargo pra editar, ou crie um novo.';
    roleEditorEl.appendChild(p);
    return;
  }

  const nameField = document.createElement('label');
  nameField.className = 'role-editor-field';
  nameField.textContent = 'Nome';
  const nameInputEl = document.createElement('input');
  nameInputEl.type = 'text';
  nameInputEl.value = role.name;
  nameInputEl.maxLength = 30;
  nameField.appendChild(nameInputEl);
  roleEditorEl.appendChild(nameField);

  const colorField = document.createElement('label');
  colorField.className = 'role-editor-field';
  colorField.textContent = 'Cor';
  const colorInputEl = document.createElement('input');
  colorInputEl.type = 'color';
  colorInputEl.value = role.color;
  colorField.appendChild(colorInputEl);
  roleEditorEl.appendChild(colorField);

  const permsTitle = document.createElement('h3');
  permsTitle.style.marginTop = '0';
  permsTitle.textContent = 'Permissões';
  roleEditorEl.appendChild(permsTitle);

  const permGrid = document.createElement('div');
  permGrid.className = 'permission-grid';
  const permInputs = {};
  PERMISSION_KEYS.forEach((key) => {
    const row = document.createElement('div');
    row.className = 'permission-row';
    const span = document.createElement('span');
    span.textContent = PERMISSION_LABELS[key];
    row.appendChild(span);
    const checkbox = document.createElement('span');
    checkbox.className = 'context-menu-checkbox';
    checkbox.classList.toggle('checked', !!role.permissions[key]);
    checkbox.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
    checkbox.addEventListener('click', () => checkbox.classList.toggle('checked'));
    permInputs[key] = checkbox;
    row.appendChild(checkbox);
    permGrid.appendChild(row);
  });
  roleEditorEl.appendChild(permGrid);

  const actions = document.createElement('div');
  actions.className = 'role-editor-actions';
  const saveBtn = document.createElement('button');
  saveBtn.className = 'secondary-btn';
  saveBtn.textContent = 'Salvar';
  saveBtn.addEventListener('click', async () => {
    const permissions = {};
    PERMISSION_KEYS.forEach((key) => {
      permissions[key] = permInputs[key].classList.contains('checked');
    });
    try {
      const data = await apiFetch(`/api/roles/${role.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: nameInputEl.value.trim(), color: colorInputEl.value, permissions }),
      });
      serverState.roles = data.roles;
      renderRolesTab();
      broadcastStateChanged();
    } catch (err) {
      alert(err.message);
    }
  });
  const delBtn = document.createElement('button');
  delBtn.className = 'danger-btn';
  delBtn.textContent = 'Apagar cargo';
  delBtn.addEventListener('click', async () => {
    if (!confirm(`Apagar o cargo "${role.name}"?`)) return;
    try {
      const data = await apiFetch(`/api/roles/${role.id}`, { method: 'DELETE' });
      serverState.roles = data.roles;
      serverState.memberRoles = data.memberRoles;
      selectedRoleId = null;
      renderRolesTab();
      broadcastStateChanged();
    } catch (err) {
      alert(err.message);
    }
  });
  actions.appendChild(saveBtn);
  actions.appendChild(delBtn);
  roleEditorEl.appendChild(actions);
}

createRoleBtn.addEventListener('click', async () => {
  try {
    const data = await apiFetch('/api/roles', {
      method: 'POST',
      body: JSON.stringify({ name: 'Novo cargo', color: '#ff5e3a', permissions: {} }),
    });
    serverState.roles = data.roles;
    selectedRoleId = data.roles[data.roles.length - 1].id;
    renderRolesTab();
    broadcastStateChanged();
  } catch (err) {
    alert(err.message);
  }
});

function renderRoleMembers() {
  rolesMembersListEl.innerHTML = '';
  const memberEls = Array.from(memberListItems.querySelectorAll('.member-row'));
  memberEls.forEach((el) => {
    const identity = el.dataset.identity;
    const name = el.dataset.name;

    const row = document.createElement('div');
    row.className = 'role-member-row';
    const nameEl = document.createElement('span');
    nameEl.className = 'name';
    nameEl.textContent = name;
    row.appendChild(nameEl);

    const badges = document.createElement('div');
    badges.className = 'role-member-badges';
    const assignedIds = new Set(serverState.memberRoles[identity] || []);

    if (identity === serverState.ownerIdentity) {
      const ownerBadge = document.createElement('span');
      ownerBadge.className = 'role-badge assigned';
      ownerBadge.style.background = 'rgba(255,178,56,0.2)';
      ownerBadge.style.color = '#ffb238';
      ownerBadge.style.borderColor = '#ffb238';
      ownerBadge.textContent = 'Dono';
      badges.appendChild(ownerBadge);
    }

    serverState.roles.forEach((role) => {
      const assigned = assignedIds.has(role.id);
      const badge = document.createElement('span');
      badge.className = `role-badge${assigned ? ' assigned' : ''}`;
      badge.style.background = assigned ? `${role.color}33` : 'transparent';
      badge.style.color = role.color;
      badge.style.borderColor = role.color;
      badge.textContent = role.name;
      badge.addEventListener('click', async () => {
        try {
          const data = await apiFetch(`/api/members/${encodeURIComponent(identity)}/roles`, {
            method: 'POST',
            body: JSON.stringify({ roleId: role.id, action: assigned ? 'remove' : 'add' }),
          });
          serverState.memberRoles = data.memberRoles;
          renderRoleMembers();
          broadcastStateChanged();
        } catch (err) {
          alert(err.message);
        }
      });
      badges.appendChild(badge);
    });

    row.appendChild(badges);
    rolesMembersListEl.appendChild(row);
  });
}

init();
