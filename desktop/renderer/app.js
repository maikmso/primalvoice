const { Room, RoomEvent, ConnectionQuality, Track } = LivekitClient;

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
const usernamePrivacyHint = document.getElementById('username-privacy-hint');
const joinDisplaynameLabel = document.getElementById('join-displayname-label');
const displaynameInput = document.getElementById('displayname-input');
const passwordInput = document.getElementById('password-input');
const passwordConfirmInput = document.getElementById('password-confirm-input');
const roomPasswordInput = document.getElementById('room-password-input');
const joinPasswordLabel = document.getElementById('join-password-label');
const joinPasswordConfirmLabel = document.getElementById('join-password-confirm-label');
const joinRoomPasswordLabel = document.getElementById('join-room-password-label');
const joinModeToggle = document.getElementById('join-mode-toggle');
const joinError = document.getElementById('join-error');
const joinSubmitBtn = joinForm.querySelector('button[type="submit"]');

// ---------- login x criar conta ----------
let joinMode = 'login'; // 'login' | 'register'
function applyJoinMode() {
  const isRegister = joinMode === 'register';
  joinDisplaynameLabel.hidden = !isRegister;
  displaynameInput.required = isRegister;
  usernamePrivacyHint.hidden = !isRegister;
  joinPasswordConfirmLabel.hidden = !isRegister;
  joinRoomPasswordLabel.hidden = !isRegister;
  passwordConfirmInput.required = isRegister;
  roomPasswordInput.required = isRegister;
  joinPasswordLabel.firstChild.textContent = isRegister ? 'Crie uma senha' : 'Sua senha';
  joinSubmitBtn.textContent = isRegister ? 'Criar conta' : 'Entrar';
  joinModeToggle.textContent = isRegister ? 'Já tem conta? Entrar' : 'Ainda não tem conta? Criar conta';
  joinError.hidden = true;
}
joinModeToggle.addEventListener('click', () => {
  joinMode = joinMode === 'login' ? 'register' : 'login';
  applyJoinMode();
});

const grid = document.getElementById('grid');
const memberSidebarGroups = document.getElementById('member-sidebar-groups');
const hideSidebarFullscreenBtn = document.getElementById('hide-sidebar-fullscreen-btn');
const homeIconBtn = document.getElementById('home-icon-btn');
const serverIconBtn = document.getElementById('server-icon-btn');
const homeUnreadBadge = document.getElementById('home-unread-badge');
const serverUnreadBadge = document.getElementById('server-unread-badge');
const dmQuickList = document.getElementById('dm-quick-list');
const sidebarTitleEl = document.getElementById('sidebar-title');
const serverIconInput = document.getElementById('server-icon-input');
const micBtn = document.getElementById('mic-btn');
const camBtn = document.getElementById('cam-btn');
const shareBtn = document.getElementById('share-btn');
const hangupBtn = document.getElementById('hangup-btn');
const exitAppBtn = document.getElementById('exit-app-btn');
const memberListItems = document.getElementById('member-list-items');
const selfAvatar = document.getElementById('self-avatar');
const selfName = document.getElementById('self-name');
const selfNameBtn = document.getElementById('self-name-btn');
const channelSidebar = document.querySelector('.channel-sidebar');
const memberList = document.querySelector('.member-list');
const resizeLeft = document.getElementById('resize-left');
const toggleMembersBtn = document.getElementById('toggle-members-btn');
const userPanelControls = document.querySelector('.user-panel-controls');
const voiceStatusBar = document.getElementById('voice-status-bar');
const voiceStatusChannel = document.getElementById('voice-status-channel');
const voiceStatusTitle = document.getElementById('voice-status-title');
const voiceQualityTooltip = document.getElementById('voice-quality-tooltip');
const voiceQualityIcon = document.getElementById('voice-quality-icon');

// posiciona o balão do ping em coordenadas fixas da tela (calculadas na
// hora), em vez de depender de "escapar" do painel — o painel da barra
// lateral tem overflow:hidden e cortava o topo do balão
voiceQualityIcon.addEventListener('mouseenter', () => {
  const rect = voiceQualityIcon.getBoundingClientRect();
  voiceQualityTooltip.style.left = `${rect.left + rect.width / 2}px`;
  voiceQualityTooltip.style.top = `${rect.top - 9}px`;
  voiceQualityTooltip.style.transform = 'translate(-50%, -100%)';
  voiceQualityTooltip.classList.add('tooltip-visible');
});
voiceQualityIcon.addEventListener('mouseleave', () => {
  voiceQualityTooltip.classList.remove('tooltip-visible');
});
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

const profileAvatarPreview = document.getElementById('profile-avatar-preview');
const profileAvatarChangeBtn = document.getElementById('profile-avatar-change-btn');
const profileAvatarRemoveBtn = document.getElementById('profile-avatar-remove-btn');
const profileAvatarInput = document.getElementById('profile-avatar-input');
const profileBannerPreview = document.getElementById('profile-banner-preview');
const profileBannerChangeBtn = document.getElementById('profile-banner-change-btn');
const profileBannerRemoveBtn = document.getElementById('profile-banner-remove-btn');
const profileBannerInput = document.getElementById('profile-banner-input');
const profileDisplaynameInput = document.getElementById('profile-displayname-input');
const profileIdentityTag = document.getElementById('profile-identity-tag');
const profileStatusInput = document.getElementById('profile-status-input');
const profileSaveBtn = document.getElementById('profile-save-btn');

const cropOverlay = document.getElementById('crop-overlay');
const cropTitle = document.getElementById('crop-title');
const cropStage = document.getElementById('crop-stage');
const cropImage = document.getElementById('crop-image');
const cropZoomInput = document.getElementById('crop-zoom-input');
const cropCancelBtn = document.getElementById('crop-cancel-btn');
const cropConfirmBtn = document.getElementById('crop-confirm-btn');

const themeGrid = document.getElementById('theme-grid');

const dmListEl = document.getElementById('dm-list');

const keybindMuteClearBtn = document.getElementById('keybind-mute-clear-btn');
const keybindDeafenClearBtn = document.getElementById('keybind-deafen-clear-btn');

const chatAttachmentBtn = document.getElementById('chat-attachment-btn');
const chatAttachmentInput = document.getElementById('chat-attachment-input');

const sharepickOverlay = document.getElementById('sharepick-overlay');
const sharepickGrid = document.getElementById('sharepick-grid');
const sharepickTabs = document.querySelectorAll('.sharepick-tab');
const sharepickAudioCheckbox = document.getElementById('sharepick-audio-checkbox');
const sharepickCancelBtn = document.getElementById('sharepick-cancel-btn');
const sharepickConfirmBtn = document.getElementById('sharepick-confirm-btn');

const HASH_ICON_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="9" x2="20" y2="9"></line><line x1="4" y1="15" x2="20" y2="15"></line><line x1="10" y1="3" x2="8" y2="21"></line><line x1="16" y1="3" x2="14" y2="21"></line></svg>';
const VOICE_ICON_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>';
const DM_ICON_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>';
const PENCIL_ICON_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"></path></svg>';

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
// guarda se a voz já estava mutada por escolha da pessoa antes de ensurdecer
// — assim, ao tirar o ensurdecer, a gente sabe se deve voltar a falar ou não
// (igual Discord: mutar sozinho não mexe no escutar; ensurdecer muta os dois;
// tirar o ensurdecer só devolve a fala se ela não tinha sido mutada por
// escolha própria antes)
let micMutedBeforeDeafen = false;

function animateIconKick(el) {
  const svg = el?.querySelector('svg');
  if (!svg) return;
  svg.classList.remove('icon-kick');
  void svg.offsetWidth; // força reflow pra poder reiniciar a animação
  svg.classList.add('icon-kick');
  svg.addEventListener('animationend', () => svg.classList.remove('icon-kick'), { once: true });
}
let amISpeaking = false;

// ---------- indicador de voz no ícone da barra de tarefas (igual Discord) ----------
// Prioridade quando mais de uma coisa é verdade ao mesmo tempo: ensurdecido
// > mudo > falando > só conectado parado. Sem voiceRoom, tira o indicador.
function updateVoiceOverlay() {
  if (!window.vortex?.setVoiceOverlay) return;
  let status = 'none';
  if (voiceRoom) {
    if (isDeafened) status = 'deafened';
    else if (micBtn.dataset.on !== 'true') status = 'muted';
    else if (amISpeaking) status = 'speaking';
    else status = 'idle';
  }
  window.vortex.setVoiceOverlay(status);
}
let voiceQualityInterval = null;

// ---------- indicador de qualidade da conexão (barrinhas + ping) ----------
function setVoiceQuality(quality) {
  voiceQualityIcon.classList.remove('quality-excellent', 'quality-good', 'quality-poor', 'quality-lost', 'quality-unknown');
  voiceQualityIcon.classList.add(`quality-${quality}`);
}

function updateVoiceQualityTooltip() {
  if (!voiceRoom) return;
  const rtt = voiceRoom.engine && voiceRoom.engine.client && voiceRoom.engine.client.rtt;
  voiceQualityTooltip.textContent = typeof rtt === 'number' && rtt > 0 ? `Ping: ${rtt}ms` : 'Qualidade da conexão';
}

function stopVoiceQualityMonitor() {
  if (voiceQualityInterval) {
    clearInterval(voiceQualityInterval);
    voiceQualityInterval = null;
  }
  setVoiceQuality('unknown');
  voiceQualityTooltip.textContent = 'Qualidade da conexão';
}
let joining = false;

const chatHistoryByChannel = new Map(); // channelId -> [{name,text,ts,isSelf}]
// Canais/DMs cujo histórico já foi carregado do servidor nesta sessão —
// evita buscar de novo toda vez que a pessoa clica pra trocar de canal.
const historyLoadedFor = new Set();
// Contagem de mensagens não lidas por canal/DM (channelId -> quantidade),
// tipo Discord — some assim que a pessoa abre aquela conversa.
const unreadCounts = new Map();
const voicePresence = new Map(); // channelId -> Map(identity -> name)
const voiceMemberStatus = new Map(); // identity -> { muted, deafened }
const memberProfiles = new Map(); // identity -> { avatar, banner, status, displayName }
let myAvatarDataUrl = '';
let myBannerDataUrl = '';
let myStatusText = '';
let myDisplayName = '';
let pendingProfileAvatar = null; // enquanto o modal de perfil está aberto
let pendingProfileBanner = null;

// ---------- conversas diretas (DM) ----------
// Pra entrega ao vivo, a mensagem ainda viaja pelo mesmo canal de dados do
// LiveKit (que todo mundo na sala recebe), só que só é MOSTRADA na conversa
// privada entre as duas pessoas envolvidas — não é sigilo de ponta a ponta,
// é privacidade de interface. O histórico persistido no servidor, porém,
// fica guardado numa chave exclusiva das duas pessoas (não vaza pra mais
// ninguém que entrar na sala depois).
const dmPeers = new Set(); // identities com quem já trocou DM nessa sessão
let activeDmPeer = null; // identity da conversa privada aberta, ou null

// Identidades que já vimos entrar na sala (ou de quem já recebemos o perfil)
// durante essa sessão do app — existe pra garantir que a pessoa continue
// aparecendo como OFFLINE na lista de membros depois que ela sai, mesmo se
// ela criou a conta DEPOIS da última vez que buscamos o /api/state (nesse
// caso ela não estaria no serverState.profiles ainda, e sem isso aqui
// desapareceria da lista por completo em vez de virar OFFLINE).
const knownIdentities = new Set();

