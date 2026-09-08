const { Room, RoomEvent, ConnectionQuality, Track, createAudioAnalyser } = LivekitClient;

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
const soundboardBtn = document.getElementById('soundboard-btn');
const soundboardFileInput = document.getElementById('soundboard-file-input');
const hangupBtn = document.getElementById('hangup-btn');
const exitAppBtn = document.getElementById('exit-app-btn');

// Barra flutuante do modo cinema (igual Discord): repete câmera/mic/desligar
// da barra lateral (que fica escondida em cinema mode) como botões
// separados — clicar neles só aciona os botões DE VERDADE (camBtn.click()
// etc.), nunca duplica a lógica, e o estado (ligado/desligado) é espelhado
// automaticamente via MutationObserver logo abaixo.
const cinemaControlsBar = document.getElementById('cinema-controls-bar');
const cinemaCamBtn = document.getElementById('cinema-cam-btn');
const cinemaVolumeBtn = document.getElementById('cinema-volume-btn');
const cinemaStopWatchBtn = document.getElementById('cinema-stop-watch-btn');
const cinemaMicBtn = document.getElementById('cinema-mic-btn');
const cinemaHangupBtn = document.getElementById('cinema-hangup-btn');

// Espelha a classe "off" do botão de verdade pro botão da barra do cinema —
// via MutationObserver, então funciona não importa QUAL trecho do código
// mudou o botão original (mic/câmera são ligados/desligados de vários
// lugares: clique direto, ensurdecer, etc.), sem precisar caçar cada um.
function mirrorButtonOffState(sourceBtn, mirrorBtn) {
  const sync = () => mirrorBtn.classList.toggle('off', sourceBtn.classList.contains('off'));
  sync();
  new MutationObserver(sync).observe(sourceBtn, { attributes: true, attributeFilter: ['class'] });
}
mirrorButtonOffState(camBtn, cinemaCamBtn);
mirrorButtonOffState(micBtn, cinemaMicBtn);

cinemaCamBtn.addEventListener('click', () => camBtn.click());
cinemaMicBtn.addEventListener('click', () => micBtn.click());
cinemaHangupBtn.addEventListener('click', () => hangupBtn.click());
// Botão branco "parar de assistir" -- fecha a transmissão de vez (mesma
// coisa que o antigo X da barrinha antiga fazia: para de receber o track,
// mostra de novo o botão de "Assistir transmissão"), não só sai do modo
// cinema. cinemaVolumeBtn.dataset.identity é sempre mantido em dia por
// updateFloatingBarVisibility, então serve pra saber de quem é a
// transmissão sendo mostrada agora na barra, com ou sem cinema de verdade.
cinemaStopWatchBtn.addEventListener('click', () => {
  const identity = cinemaVolumeBtn.dataset.identity;
  if (!identity) return;
  const tile = document.getElementById(tileId(identity));
  if (!tile) return;
  stopWatchingScreenShare(participantFromRow(tile));
});
// volume DA TRANSMISSÃO de quem está sendo assistido em modo cinema agora —
// o data-identity (e o ícone ligado/mutado, via classe .is-muted que ele
// herda por já ter a classe screen-volume-btn) é mantido em dia em
// enterCinemaFullscreen() e na troca de vídeo expandido lá embaixo.
cinemaVolumeBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  if (!cinemaTileIdentity) return;
  openStreamVolumePopover(cinemaVolumeBtn, cinemaTileIdentity);
});

// ---------- overlay por cima de outras janelas/jogos, enquanto VOCÊ compartilha a tela ----------
// Igual o "Discord Overlay": mostra um aviso "AO VIVO" + os mesmos
// controles (câmera/mic/parar de compartilhar/desligar) flutuando por cima
// de QUALQUER outro programa/jogo, não só dentro da janela do PrimalVoice
// (ver createShareOverlayWindow no main.js). O overlay em si não sabe nada
// de LiveKit — só manda o "pedido" de volta pra cá (onOverlayAction), que é
// onde mora a lógica de verdade: delega pros mesmos botões reais, igual já
// fazemos com a barra do modo cinema.
function syncShareOverlayState() {
  window.vortex.setShareOverlayState?.({
    camOff: camBtn.classList.contains('off'),
    micOff: micBtn.classList.contains('off'),
  });
}
new MutationObserver(syncShareOverlayState).observe(camBtn, { attributes: true, attributeFilter: ['class'] });
new MutationObserver(syncShareOverlayState).observe(micBtn, { attributes: true, attributeFilter: ['class'] });

window.vortex.onOverlayAction?.((action) => {
  if (action === 'toggleCam') camBtn.click();
  else if (action === 'toggleMic') micBtn.click();
  else if (action === 'hangup') hangupBtn.click();
  else if (action === 'stopShare') shareBtn.click(); // já sabe que tá compartilhando, então desliga
});

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

// Balãozinho igual o do "Ping: Xms" só que pra direita, pros ícones da barra
// de servidores (PrimalVoice, Mensagens diretas, atalhos de DM) — antes
// usavam o "title" nativo do HTML, que é o tooltip feio/padrão do sistema
// (demora pra aparecer, não combina com o tema do app).
const railTooltip = document.getElementById('rail-tooltip');
// dir: 'right' (padrão, usado na barra de servidores/DMs à esquerda) ou
// 'top' (usado nos botõezinhos da barra de controles de voz, lá embaixo —
// não cabe empurrar o popup pra direita porque é perto do canto da tela).
function attachRailTooltip(el, getText, opts = {}) {
  if (!el) return;
  const dir = opts.dir || 'right';
  el.addEventListener('mouseenter', () => {
    const text = typeof getText === 'function' ? getText() : getText;
    if (!text) return;
    railTooltip.textContent = text;
    const rect = el.getBoundingClientRect();
    if (dir === 'top') {
      railTooltip.style.left = `${rect.left + rect.width / 2}px`;
      railTooltip.style.top = `${rect.top - 10}px`;
      railTooltip.style.transform = 'translate(-50%, -100%)';
    } else {
      railTooltip.style.left = `${rect.right + 12}px`;
      railTooltip.style.top = `${rect.top + rect.height / 2}px`;
      railTooltip.style.transform = 'translateY(-50%)';
    }
    railTooltip.classList.toggle('tooltip-top', dir === 'top');
    railTooltip.classList.add('tooltip-visible');
  });
  el.addEventListener('mouseleave', () => {
    railTooltip.classList.remove('tooltip-visible');
  });
  el.removeAttribute('title');
}
attachRailTooltip(homeIconBtn, () => homeIconBtn.dataset.tooltip);
attachRailTooltip(serverIconBtn, () => serverIconBtn.dataset.tooltip);
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
const sharepickResolutionSelect = document.getElementById('sharepick-resolution');
const sharepickFramerateSelect = document.getElementById('sharepick-framerate');
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
// Áudio do COMPARTILHAMENTO DE TELA (o som do jogo/vídeo/desktop de quem tá
// transmitindo) é registrado separado do áudio da VOZ dela (microfone) —
// assim dá pra abaixar só o som do jogo sem abaixar a voz da pessoa junto
// (ver registerStreamAudioEl/applyStreamVolume, e o slider no botão de
// volume da telinha em addScreenShareControls). "Silenciar" no menu de
// contexto e "Ensurdecer" continuam mudando os dois juntos (silenciar a
// pessoa de vez é silenciar tudo dela).
const streamAudioElsByIdentity = new Map();
const streamVolumes = new Map();
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

  // Retrato ao vivo de quem tá em qual canal de voz agora (ver
  // store.getVoicePresenceSnapshot no servidor) — só PREENCHE o que a gente
  // ainda não sabia, nunca sobrescreve/apaga (a fonte de verdade pro que já
  // está na tela é o broadcast em tempo real pelo LiveKit; isso aqui só
  // existe pra não ficar tudo vazio nos primeiros segundos depois de
  // conectar). Nunca inclui a própria identity — a minha presença em canal
  // de voz é sempre controlada localmente por quem eu realmente entrei.
  const voicePresenceData = data.voicePresence || {};
  for (const [channelId, identities] of Object.entries(voicePresenceData)) {
    if (!voicePresence.has(channelId)) voicePresence.set(channelId, new Map());
    const map = voicePresence.get(channelId);
    for (const [identity, name] of Object.entries(identities)) {
      if (identity !== myIdentity && !map.has(identity)) map.set(identity, name);
    }
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
  devicePrefs = Object.assign(
    { micId: '', speakerId: '', cameraId: '', screenResolution: '1080p', screenFrameRate: 30 },
    cfg.devicePrefs || {}
  );
  if (sharepickResolutionSelect) sharepickResolutionSelect.value = devicePrefs.screenResolution;
  if (sharepickFramerateSelect) sharepickFramerateSelect.value = String(devicePrefs.screenFrameRate);
  keybinds = Object.assign({ muteSelf: '', deafen: '' }, cfg.keybinds || {});
  keybindMuteBtn.textContent = keybinds.muteSelf || 'Definir atalho';
  keybindDeafenBtn.textContent = keybinds.deafen || 'Definir atalho';
  if (keybinds.muteSelf) await window.vortex.setShortcut('muteSelf', keybinds.muteSelf);
  if (keybinds.deafen) await window.vortex.setShortcut('deafen', keybinds.deafen);
}

// ---------- efeitos sonoros (soundboard) ----------
// Guardado só neste PC (não segue a conta pra outros dispositivos, diferente
// do perfil) — cada som vira um data URL (base64) dentro do config.json,
// igual já é feito com foto de perfil/banner, só que com um limite bem mais
// apertado (áudio comprimido em base64 infla rápido o arquivo de config).
let mySounds = [];
const MAX_SOUND_BYTES = 1_000_000; // ~1MB por efeito, dá uns poucos segundos de áudio
const MAX_SOUND_SECONDS = 12;
const MAX_SOUNDS = 24;

// Volume/mudo dos efeitos sonoros (meu, de escutar) — separado do volume por
// pessoa que já existia, porque um efeito pode ser bem mais alto que a voz
// de quem tocou (é justamente a reclamação: gente que sobe o áudio do efeito
// pra gritar mais forte). Isso controla só o que EU escuto (dos outros e do
// meu próprio preview) — não muda o que os outros recebem quando EU toco.
let soundboardEffectsVolume = 0.6;
let soundboardMuted = false;
const soundboardAudioEls = new Set(); // <audio> de efeito recebidos de outros, tocando agora
const soundboardLocalGains = new Set(); // GainNode do MEU preview local, tocando agora

function effectiveSoundboardVolume() {
  return soundboardMuted ? 0 : soundboardEffectsVolume;
}

function applySoundboardVolume() {
  const vol = effectiveSoundboardVolume();
  // efeito de alguém que eu silenciei (ou se eu tô ensurdecido) continua
  // sem tocar pra mim, mesmo que o volume geral dos efeitos esteja ligado —
  // mesma regra que já vale pra voz da pessoa.
  soundboardAudioEls.forEach((el) => {
    const identity = el.dataset.soundboardIdentity;
    const blocked = isDeafened || (identity && mutedForMe.has(identity));
    el.volume = blocked ? 0 : vol;
  });
  soundboardLocalGains.forEach((gain) => { gain.gain.value = vol; });
}

function loadSoundboardFromConfig(cfg) {
  mySounds = Array.isArray(cfg.soundboard) ? cfg.soundboard : [];
  soundboardEffectsVolume = typeof cfg.soundboardVolume === 'number' ? cfg.soundboardVolume : 0.6;
  soundboardMuted = !!cfg.soundboardMuted;
}

async function saveSoundboardToConfig() {
  const cfg = (await window.vortex.getConfig()) || {};
  cfg.soundboard = mySounds;
  cfg.soundboardVolume = soundboardEffectsVolume;
  cfg.soundboardMuted = soundboardMuted;
  await window.vortex.setConfig(cfg);
}

// ---------- sons padrão do PrimalVoice ----------
// Gerados na hora por síntese (osciladores/ruído filtrado do Web Audio),
// não são arquivos de áudio de verdade — assim não precisa embutir nenhum
// arquivo de som de terceiros no instalador. Ficam sempre disponíveis, não
// contam pro limite MAX_SOUNDS, e ninguém pode apagar.
function renderSynthBuffer(ctx, durationSec, draw) {
  return new Promise((resolve, reject) => {
    const rate = ctx.sampleRate;
    const off = new OfflineAudioContext(1, Math.ceil(rate * durationSec), rate);
    draw(off);
    off.startRendering().then(resolve, reject);
  });
}

function synthTone(off, freq, startAt, dur, type = 'sine', peak = 0.5) {
  const osc = off.createOscillator();
  osc.type = type;
  osc.frequency.value = freq;
  const g = off.createGain();
  g.gain.setValueAtTime(0, startAt);
  g.gain.linearRampToValueAtTime(peak, startAt + 0.015);
  g.gain.exponentialRampToValueAtTime(0.001, startAt + dur);
  osc.connect(g);
  g.connect(off.destination);
  osc.start(startAt);
  osc.stop(startAt + dur + 0.02);
}

function synthNoiseBurst(off, startAt, dur, freq, q, peak = 0.6) {
  const bufLen = Math.ceil(off.sampleRate * dur);
  const buffer = off.createBuffer(1, bufLen, off.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;
  const src = off.createBufferSource();
  src.buffer = buffer;
  const filter = off.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = freq;
  filter.Q.value = q;
  const g = off.createGain();
  g.gain.setValueAtTime(peak, startAt);
  g.gain.exponentialRampToValueAtTime(0.001, startAt + dur);
  src.connect(filter);
  filter.connect(g);
  g.connect(off.destination);
  src.start(startAt);
}

const BUILTIN_SOUNDBOARD_SOUNDS = [
  {
    id: 'builtin-bipe',
    name: 'Bipe',
    duration: 0.35,
    draw: (off) => synthTone(off, 880, 0, 0.2),
  },
  {
    id: 'builtin-dingdong',
    name: 'Ding-dong',
    duration: 0.9,
    draw: (off) => {
      synthTone(off, 987.77, 0, 0.35); // Si5
      synthTone(off, 783.99, 0.28, 0.5); // Sol5
    },
  },
  {
    id: 'builtin-vitoria',
    name: 'Vitória',
    duration: 1.1,
    draw: (off) => {
      synthTone(off, 523.25, 0, 0.22); // Dó5
      synthTone(off, 659.25, 0.16, 0.22); // Mi5
      synthTone(off, 783.99, 0.32, 0.5); // Sol5
    },
  },
  {
    id: 'builtin-boing',
    name: 'Boing engraçado',
    duration: 0.5,
    draw: (off) => {
      const osc = off.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(700, 0);
      osc.frequency.exponentialRampToValueAtTime(120, 0.4);
      const g = off.createGain();
      g.gain.setValueAtTime(0.55, 0);
      g.gain.exponentialRampToValueAtTime(0.001, 0.45);
      osc.connect(g);
      g.connect(off.destination);
      osc.start(0);
      osc.stop(0.46);
    },
  },
  {
    id: 'builtin-alerta',
    name: 'Alerta',
    duration: 0.8,
    draw: (off) => {
      synthTone(off, 660, 0, 0.18, 'square', 0.35);
      synthTone(off, 660, 0.28, 0.18, 'square', 0.35);
      synthTone(off, 660, 0.56, 0.2, 'square', 0.35);
    },
  },
  {
    id: 'builtin-aplauso',
    name: 'Aplauso curto',
    duration: 0.9,
    draw: (off) => synthNoiseBurst(off, 0, 0.8, 2200, 0.7, 0.5),
  },
];
BUILTIN_SOUNDBOARD_SOUNDS.forEach((sound) => { sound.builtin = true; });
const builtinSoundBufferCache = new Map();
async function getBuiltinSoundBuffer(ctx, sound) {
  if (builtinSoundBufferCache.has(sound.id)) return builtinSoundBufferCache.get(sound.id);
  const buffer = await renderSynthBuffer(ctx, sound.duration, sound.draw);
  builtinSoundBufferCache.set(sound.id, buffer);
  return buffer;
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
  loadSoundboardFromConfig(cfg);
  await loadThemeFromConfig(cfg);
  if (cfg.serverUrl) {
    serverUrl = cfg.serverUrl;
    // Se já tinha entrado antes nesse PC, tenta reconectar sozinho (sem
    // mostrar a tela de login) — só mostra a tela de login se isso falhar
    // (sessão inválida, servidor fora do ar, etc.) ou se nunca entrou aqui.
    const resumed = await attemptAutoResume(cfg);
    if (!resumed) showJoin();
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

    // só recolhe quando chega bem pertinho do fim de verdade (era min*0.55,
    // ou seja, recolhia sozinho ainda no meio do arraste, bem antes da
    // pessoa soltar) — agora só recolhe se ela arrastar até quase o 0
    const COLLAPSE_THRESHOLD_PX = 28;
    if (next < COLLAPSE_THRESHOLD_PX) {
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

// (o balãozinho de texto explicando "arraste/clique" foi tirado — igual o
// Discord, que não mostra nenhum texto, só a faixa fina com a setinha
// dupla aparecendo no hover; mais limpo)

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
    // Só mostra aqui na barra de servidores quem tem mensagem não lida —
    // igual Discord. Antes ficava toda conversa que já foi aberta na sessão
    // pra sempre destacada aqui (mesmo depois de já ter lido); assim que a
    // pessoa clica e entra na conversa, o não lido zera (switchToDm) e o
    // atalho já não aparece mais nem aqui, só dentro de "Conversas diretas".
    Array.from(dmPeers)
      .filter((identity) => (unreadCounts.get(dmChannelKey(identity)) || 0) > 0)
      .sort((a, b) => displayNameFor(a).localeCompare(displayNameFor(b)))
      .forEach((identity) => {
        const unread = unreadCounts.get(dmChannelKey(identity)) || 0;
        const icon = document.createElement('div');
        icon.className = 'server-icon dm-quick-icon';
        icon.dataset.identity = identity;
        icon.classList.toggle('active', sidebarView === 'dms' && activeDmPeer === identity);
        attachRailTooltip(icon, () => displayNameFor(identity));

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

  vr.on(RoomEvent.TrackSubscribed, (track, pub, participant) => {
    attachTrack(track, participant, pub);
  });
  vr.on(RoomEvent.TrackUnsubscribed, (track, _pub, participant) => {
    // Se fomos NÓS que mandamos parar de receber esse track (cliquei no X pra
    // "pausar" a transmissão que eu tava assistindo), não é o apresentador
    // que parou de compartilhar — não pode apagar screenShareTracks/etc,
    // senão nunca mais dá pra assistir de novo sem ele parar e começar a
    // compartilhar tudo de novo. Ver stopWatchingScreenShare.
    if (
      (track.source === Track.Source.ScreenShare || track.source === Track.Source.ScreenShareAudio) &&
      manualScreenUnsubscribe.has(participant?.identity)
    ) {
      manualScreenUnsubscribe.delete(participant.identity);
      return;
    }
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
    // Eu mesmo não entro nessa lista: quem decide se EU estou falando é a
    // detecção local (startLocalSpeakingDetection, mais rápida que esperar
    // o servidor mandar essa atualização) — ver o comentário lá em cima,
    // perto de setSpeaking. Só aplica pros outros participantes aqui.
    const speakingIds = new Set(speakers.map((p) => p.identity));
    vr.remoteParticipants.forEach((p) => setSpeaking(p.identity, speakingIds.has(p.identity)));
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
  vr.on(RoomEvent.LocalTrackPublished, (publication, participant) => {
    handleTrackPublishedChange(true)(publication, participant);
    if (publication.source === Track.Source.Microphone && publication.track) {
      startLocalSpeakingDetection(publication.track);
    }
  });
  vr.on(RoomEvent.LocalTrackUnpublished, (publication, participant) => {
    handleTrackPublishedChange(false)(publication, participant);
    if (publication.source === Track.Source.Microphone) {
      stopLocalSpeakingDetection();
      setSpeaking(myIdentity, false);
      amISpeaking = false;
      updateVoiceOverlay();
    }
  });

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
  micBtn.dataset.tooltip = 'Microfone';
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
  // também avisa o servidor (retrato ao vivo, ver getVoicePresenceSnapshot) —
  // é isso que deixa quem conecta agora já ver na hora quem tá em cada canal,
  // sem esperar o vaivém de mensagens do LiveKit
  apiFetch('/api/voice-presence/join', { method: 'POST', body: JSON.stringify({ channelId }) }).catch(() => {});

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
  apiFetch('/api/voice-presence/leave', { method: 'POST' }).catch(() => {});

  try {
    await voiceRoom.disconnect();
  } catch {
    // já pode ter caído sozinho
  }
  voiceRoom = null;
  activeVoiceChannelId = null;
  amISpeaking = false;
  stopLocalSpeakingDetection();
  updateVoiceOverlay();

  if (cinemaTileIdentity) exitCinemaFullscreen();
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
  micBtn.dataset.tooltip = 'Microfone (clique num canal de voz pra entrar)';
  camBtn.dataset.on = 'false';
  camBtn.classList.add('off');
  shareBtn.dataset.on = 'false';
  shareBtn.classList.add('off');
  shareBtn.classList.remove('sharing');
  // se a pessoa sair do canal de voz (ou desconectar de vez) SEM antes
  // clicar em "parar de compartilhar", o botão de compartilhar zerava aqui
  // mas o overlay por cima de outras janelas ficava esquecido, ligado --
  // preso na tela dela pra sempre até fechar o app de vez pela bandeja.
  // isso tem que ser desligado sempre que a chamada acaba, não só quando
  // a pessoa clica pra parar de compartilhar.
  window.vortex.hideShareOverlay?.();
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

// Deixa os links dentro do texto da mensagem clicáveis (abrem no navegador
// padrão, não dentro do próprio PrimalVoice) e mantém o resto do texto
// como texto normal — sem isso o link aparecia igual a qualquer palavra,
// sem dar pra clicar nem tinha como saber que era um link antes de tentar.
const CHAT_URL_REGEX = /(https?:\/\/[^\s<>"']+)/g;

function renderMessageTextWithLinks(container, text) {
  CHAT_URL_REGEX.lastIndex = 0;
  let lastIndex = 0;
  let match;
  while ((match = CHAT_URL_REGEX.exec(text))) {
    if (match.index > lastIndex) {
      container.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
    }
    // tira pontuação de fechamento que normalmente não faz parte do link em
    // si (ex: "olha isso: https://x.com/y." ou "(https://x.com/y)")
    let url = match[0];
    let trailing = '';
    while (url && /[).,!?;:'"]$/.test(url)) {
      trailing = url.slice(-1) + trailing;
      url = url.slice(0, -1);
    }
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.className = 'chat-link';
    link.textContent = url;
    container.appendChild(link);
    if (trailing) container.appendChild(document.createTextNode(trailing));
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    container.appendChild(document.createTextNode(text.slice(lastIndex)));
  }
}

// Cartãozinho de prévia de vídeo do YouTube embaixo da mensagem, igual o
// Discord — miniatura, título e nome do canal. Continua abrindo no
// navegador padrão ao clicar (não toca o vídeo dentro do próprio app, por
// design — igual qualquer outro link do chat), só que agora dá pra VER do
// que se trata antes de clicar, com direito a miniatura.
const YOUTUBE_URL_REGEX = /(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{6,15})/;

function extractYoutubeVideoId(text) {
  const match = text.match(YOUTUBE_URL_REGEX);
  return match ? match[1] : null;
}

const YT_PLAY_ICON_SVG =
  '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="11" fill="rgba(0,0,0,0.55)"></circle><path d="M10 8.5v7l6-3.5z" fill="#fff"></path></svg>';
const YT_EXTERNAL_ICON_SVG =
  '<svg class="yt-embed-external" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>';

// Guarda o resultado (ou `null` se falhou) por id de vídeo — evita buscar o
// mesmo vídeo no oEmbed toda vez que o histórico é redesenhado (troca de
// canal, reconexão etc.)
const youtubeEmbedCache = new Map();

async function fetchYoutubeEmbedInfo(videoId) {
  if (youtubeEmbedCache.has(videoId)) return youtubeEmbedCache.get(videoId);
  const promise = (async () => {
    try {
      const url = `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}&format=json`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('oembed falhou');
      return await res.json();
    } catch {
      return null;
    }
  })();
  youtubeEmbedCache.set(videoId, promise);
  const resolved = await promise;
  youtubeEmbedCache.set(videoId, resolved);
  return resolved;
}

function buildYoutubeEmbedCard(videoId) {
  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;

  // O card em si não é mais um link único (igual Discord: cada parte tem
  // seu próprio comportamento) — o TÍTULO abre no navegador, a MINIATURA
  // toca o vídeo embutido ali mesmo na conversa, e o iconezinho de "abrir
  // externo" em cima da miniatura sempre abre no navegador, mesmo clicando
  // nele por cima da miniatura.
  const card = document.createElement('div');
  card.className = 'yt-embed';

  const source = document.createElement('div');
  source.className = 'yt-embed-source';
  source.textContent = 'YouTube';
  card.appendChild(source);

  const author = document.createElement('div');
  author.className = 'yt-embed-author';
  author.hidden = true;
  card.appendChild(author);

  const title = document.createElement('a');
  title.className = 'yt-embed-title';
  title.href = watchUrl;
  title.target = '_blank';
  title.rel = 'noopener noreferrer';
  title.textContent = 'Assistir no YouTube';
  card.appendChild(title);

  const thumbWrap = document.createElement('div');
  thumbWrap.className = 'yt-embed-thumb-wrap';
  thumbWrap.title = 'Tocar vídeo';
  const thumb = document.createElement('img');
  thumb.className = 'yt-embed-thumb';
  thumb.alt = '';
  // já mostra uma miniatura na hora (esse endereço sempre existe pra
  // qualquer vídeo público, sem precisar esperar o oEmbed responder)
  thumb.src = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
  thumbWrap.appendChild(thumb);

  // ícone de play (só decorativo — clicar em QUALQUER parte da miniatura já
  // toca o vídeo, ver o listener no thumbWrap logo abaixo) e o iconezinho de
  // "abrir externo" lado a lado, centralizados por cima da miniatura, igual
  // o Discord.
  const playOverlay = document.createElement('div');
  playOverlay.className = 'yt-embed-play';
  playOverlay.innerHTML = YT_PLAY_ICON_SVG;
  thumbWrap.appendChild(playOverlay);

  const externalBtn = document.createElement('a');
  externalBtn.className = 'yt-embed-external-btn';
  externalBtn.href = watchUrl;
  externalBtn.target = '_blank';
  externalBtn.rel = 'noopener noreferrer';
  externalBtn.title = 'Abrir no navegador';
  externalBtn.innerHTML = YT_EXTERNAL_ICON_SVG;
  // clicar nesse iconezinho abre no navegador — não pode também disparar o
  // clique da miniatura (que tocaria o vídeo embutido por baixo dele)
  externalBtn.addEventListener('click', (e) => e.stopPropagation());
  playOverlay.appendChild(externalBtn);

  // Clicar em qualquer parte da miniatura (menos o iconezinho de abrir
  // externo, tratado acima) troca ela por um player de verdade do YouTube,
  // tocando ali mesmo dentro da conversa, sem sair do PrimalVoice.
  thumbWrap.addEventListener('click', () => {
    const iframe = document.createElement('iframe');
    iframe.className = 'yt-embed-iframe';
    iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
    iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    iframe.allowFullscreen = true;
    iframe.frameBorder = '0';
    thumbWrap.replaceWith(iframe);
  });

  card.appendChild(thumbWrap);

  fetchYoutubeEmbedInfo(videoId).then((info) => {
    if (!info) return;
    if (info.author_name) {
      author.textContent = info.author_name;
      author.hidden = false;
    }
    if (info.title) title.textContent = info.title;
    if (info.thumbnail_url) thumb.src = info.thumbnail_url;
  });

  return card;
}

const EDIT_ICON_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"></path></svg>';
const DELETE_ICON_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path></svg>';

// Troca o texto da mensagem por um campinho editável na hora, sem abrir
// modal nenhum — Enter salva, Esc cancela (igual renomear canal).
function startInlineMessageEdit(textEl, channelId, id, currentText) {
  if (textEl.querySelector('textarea')) return; // já editando
  const original = currentText;
  textEl.innerHTML = '';
  const textarea = document.createElement('textarea');
  textarea.className = 'chat-edit-textarea';
  textarea.value = original;
  textEl.appendChild(textarea);
  const hint = document.createElement('div');
  hint.className = 'chat-edit-hint';
  hint.textContent = 'enter para salvar • esc para cancelar';
  textEl.appendChild(hint);
  textarea.focus();
  textarea.setSelectionRange(textarea.value.length, textarea.value.length);
  // ajusta a altura do campinho ao conteúdo (some com a barra de rolagem)
  const autoGrow = () => { textarea.style.height = 'auto'; textarea.style.height = `${textarea.scrollHeight}px`; };
  autoGrow();
  textarea.addEventListener('input', autoGrow);

  let settled = false;
  const finish = (commit) => {
    if (settled) return;
    settled = true;
    const newText = textarea.value.trim();
    if (commit && newText && newText !== original) {
      editChatMessage(channelId, id, newText);
      return; // applyMessageEdited já redesenha o .text certinho
    }
    textEl.innerHTML = '';
    renderMessageTextWithLinks(textEl, original);
  };
  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      finish(true);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      finish(false);
    }
  });
  textarea.addEventListener('blur', () => finish(true));
}

function appendChatMessageEl({ id, name, text, isSelf, identity, attachment, ts, editedAt }) {
  const empty = chatMessages.querySelector('.chat-empty');
  if (empty) empty.remove();

  const row = document.createElement('div');
  row.className = isSelf ? 'chat-message self' : 'chat-message';
  if (identity) row.dataset.identity = identity;
  if (id) row.dataset.messageId = id;

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
  // usa o horário real de quando a mensagem foi mandada (ts, vindo do
  // servidor ou gerado na hora do envio) — antes usava a hora ATUAL toda
  // vez que essa função rodava, então o horário "andava" sozinho cada
  // vez que a pessoa entrava de novo no canal e o histórico era redesenhado
  time.textContent = new Date(ts || Date.now()).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  meta.appendChild(time);
  if (editedAt) {
    const marker = document.createElement('span');
    marker.className = 'edited-marker';
    marker.textContent = '(editado)';
    meta.appendChild(marker);
  }
  body.appendChild(meta);

  if (text) {
    const textEl = document.createElement('div');
    textEl.className = 'text';
    renderMessageTextWithLinks(textEl, text);
    body.appendChild(textEl);

    // só a própria pessoa pode editar/apagar a própria mensagem — e só dá
    // pra editar mensagem de TEXTO puro (uma que só tem anexo não tem o que
    // editar, só apagar)
    if (isSelf && id) {
      const actions = document.createElement('div');
      actions.className = 'chat-message-actions';
      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'chat-message-action-btn';
      editBtn.title = 'Editar';
      editBtn.innerHTML = EDIT_ICON_SVG;
      editBtn.addEventListener('click', () => {
        // busca o texto ATUAL no histórico (não o "text" capturado quando a
        // linha foi desenhada) — senão, editar a mesma mensagem duas vezes e
        // cancelar com Esc na segunda vez voltava pro texto original de
        // antes da primeira edição, perdendo a edição já salva
        const current = findMessageInHistory(activeTextChannelId, id);
        startInlineMessageEdit(textEl, activeTextChannelId, id, current ? current.text : text);
      });
      actions.appendChild(editBtn);

      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'chat-message-action-btn';
      deleteBtn.title = 'Apagar';
      deleteBtn.innerHTML = DELETE_ICON_SVG;
      deleteBtn.addEventListener('click', () => {
        if (confirm('Apagar essa mensagem?')) deleteChatMessage(activeTextChannelId, id);
      });
      actions.appendChild(deleteBtn);

      row.appendChild(actions);
    }

    // se a mensagem tem um link do YouTube, mostra um cartãozinho de
    // prévia embaixo (miniatura + título + canal), igual o Discord
    const youtubeVideoId = extractYoutubeVideoId(text);
    if (youtubeVideoId) {
      body.appendChild(buildYoutubeEmbedCard(youtubeVideoId));
    }
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
        editedAt: m.editedAt || null,
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
function persistChatMessage(channelId, { id, text, attachment }) {
  const path = isDmChannelId(channelId)
    ? `/api/dm/${encodeURIComponent(dmPeerFromChannelId(channelId))}/messages`
    : `/api/messages/${encodeURIComponent(channelId)}`;
  // manda o id JÁ GERADO no cliente — o servidor usa esse id em vez de
  // inventar um novo, senão a mensagem "ao vivo" (que já foi desenhada com
  // esse id) e a copia salva no servidor (recarregada depois) ficariam
  // com ids diferentes, e editar/apagar não acharia a mensagem certa.
  apiFetch(path, { method: 'POST', body: JSON.stringify({ id, text, attachment: attachment || null }) }).catch((err) => {
    console.warn('Não consegui salvar a mensagem no servidor:', err);
  });
}

// Manda uma mensagem direta pra alguém — usado tanto pelo campo de chat
// normal (já estando na conversa) quanto pelo campinho rápido "Conversar com
// @Fulano" no próprio cartão de perfil (igual Discord: dá pra mandar sem
// nem abrir a conversa antes).
function sendDirectMessage(peerIdentity, text) {
  if (!text || !lobbyRoom || !peerIdentity) return;
  const ts = Date.now();
  const id = crypto.randomUUID();
  const channelId = dmChannelKey(peerIdentity);
  const payload = { type: 'dm', to: peerIdentity, from: myIdentity, name: myDisplayName || myName, text, ts, id };
  // manda SÓ pra quem é o destinatário (destinationIdentities) — sem isso o
  // LiveKit distribui pra sala inteira e mensagem "privada" nenhuma é
  // privada de verdade, mesmo o resto do app filtrando na tela
  lobbyRoom.localParticipant.publishData(chatEncoder.encode(JSON.stringify(payload)), {
    reliable: true,
    destinationIdentities: [peerIdentity],
  });
  pushChatMessage(channelId, { id, name: myDisplayName || myName, text, ts, isSelf: true, identity: myIdentity });
  persistChatMessage(channelId, { id, text });
}

chatForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = chatInput.value.trim();
  if (!text || !lobbyRoom || !activeTextChannelId) return;
  chatInput.value = '';

  if (isDmChannelId(activeTextChannelId)) {
    sendDirectMessage(dmPeerFromChannelId(activeTextChannelId), text);
    return;
  }
  const ts = Date.now();
  const id = crypto.randomUUID();
  const payload = { type: 'chat', channelId: activeTextChannelId, name: myDisplayName || myName, text, ts, id };
  lobbyRoom.localParticipant.publishData(chatEncoder.encode(JSON.stringify(payload)), { reliable: true });
  pushChatMessage(activeTextChannelId, { id, name: myDisplayName || myName, text, ts, isSelf: true, identity: myIdentity });
  persistChatMessage(activeTextChannelId, { id, text });
});

// ---------- editar/apagar a própria mensagem ----------
// O id é gerado AQUI no cliente (na hora de mandar) e usado em TODO lugar —
// no broadcast pros outros, no histórico local e no que é salvo no
// servidor — assim os três lados sempre concordam em qual id é qual
// mensagem, mesmo depois de reconectar/recarregar o histórico.
function findMessageInHistory(channelId, id) {
  const history = chatHistoryByChannel.get(channelId);
  return history ? history.find((m) => m.id === id) || null : null;
}

function applyMessageEdited(channelId, id, newText) {
  const msg = findMessageInHistory(channelId, id);
  if (msg) {
    msg.text = newText;
    msg.editedAt = Date.now();
  }
  if (channelId === activeTextChannelId && !textView.hidden) {
    const row = chatMessages.querySelector(`.chat-message[data-message-id="${cssEscape(id)}"]`);
    if (row) {
      const textEl = row.querySelector('.text');
      if (textEl) {
        textEl.innerHTML = '';
        renderMessageTextWithLinks(textEl, newText);
      }
      if (!row.querySelector('.edited-marker')) {
        const marker = document.createElement('span');
        marker.className = 'edited-marker';
        marker.textContent = '(editado)';
        row.querySelector('.meta')?.appendChild(marker);
      }
    }
  }
}

function applyMessageDeleted(channelId, id) {
  const history = chatHistoryByChannel.get(channelId);
  if (history) {
    const idx = history.findIndex((m) => m.id === id);
    if (idx !== -1) history.splice(idx, 1);
  }
  if (channelId === activeTextChannelId && !textView.hidden) {
    const row = chatMessages.querySelector(`.chat-message[data-message-id="${cssEscape(id)}"]`);
    row?.remove();
    if (!chatMessages.querySelector('.chat-message')) {
      chatMessages.innerHTML = '<p class="chat-empty">Nenhuma mensagem ainda. Comece a conversa.</p>';
    }
  }
}

function chatMessageServerPath(channelId, id) {
  return isDmChannelId(channelId)
    ? `/api/dm/${encodeURIComponent(dmPeerFromChannelId(channelId))}/messages/${encodeURIComponent(id)}`
    : `/api/messages/${encodeURIComponent(channelId)}/${encodeURIComponent(id)}`;
}

function editChatMessage(channelId, id, newText) {
  if (!lobbyRoom) return;
  const isDm = isDmChannelId(channelId);
  const payload = isDm
    ? { type: 'message-edited', dm: true, to: dmPeerFromChannelId(channelId), from: myIdentity, id, text: newText }
    : { type: 'message-edited', channelId, from: myIdentity, id, text: newText };
  // edição de DM também só vai pro destinatário — mesma razão do envio
  const options = isDm
    ? { reliable: true, destinationIdentities: [dmPeerFromChannelId(channelId)] }
    : { reliable: true };
  lobbyRoom.localParticipant.publishData(chatEncoder.encode(JSON.stringify(payload)), options);
  applyMessageEdited(channelId, id, newText);
  apiFetch(chatMessageServerPath(channelId, id), { method: 'PATCH', body: JSON.stringify({ text: newText }) }).catch((err) => {
    console.warn('Não consegui salvar a edição da mensagem no servidor:', err);
  });
}

function deleteChatMessage(channelId, id) {
  if (!lobbyRoom) return;
  const isDm = isDmChannelId(channelId);
  const payload = isDm
    ? { type: 'message-deleted', dm: true, to: dmPeerFromChannelId(channelId), from: myIdentity, id }
    : { type: 'message-deleted', channelId, from: myIdentity, id };
  const options = isDm
    ? { reliable: true, destinationIdentities: [dmPeerFromChannelId(channelId)] }
    : { reliable: true };
  lobbyRoom.localParticipant.publishData(chatEncoder.encode(JSON.stringify(payload)), options);
  applyMessageDeleted(channelId, id);
  apiFetch(chatMessageServerPath(channelId, id), { method: 'DELETE' }).catch((err) => {
    console.warn('Não consegui apagar a mensagem no servidor:', err);
  });
}

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

// Manda um arquivo pro chat ativo (usado pelo clipezinho, por arrastar
// arquivo pra dentro da conversa, e por colar print/imagem copiada — os
// 3 caminhos terminam todos aqui, pra não duplicar a lógica de novo).
async function sendChatFile(file) {
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
    const id = crypto.randomUUID();
    if (isDmChannelId(activeTextChannelId)) {
      const to = dmPeerFromChannelId(activeTextChannelId);
      const payload = { type: 'dm', to, from: myIdentity, name: myDisplayName || myName, text, ts, attachment, id };
      lobbyRoom.localParticipant.publishData(chatEncoder.encode(JSON.stringify(payload)), {
        reliable: true,
        destinationIdentities: [to],
      });
      pushChatMessage(activeTextChannelId, { id, name: myDisplayName || myName, text, ts, isSelf: true, identity: myIdentity, attachment });
      persistChatMessage(activeTextChannelId, { id, text, attachment });
      return;
    }
    const payload = { type: 'chat', channelId: activeTextChannelId, name: myDisplayName || myName, text, ts, attachment, id };
    lobbyRoom.localParticipant.publishData(chatEncoder.encode(JSON.stringify(payload)), { reliable: true });
    pushChatMessage(activeTextChannelId, { id, name: myDisplayName || myName, text, ts, isSelf: true, identity: myIdentity, attachment });
    persistChatMessage(activeTextChannelId, { id, text, attachment });
  } catch (err) {
    alert(err.message || 'Não consegui enviar o arquivo.');
  } finally {
    chatAttachmentBtn.disabled = false;
  }
}

chatAttachmentBtn.addEventListener('click', () => {
  if (!lobbyRoom || !activeTextChannelId) return;
  chatAttachmentInput.click();
});

chatAttachmentInput.addEventListener('change', () => {
  const file = chatAttachmentInput.files[0];
  chatAttachmentInput.value = '';
  sendChatFile(file);
});

// Arrastar um arquivo (da área de trabalho, do explorador, de outra janela)
// e soltar em cima da conversa manda ele igual clicar no clipezinho.
let chatDragCounter = 0;
textView.addEventListener('dragenter', (e) => {
  if (!lobbyRoom || !activeTextChannelId) return;
  e.preventDefault();
  chatDragCounter += 1;
  textView.classList.add('drag-over');
});
textView.addEventListener('dragover', (e) => {
  if (!lobbyRoom || !activeTextChannelId) return;
  e.preventDefault();
});
textView.addEventListener('dragleave', () => {
  chatDragCounter = Math.max(0, chatDragCounter - 1);
  if (chatDragCounter === 0) textView.classList.remove('drag-over');
});
textView.addEventListener('drop', (e) => {
  e.preventDefault();
  chatDragCounter = 0;
  textView.classList.remove('drag-over');
  if (!lobbyRoom || !activeTextChannelId) return;
  const files = Array.from(e.dataTransfer?.files || []);
  // manda um de cada vez (cada arquivo vira uma mensagem própria, igual
  // já era quando escolhia um arquivo por vez pelo clipezinho)
  files.reduce((chain, file) => chain.then(() => sendChatFile(file)), Promise.resolve());
});

// Colar (Ctrl+V) uma imagem copiada — print de tela (Win+Shift+S, PrtScn) ou
// uma imagem copiada de qualquer lugar — manda ela igual um anexo. Só entra
// nesse caminho se realmente tiver uma IMAGEM na área de transferência; colar
// texto normal continua funcionando que nem sempre funcionou, sem mudar nada.
chatInput.addEventListener('paste', (e) => {
  if (!lobbyRoom || !activeTextChannelId) return;
  const items = Array.from(e.clipboardData?.items || []);
  const imageItem = items.find((item) => item.kind === 'file' && item.type.startsWith('image/'));
  if (!imageItem) return; // sem imagem colada -> deixa o colar de texto normal acontecer
  e.preventDefault();
  const file = imageItem.getAsFile();
  if (file) sendChatFile(file);
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

// Compartilhamento de tela de OUTRA pessoa não abre sozinho pra quem tá na
// sala — fica só um botão "Assistir transmissão" no meio da telinha até a
// pessoa clicar (igual pedido, pra não abrir do nada no meio de uma call).
// screenShareTracks guarda o track de vídeo de cada identidade que tá
// compartilhando (pra poder desenhar quando clicar em assistir);
// screenSharePublications guarda a publicação (pra poder pausar/retomar de
// verdade o recebimento, não só esconder); screenShareAudioTracks guarda o
// áudio do compartilhamento (se tiver), que também só deve tocar depois que
// a pessoa clicar em assistir; watchingScreenShare guarda quem JÁ clicou em
// assistir agora; manualScreenUnsubscribe marca "fui EU que mandei parar de
// receber esse track" pra distinguir de "o apresentador parou de compartilhar
// de verdade" no TrackUnsubscribed.
const screenShareTracks = new Map();
const screenSharePublications = new Map();
const screenShareAudioTracks = new Map();
const watchingScreenShare = new Set();
const manualScreenUnsubscribe = new Set();

function isMyIdentity(identity) {
  return !!(voiceRoom && voiceRoom.localParticipant && voiceRoom.localParticipant.identity === identity);
}

// Avisa todo mundo (canal de dados, igual voice-status/profile-update) quais
// apresentador(es) eu estou assistindo agora — manda a LISTA de identities
// (não só um bit sim/não), porque o olho só pode aparecer pra quem está
// apresentando, e só sobre quem está assistindo A ELE especificamente (ver
// setVoiceMemberStatus mais abaixo, no handler do 'watch-status').
function broadcastWatchStatus() {
  if (!lobbyRoom) return;
  const payload = { type: 'watch-status', identity: myIdentity, watching: Array.from(watchingScreenShare) };
  lobbyRoom.localParticipant.publishData(chatEncoder.encode(JSON.stringify(payload)), { reliable: true });
}

// Não mostra o olho em mim mesmo (quem tá assistindo já sabe que tá
// assistindo) — o olho só deve aparecer pra quem está TRANSMITINDO, do lado
// do nome de quem está assistindo A TRANSMISSÃO DELE.
function updateMyWatchingStatus() {
  broadcastWatchStatus();
}

function showWatchStreamPrompt(tile, participant) {
  if (tile.querySelector('.watch-stream-prompt')) return;
  tile.classList.add('screen-pending');
  const prompt = document.createElement('div');
  prompt.className = 'watch-stream-prompt';
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'watch-stream-btn';
  btn.innerHTML =
    '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M8 5v14l11-7z"></path></svg>Assistir transmissão';
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    watchingScreenShare.add(participant.identity);
    updateMyWatchingStatus();
    const pub = screenSharePublications.get(participant.identity);
    if (pub && !pub.isSubscribed) {
      // tinha sido pausado (X) antes — pede pra receber de novo; o
      // TrackSubscribed que isso dispara é quem vai chamar attachTrack.
      pub.setSubscribed(true);
      return;
    }
    const track = screenShareTracks.get(participant.identity);
    if (track) attachTrack(track, participant, pub);
    const audioTrack = screenShareAudioTracks.get(participant.identity);
    if (audioTrack) attachTrack(audioTrack, participant);
  });
  prompt.appendChild(btn);
  tile.appendChild(prompt);
}

const SCREEN_FULLSCREEN_ICON_SVG =
  '<svg class="icon-maximize" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3"></path><path d="M21 8V5a2 2 0 0 0-2-2h-3"></path><path d="M3 16v3a2 2 0 0 0 2 2h3"></path><path d="M16 21h3a2 2 0 0 0 2-2v-3"></path></svg>' +
  '<svg class="icon-minimize" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3"></path><path d="M21 8h-3a2 2 0 0 1-2-2V3"></path><path d="M3 16h3a2 2 0 0 1 2 2v3"></path><path d="M16 21v-3a2 2 0 0 1 2-2h3"></path></svg>';

// Volume DA TRANSMISSÃO (áudio do compartilhamento de tela: jogo/vídeo/som
// do desktop de quem tá transmitindo) — SEPARADO do volume da voz/microfone
// dela (ver streamVolumes/applyStreamVolume/registerStreamAudioEl), pra dar
// pra abaixar só o som do jogo sem cortar a pessoa falando. Direto na
// telinha porque só clicar em "Assistir transmissão" já pode tocar um som
// alto (tiro de jogo etc.) sem aviso, e o usuário pode querer abaixar na
// hora, sem precisar achar o nome da pessoa na lista.
const VOLUME_ICON_SVG =
  '<svg class="icon-vol-on" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path></svg>';
const VOLUME_MUTED_ICON_SVG =
  '<svg class="icon-vol-off" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>';

// Único lugar que de fato muda o volume DA TRANSMISSÃO de alguém pra mim —
// usado só pelo slider da telinha (o do menu de contexto mexe na voz/
// microfone dela, ver participantVolumes/setParticipantVolumeForMe acima).
function setStreamVolumeForMe(identity, v) {
  streamVolumes.set(identity, v);
  applyStreamVolume(identity); // já chama syncScreenVolumeBtnIcon
}

// Abre o popover com o slider de volume DA TRANSMISSÃO -- usado tanto pelo
// botãozinho de volume da telinha quanto pelo botão de volume da barra
// flutuante do modo cinema (ver cinemaVolumeBtn mais abaixo), pra não
// duplicar a mesma lógica nos dois lugares.
function openStreamVolumePopover(anchorBtn, identity) {
  if (contextMenuEl && contextMenuEl.classList.contains('screen-volume-popover')) {
    closeContextMenu();
    return;
  }
  closeContextMenu();
  const popover = document.createElement('div');
  popover.className = 'screen-volume-popover';
  const slider = document.createElement('input');
  slider.type = 'range';
  slider.min = '0';
  slider.max = '100';
  slider.value = String(Math.round((streamVolumes.get(identity) ?? 1) * 100));
  slider.addEventListener('input', () => {
    setStreamVolumeForMe(identity, Number(slider.value) / 100);
  });
  popover.addEventListener('click', (ev) => ev.stopPropagation());
  popover.appendChild(slider);
  document.body.appendChild(popover);
  const rect = anchorBtn.getBoundingClientRect();
  popover.style.left = `${rect.left + rect.width / 2}px`;
  popover.style.top = `${rect.top - 10}px`;
  contextMenuEl = popover;
}

function addScreenShareControls(tile, participant) {
  tile.classList.add('has-screen-controls');
  if (tile.querySelector('.screen-share-controls')) return;
  const bar = document.createElement('div');
  bar.className = 'screen-share-controls';

  const volumeBtn = document.createElement('button');
  volumeBtn.type = 'button';
  volumeBtn.className = 'screen-share-ctrl-btn screen-volume-btn';
  volumeBtn.dataset.identity = participant.identity;
  volumeBtn.title = 'Volume da transmissão';
  volumeBtn.innerHTML = VOLUME_ICON_SVG + VOLUME_MUTED_ICON_SVG;
  volumeBtn.classList.toggle('is-muted', (streamVolumes.get(participant.identity) ?? 1) === 0 || mutedForMe.has(participant.identity) || isDeafened);
  volumeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    openStreamVolumePopover(volumeBtn, participant.identity);
  });

  const fullscreenBtn = document.createElement('button');
  fullscreenBtn.type = 'button';
  fullscreenBtn.className = 'screen-share-ctrl-btn screen-share-fullscreen-btn';
  fullscreenBtn.title = 'Tela cheia';
  fullscreenBtn.innerHTML = SCREEN_FULLSCREEN_ICON_SVG;
  fullscreenBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (cinemaTileIdentity === participant.identity) {
      exitCinemaFullscreen();
    } else {
      enterCinemaFullscreen(tile, participant);
    }
  });

  bar.appendChild(volumeBtn);
  bar.appendChild(fullscreenBtn);
  tile.appendChild(bar);
}

// Clicou no X: fecha E pausa de verdade — não só esconde o vídeo, também
// manda o LiveKit parar de receber os tracks (setSubscribed(false)), então
// para de gastar internet/CPU decodificando uma transmissão que ninguém tá
// vendo, e nenhum áudio dela continua tocando escondido. Não mexe em nada de
// quem está compartilhando (ele nem fica sabendo).
function stopWatchingScreenShare(participant) {
  watchingScreenShare.delete(participant.identity);
  updateMyWatchingStatus();
  const tile = document.getElementById(tileId(participant.identity));
  if (cinemaTileIdentity === participant.identity) exitCinemaFullscreen();
  updateFloatingBarVisibility();
  if (!tile) return;
  const track = screenShareTracks.get(participant.identity);
  if (track) detachTrackFromTile(track, tile, participant.identity);
  const audioTrack = screenShareAudioTracks.get(participant.identity);
  if (audioTrack) detachTrackFromTile(audioTrack, tile, participant.identity);
  tile.querySelector('.screen-share-controls')?.remove();
  tile.classList.remove('has-screen-controls');
  const pub = screenSharePublications.get(participant.identity);
  if (pub && pub.isSubscribed) {
    manualScreenUnsubscribe.add(participant.identity);
    pub.setSubscribed(false);
  }
  if (track && screenShareTracks.has(participant.identity)) {
    showWatchStreamPrompt(tile, participant);
  }
}

function attachTrack(track, participant, publication) {
  const tile = ensureTile(participant);
  const isScreenShare = track.kind === 'video' && track.source === Track.Source.ScreenShare;
  const isRemoteScreenShare = isScreenShare && !isMyIdentity(participant.identity);
  const isScreenShareAudio = track.kind === 'audio' && track.source === Track.Source.ScreenShareAudio;
  const isRemoteScreenShareAudio = isScreenShareAudio && !isMyIdentity(participant.identity);

  if (isRemoteScreenShare) {
    screenShareTracks.set(participant.identity, track);
    if (publication) screenSharePublications.set(participant.identity, publication);
    if (!watchingScreenShare.has(participant.identity)) {
      showWatchStreamPrompt(tile, participant);
      return;
    }
  }

  // Áudio do compartilhamento de tela (quando a pessoa compartilha com "som
  // do computador"): não pode tocar escondido enquanto ninguém clicou em
  // "Assistir transmissão" — some junto com o vídeo até lá.
  if (isRemoteScreenShareAudio) {
    screenShareAudioTracks.set(participant.identity, track);
    if (!watchingScreenShare.has(participant.identity)) return;
  }

  const el = track.attach();
  if (track.kind === 'video') {
    el.classList.add('video-el');
    // compartilhamento de tela nunca pode cortar as pontas (a pessoa
    // assistindo precisa ver a tela inteira) — câmera pode continuar
    // preenchendo o quadro todo (cover), que fica melhor pra rosto
    if (isScreenShare) el.classList.add('screen-video');
    const old = tile.querySelector('video');
    if (old) old.remove();
    tile.appendChild(el);
    tile.classList.add('has-video');
    applyVideoVisibility(participant.identity);
    if (isRemoteScreenShare) {
      tile.querySelector('.watch-stream-prompt')?.remove();
      tile.classList.remove('screen-pending');
      addScreenShareControls(tile, participant);
    }
  } else {
    el.classList.add('audio-el');
    tile.appendChild(el);
    // Efeito sonoro (soundboard) de alguém: não é a voz da pessoa (não usa
    // o volume por-pessoa nem entra na contagem de "quem tá falando"), tem
    // volume próprio — ver soundboardEffectsVolume/applySoundboardVolume.
    if (!isMyIdentity(participant.identity) && track.source === Track.Source.Unknown) {
      el.dataset.soundboardIdentity = participant.identity;
      soundboardAudioEls.add(el);
      const blocked = isDeafened || mutedForMe.has(participant.identity);
      el.volume = blocked ? 0 : effectiveSoundboardVolume();
    } else if (isRemoteScreenShareAudio) {
      // som do jogo/desktop de quem compartilha tela: volume PRÓPRIO,
      // separado da voz dela (ver streamVolumes/registerStreamAudioEl)
      registerStreamAudioEl(participant.identity, el);
    } else {
      registerAudioEl(participant.identity, el);
    }
  }
}

function detachTrackFromTile(track, tile, identity) {
  const detached = track.detach();
  detached.forEach((el) => {
    soundboardAudioEls.delete(el);
    if (identity) {
      unregisterAudioEl(identity, el);
      unregisterStreamAudioEl(identity, el);
    }
    el.remove();
  });
  if (tile && track.kind === 'video' && !tile.querySelector('video')) {
    tile.classList.remove('has-video');
  }
}

function detachTrack(track, participant) {
  const tile = participant ? document.getElementById(tileId(participant.identity)) : null;
  // parou de compartilhar (ou saiu do canal) antes de alguém clicar em
  // "assistir" — limpa o estado de pendência e tira o botão da tela
  if (
    participant &&
    (screenShareTracks.get(participant.identity) === track || screenShareAudioTracks.get(participant.identity) === track)
  ) {
    if (cinemaTileIdentity === participant.identity) exitCinemaFullscreen();
    screenShareTracks.delete(participant.identity);
    screenSharePublications.delete(participant.identity);
    screenShareAudioTracks.delete(participant.identity);
    watchingScreenShare.delete(participant.identity);
    updateMyWatchingStatus();
    if (tile) {
      tile.querySelector('.watch-stream-prompt')?.remove();
      tile.querySelector('.screen-share-controls')?.remove();
      tile.classList.remove('screen-pending', 'has-screen-controls');
    }
  }
  detachTrackFromTile(track, tile, participant?.identity);
}

function removeTile(participant) {
  const tile = document.getElementById(tileId(participant.identity));
  if (tile && tile.classList.contains('expanded')) {
    grid.classList.remove('has-expanded');
    exitExpandedExtras();
  }
  if (cinemaTileIdentity === participant.identity) exitCinemaFullscreen();
  updateFloatingBarVisibility();
  screenShareTracks.delete(participant.identity);
  screenSharePublications.delete(participant.identity);
  screenShareAudioTracks.delete(participant.identity);
  watchingScreenShare.delete(participant.identity);
  if (tile) tile.remove();
}

// Ao expandir um vídeo (tela cheia dentro do app): a lista de membros da
// direita esconde sozinha (o vídeo ganha aquele espaço). Ao sair, volta tudo
// exatamente como estava antes.
let memberListStateBeforeExpand = null;
let sidebarStateBeforeExpand = null;

function enterExpandedExtras() {
  memberListStateBeforeExpand = memberListCollapsedState;
  sidebarStateBeforeExpand = sidebarCollapsed;
  if (!memberListCollapsedState) setMemberListCollapsed(true);
}

function exitExpandedExtras() {
  if (memberListStateBeforeExpand === false) setMemberListCollapsed(false);
  if (sidebarStateBeforeExpand !== null && sidebarStateBeforeExpand !== sidebarCollapsed) {
    setSidebarCollapsed(sidebarStateBeforeExpand);
  }
  memberListStateBeforeExpand = null;
  sidebarStateBeforeExpand = null;
}

function collapseExpandedTile() {
  const wasExpanded = grid.classList.contains('has-expanded');
  grid.querySelectorAll('.tile.expanded').forEach((t) => t.classList.remove('expanded'));
  grid.classList.remove('has-expanded');
  if (wasExpanded) exitExpandedExtras();
  if (cinemaTileIdentity) exitCinemaFullscreen();
  updateFloatingBarVisibility();
}

// ---------- tela cheia de verdade pra compartilhamento de tela ----------
// O botão de "tela cheia" da transmissão não usa mais a Fullscreen API do
// próprio elemento <video> — o Chromium mostra um aviso/ícone próprio de
// "aperte Esc pra sair" por cima do vídeo quando é usado assim (era o que
// tava aparecendo do lado de "JOGANDO"), e some sozinho igual um popup, sem
// dar pra tirar. Em vez disso, deixamos a JANELA DO APP inteira em tela
// cheia de verdade (sem esse aviso do navegador) e escondemos toda a
// interface (barra lateral, lista de membros, barra de título), sobrando só
// a transmissão — igual apertar F11 num player de vídeo.
let cinemaTileIdentity = null;

function updateFullscreenBtnIcon(tile, isFullscreen) {
  tile.querySelector('.screen-share-fullscreen-btn')?.classList.toggle('is-fullscreen', isFullscreen);
}

// A barra flutuante nova (câmera/volume/parar de assistir/mic/desligar)
// agora aparece SEMPRE que a telinha expandida é de uma transmissão de
// tela — não só no modo cinema de verdade (tela cheia da janela). Essa
// função central decide isso: olha qual telinha tá expandida agora e se
// ela é uma transmissão que a pessoa está assistindo; chamada toda vez que
// esse estado pode ter mudado (expandir/recolher telinha, trocar de vídeo
// expandido, parar de assistir, entrar/sair do modo cinema de verdade,
// participante sair da sala).
function updateFloatingBarVisibility() {
  const expandedTile = grid.querySelector('.tile.expanded');
  const identity = expandedTile && watchingScreenShare.has(expandedTile.dataset.identity) ? expandedTile.dataset.identity : null;
  if (identity) {
    cinemaControlsBar.hidden = false;
    cinemaVolumeBtn.dataset.identity = identity;
    syncScreenVolumeBtnIcon(identity);
    // fora do modo cinema de verdade a barra fica sempre visível (a tela
    // não tá toda tomada pelo vídeo, então não atrapalha) -- o esquema de
    // sumir sozinha depois de alguns segundos parado (showCinemaControlsBriefly)
    // só faz sentido de verdade em cinema-mode, com o vídeo ocupando tudo
    if (!cinemaTileIdentity) cinemaControlsBar.classList.add('visible');
  } else {
    cinemaControlsBar.hidden = true;
    cinemaControlsBar.classList.remove('visible');
  }
}

function enterCinemaFullscreen(tile, participant) {
  if (cinemaTileIdentity && cinemaTileIdentity !== participant.identity) {
    const oldTile = document.getElementById(tileId(cinemaTileIdentity));
    if (oldTile) updateFullscreenBtnIcon(oldTile, false);
  }
  if (!tile.classList.contains('expanded')) {
    const gridWasExpanded = grid.classList.contains('has-expanded');
    grid.querySelectorAll('.tile.expanded').forEach((t) => t.classList.remove('expanded'));
    tile.classList.add('expanded');
    grid.classList.add('has-expanded');
    if (!gridWasExpanded) enterExpandedExtras();
  }
  cinemaTileIdentity = participant.identity;
  document.body.classList.add('cinema-mode');
  window.vortex.setWindowFullscreen?.(true).catch(() => {});
  updateFullscreenBtnIcon(tile, true);
  updateFloatingBarVisibility();
  showCinemaControlsBriefly();
}

function exitCinemaFullscreen() {
  const identity = cinemaTileIdentity;
  cinemaTileIdentity = null;
  document.body.classList.remove('cinema-mode');
  window.vortex.setWindowFullscreen?.(false).catch(() => {});
  clearTimeout(cinemaControlsHideTimer);
  if (identity) {
    const tile = document.getElementById(tileId(identity));
    if (tile) {
      updateFullscreenBtnIcon(tile, false);
      tile.classList.remove('force-controls');
    }
  }
  // a telinha continua expandida mesmo saindo do modo cinema de verdade
  // (só deixa de ser tela cheia da janela) -- se ela ainda for uma
  // transmissão, a barra flutuante continua aparecendo, só que sempre
  // visível em vez do esquema de sumir sozinha
  updateFloatingBarVisibility();
}

// Em cinema-mode o vídeo ocupa a janela inteira, então ":hover" sozinho não
// resolve (o mouse sempre está "em cima" do vídeo) — precisa ser tipo um
// player de vídeo: mexeu o mouse, mostra os botões de novo por alguns
// segundos, parou de mexer, esconde. Fora do cinema-mode (telinha grande só
// dentro da grade, com o resto da interface do lado) isso não é necessário,
// porque ali dá pra mesmo tirar o mouse de cima de verdade.
let cinemaControlsHideTimer = null;
function showCinemaControlsBriefly() {
  if (!cinemaTileIdentity) return;
  const tile = document.getElementById(tileId(cinemaTileIdentity));
  if (!tile) return;
  tile.classList.add('force-controls');
  cinemaControlsBar.classList.add('visible');
  clearTimeout(cinemaControlsHideTimer);
  cinemaControlsHideTimer = setTimeout(() => {
    tile.classList.remove('force-controls');
    cinemaControlsBar.classList.remove('visible');
  }, 2500);
}
document.addEventListener('mousemove', () => {
  if (cinemaTileIdentity) showCinemaControlsBriefly();
});

// Se a pessoa sair da tela cheia pelo próprio Windows (ex: apertando F11 ou
// o atalho do SO), o main process avisa aqui pra desfazer o "cinema-mode"
// (senão a interface continuaria escondida com a janela já não-fullscreen).
window.vortex.onWindowFullscreenChanged?.((isFullscreen) => {
  if (!isFullscreen && cinemaTileIdentity) exitCinemaFullscreen();
});

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
    if (cinemaTileIdentity === tile.dataset.identity) exitCinemaFullscreen();
  } else {
    tile.classList.add('expanded');
    grid.classList.add('has-expanded');
    // só dispara a troca de layout (esconder lista/mostrar botão) ao ENTRAR
    // em tela cheia — trocar de vídeo expandido pra outro não deve mexer
    // nas barras de novo
    if (!gridWasExpanded) enterExpandedExtras();
    // trocou pra outro vídeo enquanto a janela já tava em cinema mode —
    // mantém o modo, só troca o ícone de tela cheia de dono
    if (cinemaTileIdentity && cinemaTileIdentity !== tile.dataset.identity) {
      const oldTile = document.getElementById(tileId(cinemaTileIdentity));
      if (oldTile) updateFullscreenBtnIcon(oldTile, false);
      cinemaTileIdentity = tile.dataset.identity;
      updateFullscreenBtnIcon(tile, true);
    }
  }
  updateFloatingBarVisibility();
});