function dmChannelKey(identity) {
  return `dm:${identity}`;
}
function isDmChannelId(id) {
  return typeof id === 'string' && id.startsWith('dm:');
}
function dmPeerFromChannelId(id) {
  return id.slice(3);
}
function displayNameFor(identity) {
  if (identity === myIdentity) return myDisplayName || myName || identity;
  return memberProfiles.get(identity)?.displayName || identity;
}

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
const muteSound = new Audio('assets/sound-mute.wav');
const unmuteSound = new Audio('assets/sound-unmute.wav');
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
  applyServerIcon();

  // Perfil (foto/banner/nome/status) agora é uma conta de verdade guardada
  // no servidor — segue a pessoa entre PCs/dispositivos. Isso inclui gente
  // que não está online agora (diferente do broadcast, que só chega pra
  // quem já está na sala no momento).
  const profiles = data.profiles || {};
  for (const [identity, profile] of Object.entries(profiles)) {
    if (identity === myIdentity) {
      myAvatarDataUrl = profile.avatar || '';
      myBannerDataUrl = profile.banner || '';
      myStatusText = profile.status || '';
      myDisplayName = profile.displayName || '';
    } else {
      memberProfiles.set(identity, profile);
    }
    applyProfileEverywhere(identity);
  }

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

// "Ensurdecido" é uma escolha só do próprio cliente (o LiveKit não sabe
// disso), então avisamos os outros manualmente pelo canal de dados —
// diferente do mudo do microfone, que já é visível pra todo mundo através
// do próprio track de áudio (TrackMuted/TrackUnmuted do LiveKit).
function broadcastVoiceStatus() {
  if (!lobbyRoom || !activeVoiceChannelId) return;
  const payload = { type: 'voice-status', identity: myIdentity, deafened: isDeafened };
  lobbyRoom.localParticipant.publishData(chatEncoder.encode(JSON.stringify(payload)), { reliable: true });
}

// ---------- perfil (foto + status) ----------
// Não tem servidor de perfil de verdade: cada um guarda a própria foto/status
// salvos no config.json local, e avisa os outros pelo canal de dados sempre
// que muda ou quando alguém novo entra (igual ao voice-status).
function broadcastProfile() {
  if (!lobbyRoom) return;
  const payload = {
    type: 'profile-update',
    identity: myIdentity,
    avatar: myAvatarDataUrl,
    banner: myBannerDataUrl,
    status: myStatusText,
    displayName: myDisplayName,
  };
  lobbyRoom.localParticipant.publishData(chatEncoder.encode(JSON.stringify(payload)), { reliable: true });
}

function applyAvatarToEl(el, identity) {
  if (!el) return;
  const avatar = identity === myIdentity ? myAvatarDataUrl : memberProfiles.get(identity)?.avatar;
  if (avatar) {
    el.style.backgroundImage = `url(${avatar})`;
    el.classList.add('has-avatar');
  } else {
    el.style.backgroundImage = '';
    el.classList.remove('has-avatar');
  }
}

function applyProfileEverywhere(identity) {
  document.querySelectorAll(`.member-row[data-identity="${cssEscape(identity)}"] .avatar`).forEach((el) => applyAvatarToEl(el, identity));
  document.querySelectorAll(`.member-row[data-identity="${cssEscape(identity)}"] .member-name`).forEach((el) => {
    el.textContent = displayNameFor(identity);
  });
  const tile = document.getElementById(tileId(identity));
  if (tile) {
    applyAvatarToEl(tile.querySelector('.initial'), identity);
    const label = tile.querySelector('.label');
    if (label) label.textContent = displayNameFor(identity);
  }
  if (identity === myIdentity) applyAvatarToEl(selfAvatar, identity);
  if (identity === activeDmPeer) renderDmHeader();
  renderDmList();
  // mensagens do chat que já estavam na tela quando a pessoa trocou de foto
  // (ou quando o perfil dela só chegou depois que a mensagem foi mandada)
  // ficavam pra sempre com o avatar antigo/vazio, porque só eram desenhadas
  // uma vez — atualiza aqui pra pegar todo mundo que já apareceu na conversa.
  document.querySelectorAll(`.chat-message[data-identity="${cssEscape(identity)}"] .avatar`).forEach((el) => applyAvatarToEl(el, identity));
}

// Cargo "principal" de alguém pra fins de cor (o primeiro cargo dela na
// ordem de serverState.roles) — mesma lógica usada pra agrupar a lista de
// membros da direita, só que aqui devolve só a cor (ou null se não tem
// cargo nenhum).
function topRoleColorFor(identity) {
  if (!identity || !serverState.roles) return null;
  const assigned = serverState.memberRoles[identity] || [];
  const role = serverState.roles.find((r) => assigned.includes(r.id));
  return role ? role.color : null;
}

// Se o cargo (ou a cor dele) mudar DEPOIS que a mensagem já apareceu na
// tela, sem isso ela ficaria pra sempre com a cor antiga/nenhuma — mesmo
// motivo da correção do avatar retroativo.
function refreshAllChatAuthorColors() {
  document.querySelectorAll('.chat-message[data-identity]').forEach((row) => {
    const author = row.querySelector('.author');
    if (!author) return;
    author.style.color = topRoleColorFor(row.dataset.identity) || '';
  });
}

function cssEscape(value) {
  return String(value).replace(/["\\]/g, '\\$&');
}

function loadProfileFromConfig(cfg) {
  const p = cfg.profile || {};
  myAvatarDataUrl = p.avatar || '';
  myBannerDataUrl = p.banner || '';
  myStatusText = p.status || '';
  myDisplayName = p.displayName || '';
}

async function saveProfileToConfig() {
  const cfg = (await window.vortex.getConfig()) || {};
  cfg.profile = { avatar: myAvatarDataUrl, banner: myBannerDataUrl, status: myStatusText, displayName: myDisplayName };
  await window.vortex.setConfig(cfg);
}

// ---------- ajuste de foto/banner (crop interativo) ----------
// A pessoa escolhe um arquivo, aí abre um editor onde dá pra arrastar a
// imagem (ver exatamente qual área vai aparecer) e dar zoom, antes de
// confirmar. Só depois disso a imagem é de fato recortada/comprimida.
const CROP_SPECS = {
  avatar: { frameW: 160, frameH: 160, outW: 160, outH: 160, maxBytes: 22000, shape: 'avatar' },
  banner: { frameW: 420, frameH: 140, outW: 420, outH: 140, maxBytes: 28000, shape: 'banner' },
  servericon: { frameW: 160, frameH: 160, outW: 160, outH: 160, maxBytes: 22000, shape: 'avatar' },
};
const CROP_TITLES = {
  avatar: 'Ajustar foto de perfil',
  banner: 'Ajustar banner',
  servericon: 'Ajustar foto do servidor',
};

const cropState = {
  kind: null,
  spec: null,
  naturalW: 0,
  naturalH: 0,
  baseScale: 1,
  zoom: 1,
  offsetX: 0,
  offsetY: 0,
  dragging: false,
  dragStartX: 0,
  dragStartY: 0,
  dragOrigX: 0,
  dragOrigY: 0,
  resolve: null,
};

function cropClampOffsets() {
  const spec = cropState.spec;
  const scale = cropState.baseScale * cropState.zoom;
  const dispW = cropState.naturalW * scale;
  const dispH = cropState.naturalH * scale;
  const minX = Math.min(0, spec.frameW - dispW);
  const minY = Math.min(0, spec.frameH - dispH);
  cropState.offsetX = Math.max(minX, Math.min(0, cropState.offsetX));
  cropState.offsetY = Math.max(minY, Math.min(0, cropState.offsetY));
}

function cropApplyTransform() {
  const scale = cropState.baseScale * cropState.zoom;
  cropImage.style.width = `${cropState.naturalW * scale}px`;
  cropImage.style.height = `${cropState.naturalH * scale}px`;
  cropImage.style.transform = `translate(${cropState.offsetX}px, ${cropState.offsetY}px)`;
}

function cropSetZoom(newZoom, anchorFrameX, anchorFrameY) {
  const spec = cropState.spec;
  const oldScale = cropState.baseScale * cropState.zoom;
  // ponto da imagem original que está sob o "âncora" (centro do quadro por
  // padrão), pra manter esse ponto no lugar quando o zoom muda
  const ax = anchorFrameX ?? spec.frameW / 2;
  const ay = anchorFrameY ?? spec.frameH / 2;
  const imgX = (ax - cropState.offsetX) / oldScale;
  const imgY = (ay - cropState.offsetY) / oldScale;
  cropState.zoom = newZoom;
  const newScale = cropState.baseScale * cropState.zoom;
  cropState.offsetX = ax - imgX * newScale;
  cropState.offsetY = ay - imgY * newScale;
  cropClampOffsets();
  cropApplyTransform();
}

function openCropper(file, kind) {
  return new Promise((resolve, reject) => {
    const spec = CROP_SPECS[kind];
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      cropState.kind = kind;
      cropState.spec = spec;
      cropState.naturalW = img.naturalWidth;
      cropState.naturalH = img.naturalHeight;
      cropState.baseScale = Math.max(spec.frameW / img.naturalWidth, spec.frameH / img.naturalHeight);
      cropState.zoom = 1;
      cropState.offsetX = (spec.frameW - img.naturalWidth * cropState.baseScale) / 2;
      cropState.offsetY = (spec.frameH - img.naturalHeight * cropState.baseScale) / 2;
      cropState.resolve = resolve;

      cropTitle.textContent = CROP_TITLES[kind] || 'Ajustar imagem';
      cropStage.className = `crop-stage ${spec.shape}`;
      cropStage.style.width = `${spec.frameW}px`;
      cropStage.style.height = `${spec.frameH}px`;
      cropImage.src = objectUrl;
      cropZoomInput.value = '100';
      cropApplyTransform();
      cropOverlay.hidden = false;
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Não consegui abrir essa imagem.'));
    };
    img.src = objectUrl;
  });
}

function closeCropper(result) {
  cropOverlay.hidden = true;
  if (cropImage.src) URL.revokeObjectURL(cropImage.src);
  cropImage.src = '';
  const resolveFn = cropState.resolve;
  cropState.resolve = null;
  if (resolveFn) resolveFn(result);
}

cropStage.addEventListener('mousedown', (e) => {
  cropState.dragging = true;
  cropStage.classList.add('dragging');
  cropState.dragStartX = e.clientX;
  cropState.dragStartY = e.clientY;
  cropState.dragOrigX = cropState.offsetX;
  cropState.dragOrigY = cropState.offsetY;
});
window.addEventListener('mousemove', (e) => {
  if (!cropState.dragging) return;
  cropState.offsetX = cropState.dragOrigX + (e.clientX - cropState.dragStartX);
  cropState.offsetY = cropState.dragOrigY + (e.clientY - cropState.dragStartY);
  cropClampOffsets();
  cropApplyTransform();
});
window.addEventListener('mouseup', () => {
  if (!cropState.dragging) return;
  cropState.dragging = false;
  cropStage.classList.remove('dragging');
});
cropZoomInput.addEventListener('input', () => {
  cropSetZoom(Number(cropZoomInput.value) / 100);
});
cropCancelBtn.addEventListener('click', () => closeCropper(null));
cropOverlay.addEventListener('click', (e) => {
  if (e.target === cropOverlay) closeCropper(null);
});
cropConfirmBtn.addEventListener('click', () => {
  const spec = cropState.spec;
  const scale = cropState.baseScale * cropState.zoom;
  const canvas = document.createElement('canvas');
  canvas.width = spec.outW;
  canvas.height = spec.outH;
  const ctx = canvas.getContext('2d');
  const srcX = -cropState.offsetX / scale;
  const srcY = -cropState.offsetY / scale;
  const srcW = spec.frameW / scale;
  const srcH = spec.frameH / scale;
  const img = new Image();
  img.onload = () => {
    ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, spec.outW, spec.outH);
    const dataUrl = canvasToBudgetedDataUrl(canvas, spec.maxBytes);
    closeCropper(dataUrl);
  };
  img.src = cropImage.src;
});