// Duplo-clique numa telinha de transmissão JÁ expandida entra direto no
// modo cinema de verdade (tela cheia da janela) -- como agora a barra
// antiga (que tinha o botão de "tela cheia") não aparece mais em lugar
// nenhum, precisa de um jeito de chegar lá; um clique só continua servindo
// só pra expandir/recolher dentro da grade, igual sempre foi.
grid.addEventListener('dblclick', (e) => {
  const tile = e.target.closest('.tile');
  if (!tile || !tile.dataset.identity) return;
  if (!watchingScreenShare.has(tile.dataset.identity)) return;
  enterCinemaFullscreen(tile, participantFromRow(tile));
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

// Volume DA VOZ/microfone de alguém pra mim (menu de contexto, botão direito
// no nome) — separado do volume da transmissão de tela dela (ver
// setStreamVolumeForMe/streamVolumes lá em cima, perto de addScreenShareControls).
function setParticipantVolumeForMe(identity, v) {
  participantVolumes.set(identity, v);
  if (v > 0 && mutedForMe.has(identity)) mutedForMe.delete(identity);
  applyVolume(identity);
  applySoundboardVolume();
}

// Mesma ideia do registerAudioEl/applyVolume acima, só que pro áudio da
// TRANSMISSÃO DE TELA (não o microfone) — tem seu próprio volume
// (streamVolumes), mas "Silenciar"/"Ensurdecer" ainda zeram os dois juntos.
function registerStreamAudioEl(identity, el) {
  if (!streamAudioElsByIdentity.has(identity)) streamAudioElsByIdentity.set(identity, new Set());
  streamAudioElsByIdentity.get(identity).add(el);
  applyStreamVolume(identity);
}

function unregisterStreamAudioEl(identity, el) {
  streamAudioElsByIdentity.get(identity)?.delete(el);
}

function applyStreamVolume(identity) {
  const volume = mutedForMe.has(identity) || isDeafened ? 0 : streamVolumes.get(identity) ?? 1;
  streamAudioElsByIdentity.get(identity)?.forEach((el) => {
    el.volume = volume;
  });
  syncScreenVolumeBtnIcon(identity);
}

// Ícone do botão de volume na telinha da transmissão reflete o volume DA
// TRANSMISSÃO especificamente (não o do microfone) — mudo se o slider da
// transmissão tá em 0, se a pessoa foi silenciada, ou se eu tô ensurdecido.
function syncScreenVolumeBtnIcon(identity) {
  const effectivelyMuted = (streamVolumes.get(identity) ?? 1) === 0 || mutedForMe.has(identity) || isDeafened;
  document.querySelectorAll(`.screen-volume-btn[data-identity="${cssEscape(identity)}"]`).forEach((btn) => {
    btn.classList.toggle('is-muted', effectivelyMuted);
  });
}

function resetAudioState() {
  audioElsByIdentity.clear();
  participantVolumes.clear();
  streamAudioElsByIdentity.clear();
  streamVolumes.clear();
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
  streamAudioElsByIdentity.forEach((_els, identity) => applyStreamVolume(identity));
  applySoundboardVolume();

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
// "olho" que aparece do lado de quem está assistindo uma transmissão de tela
// agora (igual Discord) — não diz QUAL transmissão, só que a pessoa está
// vendo alguma no momento.
const WATCHING_BADGE_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>';

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

    const watchingBadge = document.createElement('span');
    watchingBadge.className = 'status-badge watching-badge';
    watchingBadge.title = 'Assistindo uma transmissão';
    watchingBadge.innerHTML = WATCHING_BADGE_SVG;
    badges.appendChild(watchingBadge);

    row.appendChild(badges);
    applyStatusBadges(row, ensureVoiceStatus(participant.identity));
  }

  return row;
}

function ensureVoiceStatus(identity) {
  if (!voiceMemberStatus.has(identity)) {
    voiceMemberStatus.set(identity, { muted: false, deafened: false, camera: false, screenShare: false, watching: false });
  }
  return voiceMemberStatus.get(identity);
}

function applyStatusBadges(row, status) {
  const cameraBadge = row.querySelector('.status-badge.camera-badge');
  const liveBadge = row.querySelector('.status-badge.live-badge');
  const micBadge = row.querySelector('.status-badge.mic-badge');
  const deafenBadge = row.querySelector('.status-badge.deafen-badge');
  const watchingBadge = row.querySelector('.status-badge.watching-badge');
  if (cameraBadge) cameraBadge.classList.toggle('badge-on', !!status.camera);
  if (liveBadge) liveBadge.classList.toggle('badge-on', !!status.screenShare);
  if (micBadge) micBadge.classList.toggle('badge-on', !!status.muted);
  if (deafenBadge) deafenBadge.classList.toggle('badge-on', !!status.deafened);
  if (watchingBadge) watchingBadge.classList.toggle('badge-on', !!status.watching);
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
      // A seção "Offline" junta gente de qualquer cargo (não é dividida por
      // cargo como as de cima), então o "color" dela é sempre null — mas
      // isso não pode apagar a cor do NOME de cada um, que segue sendo a do
      // próprio cargo da pessoa (igual Discord: offline fica com a lista
      // toda meio apagada, mas o nome mantém a cor do cargo).
      const rowColor = opts.offline ? topRoleColorFor(identity) : color;
      const row = opts.offline
        ? buildOfflineMemberRow(identity, { roleColor: rowColor })
        : buildMemberRow({ identity, name: displayNameFor(identity) }, { roleColor: rowColor });
      section.appendChild(row);
    });

    memberSidebarGroups.appendChild(section);
  };

  roleGroups.forEach(({ role, identities }) => addSection(role.name, role.color, identities));
  addSection('Online', null, onlineNoRole);
  addSection('Offline', null, offline, { offline: true });
}

// Detecta se EU estou falando direto do áudio do microfone (Web Audio API,
// via o próprio helper que o LiveKit já expõe), sem esperar o aviso do
// servidor — era exatamente essa espera (o "ActiveSpeakersChanged" só chega
// de tempos em tempos, não é instantâneo) que fazia o aninhado verde demorar
// pra acender depois que a pessoa já tinha começado a falar. Só se aplica a
// mim mesmo: pra quem está do outro lado, continua vindo do servidor (não
// dá pra saber se alguém remoto está falando sem passar pela rede).
let localSpeakingAnalyser = null;
let localSpeakingLoopId = null;
let localSpeakingActive = false;
let localSpeakingHangoverAt = 0;
const SPEAKING_VOLUME_THRESHOLD = 0.02;
const SPEAKING_HANGOVER_MS = 300; // segura o "falando" um pouquinho a mais pra não piscar entre palavras
const SPEAKING_POLL_MS = 100; // não usa requestAnimationFrame de propósito: isso pausa/fica bem lento com a janela minimizada ou sem foco, e a pessoa pode continuar numa chamada de voz com o PrimalVoice em segundo plano

function stopLocalSpeakingDetection() {
  if (localSpeakingLoopId) {
    clearInterval(localSpeakingLoopId);
    localSpeakingLoopId = null;
  }
  if (localSpeakingAnalyser) {
    localSpeakingAnalyser.cleanup().catch(() => {});
    localSpeakingAnalyser = null;
  }
  localSpeakingActive = false;
}