// Busca a melhor qualidade WebP que caiba no orçamento de bytes — WebP dá
// bem mais qualidade por byte que JPEG, então a foto fica bem mais nítida
// pro mesmo tamanho de arquivo (importante porque o perfil viaja inteiro
// numa mensagem de dados do LiveKit, que tem limite de tamanho).
function canvasToBudgetedDataUrl(canvas, maxBytes) {
  const qualities = [0.9, 0.82, 0.74, 0.66, 0.58, 0.5, 0.4, 0.3];
  let last = canvas.toDataURL('image/webp', qualities[qualities.length - 1]);
  for (const q of qualities) {
    const attempt = canvas.toDataURL('image/webp', q);
    last = attempt;
    if (attempt.length <= maxBytes) return attempt;
  }
  return last;
}

profileAvatarChangeBtn.addEventListener('click', () => profileAvatarInput.click());
profileAvatarInput.addEventListener('change', async () => {
  const file = profileAvatarInput.files[0];
  profileAvatarInput.value = '';
  if (!file) return;
  try {
    const dataUrl = await openCropper(file, 'avatar');
    if (!dataUrl) return;
    pendingProfileAvatar = dataUrl;
    profileAvatarPreview.style.backgroundImage = `url(${dataUrl})`;
    profileAvatarPreview.classList.add('has-avatar');
  } catch (err) {
    alert(err.message || 'Não consegui usar essa imagem.');
  }
});
profileAvatarRemoveBtn.addEventListener('click', () => {
  pendingProfileAvatar = '';
  profileAvatarPreview.style.backgroundImage = '';
  profileAvatarPreview.classList.remove('has-avatar');
});

profileBannerChangeBtn.addEventListener('click', () => profileBannerInput.click());
profileBannerInput.addEventListener('change', async () => {
  const file = profileBannerInput.files[0];
  profileBannerInput.value = '';
  if (!file) return;
  try {
    const dataUrl = await openCropper(file, 'banner');
    if (!dataUrl) return;
    pendingProfileBanner = dataUrl;
    profileBannerPreview.style.backgroundImage = `url(${dataUrl})`;
    profileBannerPreview.classList.add('has-banner');
  } catch (err) {
    alert(err.message || 'Não consegui usar essa imagem.');
  }
});
profileBannerRemoveBtn.addEventListener('click', () => {
  pendingProfileBanner = '';
  profileBannerPreview.style.backgroundImage = '';
  profileBannerPreview.classList.remove('has-banner');
});

profileSaveBtn.addEventListener('click', async () => {
  if (pendingProfileAvatar !== null) myAvatarDataUrl = pendingProfileAvatar;
  if (pendingProfileBanner !== null) myBannerDataUrl = pendingProfileBanner;
  myStatusText = profileStatusInput.value.trim().slice(0, 60);
  myDisplayName = profileDisplaynameInput.value.trim().slice(0, 32);
  pendingProfileAvatar = null;
  pendingProfileBanner = null;
  await saveProfileToConfig();
  applyProfileEverywhere(myIdentity);
  broadcastProfile();
  closeSettingsModal();
  // Salva no servidor também — assim o perfil segue a conta pra qualquer
  // outro PC/dispositivo em que a pessoa entrar depois, não só o de agora.
  // Roda em segundo plano e SEM alert() de propósito: se der ruim (rede
  // caiu, servidor fora do ar), o perfil já está salvo neste PC e já
  // apareceu certinho pros outros aqui na sala — travar o app inteiro com
  // um alerta por causa de um problema de rede é pior que só avisar no
  // console e deixar a pessoa seguir usando.
  apiFetch('/api/profile', {
    method: 'PATCH',
    body: JSON.stringify({
      avatar: myAvatarDataUrl,
      banner: myBannerDataUrl,
      status: myStatusText,
      displayName: myDisplayName,
    }),
  }).catch((err) => {
    console.warn('Não consegui salvar o perfil no servidor (ficou salvo só neste PC por enquanto):', err);
  });
});

function openProfilePane() {
  pendingProfileAvatar = null;
  pendingProfileBanner = null;
  profileStatusInput.value = myStatusText;
  profileDisplaynameInput.value = myDisplayName;
  profileIdentityTag.textContent = myIdentity;
  if (myAvatarDataUrl) {
    profileAvatarPreview.style.backgroundImage = `url(${myAvatarDataUrl})`;
    profileAvatarPreview.classList.add('has-avatar');
  } else {
    profileAvatarPreview.style.backgroundImage = '';
    profileAvatarPreview.classList.remove('has-avatar');
    profileAvatarPreview.textContent = (myName || '?').charAt(0).toUpperCase();
  }
  if (myBannerDataUrl) {
    profileBannerPreview.style.backgroundImage = `url(${myBannerDataUrl})`;
    profileBannerPreview.classList.add('has-banner');
  } else {
    profileBannerPreview.style.backgroundImage = '';
    profileBannerPreview.classList.remove('has-banner');
  }
}

selfAvatar.addEventListener('click', () => openSettingsModal('profile'));
selfNameBtn.addEventListener('click', () => openSettingsModal('profile'));

// ---------- aparência (tema) ----------
function applyTheme(theme) {
  if (theme && theme !== 'escuro') document.documentElement.dataset.theme = theme;
  else delete document.documentElement.dataset.theme;
  document.querySelectorAll('.theme-option').forEach((btn) => {
    btn.classList.toggle('active', (btn.dataset.theme || 'escuro') === (theme || 'escuro'));
  });
}

async function loadThemeFromConfig(cfg) {
  applyTheme(cfg.theme || 'escuro');
}

if (themeGrid) {
  themeGrid.querySelectorAll('.theme-option').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const theme = btn.dataset.theme || 'escuro';
      applyTheme(theme);
      const cfg = (await window.vortex.getConfig()) || {};
      cfg.theme = theme;
      await window.vortex.setConfig(cfg);
    });
  });
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
  const modalVersionEl = document.getElementById('modal-version');
  if (modalVersionEl && window.vortex?.getAppVersion) {
    window.vortex.getAppVersion().then((v) => {
      modalVersionEl.textContent = `PrimalVoice v${v}`;
    });
  }

  const cfg = (await window.vortex.getConfig()) || {};
  await loadPrefsFromConfig(cfg);
  loadProfileFromConfig(cfg);
  await loadThemeFromConfig(cfg);
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
  if (toggleMembersBtn) {
    toggleMembersBtn.classList.toggle('active', !collapsed);
    toggleMembersBtn.title = collapsed ? 'Mostrar lista de membros' : 'Ocultar lista de membros';
  }
  if (collapsed) {
    if (memberListWidthPx > 20) lastMemberListWidth = memberListWidthPx;
    applyMemberListWidth(0);
  } else {
    applyMemberListWidth(lastMemberListWidth || MEMBERLIST_DEFAULT);
  }
}

toggleMembersBtn?.addEventListener('click', () => setMemberListCollapsed(!memberListCollapsedState));

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

// Lista de membros da direita: fixa (não arrasta mais), só abre/fecha pelo
// botão no cabeçalho — ver toggleMembersBtn acima.

// Dica de "arraste/clique" das bordas redimensionáveis: era um title nativo
// do navegador, que aparecia solto em cima do conteúdo (vídeo, lista de
// membros) em qualquer altura onde o mouse estivesse na faixa inteira, e
// ainda cortava na borda da janela do lado direito. Agora é um balãozinho
// nosso, sempre ancorado no círculo da setinha (que fica no meio vertical
// da faixa) e sempre abrindo pro lado do conteúdo principal, onde tem mais
// espaço — nunca cortado na borda da janela.
function setupResizeTooltip(handle, openTo) {
  const tooltip = handle.querySelector('.resize-tooltip');
  const hint = handle.querySelector('.collapse-hint');
  handle.addEventListener('mouseenter', () => {
    const rect = hint.getBoundingClientRect();
    tooltip.style.top = `${rect.top + rect.height / 2}px`;
    tooltip.style.transform = 'translateY(-50%)';
    if (openTo === 'right') {
      tooltip.style.left = `${rect.right + 10}px`;
      tooltip.style.right = '';
    } else {
      tooltip.style.right = `${window.innerWidth - rect.left + 10}px`;
      tooltip.style.left = '';
    }
    tooltip.classList.add('tooltip-visible');
  });
  handle.addEventListener('mouseleave', () => {
    tooltip.classList.remove('tooltip-visible');
  });
  handle.addEventListener('mousedown', () => {
    tooltip.classList.remove('tooltip-visible');
  });
}

setupResizeTooltip(resizeLeft, 'right');

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

  if (type === 'text') {
    const unread = unreadCounts.get(channel.id) || 0;
    if (unread > 0) {
      el.classList.add('has-unread');
      const badge = document.createElement('span');
      badge.className = 'channel-badge';
      badge.textContent = unread > 99 ? '99+' : String(unread);
      el.appendChild(badge);
    }
  }

  if (myPermissions.manageChannels) {
    // Duplo-clique no nome também entra no modo de edição — igual Discord,
    // sem precisar caçar o lápis primeiro.
    label.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      startInlineChannelRename(el, channel, type, label);
    });

    const renameBtn = document.createElement('button');
    renameBtn.className = 'channel-rename-btn';
    renameBtn.title = 'Renomear canal';
    renameBtn.innerHTML = PENCIL_ICON_SVG;
    renameBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      startInlineChannelRename(el, channel, type, label);
    });
    el.appendChild(renameBtn);

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

// Troca o nome do canal, na hora, por um campinho de texto editável (sem
// precisar abrir nenhum modal) — salva no Enter ou ao clicar fora, cancela
// no Esc. Usado tanto pelo lápis quanto pelo duplo-clique no nome.
async function renameChannel(type, channelId, newName) {
  const data = await apiFetch(`/api/channels/${type}/${channelId}`, {
    method: 'PATCH',
    body: JSON.stringify({ name: newName }),
  });
  serverState.channels = data.channels;
  renderChannelLists();
  if (myPermissions.manageChannels) renderManageChannels();
  broadcastStateChanged();
}

function startInlineChannelRename(itemEl, channel, type, labelEl) {
  if (itemEl.querySelector('.channel-rename-input')) return; // já editando
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'channel-rename-input';
  input.maxLength = 40;
  input.value = channel.name;
  labelEl.replaceWith(input);
  input.focus();
  input.select();

  let settled = false;
  const finish = async (commit) => {
    if (settled) return;
    settled = true;
    const newName = input.value.trim();
    if (commit && newName && newName !== channel.name) {
      try {
        await renameChannel(type, channel.id, newName);
        return; // renderChannelLists() já reconstrói tudo com o nome novo
      } catch (err) {
        alert(err.message);
      }
    }
    // sem mudança (ou deu erro/cancelou) — só volta o texto original no lugar
    if (input.isConnected) input.replaceWith(labelEl);
  };

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      finish(true);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      finish(false);
    }
  });
  input.addEventListener('blur', () => finish(true));
  input.addEventListener('click', (e) => e.stopPropagation());
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
        const row = buildMemberRow({ identity, name }, { showStatus: true });
        row.id = channelMemberRowId(identity);
        membersEl.appendChild(row);
      });
    }
    wrap.appendChild(membersEl);
    voiceChannelsList.appendChild(wrap);
  });

  renderMemberSidebar();
  updateRailBadges();
}