function startLocalSpeakingDetection(track) {
  stopLocalSpeakingDetection();
  if (!track || typeof createAudioAnalyser !== 'function') return;
  try {
    // minDecibels/maxDecibels bem mais abertos que o padrão do helper (que é
    // -100/-80, uma faixa de só 20dB — satura rápido demais e detecta até
    // ruído bem fraco como "falando"). -100/-30 é a faixa normal usada em
    // medidor de nível de voz, dá uma resposta muito mais fiel a fala real.
    localSpeakingAnalyser = createAudioAnalyser(track, {
      fftSize: 512,
      smoothingTimeConstant: 0.2,
      minDecibels: -100,
      maxDecibels: -30,
    });
  } catch {
    localSpeakingAnalyser = null;
    return;
  }
  const loop = () => {
    if (!localSpeakingAnalyser) return;
    const volume = localSpeakingAnalyser.calculateVolume();
    const now = Date.now();
    if (volume > SPEAKING_VOLUME_THRESHOLD) {
      localSpeakingHangoverAt = now + SPEAKING_HANGOVER_MS;
      if (!localSpeakingActive) {
        localSpeakingActive = true;
        setSpeaking(myIdentity, true);
        amISpeaking = true;
        updateVoiceOverlay();
      }
    } else if (localSpeakingActive && now > localSpeakingHangoverAt) {
      localSpeakingActive = false;
      setSpeaking(myIdentity, false);
      amISpeaking = false;
      updateVoiceOverlay();
    }
  };
  localSpeakingLoopId = setInterval(loop, SPEAKING_POLL_MS);
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

// ---------- efeitos sonoros (soundboard) ----------
const SOUNDBOARD_ICON_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>';

// Ícone de fone/volume dos efeitos (aparece no canto de cima do painel,
// igual a cornetinha do Discord) — clica pra mutar, arrasta a barrinha do
// lado pra ajustar. Três "estados" de ícone (mudo / baixo / alto).
const SOUND_VOLUME_ICON_ON_SVG =
  '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M11 5L6 9H2v6h4l5 4V5z"></path><path d="M15.54 8.46a5 5 0 0 1 0 7.07" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path></svg>';
const SOUND_VOLUME_ICON_OFF_SVG =
  '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M11 5L6 9H2v6h4l5 4V5z"></path><line x1="23" y1="9" x2="17" y2="15" stroke="currentColor" stroke-width="2" stroke-linecap="round"></line><line x1="17" y1="9" x2="23" y2="15" stroke="currentColor" stroke-width="2" stroke-linecap="round"></line></svg>';

function buildSoundboardTile(sound, opts = {}) {
  const tile = document.createElement('button');
  tile.type = 'button';
  tile.className = 'soundboard-tile';
  tile.title = sound.name;
  // um mesmo som pode aparecer em MAIS de um cartãozinho ao mesmo tempo
  // (em "Utilizados com frequência" e também na seção de origem dele) — esse
  // id é o que deixa achar TODOS eles de uma vez pra acender/apagar o
  // contorno verde de "tocando agora" nos dois ao mesmo tempo
  tile.dataset.soundId = sound.id;

  const icon = document.createElement('span');
  icon.innerHTML = SOUNDBOARD_ICON_SVG;
  tile.appendChild(icon);

  const name = document.createElement('span');
  name.className = 'soundboard-tile-name';
  name.textContent = sound.name;
  tile.appendChild(name);

  if (!sound.builtin) {
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'soundboard-tile-remove';
    removeBtn.title = 'Remover';
    removeBtn.textContent = '✕';
    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      mySounds = mySounds.filter((s) => s.id !== sound.id);
      saveSoundboardToConfig().catch(() => {});
      if (opts.onChange) opts.onChange();
    });
    tile.appendChild(removeBtn);
  }

  tile.addEventListener('click', () => playSoundboardClip(sound));
  return tile;
}