// ---------- alternar entre "servidor" (canais) e "mensagens diretas" ----------
// Igual Discord: o ícone de cima (Home) mostra só as DMs, separado do
// servidor de baixo — a barra lateral esquerda troca de conteúdo inteiro
// (canais <-> lista de conversas), a área de chat/voz no meio não muda de
// mecanismo nenhum, só qual conversa tá ativa.
let sidebarView = 'server';
let lastServerTextChannelId = null;

function showServerView() {
  sidebarView = 'server';
  channelSidebar.classList.remove('view-dms');
  channelSidebar.classList.add('view-server');
  serverIconBtn?.classList.add('active');
  homeIconBtn?.classList.remove('active');
  if (sidebarTitleEl) sidebarTitleEl.textContent = 'Sala da galera';
}

function showDmsView() {
  sidebarView = 'dms';
  channelSidebar.classList.remove('view-server');
  channelSidebar.classList.add('view-dms');
  homeIconBtn?.classList.add('active');
  serverIconBtn?.classList.remove('active');
  if (sidebarTitleEl) sidebarTitleEl.textContent = 'Mensagens diretas';
}

// clique no ícone Home: abre a última DM ativa, ou a primeira da lista, ou
// só mostra a view vazia se ainda não tiver nenhuma conversa
function openDmHome() {
  if (activeDmPeer && dmPeers.has(activeDmPeer)) {
    switchToDm(activeDmPeer);
    return;
  }
  const sorted = Array.from(dmPeers).sort((a, b) => displayNameFor(a).localeCompare(displayNameFor(b)));
  if (sorted.length > 0) {
    switchToDm(sorted[0]);
  } else {
    showDmsView();
    renderChannelLists();
    renderDmList();
  }
}

// clique no ícone do servidor: volta pro último canal de texto que tava
// aberto (só mexe na conversa ativa se a pessoa realmente tava numa DM)
function openServerView() {
  const wasInDm = sidebarView === 'dms';
  showServerView();
  renderChannelLists();
  renderDmList();
  if (wasInDm) {
    const fallbackId = lastServerTextChannelId || (serverState.channels.text[0] && serverState.channels.text[0].id);
    if (fallbackId) switchTextChannel(fallbackId);
  }
}

homeIconBtn?.addEventListener('click', () => openDmHome());
serverIconBtn?.addEventListener('click', () => openServerView());

// ---------- foto do servidor + menu de botão direito no ícone do servidor ----------
// Igual Discord: clicar com o botão direito no ícone do servidor (na barra
// da esquerda) abre um menu com opções de "servidor" (não de uma pessoa) —
// trocar o ícone, ver os membros, e uma informação de quando a própria
// conta entrou no PrimalVoice.
function applyServerIcon() {
  const img = serverIconBtn?.querySelector('img');
  if (!img) return;
  img.src = serverState.serverIcon || 'assets/logo.png';
}

function formatJoinDate(ts) {
  if (!ts) return null;
  try {
    return new Date(ts).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  } catch {
    return null;
  }
}

serverIconInput?.addEventListener('change', async () => {
  const file = serverIconInput.files[0];
  serverIconInput.value = '';
  if (!file) return;
  try {
    const dataUrl = await openCropper(file, 'servericon');
    if (!dataUrl) return;
    const data = await apiFetch('/api/server', { method: 'PATCH', body: JSON.stringify({ icon: dataUrl }) });
    serverState.serverIcon = data.serverIcon;
    applyServerIcon();
    broadcastStateChanged();
  } catch (err) {
    alert(err.message || 'Não consegui usar essa imagem.');
  }
});

serverIconBtn?.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  closeContextMenu();

  const menu = document.createElement('div');
  menu.className = 'context-menu';
  menu.addEventListener('click', (ev) => ev.stopPropagation());

  const header = document.createElement('div');
  header.className = 'context-menu-header';
  header.textContent = 'PrimalVoice';
  menu.appendChild(header);

  if (myPermissions.manageChannels) {
    const changeIconItem = document.createElement('div');
    changeIconItem.className = 'context-menu-item';
    const changeIconLabel = document.createElement('span');
    changeIconLabel.className = 'label';
    changeIconLabel.textContent = 'Alterar foto do servidor';
    changeIconItem.appendChild(changeIconLabel);
    changeIconItem.addEventListener('click', (ev) => {
      ev.stopPropagation();
      closeContextMenu();
      serverIconInput.click();
    });
    menu.appendChild(changeIconItem);
    menu.appendChild(dividerEl());
  }

  const viewMembersItem = document.createElement('div');
  viewMembersItem.className = 'context-menu-item';
  const viewMembersLabel = document.createElement('span');
  viewMembersLabel.className = 'label';
  viewMembersLabel.textContent = 'Ver membros';
  viewMembersItem.appendChild(viewMembersLabel);
  viewMembersItem.addEventListener('click', (ev) => {
    ev.stopPropagation();
    closeContextMenu();
    if (memberListCollapsedState) setMemberListCollapsed(false);
  });
  menu.appendChild(viewMembersItem);

  menu.appendChild(dividerEl());

  const myProfile = serverState.profiles?.[myIdentity];
  const joinDate = formatJoinDate(myProfile?.createdAt);
  const info = document.createElement('div');
  info.className = 'context-menu-info';
  info.textContent = joinDate ? `Você entrou no PrimalVoice em ${joinDate}` : 'Data de entrada não disponível';
  menu.appendChild(info);

  document.body.appendChild(menu);
  contextMenuEl = menu;
  positionContextMenu(e.clientX, e.clientY, menu);
});

function switchTextChannel(channelId) {
  activeTextChannelId = channelId;
  activeDmPeer = null;
  lastServerTextChannelId = channelId;
  showServerView();
  unreadCounts.delete(channelId);
  const channel = serverState.channels.text.find((c) => c.id === channelId);
  channelHeaderIcon.innerHTML = HASH_ICON_SVG;
  channelHeaderName.textContent = channel ? channel.name : '';
  chatInput.placeholder = `Conversar em #${channel ? channel.name : ''}`;
  showTextView();
  renderChannelLists();
  renderDmList();
  renderChatForActiveChannel();
  ensureChannelHistoryLoaded(channelId);
}

// ---------- conversas diretas (DM) ----------
// Não é privado de verdade no sentido criptográfico: pra entrega ao vivo, a
// mensagem ainda viaja pelo canal de dados compartilhado da sala (igual
// chat/perfil/status), só que só é exibida na conversa privada entre as duas
// pessoas — a "privacidade" é só na hora de mostrar na tela. O histórico em
// si (pra sobreviver a reconexões) fica guardado no servidor numa chave só
// dessas duas pessoas (store.dmKey), então pelo menos não vaza pra mais
// ninguém que entrar na sala depois.
function switchToDm(peerIdentity) {
  if (!peerIdentity) return;
  dmPeers.add(peerIdentity);
  activeDmPeer = peerIdentity;
  activeTextChannelId = dmChannelKey(peerIdentity);
  showDmsView();
  unreadCounts.delete(activeTextChannelId);
  channelHeaderIcon.innerHTML = DM_ICON_SVG;
  channelHeaderName.textContent = displayNameFor(peerIdentity);
  chatInput.placeholder = `Conversar com @${displayNameFor(peerIdentity)}`;
  showTextView();
  renderChannelLists();
  renderDmList();
  renderChatForActiveChannel();
  ensureChannelHistoryLoaded(activeTextChannelId);
}

function renderDmHeader() {
  if (!activeDmPeer) return;
  channelHeaderName.textContent = displayNameFor(activeDmPeer);
  chatInput.placeholder = `Conversar com @${displayNameFor(activeDmPeer)}`;
}

function renderDmList() {
  if (!dmListEl) return;
  dmListEl.innerHTML = '';
  Array.from(dmPeers)
    .sort((a, b) => displayNameFor(a).localeCompare(displayNameFor(b)))
    .forEach((identity) => {
      const row = document.createElement('div');
      row.className = 'dm-row';
      row.classList.toggle('active', identity === activeDmPeer && activeTextChannelId === dmChannelKey(identity));
      row.dataset.identity = identity;

      const avatar = document.createElement('span');
      avatar.className = 'avatar';
      avatar.textContent = displayNameFor(identity).charAt(0).toUpperCase();
      applyAvatarToEl(avatar, identity);
      row.appendChild(avatar);

      const name = document.createElement('span');
      name.className = 'dm-row-name';
      name.textContent = displayNameFor(identity);
      row.appendChild(name);

      const unread = unreadCounts.get(dmChannelKey(identity)) || 0;
      if (unread > 0) {
        row.classList.add('has-unread');
        const badge = document.createElement('span');
        badge.className = 'channel-badge';
        badge.textContent = unread > 99 ? '99+' : String(unread);
        row.appendChild(badge);
      }

      row.addEventListener('click', () => switchToDm(identity));
      dmListEl.appendChild(row);
    });
  updateRailBadges();
}

// ---------- indicadores de notificação na barra de servidores (ícone Home / ícone do servidor) ----------
// Um atalho pra cada conversa privada que a pessoa já tem, com uma bolinha
// vermelha quando tem mensagem não lida — igual ao Discord. O ícone Home
// soma o total de não lidas de todas as DMs, e o ícone do servidor soma o
// total de não lidas dos canais de texto do servidor. Clicar num atalho de
// DM já leva direto pra conversa (switchToDm limpa o "não lido" na hora).
function updateRailBadges() {
  if (dmQuickList) {
    dmQuickList.innerHTML = '';
    Array.from(dmPeers)
      .sort((a, b) => displayNameFor(a).localeCompare(displayNameFor(b)))
      .forEach((identity) => {
        const unread = unreadCounts.get(dmChannelKey(identity)) || 0;
        const icon = document.createElement('div');
        icon.className = 'server-icon dm-quick-icon';
        icon.dataset.identity = identity;
        icon.title = displayNameFor(identity);
        icon.classList.toggle('active', sidebarView === 'dms' && activeDmPeer === identity);

        const avatar = document.createElement('span');
        avatar.className = 'avatar';
        avatar.textContent = displayNameFor(identity).charAt(0).toUpperCase();
        applyAvatarToEl(avatar, identity);
        icon.appendChild(avatar);

        if (unread > 0) {
          const badge = document.createElement('span');
          badge.className = 'server-icon-badge';
          badge.textContent = unread > 99 ? '99+' : String(unread);
          icon.appendChild(badge);
        }

        icon.addEventListener('click', () => switchToDm(identity));
        dmQuickList.appendChild(icon);
      });
  }

  let homeUnread = 0;
  dmPeers.forEach((identity) => {
    homeUnread += unreadCounts.get(dmChannelKey(identity)) || 0;
  });
  if (homeUnreadBadge) {
    homeUnreadBadge.hidden = homeUnread <= 0;
    homeUnreadBadge.textContent = homeUnread > 99 ? '99+' : String(homeUnread);
  }

  let serverUnread = 0;
  serverState.channels.text.forEach((ch) => {
    serverUnread += unreadCounts.get(ch.id) || 0;
  });
  if (serverUnreadBadge) {
    serverUnreadBadge.hidden = serverUnread <= 0;
    serverUnreadBadge.textContent = serverUnread > 99 ? '99+' : String(serverUnread);
  }
}

async function joinVoiceChannel(channelId) {
  const channel = serverState.channels.voice.find((c) => c.id === channelId);
  if (!channel) return;

  if (activeVoiceChannelId) {
    await leaveVoiceChannel({ silent: true });
  }

  voiceStatusTitle.textContent = 'Conectando...';
  voiceStatusTitle.classList.add('connecting');
  voiceStatusChannel.textContent = channel.name;
  voiceStatusBar.hidden = false;

  let data;
  try {
    data = await apiFetch('/api/voice-token', { method: 'POST', body: JSON.stringify({ channelId }) });
  } catch (err) {
    voiceStatusBar.hidden = true;
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
      resolution: { width: 1920, height: 1080, frameRate: 30 },
    },
    publishDefaults: {
      screenShareEncoding: { maxBitrate: 6_000_000, maxFramerate: 30 },
      videoEncoding: { maxBitrate: 4_000_000, maxFramerate: 30 },
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
    amISpeaking = speakingIds.has(vr.localParticipant.identity);
    updateVoiceOverlay();
  });
  vr.on(RoomEvent.ConnectionQualityChanged, (quality, participant) => {
    if (participant === vr.localParticipant) setVoiceQuality(quality);
  });
  vr.on(RoomEvent.TrackMuted, (publication, participant) => {
    if (publication.source === Track.Source.Microphone) setVoiceMemberStatus(participant.identity, { muted: true });
    // A câmera, a partir da 2ª vez que é ligada/desligada, não é republicada —
    // o LiveKit só muta/desmuta a mesma publicação (evita renegociar a
    // conexão). Por isso o símbolo da câmera precisa escutar mute/unmute
    // também, e não só published/unpublished.
    else if (publication.source === Track.Source.Camera) setVoiceMemberStatus(participant.identity, { camera: false });
  });
  vr.on(RoomEvent.TrackUnmuted, (publication, participant) => {
    if (publication.source === Track.Source.Microphone) setVoiceMemberStatus(participant.identity, { muted: false });
    else if (publication.source === Track.Source.Camera) setVoiceMemberStatus(participant.identity, { camera: true });
  });
  const handleTrackPublishedChange = (isPublished) => (publication, participant) => {
    if (publication.source === Track.Source.Camera) setVoiceMemberStatus(participant.identity, { camera: isPublished });
    else if (publication.source === Track.Source.ScreenShare) setVoiceMemberStatus(participant.identity, { screenShare: isPublished });
  };
  vr.on(RoomEvent.TrackPublished, handleTrackPublishedChange(true));
  vr.on(RoomEvent.TrackUnpublished, handleTrackPublishedChange(false));
  vr.on(RoomEvent.LocalTrackPublished, handleTrackPublishedChange(true));
  vr.on(RoomEvent.LocalTrackUnpublished, handleTrackPublishedChange(false));

  try {
    await vr.connect(livekitUrl, data.token);
  } catch (err) {
    voiceStatusBar.hidden = true;
    voiceStatusTitle.classList.remove('connecting');
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
  voiceStatusTitle.textContent = 'Conectado';
  voiceStatusTitle.classList.remove('connecting');
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
  amISpeaking = false;
  updateVoiceOverlay();
}

async function leaveVoiceChannel(opts = {}) {
  if (!voiceRoom) return;
  const channelId = activeVoiceChannelId;
  broadcastVoicePresence('leave', channelId);
  voicePresence.get(channelId)?.delete(myIdentity);
  voiceMemberStatus.delete(myIdentity);

  try {
    await voiceRoom.disconnect();
  } catch {
    // já pode ter caído sozinho
  }
  voiceRoom = null;
  activeVoiceChannelId = null;
  amISpeaking = false;
  updateVoiceOverlay();

  grid.innerHTML = '';
  if (grid.classList.contains('has-expanded')) exitExpandedExtras();
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
  micMutedBeforeDeafen = false;
  userPanelControls.classList.add('voice-disabled');
  voiceStatusBar.hidden = true;
  voiceStatusTitle.classList.remove('connecting');
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

function appendChatMessageEl({ name, text, isSelf, identity, attachment }) {
  const empty = chatMessages.querySelector('.chat-empty');
  if (empty) empty.remove();

  const row = document.createElement('div');
  row.className = isSelf ? 'chat-message self' : 'chat-message';
  if (identity) row.dataset.identity = identity;

  const avatar = document.createElement('span');
  avatar.className = 'avatar';
  avatar.textContent = (name || '?').charAt(0).toUpperCase();
  if (identity) applyAvatarToEl(avatar, identity);
  row.appendChild(avatar);

  const body = document.createElement('div');
  body.className = 'body';

  const meta = document.createElement('div');
  meta.className = 'meta';
  const author = document.createElement('span');
  author.className = 'author';
  author.textContent = name || 'Alguém';
  // cor do cargo no nome de quem mandou, igual Discord — só aqui e na lista
  // de membros da direita; NÃO na listinha de dentro do canal de voz nem no
  // seu próprio nome lá embaixo no painel (isso já é assim de propósito)
  const roleColor = topRoleColorFor(identity);
  if (roleColor) author.style.color = roleColor;
  meta.appendChild(author);
  const time = document.createElement('span');
  time.className = 'time';
  time.textContent = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  meta.appendChild(time);
  body.appendChild(meta);

  if (text) {
    const textEl = document.createElement('div');
    textEl.className = 'text';
    textEl.textContent = text;
    body.appendChild(textEl);
  }

  if (attachment && attachment.url) {
    const wrap = document.createElement('div');
    wrap.className = 'attachment';
    const src = `${serverUrl}${attachment.url}`;
    if (attachment.type === 'video') {
      const video = document.createElement('video');
      video.src = src;
      video.controls = true;
      wrap.appendChild(video);
    } else {
      const img = document.createElement('img');
      img.src = src;
      img.alt = attachment.name || 'imagem';
      wrap.appendChild(img);
    }
    body.appendChild(wrap);
  }

  row.appendChild(body);
  chatMessages.appendChild(row);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function pushChatMessage(channelId, msg) {
  if (!channelId) return;
  if (!chatHistoryByChannel.has(channelId)) chatHistoryByChannel.set(channelId, []);
  chatHistoryByChannel.get(channelId).push(msg);
  // "Visível" de verdade quer dizer: é o canal ativo E a pessoa tá mesmo
  // olhando o chat de texto agora (não a chamada de voz) — senão a mensagem
  // vira notificação em vez de só ser desenhada silenciosamente escondida.
  const isVisible = channelId === activeTextChannelId && !textView.hidden;
  if (isVisible) {
    appendChatMessageEl(msg);
  } else if (!msg.isSelf) {
    unreadCounts.set(channelId, (unreadCounts.get(channelId) || 0) + 1);
    renderChannelLists();
    renderDmList();
  }
}

// Busca o histórico salvo no servidor pra esse canal/DM (uma vez só por
// sessão) e coloca ANTES das mensagens que já chegaram ao vivo nesta
// sessão — assim a conversa não some mais quando reconecta ou reabre o
// app, e nunca duplica mensagem já recebida ao vivo.
async function ensureChannelHistoryLoaded(channelId) {
  if (!channelId || historyLoadedFor.has(channelId)) return;
  historyLoadedFor.add(channelId);
  try {
    let messages;
    if (isDmChannelId(channelId)) {
      const data = await apiFetch(`/api/dm/${encodeURIComponent(dmPeerFromChannelId(channelId))}/messages`);
      messages = data.messages;
    } else {
      const data = await apiFetch(`/api/messages/${encodeURIComponent(channelId)}`);
      messages = data.messages;
    }
    if (!Array.isArray(messages) || messages.length === 0) return;
    const existing = chatHistoryByChannel.get(channelId) || [];
    const seenIds = new Set(existing.map((m) => m.id).filter(Boolean));
    const fromServer = messages
      .filter((m) => !seenIds.has(m.id))
      .map((m) => ({
        id: m.id,
        name: m.identity === myIdentity ? (myDisplayName || myName) : m.name,
        text: m.text,
        ts: m.ts,
        isSelf: m.identity === myIdentity,
        identity: m.identity,
        attachment: m.attachment || null,
      }));
    chatHistoryByChannel.set(channelId, [...fromServer, ...existing]);
    if (channelId === activeTextChannelId) renderChatForActiveChannel();
  } catch (err) {
    historyLoadedFor.delete(channelId); // tenta de novo na próxima troca de canal
    console.warn('Não consegui carregar o histórico desse canal:', err);
  }
}

// Manda a mensagem pro servidor guardar (em segundo plano, sem travar o
// envio nem mostrar alerta se falhar — a entrega ao vivo pros outros já
// aconteceu pelo canal de dados do LiveKit; isso aqui é só a parte que
// garante que a conversa continua lá quando alguém reconectar depois).
function persistChatMessage(channelId, { text, attachment }) {
  const path = isDmChannelId(channelId)
    ? `/api/dm/${encodeURIComponent(dmPeerFromChannelId(channelId))}/messages`
    : `/api/messages/${encodeURIComponent(channelId)}`;
  apiFetch(path, { method: 'POST', body: JSON.stringify({ text, attachment: attachment || null }) }).catch((err) => {
    console.warn('Não consegui salvar a mensagem no servidor:', err);
  });
}

chatForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = chatInput.value.trim();
  if (!text || !lobbyRoom || !activeTextChannelId) return;
  chatInput.value = '';

  const ts = Date.now();
  if (isDmChannelId(activeTextChannelId)) {
    const to = dmPeerFromChannelId(activeTextChannelId);
    const payload = { type: 'dm', to, from: myIdentity, name: myDisplayName || myName, text, ts };
    lobbyRoom.localParticipant.publishData(chatEncoder.encode(JSON.stringify(payload)), { reliable: true });
    pushChatMessage(activeTextChannelId, { name: myDisplayName || myName, text, ts, isSelf: true, identity: myIdentity });
    persistChatMessage(activeTextChannelId, { text });
    return;
  }
  const payload = { type: 'chat', channelId: activeTextChannelId, name: myName, text, ts };
  lobbyRoom.localParticipant.publishData(chatEncoder.encode(JSON.stringify(payload)), { reliable: true });
  pushChatMessage(activeTextChannelId, { name: myName, text, ts, isSelf: true, identity: myIdentity });
  persistChatMessage(activeTextChannelId, { text });
});

// ---------- anexos no chat (imagem/vídeo) ----------
// O arquivo em si vai por HTTP normal pro servidor (não pelo canal de dados
// do LiveKit, que não aguenta arquivo grande); só a URL viaja na mensagem.
async function uploadChatAttachment(file) {
  const formData = new FormData();
  formData.append('file', file);
  const headers = {};
  if (sessionToken) headers['Authorization'] = `Bearer ${sessionToken}`;
  const res = await fetch(`${serverUrl}/api/upload`, { method: 'POST', headers, body: formData });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Erro ao enviar arquivo.');
  return data; // { url, type, name }
}

chatAttachmentBtn.addEventListener('click', () => {
  if (!lobbyRoom || !activeTextChannelId) return;
  chatAttachmentInput.click();
});