// Refaz só a listinha de sons (busca, "utilizados com frequência", meus
// efeitos, sons padrão) sem reconstruir o painel inteiro — assim dá pra
// digitar na busca sem perder o foco do campo a cada tecla.
function renderSoundboardLists(container, searchText) {
  container.innerHTML = '';
  const query = (searchText || '').trim().toLowerCase();
  const filteredMine = query ? mySounds.filter((s) => s.name.toLowerCase().includes(query)) : mySounds;
  const filteredBuiltin = query
    ? BUILTIN_SOUNDBOARD_SOUNDS.filter((s) => s.name.toLowerCase().includes(query))
    : BUILTIN_SOUNDBOARD_SOUNDS;

  const rerender = () => renderSoundboardLists(container, searchTextGetterCurrent());

  if (!query) {
    const frequent = mySounds
      .concat(BUILTIN_SOUNDBOARD_SOUNDS)
      .filter((s) => (s.useCount || 0) > 0)
      .sort((a, b) => (b.useCount || 0) - (a.useCount || 0))
      .slice(0, 6);
    if (frequent.length > 0) {
      const section = document.createElement('div');
      section.className = 'soundboard-section-title';
      section.textContent = 'Utilizados com frequência';
      container.appendChild(section);
      const grid = document.createElement('div');
      grid.className = 'soundboard-grid';
      frequent.forEach((s) => grid.appendChild(buildSoundboardTile(s, { onChange: rerender })));
      container.appendChild(grid);
    }
  }

  const mineTitle = document.createElement('div');
  mineTitle.className = 'soundboard-section-title';
  mineTitle.textContent = 'Meus efeitos';
  container.appendChild(mineTitle);

  const mineGrid = document.createElement('div');
  mineGrid.className = 'soundboard-grid';
  if (filteredMine.length === 0 && mySounds.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'soundboard-empty';
    empty.textContent = 'Você ainda não adicionou nenhum efeito sonoro.';
    mineGrid.appendChild(empty);
  } else if (filteredMine.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'soundboard-empty';
    empty.textContent = 'Nenhum efeito seu com esse nome.';
    mineGrid.appendChild(empty);
  } else {
    filteredMine.forEach((s) => mineGrid.appendChild(buildSoundboardTile(s, { onChange: rerender })));
  }
  if (!query && mySounds.length < MAX_SOUNDS) {
    const addTile = document.createElement('button');
    addTile.type = 'button';
    addTile.className = 'soundboard-tile soundboard-add';
    addTile.innerHTML = '<span style="font-size:20px;line-height:1;">+</span><span class="soundboard-tile-name">Adicionar</span>';
    addTile.addEventListener('click', (e) => {
      e.stopPropagation();
      soundboardFileInput.click();
    });
    mineGrid.appendChild(addTile);
  }
  container.appendChild(mineGrid);

  if (filteredBuiltin.length > 0) {
    const builtinTitle = document.createElement('div');
    builtinTitle.className = 'soundboard-section-title';
    builtinTitle.textContent = 'Sons do PrimalVoice';
    container.appendChild(builtinTitle);
    const builtinGrid = document.createElement('div');
    builtinGrid.className = 'soundboard-grid';
    filteredBuiltin.forEach((s) => builtinGrid.appendChild(buildSoundboardTile(s, { onChange: rerender })));
    container.appendChild(builtinGrid);
  }
}

let searchTextGetterCurrent = () => '';

function openSoundboardPanel() {
  closeContextMenu();
  const panel = document.createElement('div');
  panel.className = 'context-menu soundboard-panel';
  panel.addEventListener('click', (e) => e.stopPropagation());

  const header = document.createElement('div');
  header.className = 'context-menu-header';
  header.textContent = 'Efeitos sonoros';
  panel.appendChild(header);

  const hint = document.createElement('div');
  hint.className = 'soundboard-hint';
  hint.textContent = voiceRoom
    ? 'Clique num efeito pra tocar — todo mundo no canal de voz escuta.'
    : 'Entre num canal de voz pra poder tocar os efeitos.';
  panel.appendChild(hint);

  // Busca + volume/mudo dos efeitos (só afeta o que EU escuto)
  const searchRow = document.createElement('div');
  searchRow.className = 'soundboard-search-row';

  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.className = 'soundboard-search';
  searchInput.placeholder = 'Encontre o som perfeito';
  searchRow.appendChild(searchInput);

  const volumeBtn = document.createElement('button');
  volumeBtn.type = 'button';
  volumeBtn.className = 'soundboard-volume-btn';
  volumeBtn.title = 'Mutar/reativar efeitos sonoros';
  const updateVolumeBtnIcon = () => {
    volumeBtn.innerHTML = soundboardMuted ? SOUND_VOLUME_ICON_OFF_SVG : SOUND_VOLUME_ICON_ON_SVG;
    volumeBtn.classList.toggle('muted', soundboardMuted);
  };
  updateVolumeBtnIcon();
  volumeBtn.addEventListener('click', () => {
    soundboardMuted = !soundboardMuted;
    updateVolumeBtnIcon();
    applySoundboardVolume();
    saveSoundboardToConfig().catch(() => {});
  });
  searchRow.appendChild(volumeBtn);
  panel.appendChild(searchRow);

  const volumeSliderRow = document.createElement('div');
  volumeSliderRow.className = 'soundboard-volume-row';
  const volumeSlider = document.createElement('input');
  volumeSlider.type = 'range';
  volumeSlider.min = '0';
  volumeSlider.max = '100';
  volumeSlider.value = String(Math.round(soundboardEffectsVolume * 100));
  volumeSlider.className = 'soundboard-volume-slider';
  volumeSlider.title = 'Volume dos efeitos sonoros (só o que você escuta)';
  volumeSlider.addEventListener('input', () => {
    soundboardEffectsVolume = Number(volumeSlider.value) / 100;
    if (soundboardMuted && soundboardEffectsVolume > 0) {
      soundboardMuted = false;
      updateVolumeBtnIcon();
    }
    applySoundboardVolume();
  });
  volumeSlider.addEventListener('change', () => saveSoundboardToConfig().catch(() => {}));
  volumeSliderRow.appendChild(volumeSlider);
  panel.appendChild(volumeSliderRow);

  const listContainer = document.createElement('div');
  listContainer.className = 'soundboard-lists';
  panel.appendChild(listContainer);

  searchTextGetterCurrent = () => searchInput.value;
  searchInput.addEventListener('input', () => renderSoundboardLists(listContainer, searchInput.value));
  renderSoundboardLists(listContainer, '');

  document.body.appendChild(panel);
  contextMenuEl = panel;
  searchInput.focus();
  // Abre pra CIMA do botão (não pra baixo, tipo os outros menus) — o botão
  // fica no rodapé da barra lateral, então "abrir pra baixo" sairia da tela.
  const anchorRect = soundboardBtn.getBoundingClientRect();
  const panelRect = panel.getBoundingClientRect();
  let left = anchorRect.left;
  if (left + panelRect.width > window.innerWidth) left = window.innerWidth - panelRect.width - 8;
  let top = anchorRect.top - panelRect.height - 10;
  panel.style.left = `${Math.max(8, left)}px`;
  panel.style.top = `${Math.max(8, top)}px`;
}

async function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

soundboardBtn?.addEventListener('click', (e) => {
  e.stopPropagation();
  openSoundboardPanel();
});

soundboardFileInput.addEventListener('change', async () => {
  const file = soundboardFileInput.files[0];
  soundboardFileInput.value = '';
  if (!file) return;
  if (file.size > MAX_SOUND_BYTES) {
    alert(`Esse áudio é muito grande (máximo ${(MAX_SOUND_BYTES / 1_000_000).toFixed(1)}MB — dá pra usar um trecho bem curtinho).`);
    return;
  }
  try {
    const arrayBuffer = await file.arrayBuffer();
    const probeCtx = new (window.AudioContext || window.webkitAudioContext)();
    let duration;
    try {
      const decoded = await probeCtx.decodeAudioData(arrayBuffer.slice(0));
      duration = decoded.duration;
    } finally {
      probeCtx.close().catch(() => {});
    }
    if (duration > MAX_SOUND_SECONDS) {
      alert(`Esse áudio dura ${duration.toFixed(1)}s — o limite pra efeito sonoro é ${MAX_SOUND_SECONDS}s.`);
      return;
    }
    const dataUrl = await readFileAsDataUrl(file);
    const name = file.name.replace(/\.[^./\\]+$/, '').slice(0, 32) || 'Som';
    mySounds.push({ id: `snd-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, name, dataUrl, useCount: 0 });
    await saveSoundboardToConfig();
    openSoundboardPanel();
  } catch (err) {
    console.warn('Não consegui usar esse arquivo de áudio:', err);
    alert('Não consegui usar esse arquivo — confira se é mesmo um áudio válido.');
  }
});

// AudioContext único reaproveitado entre um efeito e outro (evita criar uma
// pilha de contextos de áudio abertos, o Chromium reclama depois de muitos).
let soundboardAudioCtx = null;

// Toca o efeito no seu PC (você também escuta, no volume que VOCÊ ajustou
// nos efeitos sonoros — não no volume que a pessoa gravou) E manda ele como
// uma faixa de áudio extra pro canal de voz — assim todo mundo que está na
// chamada ouve junto, igual o soundboard de verdade do Discord. Continua
// tocando mesmo que o microfone esteja mudo (é uma faixa separada, não
// depende do mic). O volume que EU escuto é só meu — o que os outros
// recebem sempre sai "normal" (cada um ajusta o próprio volume de escuta,
// exatamente pra evitar que quem manda um efeito estourado obrigue todo
// mundo a ouvir no talo).
// Acende/apaga o contorno verde de "tocando agora" em TODOS os cartõezinhos
// desse som (pode ter mais de um na tela ao mesmo tempo, ver
// buildSoundboardTile acima).
function setSoundboardTilesPlaying(soundId, isPlaying) {
  document.querySelectorAll(`.soundboard-tile[data-sound-id="${cssEscape(soundId)}"]`).forEach((tile) => {
    tile.classList.toggle('playing', isPlaying);
  });
}

async function playSoundboardClip(sound) {
  if (!voiceRoom) {
    alert('Entre em um canal de voz pra poder tocar efeitos sonoros.');
    return;
  }
  try {
    if (!soundboardAudioCtx || soundboardAudioCtx.state === 'closed') {
      soundboardAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    const ctx = soundboardAudioCtx;

    let audioBuffer;
    if (sound.builtin) {
      audioBuffer = await getBuiltinSoundBuffer(ctx, sound);
    } else {
      const resp = await fetch(sound.dataUrl);
      const arrayBuffer = await resp.arrayBuffer();
      audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    }

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;

    // meu preview local — respeita o volume/mudo que eu ajustei
    const localGain = ctx.createGain();
    localGain.gain.value = effectiveSoundboardVolume();
    source.connect(localGain);
    localGain.connect(ctx.destination);
    soundboardLocalGains.add(localGain);

    // todo mundo na chamada ouve (faixa extra publicada só enquanto o
    // efeito está tocando — não usa Track.Source.Microphone de propósito,
    // senão o resto do app ia confundir isso com o seu microfone de verdade
    // nos badges de "mudo"/etc.) — sempre no volume "normal" (1.0), quem
    // escuta é que decide o próprio volume de efeitos, do lado dele.
    const networkGain = ctx.createGain();
    networkGain.gain.value = 1.0;
    source.connect(networkGain);
    const mixDestination = ctx.createMediaStreamDestination();
    networkGain.connect(mixDestination);
    const track = mixDestination.stream.getAudioTracks()[0];
    await voiceRoom.localParticipant.publishTrack(track, {
      name: `soundboard-${sound.id}-${Date.now()}`,
      source: Track.Source.Unknown,
    });

    // conta "utilizado com frequência" — só dos MEUS efeitos (os padrão do
    // PrimalVoice também contam, pra aparecerem ali se forem os mais usados)
    sound.useCount = (sound.useCount || 0) + 1;
    if (!sound.builtin) saveSoundboardToConfig().catch(() => {});

    setSoundboardTilesPlaying(sound.id, true);
    source.start();
    source.onended = async () => {
      setSoundboardTilesPlaying(sound.id, false);
      soundboardLocalGains.delete(localGain);
      try {
        await voiceRoom?.localParticipant.unpublishTrack(track);
      } catch {
        // já pode ter caído junto com a sala
      }
      track.stop();
    };
  } catch (err) {
    console.warn('Não consegui tocar esse efeito sonoro:', err);
    alert('Não consegui tocar esse efeito sonoro.');
  }
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
  tagEl.textContent = identity;
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
  if (isSelf) {
    const actionBtn = document.createElement('button');
    actionBtn.type = 'button';
    actionBtn.className = 'secondary-btn';
    actionBtn.textContent = 'Editar perfil';
    actionBtn.addEventListener('click', () => {
      closeContextMenu();
      openSettingsModal('profile');
    });
    actions.appendChild(actionBtn);
  } else {
    // Igual Discord: dá pra escrever e já mandar a mensagem direto daqui,
    // sem precisar abrir a conversa antes — abre a conversa sozinho quando
    // a mensagem sai, já mostrando o que acabou de ser mandado.
    const quickDmForm = document.createElement('form');
    quickDmForm.className = 'profile-card-quick-dm';
    const quickDmInput = document.createElement('input');
    quickDmInput.type = 'text';
    quickDmInput.maxLength = 500;
    quickDmInput.autocomplete = 'off';
    quickDmInput.placeholder = `Conversar com @${displayNameFor(identity)}`;
    quickDmForm.appendChild(quickDmInput);
    quickDmForm.addEventListener('click', (e) => e.stopPropagation());
    quickDmForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = quickDmInput.value.trim();
      if (!text) return;
      sendDirectMessage(identity, text);
      closeContextMenu();
      switchToDm(identity);
    });
    actions.appendChild(quickDmForm);
  }
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

  // Se o menu foi aberto em cima da transmissão de tela dela (não só a
  // câmera), diferencia os dois volumes -- senão "Volume" sozinho ficaria
  // ambíguo (voz ou transmissão?).
  const volumeWrap = document.createElement('div');
  volumeWrap.className = 'context-menu-volume';
  const volumeLabel = document.createElement('span');
  volumeLabel.className = 'label';
  volumeLabel.textContent = opts.showStreamVolume ? 'Volume (voz)' : 'Volume';
  volumeWrap.appendChild(volumeLabel);
  const volumeSlider = document.createElement('input');
  volumeSlider.type = 'range';
  volumeSlider.min = '0';
  volumeSlider.max = '100';
  volumeSlider.value = String(Math.round((participantVolumes.get(identity) ?? 1) * 100));
  volumeWrap.appendChild(volumeSlider);
  menu.appendChild(volumeWrap);

  if (opts.showStreamVolume) {
    const streamVolumeWrap = document.createElement('div');
    streamVolumeWrap.className = 'context-menu-volume';
    const streamVolumeLabel = document.createElement('span');
    streamVolumeLabel.className = 'label';
    streamVolumeLabel.textContent = 'Volume (transmissão)';
    streamVolumeWrap.appendChild(streamVolumeLabel);
    const streamVolumeSlider = document.createElement('input');
    streamVolumeSlider.type = 'range';
    streamVolumeSlider.min = '0';
    streamVolumeSlider.max = '100';
    streamVolumeSlider.value = String(Math.round((streamVolumes.get(identity) ?? 1) * 100));
    streamVolumeSlider.addEventListener('input', () => {
      setStreamVolumeForMe(identity, Number(streamVolumeSlider.value) / 100);
    });
    streamVolumeWrap.appendChild(streamVolumeSlider);
    menu.appendChild(streamVolumeWrap);
  }

  menu.appendChild(dividerEl());

  const muteItem = buildToggleItem('Silenciar', mutedForMe.has(identity), (checked) => {
    if (checked) mutedForMe.add(identity);
    else mutedForMe.delete(identity);
    // silenciar a pessoa de vez corta tudo dela: voz E o áudio da
    // transmissão de tela que ela estiver compartilhando
    applyVolume(identity);
    applyStreamVolume(identity); // já sincroniza o ícone da telinha
    applySoundboardVolume();
  });
  menu.appendChild(muteItem);

  volumeSlider.addEventListener('input', () => {
    const v = Number(volumeSlider.value) / 100;
    const wasMuted = mutedForMe.has(identity);
    setParticipantVolumeForMe(identity, v);
    if (wasMuted && !mutedForMe.has(identity)) {
      muteItem.querySelector('.context-menu-checkbox').classList.remove('checked');
    }
  });

  const videoItem = buildToggleItem('Desativar vídeo', videoHiddenForMe.has(identity), (checked) => {
    if (checked) videoHiddenForMe.add(identity);
    else videoHiddenForMe.delete(identity);
    applyVideoVisibility(identity);
  });
  menu.appendChild(videoItem);

  // Clicou com botão direito em cima da transmissão de tela dela -- dá pra
  // parar de assistir por aqui também, sem precisar passar o mouse pra ver
  // o X (que só aparece na miniatura pequena ao passar o mouse em cima).
  if (opts.showStreamVolume) {
    menu.appendChild(dividerEl());
    const stopWatchItem = document.createElement('div');
    stopWatchItem.className = 'context-menu-item';
    const stopWatchLabel = document.createElement('span');
    stopWatchLabel.className = 'label';
    stopWatchLabel.textContent = 'Parar de assistir';
    stopWatchItem.appendChild(stopWatchLabel);
    stopWatchItem.addEventListener('click', (e) => {
      e.stopPropagation();
      closeContextMenu();
      stopWatchingScreenShare(participant);
    });
    menu.appendChild(stopWatchItem);
  }

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

// mesma coisa nas mensagens do chat de texto — clicar na foto ou no nome de
// quem mandou abre o cartão de perfil, igual em qualquer outro lugar do app
// (clicar no TEXTO da mensagem não abre nada, só na foto/nome, igual Discord)
chatMessages.addEventListener('click', (e) => {
  const clickable = e.target.closest('.avatar, .author');
  const row = e.target.closest('.chat-message');
  if (!clickable || !row || !row.dataset.identity) return;
  e.stopPropagation();
  openProfileCard(e.clientX, e.clientY, row.dataset.identity);
});

grid.addEventListener('contextmenu', (e) => {
  const tile = e.target.closest('.tile');
  if (!tile || !tile.dataset.identity) return;
  e.preventDefault();
  // se for em cima da transmissão de tela dessa pessoa (não só a câmera
  // dela), o menu ganha também um controle de volume DA TRANSMISSÃO —
  // ver isso em openContextMenu
  const isScreenShareTile = watchingScreenShare.has(tile.dataset.identity);
  openContextMenu(e.clientX, e.clientY, participantFromRow(tile), { allowKick: true, showStreamVolume: isScreenShareTile });
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
  // se a queda foi com a pessoa dentro de um canal de voz (rede caiu, app
  // fechou de repente etc.), avisa o servidor que ela não está mais em
  // canal nenhum — senão o retrato ao vivo (getVoicePresenceSnapshot) fica
  // com um "fantasma" até essa pessoa entrar de novo em algum canal
  apiFetch('/api/voice-presence/leave', { method: 'POST' }).catch(() => {});
  chatHistoryByChannel.clear();
  activeVoiceChannelId = null;
  activeTextChannelId = null;
  joining = false;
  joinSubmitBtn.disabled = false;
  joinMode = 'login';
  applyJoinMode();
  settingsScreen.hidden = true;
  joinScreen.hidden = false;
  roomScreen.hidden = true;
  closeSettingsModal();
}

// Tudo que acontece depois de já ter um token da sala (token do LiveKit +
// identity + sessionToken) — usado tanto no login/cadastro normal quanto na
// reconexão automática (ver attemptAutoResume), que pula a tela de login
// pra quem já entrou antes nesse PC.
async function completeConnect(token, identity, st) {
  sessionToken = st;
  myIdentity = identity;
  myName = identity;

  // Guarda o sessionToken pra próxima vez que o app abrir — é isso que faz
  // a pessoa continuar conectada na conta sem precisar digitar usuário/senha
  // de novo, até clicar em "Sair do PrimalVoice" (que apaga isso daqui).
  try {
    const cfg = (await window.vortex.getConfig()) || {};
    cfg.savedSession = { identity, sessionToken: st };
    await window.vortex.setConfig(cfg);
  } catch {
    // se não conseguir salvar, sem problema — só significa que da próxima
    // vez a pessoa vai precisar entrar de novo manualmente
  }

  lobbyRoom = new Room({ adaptiveStream: true, dynacast: true });

  lobbyRoom.on(RoomEvent.ParticipantConnected, (participant) => {
    addMember(participant);
    renderMemberSidebar();
    broadcastProfile();
    if (activeVoiceChannelId) {
      broadcastVoicePresence('join', activeVoiceChannelId);
      broadcastVoiceStatus();
      broadcastWatchStatus();
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
        id: msg.id,
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
    } else if (msg.type === 'watch-status') {
      // msg.identity é quem mandou o aviso (quem está assistindo alguma
      // transmissão); msg.watching é a LISTA de quem ele(a) está assistindo.
      // Só mostro o olho no nome dele(a) se EU for um dos apresentadores
      // dessa lista — ou seja, só quem está transmitindo enxerga esse olho,
      // e só sobre quem está assistindo A TRANSMISSÃO DELE especificamente.
      const watchingMe = Array.isArray(msg.watching) && myIdentity && msg.watching.includes(myIdentity);
      setVoiceMemberStatus(msg.identity, { watching: !!watchingMe });
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
      // reforço extra: mesmo o envio já sendo direcionado só pro destinatário
      // (destinationIdentities), só aceita processar aqui se EU realmente for
      // uma das duas pontas dessa conversa — nunca confia só no "pra quem
      // parece ser" sem checar. Isso é o que garante que uma DM nunca aparece
      // pra quem não é remetente nem destinatário, mesmo que por algum motivo
      // o pacote chegue até aqui (bug de outra versão, race, etc.).
      if (msg.from !== myIdentity && msg.to !== myIdentity) return;
      const peer = msg.from === myIdentity ? msg.to : msg.from;
      if (!peer) return;
      dmPeers.add(peer);
      renderDmList();
      pushChatMessage(dmChannelKey(peer), {
        id: msg.id,
        name: msg.from === myIdentity ? (myDisplayName || myName) : (msg.name || displayNameFor(peer)),
        text: msg.text,
        ts: msg.ts,
        isSelf: msg.from === myIdentity,
        identity: msg.from,
        attachment: msg.attachment || null,
      });
    } else if (msg.type === 'message-edited' || msg.type === 'message-deleted') {
      // mesma checagem de privacidade do 'dm' acima: numa edição/apagada de
      // DM, só aceita se eu for de fato remetente ou destinatário
      if (msg.dm && msg.from !== myIdentity && msg.to !== myIdentity) return;
      const channelId = msg.dm ? dmChannelKey(msg.from === myIdentity ? msg.to : msg.from) : msg.channelId;
      if (!channelId || !msg.id) return;
      if (msg.type === 'message-edited') applyMessageEdited(channelId, msg.id, msg.text);
      else applyMessageDeleted(channelId, msg.id);
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

  settingsScreen.hidden = true;
  joinScreen.hidden = true;
  roomScreen.hidden = false;
  renderMemberSidebar();
}

// Se essa máquina já tem uma sessão salva de uma vez anterior, tenta entrar
// sozinho (sem mostrar a tela de login) — só cai pra tela de login normal se
// não der certo (sessão inválida, servidor fora do ar, conta não existe
// mais, etc.). Chamado durante o init(), enquanto a tela de abertura ainda
// está visível, então não aparece nenhum "flash" da tela de login à toa.
async function attemptAutoResume(cfg) {
  const saved = cfg.savedSession;
  if (!saved || !saved.identity || !saved.sessionToken) return false;
  try {
    const configRes = await fetch(`${serverUrl}/api/config`);
    if (!configRes.ok) return false;
    const configData = await configRes.json();
    livekitUrl = configData.livekitUrl;

    const res = await fetch(`${serverUrl}/api/resume-session`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${saved.sessionToken}` },
    });
    if (!res.ok) throw new Error();
    const { token, identity, sessionToken: st } = await res.json();
    await completeConnect(token, identity, st);
    return true;
  } catch {
    // sessão salva não serve mais (revogada, conta apagada, ou nem deu pra
    // falar com o servidor) — apaga o que tava salvo e deixa a tela de
    // login normal aparecer, sem travar o app tentando de novo pra sempre
    try {
      const freshCfg = (await window.vortex.getConfig()) || {};
      delete freshCfg.savedSession;
      await window.vortex.setConfig(freshCfg);
    } catch {
      // idem, sem problema
    }
    return false;
  }
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
    await completeConnect(token, identity, st);
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

// Popup bonito (igual o do ping/servidor) em vez do balãozinho padrão do
// Windows nos botões da barra de controle de voz lá embaixo.
attachRailTooltip(camBtn, () => camBtn.dataset.tooltip, { dir: 'top' });
attachRailTooltip(shareBtn, () => shareBtn.dataset.tooltip, { dir: 'top' });
attachRailTooltip(soundboardBtn, () => soundboardBtn.dataset.tooltip, { dir: 'top' });
attachRailTooltip(micBtn, () => micBtn.dataset.tooltip, { dir: 'top' });
attachRailTooltip(deafenBtn, () => deafenBtn.dataset.tooltip, { dir: 'top' });
attachRailTooltip(appSettingsBtn, () => appSettingsBtn.dataset.tooltip, { dir: 'top' });

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
  shareBtn.classList.remove('sharing');
  window.vortex.hideShareOverlay?.();
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
  const resolution = sharepickResolutionSelect.value;
  const frameRate = Number(sharepickFramerateSelect.value) || 30;
  devicePrefs.screenResolution = resolution;
  devicePrefs.screenFrameRate = frameRate;
  saveDevicePrefs();
  closeSharepickModal({
    sourceId: sharepickSelectedId,
    withAudio: sharepickAudioCheckbox.checked,
    resolution,
    frameRate,
  });
});