chatAttachmentInput.addEventListener('change', async () => {
  const file = chatAttachmentInput.files[0];
  chatAttachmentInput.value = '';
  if (!file || !lobbyRoom || !activeTextChannelId) return;
  if (file.size > 25 * 1024 * 1024) {
    alert('Arquivo muito grande (máx. 25MB).');
    return;
  }

  chatAttachmentBtn.disabled = true;
  try {
    const attachment = await uploadChatAttachment(file);
    const text = chatInput.value.trim();
    chatInput.value = '';
    const ts = Date.now();
    if (isDmChannelId(activeTextChannelId)) {
      const to = dmPeerFromChannelId(activeTextChannelId);
      const payload = { type: 'dm', to, from: myIdentity, name: myDisplayName || myName, text, ts, attachment };
      lobbyRoom.localParticipant.publishData(chatEncoder.encode(JSON.stringify(payload)), { reliable: true });
      pushChatMessage(activeTextChannelId, { name: myDisplayName || myName, text, ts, isSelf: true, identity: myIdentity, attachment });
      persistChatMessage(activeTextChannelId, { text, attachment });
      return;
    }
    const payload = { type: 'chat', channelId: activeTextChannelId, name: myName, text, ts, attachment };
    lobbyRoom.localParticipant.publishData(chatEncoder.encode(JSON.stringify(payload)), { reliable: true });
    pushChatMessage(activeTextChannelId, { name: myName, text, ts, isSelf: true, identity: myIdentity, attachment });
    persistChatMessage(activeTextChannelId, { text, attachment });
  } catch (err) {
    alert(err.message || 'Não consegui enviar o arquivo.');
  } finally {
    chatAttachmentBtn.disabled = false;
  }
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
    initial.textContent = displayNameFor(participant.identity).charAt(0).toUpperCase();
    applyAvatarToEl(initial, participant.identity);
    tile.appendChild(initial);

    const label = document.createElement('div');
    label.className = 'label';
    label.textContent = displayNameFor(participant.identity);
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
    // compartilhamento de tela nunca pode cortar as pontas (a pessoa
    // assistindo precisa ver a tela inteira) — câmera pode continuar
    // preenchendo o quadro todo (cover), que fica melhor pra rosto
    if (track.source === Track.Source.ScreenShare) el.classList.add('screen-video');
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
    exitExpandedExtras();
  }
  if (tile) tile.remove();
}

// Ao expandir um vídeo (tela cheia dentro do app): a lista de membros da
// direita esconde sozinha (o vídeo ganha aquele espaço), e some um botão
// pra também esconder a barra esquerda, pra quem quiser ficar 100% sem
// nenhuma barra. Ao sair, volta tudo exatamente como estava antes.
let memberListStateBeforeExpand = null;
let sidebarStateBeforeExpand = null;

function enterExpandedExtras() {
  memberListStateBeforeExpand = memberListCollapsedState;
  sidebarStateBeforeExpand = sidebarCollapsed;
  if (!memberListCollapsedState) setMemberListCollapsed(true);
  if (hideSidebarFullscreenBtn) hideSidebarFullscreenBtn.hidden = false;
}

function exitExpandedExtras() {
  if (memberListStateBeforeExpand === false) setMemberListCollapsed(false);
  if (sidebarStateBeforeExpand !== null && sidebarStateBeforeExpand !== sidebarCollapsed) {
    setSidebarCollapsed(sidebarStateBeforeExpand);
  }
  memberListStateBeforeExpand = null;
  sidebarStateBeforeExpand = null;
  if (hideSidebarFullscreenBtn) hideSidebarFullscreenBtn.hidden = true;
}

function collapseExpandedTile() {
  const wasExpanded = grid.classList.contains('has-expanded');
  grid.querySelectorAll('.tile.expanded').forEach((t) => t.classList.remove('expanded'));
  grid.classList.remove('has-expanded');
  if (wasExpanded) exitExpandedExtras();
}

grid.addEventListener('click', (e) => {
  const tile = e.target.closest('.tile');
  if (!tile) return;

  const wasExpanded = tile.classList.contains('expanded');
  const gridWasExpanded = grid.classList.contains('has-expanded');
  grid.querySelectorAll('.tile.expanded').forEach((t) => t.classList.remove('expanded'));

  if (wasExpanded) {
    // clicou de novo no mesmo vídeo que já tava em tela cheia -> sai de vez
    grid.classList.remove('has-expanded');
    exitExpandedExtras();
  } else {
    tile.classList.add('expanded');
    grid.classList.add('has-expanded');
    // só dispara a troca de layout (esconder lista/mostrar botão) ao ENTRAR
    // em tela cheia — trocar de vídeo expandido pra outro não deve mexer
    // nas barras de novo
    if (!gridWasExpanded) enterExpandedExtras();
  }
});

hideSidebarFullscreenBtn?.addEventListener('click', (e) => {
  e.stopPropagation();
  setSidebarCollapsed(!sidebarCollapsed);
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
    if (!opts.silent) animateIconKick(deafenBtn);
  }
  audioElsByIdentity.forEach((_els, identity) => applyVolume(identity));

  if (value) {
    // ensurdecendo: guarda se a voz já estava mutada por escolha da pessoa
    // (pra saber depois se devolve a fala ou não) e força mutar agora
    micMutedBeforeDeafen = micBtn.dataset.on !== 'true';
    if (!opts.silent && voiceRoom && micBtn.dataset.on === 'true') {
      voiceRoom.localParticipant.setMicrophoneEnabled(false);
    }
    micBtn.dataset.on = 'false';
    micBtn.classList.add('off');
    if (!opts.silent) animateIconKick(micBtn);
  } else if (!opts.silent && !micMutedBeforeDeafen) {
    // desensurdecendo: só volta a falar se a voz não tinha sido mutada por
    // escolha própria antes de ensurdecer
    if (voiceRoom) voiceRoom.localParticipant.setMicrophoneEnabled(true);
    micBtn.dataset.on = 'true';
    micBtn.classList.remove('off');
    animateIconKick(micBtn);
  }

  if (myIdentity) setVoiceMemberStatus(myIdentity, { deafened: value });
  if (!opts.silent) {
    broadcastVoiceStatus();
    playSound(value ? muteSound : unmuteSound); // local, ninguém mais ouve
  }
  updateVoiceOverlay();
}

// ---------- lista de membros do servidor ----------
function memberRowId(identity) {
  return `member-${sanitizeId(identity)}`;
}

const MIC_OFF_BADGE_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line><line x1="1" y1="1" x2="23" y2="23"></line></svg>';
const DEAFEN_BADGE_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"></path><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>';
const CAMERA_BADGE_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>';

function buildMemberRow(participant, opts = {}) {
  const row = document.createElement('div');
  row.className = 'member-row';
  row.dataset.identity = participant.identity;
  row.dataset.name = participant.name || participant.identity;

  const avatar = document.createElement('span');
  avatar.className = 'avatar';
  avatar.textContent = displayNameFor(participant.identity).charAt(0).toUpperCase();
  applyAvatarToEl(avatar, participant.identity);
  row.appendChild(avatar);

  const name = document.createElement('span');
  name.className = 'member-name';
  name.textContent = displayNameFor(participant.identity);
  if (opts.roleColor) name.style.color = opts.roleColor;
  row.appendChild(name);

  if (opts.showStatus) {
    const badges = document.createElement('span');
    badges.className = 'member-status-badges';

    // "AO VIVO" em vermelho no lugar do ícone de tela — mais visível que só
    // um ícone pequeno, dá pra ver de longe quem tá transmitindo no canal.
    const liveBadge = document.createElement('span');
    liveBadge.className = 'status-badge live-badge';
    liveBadge.title = 'Compartilhando tela';
    liveBadge.textContent = 'AO VIVO';
    badges.appendChild(liveBadge);

    const cameraBadge = document.createElement('span');
    cameraBadge.className = 'status-badge camera-badge';
    cameraBadge.title = 'Câmera ligada';
    cameraBadge.innerHTML = CAMERA_BADGE_SVG;
    badges.appendChild(cameraBadge);

    const micBadge = document.createElement('span');
    micBadge.className = 'status-badge mic-badge';
    micBadge.title = 'Microfone mudo';
    micBadge.innerHTML = MIC_OFF_BADGE_SVG;
    badges.appendChild(micBadge);

    const deafenBadge = document.createElement('span');
    deafenBadge.className = 'status-badge deafen-badge';
    deafenBadge.title = 'Ensurdecido';
    deafenBadge.innerHTML = DEAFEN_BADGE_SVG;
    badges.appendChild(deafenBadge);

    row.appendChild(badges);
    applyStatusBadges(row, ensureVoiceStatus(participant.identity));
  }

  return row;
}

function ensureVoiceStatus(identity) {
  if (!voiceMemberStatus.has(identity)) {
    voiceMemberStatus.set(identity, { muted: false, deafened: false, camera: false, screenShare: false });
  }
  return voiceMemberStatus.get(identity);
}

function applyStatusBadges(row, status) {
  const cameraBadge = row.querySelector('.status-badge.camera-badge');
  const liveBadge = row.querySelector('.status-badge.live-badge');
  const micBadge = row.querySelector('.status-badge.mic-badge');
  const deafenBadge = row.querySelector('.status-badge.deafen-badge');
  if (cameraBadge) cameraBadge.classList.toggle('badge-on', !!status.camera);
  if (liveBadge) liveBadge.classList.toggle('badge-on', !!status.screenShare);
  if (micBadge) micBadge.classList.toggle('badge-on', !!status.muted);
  if (deafenBadge) deafenBadge.classList.toggle('badge-on', !!status.deafened);
}

function setVoiceMemberStatus(identity, patch) {
  const status = ensureVoiceStatus(identity);
  Object.assign(status, patch);
  const row = document.getElementById(channelMemberRowId(identity));
  if (row) applyStatusBadges(row, status);
}

function addMember(participant) {
  knownIdentities.add(participant.identity);
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

// linha (só visual) pra quem não está online agora — clicável, mostra o
// perfil salvo, mas sem os badges de câmera/mic/etc. que só existem em
// chamada de voz
function buildOfflineMemberRow(identity, opts = {}) {
  const row = document.createElement('div');
  row.className = 'offline-member-row';
  row.dataset.identity = identity;
  row.dataset.name = displayNameFor(identity);

  const avatar = document.createElement('span');
  avatar.className = 'avatar';
  avatar.textContent = displayNameFor(identity).charAt(0).toUpperCase();
  applyAvatarToEl(avatar, identity);
  row.appendChild(avatar);

  const name = document.createElement('span');
  name.className = 'member-name';
  name.textContent = displayNameFor(identity);
  if (opts.roleColor) name.style.color = opts.roleColor;
  row.appendChild(name);

  return row;
}

// lista de membros à direita, agrupada por cargo (maior cargo primeiro),
// com quem não tem cargo em "Online" e quem não está conectado agora em
// "Offline" — igual o Discord
function renderMemberSidebar() {
  if (!memberSidebarGroups) return;
  const onlineIdentities = new Set(
    Array.from(memberListItems.querySelectorAll('.member-row')).map((el) => el.dataset.identity)
  );

  const allKnown = new Set(Object.keys(serverState.profiles || {}));
  onlineIdentities.forEach((id) => allKnown.add(id));
  knownIdentities.forEach((id) => allKnown.add(id));
  if (serverState.ownerIdentity) allKnown.add(serverState.ownerIdentity);

  const roleGroups = [];
  const roleGroupById = new Map();
  (serverState.roles || []).forEach((role) => {
    const group = { role, identities: [] };
    roleGroups.push(group);
    roleGroupById.set(role.id, group);
  });
  const onlineNoRole = [];

  allKnown.forEach((identity) => {
    if (!onlineIdentities.has(identity)) return;
    const assigned = serverState.memberRoles[identity] || [];
    const topRoleId = assigned.find((rid) => roleGroupById.has(rid));
    if (topRoleId) roleGroupById.get(topRoleId).identities.push(identity);
    else onlineNoRole.push(identity);
  });

  const offline = Array.from(allKnown).filter((id) => !onlineIdentities.has(id));

  const byName = (a, b) => displayNameFor(a).localeCompare(displayNameFor(b));

  memberSidebarGroups.innerHTML = '';

  const addSection = (label, color, identities, opts = {}) => {
    if (identities.length === 0) return;
    const section = document.createElement('div');
    section.className = 'member-section';

    const header = document.createElement('div');
    header.className = 'member-section-header';
    if (color) header.style.color = color;
    header.textContent = `${label} — ${identities.length}`;
    section.appendChild(header);

    identities.sort(byName).forEach((identity) => {
      // cor do cargo só no nome de quem tá com a lista agrupada por cargo aqui
      // na barra lateral — igual Discord, não mexe no nome dentro da chamada
      // de voz (isso usa buildMemberRow em outro lugar, sem passar roleColor).
      // showStatus fica de fora aqui: essa lista é "quem tá online", não "quem
      // tá em chamada de voz" — os ícones de mic/fone mudo só fazem sentido
      // na listinha de dentro do canal de voz (essa sim passa showStatus).
      const row = opts.offline
        ? buildOfflineMemberRow(identity, { roleColor: color })
        : buildMemberRow({ identity, name: displayNameFor(identity) }, { roleColor: color });
      section.appendChild(row);
    });

    memberSidebarGroups.appendChild(section);
  };

  roleGroups.forEach(({ role, identities }) => addSection(role.name, role.color, identities));
  addSection('Online', null, onlineNoRole);
  addSection('Offline', null, offline, { offline: true });
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

function positionContextMenu(x, y, menu) {
  const rect = menu.getBoundingClientRect();
  let left = x;
  let top = y;
  if (left + rect.width > window.innerWidth) left = window.innerWidth - rect.width - 8;
  if (top + rect.height > window.innerHeight) top = window.innerHeight - rect.height - 8;
  menu.style.left = `${Math.max(8, left)}px`;
  menu.style.top = `${Math.max(8, top)}px`;
}

// ---------- cartão de perfil (clique com botão esquerdo) ----------
function openProfileCard(x, y, identity) {
  closeContextMenu();
  if (!identity) return;
  const isSelf = identity === myIdentity;
  const profile = isSelf
    ? { avatar: myAvatarDataUrl, banner: myBannerDataUrl, status: myStatusText }
    : memberProfiles.get(identity) || {};

  const card = document.createElement('div');
  card.className = 'context-menu profile-card';
  card.addEventListener('click', (e) => e.stopPropagation());

  const banner = document.createElement('div');
  banner.className = 'profile-card-banner';
  if (profile.banner) banner.style.backgroundImage = `url(${profile.banner})`;
  card.appendChild(banner);

  const avatar = document.createElement('span');
  avatar.className = 'avatar profile-card-avatar';
  avatar.textContent = displayNameFor(identity).charAt(0).toUpperCase();
  applyAvatarToEl(avatar, identity);

  // bolinha verde/cinza igual Discord — mesma checagem usada pra montar a
  // lista de online/offline (se tem uma linha na lista de dentro da sala,
  // a pessoa tá online agora).
  const statusDot = document.createElement('span');
  statusDot.className = 'profile-card-status-dot';
  statusDot.classList.toggle('is-online', !!document.getElementById(memberRowId(identity)));
  avatar.appendChild(statusDot);

  card.appendChild(avatar);

  const body = document.createElement('div');
  body.className = 'profile-card-body';

  const nameEl = document.createElement('div');
  nameEl.className = 'profile-card-name';
  nameEl.textContent = displayNameFor(identity);
  body.appendChild(nameEl);

  const tagEl = document.createElement('div');
  tagEl.className = 'profile-card-tag';
  tagEl.textContent = `usuário padrão: ${identity}`;
  body.appendChild(tagEl);

  if (profile.status) {
    const statusEl = document.createElement('div');
    statusEl.className = 'profile-card-status';
    statusEl.textContent = profile.status;
    body.appendChild(statusEl);
  }

  // cargos do servidor que essa pessoa tem — igual Discord, mostra os
  // cargos com a mesma cor que aparecem na lista de membros
  const roleIds = serverState.memberRoles?.[identity] || [];
  const roles = (serverState.roles || []).filter((r) => roleIds.includes(r.id));
  if (roles.length > 0) {
    const rolesTitle = document.createElement('div');
    rolesTitle.className = 'profile-card-section-title';
    rolesTitle.textContent = 'Cargos';
    body.appendChild(rolesTitle);

    const rolesWrap = document.createElement('div');
    rolesWrap.className = 'profile-card-roles';
    roles.forEach((role) => {
      const chip = document.createElement('span');
      chip.className = 'profile-card-role-chip';
      const dot = document.createElement('span');
      dot.className = 'role-color-dot';
      dot.style.background = role.color;
      chip.appendChild(dot);
      const label = document.createElement('span');
      label.textContent = role.name;
      chip.appendChild(label);
      rolesWrap.appendChild(chip);
    });
    body.appendChild(rolesWrap);
  }

  // desde quando a pessoa usa o PrimalVoice (data de criação da conta) —
  // vem junto do perfil público que o servidor manda em /api/state
  const joinDate = formatJoinDate(serverState.profiles?.[identity]?.createdAt);
  if (joinDate) {
    const joinEl = document.createElement('div');
    joinEl.className = 'profile-card-join-date';
    joinEl.textContent = `No PrimalVoice desde ${joinDate}`;
    body.appendChild(joinEl);
  }

  card.appendChild(body);

  const actions = document.createElement('div');
  actions.className = 'profile-card-actions';
  const actionBtn = document.createElement('button');
  actionBtn.type = 'button';
  actionBtn.className = 'secondary-btn';
  if (isSelf) {
    actionBtn.textContent = 'Editar perfil';
    actionBtn.addEventListener('click', () => {
      closeContextMenu();
      openSettingsModal('profile');
    });
  } else {
    actionBtn.textContent = 'Conversar';
    actionBtn.addEventListener('click', () => {
      closeContextMenu();
      switchToDm(identity);
    });
  }
  actions.appendChild(actionBtn);
  card.appendChild(actions);

  document.body.appendChild(card);
  contextMenuEl = card;
  positionContextMenu(x, y, card);
}

function openContextMenu(x, y, participant, opts = {}) {
  closeContextMenu();
  const identity = participant.identity;
  if (!identity) return;

  const menu = document.createElement('div');
  menu.className = 'context-menu';
  menu.addEventListener('click', (e) => e.stopPropagation());

  const header = document.createElement('div');
  header.className = 'context-menu-header';
  header.textContent = participant.name || identity;
  menu.appendChild(header);

  // No seu próprio nome não faz sentido silenciar/expulsar você mesmo —
  // mostra um menu bem mais simples, só com editar perfil (igual clicar no
  // seu avatar/nome lá embaixo).
  if (identity === myIdentity) {
    const profileItem = document.createElement('div');
    profileItem.className = 'context-menu-item';
    const profileLabel = document.createElement('span');
    profileLabel.className = 'label';
    profileLabel.textContent = 'Editar perfil';
    profileItem.appendChild(profileLabel);
    profileItem.addEventListener('click', (e) => {
      e.stopPropagation();
      closeContextMenu();
      openSettingsModal('profile');
    });
    menu.appendChild(profileItem);

    document.body.appendChild(menu);
    contextMenuEl = menu;
    positionContextMenu(x, y, menu);
    return;
  }

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
  positionContextMenu(x, y, menu);
}

memberListItems.addEventListener('contextmenu', (e) => {
  const row = e.target.closest('.member-row');
  if (!row || !row.dataset.identity) return;
  e.preventDefault();
  openContextMenu(e.clientX, e.clientY, participantFromRow(row));
});

memberListItems.addEventListener('click', (e) => {
  const row = e.target.closest('.member-row');
  if (!row || !row.dataset.identity) return;
  e.stopPropagation();
  openProfileCard(e.clientX, e.clientY, row.dataset.identity);
});

// a lista visual agrupada (por cargo/online/offline) é um espelho da lista
// interna acima — repete os mesmos eventos pra abrir perfil/menu funcionar
// nela também
memberSidebarGroups.addEventListener('contextmenu', (e) => {
  const row = e.target.closest('.member-row');
  if (!row || !row.dataset.identity) return;
  e.preventDefault();
  openContextMenu(e.clientX, e.clientY, participantFromRow(row));
});

memberSidebarGroups.addEventListener('click', (e) => {
  const onlineRow = e.target.closest('.member-row');
  const offlineRow = e.target.closest('.offline-member-row');
  const identity = onlineRow?.dataset.identity || offlineRow?.dataset.identity;
  if (!identity) return;
  e.stopPropagation();
  openProfileCard(e.clientX, e.clientY, identity);
});

voiceChannelsList.addEventListener('contextmenu', (e) => {
  const row = e.target.closest('.member-row');
  if (!row || !row.dataset.identity) return;
  e.preventDefault();
  openContextMenu(e.clientX, e.clientY, participantFromRow(row));
});

voiceChannelsList.addEventListener('click', (e) => {
  const row = e.target.closest('.member-row');
  if (!row || !row.dataset.identity) return;
  e.stopPropagation();
  openProfileCard(e.clientX, e.clientY, row.dataset.identity);
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
  amISpeaking = false;
  updateVoiceOverlay();
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
  joinMode = 'login';
  applyJoinMode();
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
  joinSubmitBtn.textContent = joinMode === 'register' ? 'Criando conta...' : 'Entrando...';

  const name = nameInput.value.trim();
  const password = passwordInput.value;

  try {
    if (joinMode === 'register' && password !== passwordConfirmInput.value) {
      throw new Error('As senhas não são iguais.');
    }
    if (joinMode === 'register' && !displaynameInput.value.trim()) {
      throw new Error('Informe um nome de exibição (é o nome que os outros vão ver).');
    }

    const configRes = await fetch(`${serverUrl}/api/config`);
    if (!configRes.ok) throw new Error('Não foi possível falar com o servidor.');
    const configData = await configRes.json();
    livekitUrl = configData.livekitUrl;

    const endpoint = joinMode === 'register' ? '/api/register' : '/api/token';
    const body =
      joinMode === 'register'
        ? { name, password, roomPassword: roomPasswordInput.value, displayName: displaynameInput.value.trim() }
        : { name, password };

    const tokenRes = await fetch(`${serverUrl}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
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
      renderMemberSidebar();
      broadcastProfile();
      if (activeVoiceChannelId) {
        broadcastVoicePresence('join', activeVoiceChannelId);
        broadcastVoiceStatus();
      }
    });
    lobbyRoom.on(RoomEvent.ParticipantDisconnected, (participant) => {
      removeMember(participant);
      renderMemberSidebar();
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
          identity: participant?.identity,
          attachment: msg.attachment || null,
        });
      } else if (msg.type === 'voice-presence') {
        if (!voicePresence.has(msg.channelId)) voicePresence.set(msg.channelId, new Map());
        const map = voicePresence.get(msg.channelId);
        if (msg.action === 'join') map.set(msg.identity, msg.name || msg.identity);
        else {
          map.delete(msg.identity);
          voiceMemberStatus.delete(msg.identity);
        }
        renderChannelLists();
      } else if (msg.type === 'voice-status') {
        setVoiceMemberStatus(msg.identity, { deafened: !!msg.deafened });
      } else if (msg.type === 'profile-update') {
        knownIdentities.add(msg.identity);
        memberProfiles.set(msg.identity, {
          avatar: msg.avatar || '',
          banner: msg.banner || '',
          status: msg.status || '',
          displayName: msg.displayName || '',
        });
        applyProfileEverywhere(msg.identity);
        renderMemberSidebar();
      } else if (msg.type === 'state-changed') {
        fetchServerState().catch(() => {});
      } else if (msg.type === 'dm') {
        const peer = msg.from === myIdentity ? msg.to : msg.from;
        if (!peer) return;
        dmPeers.add(peer);
        renderDmList();
        pushChatMessage(dmChannelKey(peer), {
          name: msg.from === myIdentity ? (myDisplayName || myName) : (msg.name || displayNameFor(peer)),
          text: msg.text,
          ts: msg.ts,
          isSelf: msg.from === myIdentity,
          identity: msg.from,
          attachment: msg.attachment || null,
        });
      }
    });

    await lobbyRoom.connect(livekitUrl, token);

    selfAvatar.textContent = identity.charAt(0).toUpperCase();
    selfName.textContent = identity;
    applyAvatarToEl(selfAvatar, identity);
    addMember(lobbyRoom.localParticipant);
    lobbyRoom.remoteParticipants.forEach((participant) => addMember(participant));
    broadcastProfile();

    await fetchServerState();
    chatHistoryByChannel.clear();
    activeTextChannelId = serverState.channels.text[0]?.id || null;
    resetVoiceControlsUI();
    if (activeTextChannelId) switchTextChannel(activeTextChannelId);

    joinScreen.hidden = true;
    roomScreen.hidden = false;
    renderMemberSidebar();
  } catch (err) {
    joinError.textContent = err.message || 'Erro ao entrar na sala.';
    joinError.hidden = false;
    joining = false;
    joinSubmitBtn.disabled = false;
    joinSubmitBtn.textContent = joinMode === 'register' ? 'Criar conta' : 'Entrar';
  }
});

micBtn.addEventListener('click', async () => {
  if (!voiceRoom) return;
  // clicar no microfone enquanto está ensurdecido sempre desfaz o
  // ensurdecer (igual Discord) — a voz volta pro estado de antes de
  // ensurdecer, dentro do setDeafened
  if (isDeafened) {
    setDeafened(false);
    return;
  }
  const newOn = micBtn.dataset.on !== 'true';
  await voiceRoom.localParticipant.setMicrophoneEnabled(newOn);
  micBtn.dataset.on = String(newOn);
  micBtn.classList.toggle('off', !newOn);
  playSound(newOn ? unmuteSound : muteSound); // só toca pra quem clicou, não é avisado pros outros
  animateIconKick(micBtn);
  updateVoiceOverlay();
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

// ---------- escolher o que compartilhar (tela/janela + com ou sem áudio) ----------
let sharepickResolve = null;
let sharepickSelectedId = null;
let sharepickSources = [];
let sharepickKind = 'screen';

function stopScreenShareUI() {
  shareBtn.dataset.on = 'false';
  shareBtn.classList.add('off');
  if (!voiceRoom) return;
  const tile = document.getElementById(tileId(voiceRoom.localParticipant.identity));
  tile?.querySelectorAll('video').forEach((el) => el.remove());
  if (tile && !tile.querySelector('video')) tile.classList.remove('has-video');
}

function renderSharepickGrid() {
  sharepickGrid.innerHTML = '';
  const list = sharepickSources.filter((s) => s.kind === sharepickKind);
  if (list.length === 0) {
    sharepickGrid.innerHTML = '<p class="sharepick-empty">Nada encontrado aqui.</p>';
    return;
  }
  list.forEach((source) => {
    const item = document.createElement('div');
    item.className = 'sharepick-item';
    item.classList.toggle('selected', source.id === sharepickSelectedId);

    const thumb = document.createElement('img');
    thumb.className = 'sharepick-thumb';
    thumb.src = source.thumbnail || '';
    item.appendChild(thumb);

    const nameRow = document.createElement('div');
    nameRow.className = 'sharepick-name';
    if (source.appIcon) {
      const icon = document.createElement('img');
      icon.src = source.appIcon;
      nameRow.appendChild(icon);
    }
    const nameSpan = document.createElement('span');
    nameSpan.textContent = source.name;
    nameRow.appendChild(nameSpan);
    item.appendChild(nameRow);

    item.addEventListener('click', () => {
      sharepickSelectedId = source.id;
      sharepickConfirmBtn.disabled = false;
      renderSharepickGrid();
    });

    sharepickGrid.appendChild(item);
  });
}

sharepickTabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    sharepickTabs.forEach((t) => t.classList.toggle('active', t === tab));
    sharepickKind = tab.dataset.kind;
    renderSharepickGrid();
  });
});

function closeSharepickModal(result) {
  sharepickOverlay.hidden = true;
  if (sharepickResolve) {
    sharepickResolve(result);
    sharepickResolve = null;
  }
}

sharepickCancelBtn.addEventListener('click', () => closeSharepickModal(null));
sharepickOverlay.addEventListener('click', (e) => {
  if (e.target === sharepickOverlay) closeSharepickModal(null);
});
sharepickConfirmBtn.addEventListener('click', () => {
  if (!sharepickSelectedId) return;
  closeSharepickModal({ sourceId: sharepickSelectedId, withAudio: sharepickAudioCheckbox.checked });
});

async function openScreenShareModal() {
  sharepickSelectedId = null;
  sharepickKind = 'screen';
  sharepickAudioCheckbox.checked = false;
  sharepickConfirmBtn.disabled = true;
  sharepickTabs.forEach((t) => t.classList.toggle('active', t.dataset.kind === 'screen'));
  sharepickGrid.innerHTML = '<p class="sharepick-empty">Carregando...</p>';
  sharepickOverlay.hidden = false;

  try {
    sharepickSources = await window.vortex.listScreenShareSources();
  } catch {
    sharepickSources = [];
  }
  renderSharepickGrid();

  return new Promise((resolve) => {
    sharepickResolve = resolve;
  });
}

shareBtn.addEventListener('click', async () => {
  if (!voiceRoom) return;

  if (shareBtn.dataset.on === 'true') {
    await voiceRoom.localParticipant.setScreenShareEnabled(false);
    stopScreenShareUI();
    return;
  }

  const choice = await openScreenShareModal();
  if (!choice) return;

  await window.vortex.chooseScreenShareSource(choice);
  let publication;
  try {
    publication = await voiceRoom.localParticipant.setScreenShareEnabled(true, {
      audio: choice.withAudio,
      resolution: { width: 1920, height: 1080, frameRate: 30 },
      contentHint: 'detail',
    });
  } catch (err) {
    alert('Não consegui compartilhar a tela.');
    return;
  }

  shareBtn.dataset.on = 'true';
  shareBtn.classList.remove('off');
  if (publication && publication.track) {
    attachTrack(publication.track, voiceRoom.localParticipant);
    const mst = publication.track.mediaStreamTrack;
    if (mst) mst.onended = () => stopScreenShareUI();
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

async function clearKeybind(button, action) {
  await window.vortex.setShortcut(action, null);
  keybinds[action] = '';
  button.textContent = 'Definir atalho';
  saveDevicePrefs();
}
keybindMuteClearBtn.addEventListener('click', () => clearKeybind(keybindMuteBtn, 'muteSelf'));
keybindDeafenClearBtn.addEventListener('click', () => clearKeybind(keybindDeafenBtn, 'deafen'));

window.vortex.onShortcut((action) => {
  if (action === 'muteSelf') {
    if (!voiceRoom) return;
    if (isDeafened) {
      setDeafened(false);
      return;
    }
    const newOn = micBtn.dataset.on !== 'true';
    voiceRoom.localParticipant.setMicrophoneEnabled(newOn);
    micBtn.dataset.on = String(newOn);
    micBtn.classList.toggle('off', !newOn);
    animateIconKick(micBtn);
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
  openProfilePane();
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
  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.className = 'name';
  nameInput.maxLength = 40;
  nameInput.value = channel.name;
  row.appendChild(nameInput);

  const saveBtn = document.createElement('button');
  saveBtn.className = 'secondary-btn';
  saveBtn.textContent = 'Salvar';
  saveBtn.addEventListener('click', async () => {
    const newName = nameInput.value.trim();
    if (!newName || newName === channel.name) return;
    try {
      await renameChannel(type, channel.id, newName);
    } catch (err) {
      alert(err.message);
    }
  });
  row.appendChild(saveBtn);

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
      renderMemberSidebar();
      refreshAllChatAuthorColors();
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
      renderMemberSidebar();
      refreshAllChatAuthorColors();
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
          // sem isso, quem atribuiu o cargo só via a lista da direita
          // reagrupada depois de reconectar — os outros já recebem certo
          // pelo broadcastStateChanged, mas quem clicou aqui não recebe o
          // próprio broadcast de volta
          renderMemberSidebar();
          refreshAllChatAuthorColors();
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

// Atualização automática (igual Discord): o processo principal confere
// sozinho se tem versão nova no GitHub, baixa em segundo plano, e aqui a
// gente só mostra o banner e reage ao clique de "Reiniciar e instalar".
const updateBanner = document.getElementById('update-banner');
const updateBannerText = document.getElementById('update-banner-text');
const updateBannerBtn = document.getElementById('update-banner-btn');
const updateBannerDismiss = document.getElementById('update-banner-dismiss');
const updateInstallOverlay = document.getElementById('update-install-overlay');
let updateReadyToInstall = false;

function showUpdateBanner(text, { showButton = false } = {}) {
  updateBannerText.textContent = text;
  updateBannerBtn.hidden = !showButton;
  updateBanner.hidden = false;
}

if (window.vortex && window.vortex.onUpdateStatus) {
  window.vortex.onUpdateStatus(({ status, version, percent, message }) => {
    if (status === 'available') {
      showUpdateBanner(`Baixando atualização (v${version})...`);
    } else if (status === 'downloading') {
      showUpdateBanner(`Baixando atualização... ${percent || 0}%`);
    } else if (status === 'downloaded') {
      updateReadyToInstall = true;
      showUpdateBanner(`Nova atualização disponível (v${version})`, { showButton: true });
    } else if (status === 'error') {
      console.warn('[primalvoice] erro ao atualizar:', message);
    }
    // 'checking' e 'not-available' não precisam de UI — o app já fica quieto.
  });
}

updateBannerBtn.addEventListener('click', () => {
  if (!updateReadyToInstall) return;
  // mostra a telinha escura com o logo girando (igual Discord) antes de
  // mandar instalar — dá um tempinho pro Chromium desenhar isso na tela
  // antes do app fechar pra instalar em segundo plano.
  updateInstallOverlay.hidden = false;
  setTimeout(() => window.vortex.installUpdate(), 250);
});

updateBannerDismiss.addEventListener('click', () => {
  updateBanner.hidden = true;
});

function hideBootSplash() {
  const splash = document.getElementById('boot-splash');
  if (!splash) return;
  splash.classList.add('boot-splash-hide');
  setTimeout(() => {
    splash.hidden = true;
  }, 450);
}

// tela de abertura (igual Discord) fica visível pelo menos um tempinho,
// mesmo que o app carregue rapidinho, pra dar tempo de ver a animação
(async () => {
  const startedAt = Date.now();
  const MIN_SPLASH_MS = 900;
  try {
    await init();
  } finally {
    const elapsed = Date.now() - startedAt;
    if (elapsed < MIN_SPLASH_MS) await new Promise((r) => setTimeout(r, MIN_SPLASH_MS - elapsed));
    hideBootSplash();
  }
})();