// Qualidade/taxa de quadros do compartilhamento de tela (igual "Stream
// Quality" do Discord) — resolução mais alta ou mais FPS sozinhos não
// resolvem pixelização se o bitrate continuar baixo, então cada combinação
// tem seu próprio teto de bitrate (mais generoso quanto maior a
// resolução/FPS escolhidos). Isso não elimina delay/pixelização de vez —
// isso depende também da internet de quem compartilha — mas deixa a pessoa
// escolher um ponto de equilíbrio pra internet dela, em vez de um valor fixo
// que tanto pode ficar borrado (se a conexão for boa) quanto travar (se não
// for).
const SCREEN_RESOLUTIONS = {
  '720p': { width: 1280, height: 720 },
  '1080p': { width: 1920, height: 1080 },
  '1440p': { width: 2560, height: 1440 },
  source: null, // sem forçar resolução — usa o tamanho nativo da tela/janela
};
const SCREEN_BITRATE_TABLE = {
  '720p': { 15: 1_500_000, 30: 2_500_000, 60: 3_500_000 },
  '1080p': { 15: 3_000_000, 30: 6_000_000, 60: 8_000_000 },
  '1440p': { 15: 6_000_000, 30: 9_000_000, 60: 12_000_000 },
  source: { 15: 6_000_000, 30: 9_000_000, 60: 12_000_000 },
};
function screenShareQualitySettings(resolutionKey, frameRate) {
  // atenção: SCREEN_RESOLUTIONS.source é null DE PROPÓSITO (não é "chave
  // não encontrada") — usar "||" aqui trataria null como se a chave não
  // existisse e cairia sempre no 1080p, quebrando a opção "Fonte (nativa)".
  const hasKey = Object.prototype.hasOwnProperty.call(SCREEN_RESOLUTIONS, resolutionKey);
  const preset = hasKey ? SCREEN_RESOLUTIONS[resolutionKey] : SCREEN_RESOLUTIONS['1080p'];
  const bitrateRow = SCREEN_BITRATE_TABLE[resolutionKey] || SCREEN_BITRATE_TABLE['1080p'];
  const maxBitrate = bitrateRow[frameRate] || bitrateRow[30];
  return {
    resolution: preset ? { width: preset.width, height: preset.height, frameRate } : undefined,
    maxBitrate,
  };
}

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
  const { resolution: sizeConstraint, maxBitrate } = screenShareQualitySettings(choice.resolution, choice.frameRate);
  let publication;
  try {
    publication = await voiceRoom.localParticipant.setScreenShareEnabled(true, {
      audio: choice.withAudio,
      resolution: sizeConstraint,
      contentHint: 'detail',
      screenShareEncoding: { maxBitrate, maxFramerate: choice.frameRate },
    });
  } catch (err) {
    alert('Não consegui compartilhar a tela.');
    return;
  }

  shareBtn.dataset.on = 'true';
  shareBtn.classList.remove('off');
  shareBtn.classList.add('sharing');
  window.vortex.showShareOverlay?.();
  syncShareOverlayState();
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
  sessionToken = '';
  // Apaga a sessão salva nesse PC — sem isso o app entraria sozinho de novo
  // na mesma conta na próxima vez que abrisse, mesmo depois de "sair".
  try {
    const cfg = (await window.vortex.getConfig()) || {};
    delete cfg.savedSession;
    await window.vortex.setConfig(cfg);
  } catch {
    // sem problema
  }
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

// Só pede getUserMedia (o que acende a luzinha da câmera/microfone) UMA VEZ
// por sessão do app — a primeira vez que abre as configurações e o Chromium
// ainda não liberou os NOMES de verdade dos dispositivos (sem permissão
// concedida ainda, enumerateDevices() devolve tudo sem "label", tipo
// "Microfone 1" em vez do nome real). Depois que já tem permissão, abrir
// as configurações de novo não precisa mais pedir — antes pedia TODA vez,
// e por isso a câmera acendia e apagava rapidinho sempre que abria essa tela.
let mediaLabelsUnlocked = false;

async function populateDeviceSelects() {
  try {
    let devices = await navigator.mediaDevices.enumerateDevices();
    const hasLabels = devices.some((d) => d.label);
    if (!hasLabels && !mediaLabelsUnlocked) {
      const tmpStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true }).catch(() => null);
      if (tmpStream) {
        tmpStream.getTracks().forEach((t) => t.stop());
        devices = await navigator.mediaDevices.enumerateDevices();
      }
    }
    if (devices.some((d) => d.label)) mediaLabelsUnlocked = true;

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
      // Trocar de microfone substitui o track de áudio por baixo dos panos —
      // reinicia a detecção de "estou falando" nesse track novo, senão ela
      // fica presa ouvindo o dispositivo antigo (que já nem existe mais).
      const micPub = voiceRoom.localParticipant.getTrackPublication(Track.Source.Microphone);
      if (micPub?.track) startLocalSpeakingDetection(micPub.track);
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

// A tela de abertura (splash) agora é uma janela separada e pequena,
// controlada pelo main.js (ver renderer/splash.html) — ela já cuida do
// tempo mínimo visível e de só mostrar a janela principal quando tudo
// estiver pronto, então aqui é só rodar o init() normalmente.
init();
