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
const micOptionsBtn = document.getElementById('mic-options-btn');
const outputOptionsBtn = document.getElementById('output-options-btn');
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
const cinemaFullscreenBtn = document.getElementById('cinema-fullscreen-btn');
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
// volume DA TRANSMISSÃO de quem está sendo assistida agora — usa
// cinemaVolumeBtn.dataset.identity (igual o botão de parar de assistir
// acima), não cinemaTileIdentity, porque esse último só fica preenchido em
// modo cinema DE VERDADE (tela cheia); a barra também aparece na tela
// expandida sem cinema, e nesse estado cinemaTileIdentity fica vazio —
// antes disso fazia o clique não fazer nada nesse caso.
cinemaVolumeBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  const identity = cinemaVolumeBtn.dataset.identity;
  if (!identity) return;
  openStreamVolumePopover(cinemaVolumeBtn, identity);
});
// Coloca a transmissão em tela cheia de verdade (janela inteira) -- mesma
// identidade da barra (cinemaVolumeBtn.dataset.identity), já que essa barra
// só aparece quando já tem uma telinha expandida assistindo alguém. Clicar
// de novo (já em tela cheia) sai dela -- ver enterCinemaFullscreen/
// exitCinemaFullscreen mais abaixo.
cinemaFullscreenBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  const identity = cinemaVolumeBtn.dataset.identity;
  if (!identity) return;
  if (cinemaTileIdentity === identity) {
    exitCinemaFullscreen();
    return;
  }
  const tile = document.getElementById(tileId(identity));
  if (!tile) return;
  enterCinemaFullscreen(tile, participantFromRow(tile));
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
  else if (action === 'stopShare') stopScreenShare();
});

// Avisinho "AO VIVO" + botão de parar, dentro do próprio painel da esquerda
// -- como o overlay por cima de outras janelas só aparece quando a janela do
// PrimalVoice está fora de foco (ver main.js), enquanto você está OLHANDO
// pro próprio app (compartilhando a tela) não sobra nenhum aviso visível de
// que você está ao vivo, só o ícone pequeno ficando verde. Esse avisinho
// aqui resolve isso, sempre visível ali em cima do "Conectado".
const myLiveShareBar = document.getElementById('my-live-share-bar');
const myLiveStopBtn = document.getElementById('my-live-stop-btn');
function syncMyLiveShareBar() {
  myLiveShareBar.hidden = !shareBtn.classList.contains('sharing');
}
new MutationObserver(syncMyLiveShareBar).observe(shareBtn, { attributes: true, attributeFilter: ['class'] });
myLiveStopBtn.addEventListener('click', () => stopScreenShare());

const memberListItems = document.getElementById('member-list-items');
const selfAvatar = document.getElementById('self-avatar');
const selfName = document.getElementById('self-name');
const selfNameBtn = document.getElementById('self-name-btn');
const channelSidebar = document.querySelector('.channel-sidebar');
// .user-panel não mora mais DENTRO de .channel-sidebar (agora flutua por
// cima dela E da barra de ícones de servidor, ver style.css) -- por isso
// setSidebarCollapsed() precisa escondê-lo à parte, via classe própria, em
// vez de contar com o ".channel-sidebar.collapsed > *" de antes.
const userPanel = document.querySelector('.user-panel');
const memberList = document.querySelector('.member-list');
const resizeLeft = document.getElementById('resize-left');
const toggleMembersBtn = document.getElementById('toggle-members-btn');
const userPanelControls = document.querySelector('.user-panel-controls');
const voiceStatusBar = document.getElementById('voice-status-bar');
const voiceStatusChannel = document.getElementById('voice-status-channel');
const voiceStatusTitle = document.getElementById('voice-status-title');
const voiceQualityTooltip = document.getElementById('voice-quality-tooltip');
const voiceQualityIcon = document.getElementById('voice-quality-icon');
const reconnectOverlay = document.getElementById('reconnect-overlay');

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
// Atalho pra "consertar" de uma vez qualquer botão que ainda estava usando
// o title nativo do HTML (feio, padrão do sistema) -- pega o texto que já
// tava no title (ou no title passado direto em opts.text, pra quando o
// texto muda com o tempo, tipo o de mostrar/ocultar membros) e liga o
// balãozinho bonito no lugar dele.
function upgradeTooltip(el, opts = {}) {
  if (!el) return;
  const getText = opts.getText || (() => el.dataset.tooltip);
  if (!el.dataset.tooltip) el.dataset.tooltip = opts.text || el.getAttribute('title') || '';
  attachRailTooltip(el, getText, opts);
}
attachRailTooltip(homeIconBtn, () => homeIconBtn.dataset.tooltip);
attachRailTooltip(serverIconBtn, () => serverIconBtn.dataset.tooltip);
const channelHeaderIcon = document.getElementById('channel-header-icon');
const channelHeaderName = document.getElementById('channel-header-name');
const textView = document.getElementById('text-view');
const chatMessages = document.getElementById('chat-messages');
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
const chatInputHighlight = document.getElementById('chat-input-highlight');

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
const rolesSearchInput = document.getElementById('roles-search-input');
const rolesCountLabel = document.getElementById('roles-count-label');
const bansListEl = document.getElementById('bans-list');
const bansEmptyHint = document.getElementById('bans-empty-hint');

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
const profileBioInput = document.getElementById('profile-bio-input');
const profileSaveBtn = document.getElementById('profile-save-btn');

const confirmDialogOverlay = document.getElementById('confirm-dialog-overlay');
const confirmDialogMessage = document.getElementById('confirm-dialog-message');
const confirmDialogCancelBtn = document.getElementById('confirm-dialog-cancel-btn');
const confirmDialogConfirmBtn = document.getElementById('confirm-dialog-confirm-btn');

// Confirmação customizada -- substitui o confirm() nativo do sistema (janela
// branca fora do tema escuro do app, título "vortex-desktop" solto) por um
// diálogo com a cara do PrimalVoice, igual Discord faz nas ações de
// moderação dele. Mesma ideia (resolve true/false), só que combinando com o
// resto do visual. opts.confirmLabel deixa o botão de confirmar com um verbo
// específico da ação ("Banir", "Expulsar", "Apagar"...) em vez de um
// "Confirmar" genérico.
function confirmDialog(message, opts = {}) {
  return new Promise((resolve) => {
    confirmDialogMessage.textContent = message;
    confirmDialogConfirmBtn.textContent = opts.confirmLabel || 'Confirmar';
    confirmDialogOverlay.hidden = false;

    // Esse diálogo não bloqueia o resto do app nem escurece o fundo (ver
    // CSS de .confirm-dialog-overlay/.confirm-dialog) -- a pessoa pode
    // clicar em qualquer outro lugar do app com ele ainda aberto. Por isso
    // NÃO tem mais um atalho global de "Enter confirma" (isso ia confirmar
    // a ação sem querer se a pessoa apertasse Enter pra mandar uma mensagem
    // em outro canto do app enquanto o diálogo ainda estivesse aberto).
    // Focar o botão "Cancelar" por padrão já cobre o caso de querer usar
    // Enter/Espaço pelo teclado -- o próprio botão focado responde a isso
    // nativamente (e cancelar é sempre o lado seguro pra ficar em foco).
    // O Escape continua cancelando de qualquer lugar, sem essa restrição.
    confirmDialogCancelBtn.focus();

    function cleanup(result) {
      confirmDialogOverlay.hidden = true;
      confirmDialogConfirmBtn.removeEventListener('click', onConfirm);
      confirmDialogCancelBtn.removeEventListener('click', onCancel);
      document.removeEventListener('keydown', onKeydown);
      resolve(result);
    }
    function onConfirm() { cleanup(true); }
    function onCancel() { cleanup(false); }
    function onKeydown(e) {
      if (e.key === 'Escape') cleanup(false);
    }

    confirmDialogConfirmBtn.addEventListener('click', onConfirm);
    confirmDialogCancelBtn.addEventListener('click', onCancel);
    document.addEventListener('keydown', onKeydown);
  });
}

const cropOverlay = document.getElementById('crop-overlay');
const cropTitle = document.getElementById('crop-title');
const cropStage = document.getElementById('crop-stage');
const cropImage = document.getElementById('crop-image');
const cropZoomInput = document.getElementById('crop-zoom-input');
const cropCancelBtn = document.getElementById('crop-cancel-btn');
const cropConfirmBtn = document.getElementById('crop-confirm-btn');

const themeGrid = document.getElementById('theme-grid');
const accentColorGrid = document.getElementById('accent-color-grid');
const accentColorCustomInput = document.getElementById('accent-color-custom-input');
const colorThemeGrid = document.getElementById('color-theme-grid');
const previewThemeBtn = document.getElementById('preview-theme-btn');
const themePreviewPanel = document.getElementById('theme-preview-panel');
const themePreviewPanelGrid = document.getElementById('theme-preview-panel-grid');
const themePreviewPanelActiveName = document.getElementById('theme-preview-panel-active-name');
const themePreviewExitBtn = document.getElementById('theme-preview-exit-btn');
const customThemePanel = document.getElementById('custom-theme-panel');
const customThemeCloseBtn = document.getElementById('custom-theme-close-btn');
const customThemeBackBtn = document.getElementById('custom-theme-back-btn');
const customThemeModeBtns = document.querySelectorAll('.custom-theme-mode-btn');
const customThemeSvBox = document.getElementById('custom-theme-sv-box');
const customThemeSvHandle = document.getElementById('custom-theme-sv-handle');
const customThemeHueInput = document.getElementById('custom-theme-hue-input');
const customThemeHexInput = document.getElementById('custom-theme-hex-input');
const customThemeHexSwatch = document.getElementById('custom-theme-hex-swatch');
const customThemeNativePicker = document.getElementById('custom-theme-native-picker');
const customThemeEyedropBtn = document.getElementById('custom-theme-eyedrop-btn');
const customThemeAddColorBtn = document.getElementById('custom-theme-add-color-btn');
const customThemeColorChips = document.getElementById('custom-theme-color-chips');
const customThemeAngleInput = document.getElementById('custom-theme-angle-input');
const customThemeAngleValueEl = document.getElementById('custom-theme-angle-value');
const customThemeIntensityInput = document.getElementById('custom-theme-intensity-input');
const customThemeIntensityValueEl = document.getElementById('custom-theme-intensity-value');
const customThemeSurpriseBtn = document.getElementById('custom-theme-surprise-btn');
const customThemeResetBtn = document.getElementById('custom-theme-reset-btn');
const fontOptionList = document.getElementById('font-option-list');

const dmListEl = document.getElementById('dm-list');

const keybindMuteClearBtn = document.getElementById('keybind-mute-clear-btn');
const keybindDeafenClearBtn = document.getElementById('keybind-deafen-clear-btn');

const chatAttachmentBtn = document.getElementById('chat-attachment-btn');
const chatAttachmentInput = document.getElementById('chat-attachment-input');
const chatAttachmentPreview = document.getElementById('chat-attachment-preview');

const chatReplyPreview = document.getElementById('chat-reply-preview');
const chatReplyPreviewName = document.getElementById('chat-reply-preview-name');
const chatReplyPreviewSnippet = document.getElementById('chat-reply-preview-snippet');
const chatReplyPreviewCancelBtn = document.getElementById('chat-reply-preview-cancel');

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
  moveMembers: 'Mover membros entre canais de voz',
  banMembers: 'Banir membros do servidor',
  muteMembers: 'Silenciar membros (pede pro app deles mutar)',
  deafenMembers: 'Ensurdecer membros (pede pro app deles parar de ouvir)',
  manageNicknames: 'Alterar apelido de outros membros',
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
let rolesSearchQuery = '';
let draggedRoleId = null;
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

// Limites de ping (em ms) que decidem a cor/quantidade de tracinhos --
// baseado direto no número de "Ping: Xms" que já aparece no balãozinho, em
// vez de confiar só na classificação que o próprio LiveKit calcula sozinho
// (que é mais generosa e podia mostrar 3 tracinhos verdes com um ping de
// 239ms, por exemplo -- o pedido era pra isso refletir o ping de verdade).
function pingQualityTier(rtt) {
  if (typeof rtt !== 'number' || rtt <= 0) return null;
  if (rtt <= 150) return 'excellent'; // 3 tracinhos verdes
  if (rtt <= 299) return 'good'; // 2 tracinhos laranja
  return 'poor'; // 1 tracinho vermelho (300ms+)
}

function updateVoiceQualityTooltip() {
  if (!voiceRoom) return;
  const rtt = voiceRoom.engine && voiceRoom.engine.client && voiceRoom.engine.client.rtt;
  voiceQualityTooltip.textContent = typeof rtt === 'number' && rtt > 0 ? `Ping: ${rtt}ms` : 'Qualidade da conexão';
  // roda a cada 3s (ver voiceQualityInterval) e é quem manda de verdade no
  // ícone -- corrige em até 3s qualquer classificação diferente que o evento
  // ConnectionQualityChanged do LiveKit tenha aplicado nesse meio tempo.
  const tier = pingQualityTier(rtt);
  if (tier) setVoiceQuality(tier);
}

function stopVoiceQualityMonitor() {
  if (voiceQualityInterval) {
    clearInterval(voiceQualityInterval);
    voiceQualityInterval = null;
  }
  setVoiceQuality('unknown');
  voiceQualityTooltip.textContent = 'Qualidade da conexão';
}

// ---------- Internet caindo de vez (não só um pinguinho ruim) ----------
// window 'offline'/'online' pegam a placa de rede do Windows desligando/
// voltando (ex: Wi-Fi desligado na mão, cabo puxado) -- diferente do ping
// alto/quality-poor de cima, que é sobre uma conexão ainda de pé mas ruim.
// Só mostra a tela cheia depois de OFFLINE_GRACE_MS sem rede pra não piscar
// numa queda rápida (tipo o Wi-Fi trocando de canal por 1-2s) que se resolve
// sozinha antes de atrapalhar quem tá usando o app.
const OFFLINE_GRACE_MS = 10000;
let offlineGraceTimer = null;
let channelToRejoinOnReconnect = null;

function handleNetworkOffline() {
  if (offlineGraceTimer || !reconnectOverlay.hidden) return; // já esperando, ou já mostrando
  offlineGraceTimer = setTimeout(() => {
    offlineGraceTimer = null;
    channelToRejoinOnReconnect = activeVoiceChannelId || null;
    reconnectOverlay.hidden = false;
  }, OFFLINE_GRACE_MS);
}

function handleNetworkOnline() {
  if (offlineGraceTimer) {
    clearTimeout(offlineGraceTimer);
    offlineGraceTimer = null;
  }
  if (reconnectOverlay.hidden) return; // não chegou a mostrar a tela, nada pra desfazer
  reconnectOverlay.hidden = true;
  if (channelToRejoinOnReconnect) {
    const channelId = channelToRejoinOnReconnect;
    channelToRejoinOnReconnect = null;
    // entra de novo sozinho no mesmo canal de voz que a gente estava antes
    // de cair -- joinVoiceChannel já cuida de sair de qualquer resto de
    // conexão velha primeiro (ver o início dela)
    joinVoiceChannel(channelId).catch(() => {});
  }
}

window.addEventListener('offline', handleNetworkOffline);
window.addEventListener('online', handleNetworkOnline);

let joining = false;

const chatHistoryByChannel = new Map(); // channelId -> [{name,text,ts,isSelf}]
// Canais/DMs cujo histórico já foi carregado do servidor nesta sessão —
// evita buscar de novo toda vez que a pessoa clica pra trocar de canal.
const historyLoadedFor = new Set();
// Contagem de mensagens não lidas por canal/DM (channelId -> quantidade),
// tipo Discord — some assim que a pessoa abre aquela conversa.
const unreadCounts = new Map();
// Quais desses canais/DMs têm, entre as não lidas, alguma mensagem que me
// @mencionou — nesse caso o badge mostra "@" em vez do número (ver
// messageMentionsMe/badgeText). Some junto com o unreadCounts, na mesma
// hora (abrir a conversa == ler a menção também).
const mentionedChannels = new Set();
// Quantas mensagens estavam SEM LER no momento em que a pessoa abriu aquele
// canal/DM (channelId -> quantidade) — é o que decide onde desenhar a
// linha vermelha "NOVO" (igual Discord) no meio do histórico, marcando a
// partir de onde são as mensagens que chegaram enquanto ela não estava
// olhando. Fica só até a pessoa SAIR dessa conversa (ver switchTextChannel/
// switchToDm) -- se sair e voltar depois, a linha já não aparece mais,
// porque a essa altura não tem mensagem "não lida" nenhuma de novo.
const channelUnreadMarker = new Map();
const voicePresence = new Map(); // channelId -> Map(identity -> name)
const voiceMemberStatus = new Map(); // identity -> { muted, deafened }
const memberProfiles = new Map(); // identity -> { avatar, banner, status, displayName, bio }
let myAvatarDataUrl = '';
let myBannerDataUrl = '';
let myStatusText = '';
let myDisplayName = '';
let myBioText = '';
let pendingProfileAvatar = null; // enquanto o modal de perfil está aberto
let pendingProfileBanner = null;

// ---------- conversas diretas (DM) ----------
// Pra entrega ao vivo, a mensagem ainda viaja pelo mesmo canal de dados do
// LiveKit (que todo mundo na sala recebe), só que só é MOSTRADA na conversa
// privada entre as duas pessoas envolvidas — não é sigilo de ponta a ponta,
// é privacidade de interface. O histórico persistido no servidor, porém,
// fica guardado numa chave exclusiva das duas pessoas (não vaza pra mais
// ninguém que entrar na sala depois).
const dmPeers = new Set(); // identities com quem já trocou DM -- persistido no config local (ver loadDmPeersFromConfig/saveDmPeersToConfig), então sobrevive a fechar o app
// ids de mensagens escondidas só pra mim ("Excluir (para mim)") -- também
// persistido no config local (ver loadLocallyHiddenFromConfig/saveLocallyHiddenToConfig)
const locallyHiddenMessageIds = new Set();
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
// O apelido definido pra essa pessoa NESTE servidor (serverState.nicknames)
// tem prioridade sobre o nome de exibição da conta dela -- igual Discord,
// onde o apelido do servidor é o que todo mundo vê por aqui, mas não muda o
// nome "de verdade" da conta em nenhum outro lugar.
function displayNameFor(identity) {
  const nickname = serverState.nicknames?.[identity];
  if (nickname) return nickname;
  if (identity === myIdentity) return myDisplayName || myName || identity;
  return memberProfiles.get(identity)?.displayName || identity;
}

// Todo mundo que já apareceu de algum jeito (perfil público, mensagem
// antiga, presença ao vivo, dono do servidor) -- usado tanto pra reconhecer
// "@Nome" dentro de uma mensagem quanto pra montar a lista de sugestões do
// autocomplete de menção (ver buildMentionRegex/openMentionAutocomplete).
function allKnownMemberIdentities() {
  const known = new Set(Object.keys(serverState.profiles || {}));
  knownIdentities.forEach((id) => known.add(id));
  if (serverState.ownerIdentity) known.add(serverState.ownerIdentity);
  known.add(myIdentity);
  return Array.from(known);
}

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Qual identity corresponde a um nome já reconhecido como "@Nome" dentro de
// uma mensagem (ver appendTextWithMentions) -- usado pra saber o perfil de
// quem abrir quando clicam em cima da menção, igual Discord.
function identityForMentionName(name) {
  return allKnownMemberIdentities().find((id) => displayNameFor(id) === name) || null;
}

// Regex que reconhece "@Nome" de qualquer um conhecido dentro de um texto —
// nomes mais longos primeiro (senão "@Ana Maria" bateria só com "@Ana" se
// "Ana" também existisse) e nunca no meio de uma palavra maior (o "(?!\w)"
// no final evita "@Maik" bater dentro de "@Maikzinho").
function buildMentionRegex() {
  const names = Array.from(new Set(allKnownMemberIdentities().map(displayNameFor).filter(Boolean))).sort(
    (a, b) => b.length - a.length
  );
  if (!names.length) return null;
  return new RegExp(`@(?:${names.map(escapeRegExp).join('|')})(?!\\w)`, 'g');
}

// Essa mensagem me @menciona? (usado pra decidir se o badge de não lida
// mostra "@" em vez do número — ver pushChatMessage/badgeText)
function messageMentionsMe(text) {
  if (!text) return false;
  const myName = displayNameFor(myIdentity);
  if (!myName) return false;
  const re = new RegExp(`@${escapeRegExp(myName)}(?!\\w)`, 'i');
  return re.test(text);
}

// Texto do badge de não lida: "@" quando tem menção esperando, senão o
// número de mensagens não lidas (com um teto em "99+", igual Discord).
function badgeText(count, hasMention) {
  if (hasMention) return '@';
  return count > 99 ? '99+' : String(count);
}

const chatEncoder = new TextEncoder();
const chatDecoder = new TextDecoder();

const audioElsByIdentity = new Map();
const participantVolumes = new Map();
// GainNode (Web Audio) por identity -- é o que permite passar de 100% (o
// <audio>.volume nativo trava em 1.0/100%, então pra dar boost até 200%
// igual ao Discord a gente roteia o áudio da voz por um GainNode em vez de
// só ajustar o volume do elemento). Um elemento pode ter mais de um GainNode
// (ex.: reconexão troca o <audio> mas o antigo ainda não foi destacado).
const gainNodesByIdentity = new Map();
const gainNodeByAudioEl = new WeakMap();
let sharedAudioCtx = null;

// Volume por pessoa que o usuário já configurou antes, pra lembrar da
// próxima vez que entrar em chamada com ela (não precisa reajustar toda
// vez) -- ver loadMemberVolumesFromConfig/scheduleSaveMemberVolumes.
// identity -> volume (0 a 2, onde 1 = 100%).
let savedMemberVolumes = {};
let saveMemberVolumesTimer = null;
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

// Volume geral de SAÍDA (multiplica em cima do volume por pessoa, do stream
// e dos efeitos sonoros) — é o equivalente ao "Volume de saída" do Discord,
// controlado pelo popover de saída (ver openOutputOptionsPopover).
let masterOutputVolume = 1;

let devicePrefs = { micId: '', speakerId: '', cameraId: '' };
let keybinds = { muteSelf: '', deafen: '' };

// Notas privadas sobre membros -- igual devicePrefs/keybinds acima, só ficam
// salvas neste PC (não sincronizam com a conta nem com o servidor). Mapa
// identity -> texto da nota. É o "Adicionar nota" do menu de contexto de um
// membro, que no Discord é visível só pra quem escreveu.
let memberNotes = {};
let saveMemberNotesTimer = null;

const joinSound = new Audio('assets/sound-join.wav');
const leaveSound = new Audio('assets/sound-leave.wav');
const muteSound = new Audio('assets/sound-mute.wav');
const unmuteSound = new Audio('assets/sound-unmute.wav');
const messageSound = new Audio('assets/sound-message.wav');
const sharingSound = new Audio('assets/sound-sharing.wav');
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

// ---------- Notificação de mensagem privada nova ----------
// Igual o Discord faz quando você tá "disponível": toca um barulhinho
// próprio (messageSound) e mostra uma notificação nativa do sistema
// operacional, mesmo com o app minimizado/em segundo plano. Só dispara pra
// mensagem de quem NÃO é a própria pessoa (evita notificar do próprio eco),
// e só quando a pessoa não está com o olho já em cima daquela conversa
// (janela focada + aquela DM aberta na tela) -- senão vira barulho à toa.
function shouldNotifyForDm(peer) {
  const windowFocused = typeof document !== 'undefined' && document.hasFocus && document.hasFocus();
  const alreadyViewing = activeDmPeer === peer && windowFocused;
  return !alreadyViewing;
}

function showDmNotification(peer, name, text) {
  if (typeof Notification === 'undefined') return;
  // Usa a foto de perfil de quem mandou (se ela tiver uma), igual o
  // Discord mostra o avatar de quem te chamou -- só cai pro logo do
  // PrimalVoice se a pessoa não tiver avatar definido.
  const peerAvatar = memberProfiles.get(peer)?.avatar;
  const fire = () => {
    try {
      const n = new Notification(name || displayNameFor(peer), {
        body: text && text.trim() ? text : 'Enviou uma mensagem',
        icon: peerAvatar || 'assets/logo.png',
        silent: true, // já tocamos o nosso próprio som (messageSound)
      });
      n.onclick = () => {
        window.vortex?.focusWindow?.();
        switchToDm(peer);
      };
    } catch {
      // ambiente sem suporte a Notification -- ignora
    }
  };
  if (Notification.permission === 'granted') {
    fire();
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission().then((perm) => {
      if (perm === 'granted') fire();
    });
  }
}

function notifyNewMessage(peer, name, text) {
  if (!shouldNotifyForDm(peer)) return;
  playSound(messageSound);
  showDmNotification(peer, name, text);
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
      myBioText = profile.bio || '';
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
    bio: myBioText,
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
  myBioText = p.bio || '';
}

// Antes a lista de "Mensagens diretas" só guardava quem a pessoa conversou
// NESSA sessão (dmPeers era um Set em memória, comentário antigo dizia isso
// mesmo) -- fechar e abrir o app de novo esvaziava a lista, mesmo o
// histórico de mensagens em si continuando salvo no servidor. Agora salva
// as identidades no config local (por PC) pra lista sobreviver a reabrir o
// app, igual o Discord lembra suas conversas.
function loadDmPeersFromConfig(cfg) {
  (cfg.dmPeers || []).forEach((identity) => {
    if (identity) dmPeers.add(identity);
  });
}

async function saveDmPeersToConfig() {
  const cfg = (await window.vortex.getConfig()) || {};
  cfg.dmPeers = Array.from(dmPeers);
  await window.vortex.setConfig(cfg);
}

// "Excluir mensagem (para mim)" -- só esconde a mensagem NA SUA TELA, sem
// mandar nada pros outros nem apagar de verdade no servidor (diferente do
// "Apagar", que é só pra mensagem própria e some pra todo mundo). Salva os
// ids escondidos no config local (mesma ideia do dmPeers acima) pra
// continuar escondida depois de fechar e abrir o app de novo.
function loadLocallyHiddenFromConfig(cfg) {
  (cfg.locallyHiddenMessageIds || []).forEach((id) => {
    if (id) locallyHiddenMessageIds.add(id);
  });
}

async function saveLocallyHiddenToConfig() {
  const cfg = (await window.vortex.getConfig()) || {};
  cfg.locallyHiddenMessageIds = Array.from(locallyHiddenMessageIds);
  await window.vortex.setConfig(cfg);
}

async function saveProfileToConfig() {
  const cfg = (await window.vortex.getConfig()) || {};
  cfg.profile = {
    avatar: myAvatarDataUrl,
    banner: myBannerDataUrl,
    status: myStatusText,
    displayName: myDisplayName,
    bio: myBioText,
  };
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
  myBioText = profileBioInput.value.trim().slice(0, 190);
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
      bio: myBioText,
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
  profileBioInput.value = myBioText;
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
      // Escolher um tema padrão (Escuro/Meia-noite/Clássico) volta pro
      // fundo "de fábrica" desse tema -- desliga qualquer "tema colorido"
      // que estivesse pintando o fundo/painéis por cima.
      applyColorTheme('');
      const cfg = (await window.vortex.getConfig()) || {};
      cfg.theme = theme;
      cfg.colorTheme = '';
      await window.vortex.setConfig(cfg);
    });
  });
}

// ---------- aparência (cor de destaque) ----------
// Deixa a pessoa trocar a cor usada nos botões/links/detalhes sem precisar
// trocar de tema inteiro -- clareia a cor escolhida pra --accent-2 (usada
// em texto/ícone sobre fundo escuro) e gera uma versão bem fraquinha em
// --accent-soft (fundo de botão/destaque), do mesmo jeito que os temas
// prontos já fazem à mão lá no CSS.
function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const num = parseInt(full, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}
function mixWithWhite(hex, amount) {
  const { r, g, b } = hexToRgb(hex);
  const mix = (c) => Math.round(c + (255 - c) * amount);
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}
function applyAccent(hex) {
  const root = document.documentElement;
  if (!hex) {
    root.style.removeProperty('--accent');
    root.style.removeProperty('--accent-2');
    root.style.removeProperty('--accent-soft');
  } else {
    const { r, g, b } = hexToRgb(hex);
    root.style.setProperty('--accent', hex);
    root.style.setProperty('--accent-2', mixWithWhite(hex, 0.35));
    root.style.setProperty('--accent-soft', `rgba(${r}, ${g}, ${b}, 0.18)`);
  }
  // Propositalmente NÃO mexe em --link-color/--link-soft/--on-link --
  // pediram pra tirar isso: links e @menções continuam sempre no azul
  // fixo de fábrica, não acompanham a cor de destaque escolhida.
  // Marca só a fileirinha pequena "Cor de destaque" -- a grade grande
  // "Temas coloridos" tem o próprio controle de "ativo" (por chave do
  // tema, não pela cor), já que ela mexe em mais coisa que só o accent.
  document.querySelectorAll('.accent-color-option').forEach((btn) => {
    if (btn.dataset.accent !== undefined) btn.classList.toggle('active', (btn.dataset.accent || '') === (hex || ''));
  });
  if (accentColorCustomInput && hex) accentColorCustomInput.value = hex;
}

async function loadAccentFromConfig(cfg) {
  applyAccent(cfg.accentColor || '');
}

if (accentColorGrid) {
  accentColorGrid.querySelectorAll('.accent-color-option[data-accent]').forEach((btn) => {
    upgradeTooltip(btn, { dir: 'top' });
    btn.addEventListener('click', async () => {
      const hex = btn.dataset.accent || '';
      // "Cor de destaque" mexe só nos botões -- NÃO desliga um "tema
      // colorido" que já esteja pintando o fundo/painéis. Assim dá pra
      // usar o fundo de um Tema colorido (ex: Azul-petróleo) com os
      // botões em outra cor (ex: Amarelo), do jeito que pediram.
      applyAccent(hex);
      const cfg = (await window.vortex.getConfig()) || {};
      cfg.accentColor = hex;
      await window.vortex.setConfig(cfg);
    });
  });
}
if (accentColorCustomInput) {
  upgradeTooltip(accentColorCustomInput.closest('.accent-color-custom'), { dir: 'top' });
  accentColorCustomInput.addEventListener('input', async () => {
    const hex = accentColorCustomInput.value;
    applyAccent(hex);
    const cfg = (await window.vortex.getConfig()) || {};
    cfg.accentColor = hex;
    await window.vortex.setConfig(cfg);
  });
}

// ---------- aparência (temas coloridos: grade grande, com degradê) ----------
// Igual o "Temas coloridos" do Discord: uma grade bem maior de cores pra
// escolher, incluindo algumas em degradê -- cada uma com um nome que
// aparece no balãozinho ao passar o mouse. Diferente da "Cor de destaque"
// de cima (que só troca a cor dos botões), clicar aqui REPINTA O
// PRIMALVOICE INTEIRO: fundo, painéis, bordas etc. também ganham um tom
// combinando com a cor. Quando a opção é um degradê, o quadradinho da
// grade mostra o degradê inteiro, mas quem vira de fato a cor de
// botões/fundo (quando aplicada) é a "accent" (uma das duas pontas), já
// que o resto da interface usa cor sólida, não degradê.
//
// O fundo/painéis (esta grade) e a cor dos botões ("Cor de destaque" logo
// acima) são TOTALMENTE independentes, não importa a ordem que a pessoa
// mexeu nos dois: dá pra ter o fundo Azul-petróleo com botões Amarelo
// (pediram exatamente isso), escolhendo em qualquer ordem. Um tema
// colorido só sugere a própria "accent" pro botão quando ainda não existe
// nenhuma "Cor de destaque" escolhida (primeiro uso, sem customização);
// depois disso ele nunca mais mexe no botão, só no fundo/painéis.
const COLOR_THEMES = [
  // "Lua Carmesim" -- a referência que o Discord mostra com selo de "NOVO"
  // em destaque no topo da grade dele; aqui não é um criador de tema (isso
  // é coisa de assinatura paga de lá), só um degradê rico igual aos outros,
  // com o mesmo nome/destaque.
  // Pediram mais escuro (mais preto do que vermelho) -- por isso o vermelho
  // fica só no comecinho (0%-22%) e o resto do degradê (a maior parte)
  // desce rápido pro preto quase puro, em vez de dividir igualzinho entre
  // as 4 cores (que numa janela bem mais larga que alta deixava vermelho
  // demais visível).
  { key: 'lua-carmesim', name: 'Lua Carmesim', badge: 'NOVO', css: 'linear-gradient(135deg, #c0293a 0%, #7a1220 22%, #350a12 48%, #0d0304 78%, #000000 100%)', accent: '#b91d3a' },
  // Pediram pra escurecer todas as cores da grade (estavam "doendo a
  // vista" -- muito claras/pastel) e deixar com mais tom escuro do que
  // claro. Aplicado um teto de luminosidade (máx. 42% em HSL, mantendo
  // matiz e saturação) em cada cor de cada tema: cores que já eram
  // escuras ficam como estavam, só as claras/pastel são puxadas pra
  // baixo.
  { key: 'verde-menta', name: 'Verde-menta', css: 'linear-gradient(135deg, #22b567, #2bab5d, #3a9c6a)', accent: '#3a9c6a' },
  { key: 'pessego', name: 'Pêssego', css: 'linear-gradient(135deg, #cb7e0b, #c47212, #b37023)', accent: '#b37023' },
  { key: 'azul-lavanda', name: 'Azul-lavanda', css: 'linear-gradient(135deg, #1843be, #2147b5, #2941ad)', accent: '#2941ad' },
  { key: 'amarelo-claro', name: 'Amarelo-claro', css: '#b3a523', accent: '#a79b30' },
  { key: 'lilas', name: 'Lilás', css: 'linear-gradient(135deg, #8f1bbb, #832daa, #8034a2)', accent: '#8034a2' },
  { key: 'ciano-claro', name: 'Ciano-claro', css: '#2da9a9', accent: '#37a0a0' },
  { key: 'creme', name: 'Creme', css: '#a28e34', accent: '#9d8c39' },
  { key: 'roxo-azulado', name: 'Roxo-azulado', css: 'linear-gradient(135deg, #440bcb, #2e0fc7, #2c1c7a)', accent: '#350ec8' },
  { key: 'aurora', name: 'Aurora', css: 'linear-gradient(135deg, #1eb88a, #1fb37a, #0c2a1e)', accent: '#1fb37a' },
  { key: 'vinho', name: 'Vinho', css: 'linear-gradient(135deg, #a4333b, #7a1d24, #24080a)', accent: '#a3282f' },
  { key: 'ameixa', name: 'Ameixa', css: 'linear-gradient(135deg, #5b2bab, #4b2a78, #1c0e30)', accent: '#5e36a0' },
  { key: 'terracota', name: 'Terracota', css: '#925644', accent: '#925644' },
  { key: 'cinza-azulado', name: 'Cinza-azulado', css: '#5b617b', accent: '#5b617b' },
  { key: 'verde-oliva', name: 'Verde-oliva', css: '#4f7a5e', accent: '#4f7a5e' },
  { key: 'azul-petroleo', name: 'Azul-petróleo', css: 'linear-gradient(135deg, #3486a3, #1f5f7a, #0c2530)', accent: '#1f5f7a' },
  { key: 'berinjela', name: 'Berinjela', css: 'linear-gradient(135deg, #a13583, #7a2160, #2b0c22)', accent: '#9a2c7a' },
  { key: 'por-do-sol', name: 'Pôr do sol', css: 'linear-gradient(135deg, #cea708, #c77b0f, #b02626, #8a2f6b)', accent: '#bb551b' },
  { key: 'ceu-noturno', name: 'Céu noturno', css: 'linear-gradient(135deg, #5c26b1, #1f35b7, #213fb5, #101b5c)', accent: '#1f35b7' },
  { key: 'dourado', name: 'Dourado', css: '#8a7a3a', accent: '#9a843c' },
  { key: 'indigo-puro', name: 'Índigo puro', css: '#2536b1', accent: '#2536b1' },
  { key: 'aurora-boreal', name: 'Aurora boreal', css: 'linear-gradient(135deg, #0ec8b6, #1f35b7, #6b26b1, #1c0e30)', accent: '#297ead' },
  { key: 'chama', name: 'Chama', css: 'linear-gradient(135deg, #d6a500, #d65600, #b8221e, #7a1d4a)', accent: '#b8431e' },
];

// Variáveis de CSS que um "tema colorido" repinta por cima do tema padrão
// (Escuro/Meia-noite/Clássico) -- tudo que dá "corpo" à interface, fora o
// texto. O texto (--text/--muted) fica como está pros temas prontos
// (sempre legíveis em qualquer tom, já que eles são todos escuros), mas o
// "Tema Personalizado" (ver mais abaixo) pode ser "Claro" -- nesse caso
// essas duas entram em jogo também, pra não deixar texto claro sobre fundo
// claro.
const COLOR_THEME_PALETTE_VARS = [
  '--bg', '--panel', '--tile-bg', '--border', '--hover-strong',
  '--surface-deep', '--surface-raised', '--quality-dim', '--on-accent',
];
const CUSTOM_THEME_TEXT_VARS = ['--text', '--muted'];

function hexToHsl(hex) {
  const { r, g, b } = hexToRgb(hex);
  const rN = r / 255, gN = g / 255, bN = b / 255;
  const max = Math.max(rN, gN, bN), min = Math.min(rN, gN, bN);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rN: h = (gN - bN) / d + (gN < bN ? 6 : 0); break;
      case gN: h = (bN - rN) / d + 2; break;
      default: h = (rN - gN) / d + 4; break;
    }
    h *= 60;
  }
  return { h, s: s * 100, l: l * 100 };
}

function hslToCss(h, s, l) {
  return `hsl(${Math.round(h)}, ${Math.round(s)}%, ${Math.round(l)}%)`;
}

// Igual hslToCss, mas devolvendo hex -- só usada pra mandar a cor de fundo
// atual pro processo principal (ver syncTitleBarOverlayColor), já que os
// botõezinhos nativos de minimizar/maximizar/fechar (setTitleBarOverlay)
// não entendem "hsl(...)", só hex.
function hslToHex(h, s, l) {
  const sN = s / 100, lN = l / 100;
  const k = (n) => (n + h / 30) % 12;
  const a = sN * Math.min(lN, 1 - lN);
  const f = (n) => lN - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (n) => Math.round(f(n) * 255).toString(16).padStart(2, '0');
  return `#${toHex(0)}${toHex(8)}${toHex(4)}`;
}

// Decide se o texto/ícone em cima da cor de destaque deve ser claro ou
// escuro, pelo brilho percebido (luminância) da cor -- não dá pra usar só
// a "lightness" do HSL porque tons de azul/roxo parecem mais escuros do
// que a lightness sugere (é assim que os 3 temas prontos já escolhem).
function getOnAccentColor(hex) {
  const { r, g, b } = hexToRgb(hex);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance > 0.5 ? '#16171a' : '#ffffff';
}

// A partir de uma única cor (a "accent" do tema), gera um fundo/painéis
// tingidos com o mesmo tom -- é isso que faz o PrimalVoice inteiro mudar de
// cara, não só os botões. `sat` é o quanto de saturação entra nesse tom
// (0-100, os temas prontos sempre usam 32); `mode` escolhe se o fundo
// gerado é escuro (padrão, como o resto do PrimalVoice) ou claro (só o
// "Tema Personalizado" oferece isso).
function deriveThemePalette(accentHex, { sat = 32, mode = 'escuro' } = {}) {
  const { h } = hexToHsl(accentHex);
  if (mode === 'claro') {
    return {
      bg: hslToCss(h, sat, 94),
      panel: hslToCss(h, sat, 89),
      tileBg: hslToCss(h, sat, 98),
      border: hslToCss(h, sat, 78),
      hoverStrong: hslToCss(h, sat, 82),
      surfaceDeep: hslToCss(h, sat, 97),
      surfaceRaised: hslToCss(h, sat, 85),
      qualityDim: hslToCss(h, Math.max(sat - 14, 18), 45),
      onAccent: getOnAccentColor(accentHex),
    };
  }
  return {
    bg: hslToCss(h, sat, 10),
    panel: hslToCss(h, sat, 15),
    tileBg: hslToCss(h, sat, 6),
    border: hslToCss(h, sat, 24),
    hoverStrong: hslToCss(h, sat, 20),
    surfaceDeep: hslToCss(h, sat, 7),
    surfaceRaised: hslToCss(h, sat, 19),
    qualityDim: hslToCss(h, Math.max(sat - 14, 18), 42),
    onAccent: getOnAccentColor(accentHex),
  };
}

// Quando o "Tema Personalizado" tem MAIS de uma cor (um degradê de
// verdade, montado com "+ Adicionar cor"), uma única cor não dá conta de
// mostrar as outras -- por isso, em vez de tingir tudo com o tom da
// primeira, cada "camada" da interface (fundo, painel, quadradinho,
// borda...) puxa o tom de uma cor diferente da lista (girando entre elas
// se tiver menos cores que camadas). Assim o PrimalVoice inteiro mostra
// TODAS as cores escolhidas, cada uma numa parte diferente da tela, em vez
// de só a primeira "vencer" -- é o que faz um degradê de várias cores
// realmente aparecer, igual pediram.
function deriveThemePaletteFromColors(colors, { sat = 32, mode = 'escuro' } = {}) {
  const list = Array.isArray(colors) && colors.length ? colors : ['#5865f2'];
  if (list.length === 1) return deriveThemePalette(list[0], { sat, mode });
  const hues = list.map((c) => hexToHsl(c).h);
  const pick = (i) => hues[i % hues.length];
  const light = mode === 'claro';
  const L = light
    ? { bg: 94, panel: 89, tileBg: 98, border: 78, hoverStrong: 82, surfaceDeep: 97, surfaceRaised: 85, qualityDim: 45 }
    : { bg: 10, panel: 15, tileBg: 6, border: 24, hoverStrong: 20, surfaceDeep: 7, surfaceRaised: 19, qualityDim: 42 };
  return {
    bg: hslToCss(pick(0), sat, L.bg),
    panel: hslToCss(pick(1), sat, L.panel),
    tileBg: hslToCss(pick(2), sat, L.tileBg),
    border: hslToCss(pick(3), sat, L.border),
    hoverStrong: hslToCss(pick(1), sat, L.hoverStrong),
    surfaceDeep: hslToCss(pick(2), sat, L.surfaceDeep),
    surfaceRaised: hslToCss(pick(0), sat, L.surfaceRaised),
    qualityDim: hslToCss(pick(0), Math.max(sat - 14, 18), L.qualityDim),
    onAccent: getOnAccentColor(list[0]),
  };
}

// Estado do "Tema Personalizado" -- ver a seção "criar tema personalizado"
// mais abaixo pra tudo que edita isso (grade de cor, degradê de matiz,
// campo hex, intensidade, claro/escuro, etc). Fica aqui em cima porque
// applyColorTheme() precisa ler o estado atual quando key === 'custom'.
let customThemeColors = ['#5865f2'];
let customThemeMode = 'escuro';
let customThemeIntensity = 32;
let customThemeAngle = 135;

// Manda a cor de fundo (--bg) EFETIVA (já com o tema/tema colorido/tema
// personalizado aplicado -- ou a de fábrica do tema padrão, se nenhum
// estiver ativo) pro processo principal, pra recolorir os botõezinhos
// nativos de minimizar/maximizar/fechar junto (ver window:setTitleBarOverlay
// no main.js -- CSS não alcança eles). Lê o valor computado (não só o
// inline) porque, sem nenhum tema colorido/personalizado, --bg vem só da
// folha de estilo (um hex fixo por tema padrão), não de um style.setProperty.
function syncTitleBarOverlayColor() {
  if (!window.vortex || typeof window.vortex.setTitleBarOverlay !== 'function') return;
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
  const hslMatch = raw.match(/^hsl\((\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?)%,\s*(\d+(?:\.\d+)?)%\)$/i);
  const hex = hslMatch ? hslToHex(Number(hslMatch[1]), Number(hslMatch[2]), Number(hslMatch[3])) : raw;
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return;
  const symbolColor = getOnAccentColor(hex) === '#16171a' ? '#3a3d42' : '#c8ccd1';
  window.vortex.setTitleBarOverlay(hex, symbolColor);
}

function applyColorTheme(key) {
  const root = document.documentElement;
  const activeKey = key || '';
  let theme = null;
  let paletteAccent = null;
  let paletteOpts = { sat: 32, mode: 'escuro' };
  let displayName = null;
  // Degradê de verdade (--app-bg-gradient) pros painéis grandes -- ver
  // comentário em cima da regra `html.theme-gradient-active` no style.css.
  // Só existe quando o tema tem MAIS de uma cor de fato; um tom só continua
  // no jeito antigo (cor sólida derivada, sem classe nenhuma).
  let gradientCss = null;
  if (activeKey === 'custom') {
    paletteAccent = customThemeColors[0] || '#5865f2';
    paletteOpts = { sat: customThemeIntensity, mode: customThemeMode };
    displayName = 'Tema Personalizado';
    if (customThemeColors.length > 1) {
      gradientCss = `linear-gradient(${customThemeAngle}deg, ${customThemeColors.join(', ')})`;
    }
  } else if (activeKey) {
    theme = COLOR_THEMES.find((t) => t.key === activeKey) || null;
    if (theme) {
      paletteAccent = theme.accent;
      displayName = theme.name;
      if (theme.css && theme.css.startsWith('linear-gradient')) {
        gradientCss = theme.css;
      }
    }
  }
  if (!paletteAccent) {
    COLOR_THEME_PALETTE_VARS.forEach((v) => root.style.removeProperty(v));
    CUSTOM_THEME_TEXT_VARS.forEach((v) => root.style.removeProperty(v));
  } else {
    // Um "Tema Personalizado" com várias cores usa a versão que gira entre
    // todas elas (ver comentário acima da função); os temas prontos e um
    // "Tema Personalizado" de uma cor só continuam com a versão simples.
    const palette = activeKey === 'custom' && customThemeColors.length > 1
      ? deriveThemePaletteFromColors(customThemeColors, paletteOpts)
      : deriveThemePalette(paletteAccent, paletteOpts);
    root.style.setProperty('--bg', palette.bg);
    root.style.setProperty('--panel', palette.panel);
    root.style.setProperty('--tile-bg', palette.tileBg);
    root.style.setProperty('--border', palette.border);
    root.style.setProperty('--hover-strong', palette.hoverStrong);
    root.style.setProperty('--surface-deep', palette.surfaceDeep);
    root.style.setProperty('--surface-raised', palette.surfaceRaised);
    root.style.setProperty('--quality-dim', palette.qualityDim);
    root.style.setProperty('--on-accent', palette.onAccent);
    // Só o "Tema Personalizado" no modo "Claro" mexe no texto -- os temas
    // prontos são todos pensados pra continuar em cima de texto claro.
    if (activeKey === 'custom' && customThemeMode === 'claro') {
      root.style.setProperty('--text', '#1b1c1f');
      root.style.setProperty('--muted', '#5b5d63');
    } else {
      CUSTOM_THEME_TEXT_VARS.forEach((v) => root.style.removeProperty(v));
    }
  }
  if (gradientCss) {
    root.style.setProperty('--app-bg-gradient', gradientCss);
    root.classList.add('theme-gradient-active');
  } else {
    root.style.removeProperty('--app-bg-gradient');
    root.classList.remove('theme-gradient-active');
  }
  document.querySelectorAll('.color-theme-swatch').forEach((btn) => {
    btn.classList.toggle('active', !!paletteAccent && btn.dataset.themeKey === activeKey);
  });
  if (themePreviewPanelActiveName) {
    themePreviewPanelActiveName.textContent = displayName ? `Tema atual: ${displayName}` : 'Tema atual: Padrão';
  }
  syncTitleBarOverlayColor();
}

async function loadColorThemeFromConfig(cfg) {
  if (cfg.customTheme) {
    customThemeColors = Array.isArray(cfg.customTheme.colors) && cfg.customTheme.colors.length
      ? cfg.customTheme.colors.slice()
      : ['#5865f2'];
    customThemeMode = cfg.customTheme.mode === 'claro' ? 'claro' : 'escuro';
    customThemeIntensity = Number.isFinite(cfg.customTheme.intensity) ? cfg.customTheme.intensity : 32;
    customThemeAngle = Number.isFinite(cfg.customTheme.angle) ? cfg.customTheme.angle : 135;
    if (typeof renderCustomThemeChips === 'function') renderCustomThemeChips();
  }
  applyColorTheme(cfg.colorTheme || '');
}

// Monta os quadradinhos de um "Temas coloridos" dentro do container dado --
// usada tanto pra grade normal (dentro das configurações) quanto pra cópia
// que mora no painel de prévia lateral (ver mais abaixo). As duas grades
// ficam sempre sincronizadas "de graça": applyColorTheme() marca/desmarca
// `.active` em TODOS os `.color-theme-swatch` da página, não só numa grade.
// O quadradinho de "Tema Personalizado" (com o ícone de paleta) já vem no
// HTML, fora dessa função -- ela só entra com os temas prontos, DEPOIS dele.
function buildColorThemeSwatches(container) {
  if (!container || container.querySelector('.color-theme-swatch-preset')) return;
  COLOR_THEMES.forEach((theme) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'color-theme-swatch color-theme-swatch-preset';
    btn.dataset.accent = theme.accent;
    btn.dataset.themeKey = theme.key;
    btn.style.background = theme.css;
    if (theme.badge) {
      const badgeEl = document.createElement('span');
      badgeEl.className = 'color-theme-badge';
      badgeEl.textContent = theme.badge;
      btn.appendChild(badgeEl);
    }
    upgradeTooltip(btn, { text: theme.name, dir: 'top' });
    btn.addEventListener('click', async () => {
      const cfg = (await window.vortex.getConfig()) || {};
      // Independente da ordem que a pessoa mexeu nos controles: se ela já
      // escolheu uma "Cor de destaque" própria (em qualquer momento, antes
      // OU depois de mexer aqui), essa cor tem prioridade e o tema colorido
      // não a sobrescreve -- só repinta o fundo/painéis. A accent do tema
      // só é usada como sugestão quando ainda não tem nenhuma cor de botão
      // escolhida (primeira vez, tema "de fábrica").
      if (!cfg.accentColor) {
        applyAccent(theme.accent);
        cfg.accentColor = theme.accent;
      }
      applyColorTheme(theme.key);
      cfg.colorTheme = theme.key;
      await window.vortex.setConfig(cfg);
    });
    container.appendChild(btn);
  });
}

function renderColorThemeGrid() {
  buildColorThemeSwatches(colorThemeGrid);
  buildColorThemeSwatches(themePreviewPanelGrid);
}
renderColorThemeGrid();

// ---------- aparência (criar tema personalizado) ----------
// Igual o "Personalize o seu tema" do Discord: em vez de só escolher entre
// os temas prontos, a pessoa monta o próprio -- arrasta na caixa de
// saturação/brilho + na barra de matiz (ou digita o hex, ou usa o
// conta-gotas do seletor nativo do Windows) pra escolher uma cor, pode
// empilhar mais de uma com "Adicionar cor" pra virar um degradê, escolhe se
// o fundo gerado fica Escuro ou Claro, e controla "Intensidade de cor"
// (quanto de saturação entra no fundo). Tudo se aplica ao vivo -- o painel
// abre do lado, igual o de "Pré-visualizar tema" logo abaixo.
function hexToHsv(hex) {
  const { r, g, b } = hexToRgb(hex);
  const rN = r / 255, gN = g / 255, bN = b / 255;
  const max = Math.max(rN, gN, bN), min = Math.min(rN, gN, bN);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    switch (max) {
      case rN: h = ((gN - bN) / d) % 6; break;
      case gN: h = (bN - rN) / d + 2; break;
      default: h = (rN - gN) / d + 4; break;
    }
    h *= 60;
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : d / max;
  return { h, s: s * 100, v: max * 100 };
}

function hsvToHex(h, s, v) {
  const sN = s / 100, vN = v / 100;
  const c = vN * sN;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = vN - c;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }
  const toHex = (n) => Math.round((n + m) * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

let customThemeEditHue = 235;
let customThemeEditSat = 55;
let customThemeEditVal = 95;
let customThemeActiveChip = 0; // índice em customThemeColors sendo editado agora

// Salva o estado atual (cores, modo, intensidade) no config e reaplica o
// tema personalizado na tela -- chamada a cada mudancinha (arrastar a
// caixa, mexer no matiz, digitar hex, add/remover cor, trocar claro/
// escuro, mexer na intensidade), pra tudo ficar sempre ao vivo, igual os
// temas prontos.
async function commitCustomTheme() {
  const cfg = (await window.vortex.getConfig()) || {};
  if (!cfg.accentColor) {
    applyAccent(customThemeColors[0]);
    cfg.accentColor = customThemeColors[0];
  }
  applyColorTheme('custom');
  cfg.colorTheme = 'custom';
  cfg.customTheme = {
    colors: customThemeColors.slice(),
    mode: customThemeMode,
    intensity: customThemeIntensity,
    angle: customThemeAngle,
  };
  await window.vortex.setConfig(cfg);
}

function renderCustomThemeSvBoxUI() {
  if (customThemeSvBox) customThemeSvBox.style.setProperty('--edit-hue', customThemeEditHue);
  if (customThemeSvHandle) {
    customThemeSvHandle.style.left = `${customThemeEditSat}%`;
    customThemeSvHandle.style.top = `${100 - customThemeEditVal}%`;
  }
  if (customThemeHueInput) customThemeHueInput.value = customThemeEditHue;
}

function renderCustomThemeHexUI(hex) {
  if (customThemeHexInput) customThemeHexInput.value = hex;
  if (customThemeHexSwatch) customThemeHexSwatch.style.background = hex;
}

// Monta os "chips" (bolinhas pequenas) de cada cor já adicionada ao
// degradê -- clicar numa carrega ela de volta na caixa pra editar, clicar
// no X remove (menos a última: sempre sobra pelo menos uma cor).
function renderCustomThemeChips() {
  if (!customThemeColorChips) return;
  customThemeColorChips.innerHTML = '';
  customThemeColors.forEach((hex, i) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'custom-theme-color-chip';
    chip.style.background = hex;
    chip.classList.toggle('active', i === customThemeActiveChip);
    chip.title = hex;
    chip.addEventListener('click', () => {
      customThemeActiveChip = i;
      const hsv = hexToHsv(customThemeColors[i]);
      customThemeEditHue = hsv.h; customThemeEditSat = hsv.s; customThemeEditVal = hsv.v;
      renderCustomThemeSvBoxUI();
      renderCustomThemeHexUI(customThemeColors[i]);
      renderCustomThemeChips();
    });
    if (customThemeColors.length > 1) {
      const removeBtn = document.createElement('span');
      removeBtn.className = 'custom-theme-color-chip-remove';
      removeBtn.textContent = '×';
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        customThemeColors.splice(i, 1);
        if (customThemeActiveChip >= customThemeColors.length) customThemeActiveChip = customThemeColors.length - 1;
        const hsv = hexToHsv(customThemeColors[customThemeActiveChip]);
        customThemeEditHue = hsv.h; customThemeEditSat = hsv.s; customThemeEditVal = hsv.v;
        renderCustomThemeSvBoxUI();
        renderCustomThemeHexUI(customThemeColors[customThemeActiveChip]);
        renderCustomThemeChips();
        commitCustomTheme();
      });
      chip.appendChild(removeBtn);
    }
    customThemeColorChips.appendChild(chip);
  });
}

// A cor sendo editada agora na caixa/matiz/hex sempre vira a cor do chip
// ativo, e já aplica na tela ao vivo.
function updateActiveChipColor(hex) {
  customThemeColors[customThemeActiveChip] = hex;
  renderCustomThemeChips();
  commitCustomTheme();
}

function handleCustomThemeSvPointer(clientX, clientY) {
  if (!customThemeSvBox) return;
  const rect = customThemeSvBox.getBoundingClientRect();
  const width = rect.width || 1;
  const height = rect.height || 1;
  const x = Math.min(1, Math.max(0, (clientX - rect.left) / width));
  const y = Math.min(1, Math.max(0, (clientY - rect.top) / height));
  customThemeEditSat = x * 100;
  customThemeEditVal = (1 - y) * 100;
  const hex = hsvToHex(customThemeEditHue, customThemeEditSat, customThemeEditVal);
  renderCustomThemeSvBoxUI();
  renderCustomThemeHexUI(hex);
  updateActiveChipColor(hex);
}

if (customThemeSvBox) {
  let draggingSv = false;
  customThemeSvBox.addEventListener('mousedown', (e) => {
    draggingSv = true;
    handleCustomThemeSvPointer(e.clientX, e.clientY);
  });
  document.addEventListener('mousemove', (e) => {
    if (draggingSv) handleCustomThemeSvPointer(e.clientX, e.clientY);
  });
  document.addEventListener('mouseup', () => { draggingSv = false; });
}

if (customThemeHueInput) {
  customThemeHueInput.addEventListener('input', () => {
    customThemeEditHue = Number(customThemeHueInput.value);
    const hex = hsvToHex(customThemeEditHue, customThemeEditSat, customThemeEditVal);
    renderCustomThemeSvBoxUI();
    renderCustomThemeHexUI(hex);
    updateActiveChipColor(hex);
  });
}

if (customThemeHexInput) {
  customThemeHexInput.addEventListener('change', () => {
    const raw = customThemeHexInput.value.trim();
    const hex = /^#?[0-9a-f]{6}$/i.test(raw) ? (raw.startsWith('#') ? raw : `#${raw}`) : null;
    if (!hex) { renderCustomThemeHexUI(customThemeColors[customThemeActiveChip]); return; }
    const hsv = hexToHsv(hex);
    customThemeEditHue = hsv.h; customThemeEditSat = hsv.s; customThemeEditVal = hsv.v;
    renderCustomThemeSvBoxUI();
    renderCustomThemeHexUI(hex);
    updateActiveChipColor(hex);
  });
}

if (customThemeEyedropBtn && customThemeNativePicker) {
  customThemeEyedropBtn.addEventListener('click', () => customThemeNativePicker.click());
  customThemeNativePicker.addEventListener('input', () => {
    const hex = customThemeNativePicker.value;
    const hsv = hexToHsv(hex);
    customThemeEditHue = hsv.h; customThemeEditSat = hsv.s; customThemeEditVal = hsv.v;
    renderCustomThemeSvBoxUI();
    renderCustomThemeHexUI(hex);
    updateActiveChipColor(hex);
  });
}

if (customThemeAddColorBtn) {
  customThemeAddColorBtn.addEventListener('click', () => {
    if (customThemeColors.length >= 5) return;
    customThemeColors.push(customThemeColors[customThemeActiveChip]);
    customThemeActiveChip = customThemeColors.length - 1;
    renderCustomThemeChips();
    commitCustomTheme();
  });
}

if (customThemeAngleInput) {
  customThemeAngleInput.addEventListener('input', () => {
    customThemeAngle = Number(customThemeAngleInput.value);
    if (customThemeAngleValueEl) customThemeAngleValueEl.textContent = `${customThemeAngle}°`;
    commitCustomTheme();
  });
}

if (customThemeIntensityInput) {
  customThemeIntensityInput.addEventListener('input', () => {
    customThemeIntensity = Number(customThemeIntensityInput.value);
    if (customThemeIntensityValueEl) customThemeIntensityValueEl.textContent = `${customThemeIntensity}%`;
    commitCustomTheme();
  });
}

customThemeModeBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    customThemeMode = btn.dataset.mode === 'claro' ? 'claro' : 'escuro';
    customThemeModeBtns.forEach((b) => b.classList.toggle('active', b === btn));
    commitCustomTheme();
  });
});

// "Surpreenda-me!": sorteia de 1 a 3 cores, uma intensidade e um modo
// (a maioria das vezes Escuro, já que o resto do PrimalVoice é escuro).
if (customThemeSurpriseBtn) {
  customThemeSurpriseBtn.addEventListener('click', () => {
    const count = 1 + Math.floor(Math.random() * 3);
    customThemeColors = [];
    for (let i = 0; i < count; i++) {
      const h = Math.floor(Math.random() * 360);
      const s = 45 + Math.floor(Math.random() * 45);
      const v = 55 + Math.floor(Math.random() * 40);
      customThemeColors.push(hsvToHex(h, s, v));
    }
    customThemeActiveChip = 0;
    customThemeIntensity = 20 + Math.floor(Math.random() * 45);
    customThemeMode = Math.random() < 0.7 ? 'escuro' : 'claro';
    const hsv = hexToHsv(customThemeColors[0]);
    customThemeEditHue = hsv.h; customThemeEditSat = hsv.s; customThemeEditVal = hsv.v;
    renderCustomThemeSvBoxUI();
    renderCustomThemeHexUI(customThemeColors[0]);
    renderCustomThemeChips();
    if (customThemeIntensityInput) customThemeIntensityInput.value = customThemeIntensity;
    if (customThemeIntensityValueEl) customThemeIntensityValueEl.textContent = `${customThemeIntensity}%`;
    customThemeModeBtns.forEach((b) => b.classList.toggle('active', b.dataset.mode === customThemeMode));
    commitCustomTheme();
  });
}

if (customThemeResetBtn) {
  customThemeResetBtn.addEventListener('click', () => {
    customThemeColors = ['#5865f2'];
    customThemeActiveChip = 0;
    customThemeIntensity = 32;
    customThemeAngle = 135;
    customThemeMode = 'escuro';
    const hsv = hexToHsv('#5865f2');
    customThemeEditHue = hsv.h; customThemeEditSat = hsv.s; customThemeEditVal = hsv.v;
    renderCustomThemeSvBoxUI();
    renderCustomThemeHexUI('#5865f2');
    renderCustomThemeChips();
    if (customThemeIntensityInput) customThemeIntensityInput.value = customThemeIntensity;
    if (customThemeIntensityValueEl) customThemeIntensityValueEl.textContent = '32%';
    if (customThemeAngleInput) customThemeAngleInput.value = customThemeAngle;
    if (customThemeAngleValueEl) customThemeAngleValueEl.textContent = '135°';
    customThemeModeBtns.forEach((b) => b.classList.toggle('active', b.dataset.mode === 'escuro'));
    commitCustomTheme();
  });
}

function openCustomThemePanel() {
  closeSettingsModal();
  if (themePreviewPanel) themePreviewPanel.hidden = true;
  if (customThemePanel) customThemePanel.hidden = false;
  const hsv = hexToHsv(customThemeColors[customThemeActiveChip] || '#5865f2');
  customThemeEditHue = hsv.h; customThemeEditSat = hsv.s; customThemeEditVal = hsv.v;
  renderCustomThemeSvBoxUI();
  renderCustomThemeHexUI(customThemeColors[customThemeActiveChip] || '#5865f2');
  renderCustomThemeChips();
  if (customThemeIntensityInput) customThemeIntensityInput.value = customThemeIntensity;
  if (customThemeIntensityValueEl) customThemeIntensityValueEl.textContent = `${customThemeIntensity}%`;
  if (customThemeAngleInput) customThemeAngleInput.value = customThemeAngle;
  if (customThemeAngleValueEl) customThemeAngleValueEl.textContent = `${customThemeAngle}°`;
  customThemeModeBtns.forEach((b) => b.classList.toggle('active', b.dataset.mode === customThemeMode));
}

function closeCustomThemePanel() {
  if (customThemePanel) customThemePanel.hidden = true;
  openSettingsModal('appearance');
}

document.querySelectorAll('.color-theme-swatch-custom').forEach((btn) => {
  upgradeTooltip(btn, { text: 'Tema Personalizado', dir: 'top' });
  btn.addEventListener('click', () => {
    customThemeActiveChip = 0;
    openCustomThemePanel();
  });
});

if (customThemeCloseBtn) customThemeCloseBtn.addEventListener('click', closeCustomThemePanel);
if (customThemeBackBtn) customThemeBackBtn.addEventListener('click', closeCustomThemePanel);

// "Pré-visualizar tema": igual o Discord faz -- fecha as configurações pra
// mostrar a conversa ou o servidor de verdade por trás (a cor já foi
// aplicada e salva assim que a pessoa clicou nela, então não tem passo de
// "confirmar"), e abre um painel fixo do lado direito com a MESMA grade de
// temas coloridos, pra dar pra continuar trocando de cor vendo o resultado
// ao vivo, sem precisar voltar pras configurações toda hora. O botão "Sair
// da prévia" fecha o painel e volta pra aba de aparência.
if (previewThemeBtn) {
  previewThemeBtn.addEventListener('click', () => {
    closeSettingsModal();
    if (customThemePanel) customThemePanel.hidden = true;
    if (themePreviewPanel) themePreviewPanel.hidden = false;
  });
}
if (themePreviewExitBtn) {
  themePreviewExitBtn.addEventListener('click', () => {
    if (themePreviewPanel) themePreviewPanel.hidden = true;
    openSettingsModal('appearance');
  });
}

// ---------- aparência (fonte) ----------
const FONT_STACKS = {
  padrao: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif`,
  classica: `Georgia, "Times New Roman", serif`,
  arredondada: `Calibri, Verdana, sans-serif`,
  tecnica: `Consolas, "Cascadia Code", monospace`,
  amigavel: `"Comic Sans MS", "Trebuchet MS", sans-serif`,
};
function applyFont(fontKey) {
  const key = FONT_STACKS[fontKey] ? fontKey : 'padrao';
  document.documentElement.style.setProperty('--font-family', FONT_STACKS[key]);
  document.querySelectorAll('.font-option').forEach((btn) => {
    btn.classList.toggle('active', (btn.dataset.font || 'padrao') === key);
  });
}
async function loadFontFromConfig(cfg) {
  applyFont(cfg.fontFamily || 'padrao');
}
if (fontOptionList) {
  fontOptionList.querySelectorAll('.font-option').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const fontKey = btn.dataset.font || 'padrao';
      applyFont(fontKey);
      const cfg = (await window.vortex.getConfig()) || {};
      cfg.fontFamily = fontKey;
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
  // a seção inteira "Sala da galera" (Canais/Cargos) some se a pessoa não
  // tiver NENHUMA das permissões dela -- senão ficava um título de seção
  // solto sem nenhuma aba embaixo
  const serverSection = document.getElementById('modal-tabs-server-section');
  if (serverSection) {
    const anyVisible = Array.from(serverSection.querySelectorAll('.modal-tab[data-perm]')).some((tab) => !tab.hidden);
    serverSection.hidden = !anyVisible;
  }
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
    { micId: '', speakerId: '', cameraId: '', screenResolution: '1080p', screenFrameRate: 30, outputVolume: 1 },
    cfg.devicePrefs || {}
  );
  masterOutputVolume = devicePrefs.outputVolume;
  if (sharepickResolutionSelect) sharepickResolutionSelect.value = devicePrefs.screenResolution;
  if (sharepickFramerateSelect) sharepickFramerateSelect.value = String(devicePrefs.screenFrameRate);
  keybinds = Object.assign({ muteSelf: '', deafen: '' }, cfg.keybinds || {});
  keybindMuteBtn.textContent = keybinds.muteSelf || 'Definir atalho';
  keybindDeafenBtn.textContent = keybinds.deafen || 'Definir atalho';
  if (keybinds.muteSelf) await window.vortex.setShortcut('muteSelf', keybinds.muteSelf);
  if (keybinds.deafen) await window.vortex.setShortcut('deafen', keybinds.deafen);
}

function loadMemberNotesFromConfig(cfg) {
  memberNotes = Object.assign({}, cfg.memberNotes || {});
}

// Salva as notas com um delayzinho (debounce) pra não gravar o config.json a
// cada tecla digitada -- só grava de fato uns instantes depois que a pessoa
// para de digitar.
function scheduleSaveMemberNotes() {
  clearTimeout(saveMemberNotesTimer);
  saveMemberNotesTimer = setTimeout(async () => {
    const cfg = (await window.vortex.getConfig()) || {};
    cfg.memberNotes = memberNotes;
    await window.vortex.setConfig(cfg);
  }, 500);
}

function loadMemberVolumesFromConfig(cfg) {
  savedMemberVolumes = Object.assign({}, cfg.memberVolumes || {});
}

// Mesma ideia do scheduleSaveMemberNotes acima -- debounce pra não gravar o
// config.json a cada tiquinho do slider (só grava no soltar do mouse, ver
// o listener de 'change' do volumeSlider).
function scheduleSaveMemberVolumes() {
  clearTimeout(saveMemberVolumesTimer);
  saveMemberVolumesTimer = setTimeout(async () => {
    const cfg = (await window.vortex.getConfig()) || {};
    cfg.memberVolumes = savedMemberVolumes;
    await window.vortex.setConfig(cfg);
  }, 500);
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
  return soundboardMuted ? 0 : soundboardEffectsVolume * masterOutputVolume;
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
    el.muted = !!blocked;
  });
  soundboardLocalGains.forEach((gain) => { gain.gain.value = vol; });
}

// Volume geral de SAÍDA (equivalente ao "Volume de saída" do Discord) — mexe
// em cima do volume de cada pessoa/transmissão/efeito sonoro, sem apagar as
// preferências individuais (por isso reaplica applyVolume/applyStreamVolume/
// applySoundboardVolume em vez de mexer direto nos <audio>).
function setMasterOutputVolume(v) {
  masterOutputVolume = v;
  audioElsByIdentity.forEach((_, identity) => applyVolume(identity));
  streamAudioElsByIdentity.forEach((_, identity) => applyStreamVolume(identity));
  applySoundboardVolume();
  devicePrefs.outputVolume = v;
  saveDevicePrefs();
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
  loadMemberNotesFromConfig(cfg);
  loadMemberVolumesFromConfig(cfg);
  loadProfileFromConfig(cfg);
  loadDmPeersFromConfig(cfg);
  renderDmList();
  loadLocallyHiddenFromConfig(cfg);
  loadSoundboardFromConfig(cfg);
  await loadThemeFromConfig(cfg);
  await loadAccentFromConfig(cfg);
  await loadColorThemeFromConfig(cfg);
  await loadFontFromConfig(cfg);
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
  if (userPanel) userPanel.classList.toggle('collapsed', collapsed);
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
  // a barra flutuante (cinemaControlsBar) fica fixed na janela toda, fora
  // do grid -- então escondendo só o grid ela continuava por cima da tela
  // de texto. Esconde ela também ao sair da visão de voz; volta certinha
  // (se ainda fizer sentido) em showVoiceView, via updateFloatingBarVisibility.
  cinemaControlsBar.hidden = true;
  cinemaControlsBar.classList.remove('visible');
}
function showVoiceView() {
  textView.hidden = true;
  grid.hidden = false;
  updateFloatingBarVisibility();
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
      badge.textContent = badgeText(unread, mentionedChannels.has(channel.id));
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
    renameBtn.innerHTML = PENCIL_ICON_SVG;
    upgradeTooltip(renameBtn, { text: 'Renomear canal' });
    renameBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      startInlineChannelRename(el, channel, type, label);
    });
    el.appendChild(renameBtn);

    const delBtn = document.createElement('button');
    delBtn.className = 'channel-delete-btn';
    upgradeTooltip(delBtn, { text: 'Apagar canal' });
    delBtn.textContent = '✕';
    delBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (serverState.channels[type].length <= 1) {
        alert('Precisa deixar pelo menos um canal desse tipo.');
        return;
      }
      if (!(await confirmDialog(`Apagar o canal "${channel.name}"?`, { confirmLabel: 'Apagar' }))) return;
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

// Entra num canal de voz (ou só troca pra visão dele, se já tiver dentro) --
// usado tanto ao clicar no NOME do canal de voz quanto ao clicar no nome de
// alguém que já está numa chamada (ver o listener de clique em
// voiceChannelsList logo abaixo): os dois levam pro mesmo lugar.
function enterVoiceChannel(channelId) {
  if (activeVoiceChannelId === channelId) {
    // Já tá NESSE canal de voz -- só volta pra visão dele (caso a pessoa
    // tivesse navegado pro chat de texto enquanto continuava na call).
    // Nunca sai da chamada aqui -- só o botão de desligar (hangup-btn) faz
    // isso.
    const channel = serverState.channels.voice.find((c) => c.id === channelId);
    channelHeaderIcon.innerHTML = VOICE_ICON_SVG;
    channelHeaderName.textContent = channel ? channel.name : '';
    showVoiceView();
    renderChannelLists();
  } else {
    joinVoiceChannel(channelId);
  }
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
    el.addEventListener('click', () => enterVoiceChannel(ch.id));
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
  // Trocar de conversa cancela uma resposta pendente -- "Responder" citando
  // uma mensagem de OUTRO canal/DM não faz sentido nenhum.
  clearReplyingTo();
  // Sair da conversa em que estava antes consome de vez a linha "NOVO" dela
  // -- reabrir depois não deve mais mostrar a mesma linha (ver
  // channelUnreadMarker lá em cima).
  if (activeTextChannelId) channelUnreadMarker.delete(activeTextChannelId);
  activeTextChannelId = channelId;
  activeDmPeer = null;
  lastServerTextChannelId = channelId;
  showServerView();
  const unreadAtEntry = unreadCounts.get(channelId) || 0;
  if (unreadAtEntry > 0) channelUnreadMarker.set(channelId, unreadAtEntry);
  else channelUnreadMarker.delete(channelId);
  unreadCounts.delete(channelId);
  mentionedChannels.delete(channelId);
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
  clearReplyingTo();
  if (activeTextChannelId) channelUnreadMarker.delete(activeTextChannelId);
  const isNewPeer = !dmPeers.has(peerIdentity);
  dmPeers.add(peerIdentity);
  if (isNewPeer) saveDmPeersToConfig().catch(() => {});
  activeDmPeer = peerIdentity;
  activeTextChannelId = dmChannelKey(peerIdentity);
  showDmsView();
  const unreadAtEntry = unreadCounts.get(activeTextChannelId) || 0;
  if (unreadAtEntry > 0) channelUnreadMarker.set(activeTextChannelId, unreadAtEntry);
  else channelUnreadMarker.delete(activeTextChannelId);
  unreadCounts.delete(activeTextChannelId);
  mentionedChannels.delete(activeTextChannelId);
  channelHeaderIcon.innerHTML = DM_ICON_SVG;
  channelHeaderName.textContent = displayNameFor(peerIdentity);
  chatInput.placeholder = `Conversar com @${displayNameFor(peerIdentity)}`;
  showTextView();
  renderChannelLists();
  renderDmList();
  renderChatForActiveChannel();
  ensureChannelHistoryLoaded(activeTextChannelId);
}

// Insere "@Fulano " no campo de mensagem da conversa que a pessoa está --
// igual Discord: clicar em "Mencionar" no menu de um membro não abre nada
// novo, só joga o @ dela no meio do que você já tava escrevendo (ou no
// começo, se o campo tava vazio). Se a pessoa estava na visão de voz (sem
// o chat aparecendo), troca pra visão de texto primeiro.
function insertMention(identity) {
  if (!activeTextChannelId) return;
  showTextView();
  const mention = `@${displayNameFor(identity)} `;
  const start = chatInput.selectionStart ?? chatInput.value.length;
  const end = chatInput.selectionEnd ?? chatInput.value.length;
  chatInput.value = chatInput.value.slice(0, start) + mention + chatInput.value.slice(end);
  renderChatInputHighlight();
  chatInput.focus();
  const cursor = start + mention.length;
  chatInput.setSelectionRange(cursor, cursor);
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
        badge.textContent = badgeText(unread, mentionedChannels.has(dmChannelKey(identity)));
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
          badge.textContent = badgeText(unread, mentionedChannels.has(dmChannelKey(identity)));
          icon.appendChild(badge);
        }

        icon.addEventListener('click', () => switchToDm(identity));
        dmQuickList.appendChild(icon);
      });
  }

  let homeUnread = 0;
  let homeHasMention = false;
  dmPeers.forEach((identity) => {
    homeUnread += unreadCounts.get(dmChannelKey(identity)) || 0;
    if (mentionedChannels.has(dmChannelKey(identity))) homeHasMention = true;
  });
  if (homeUnreadBadge) {
    homeUnreadBadge.hidden = homeUnread <= 0;
    homeUnreadBadge.textContent = badgeText(homeUnread, homeHasMention);
  }

  let serverUnread = 0;
  let serverHasMention = false;
  serverState.channels.text.forEach((ch) => {
    serverUnread += unreadCounts.get(ch.id) || 0;
    if (mentionedChannels.has(ch.id)) serverHasMention = true;
  });
  if (serverUnreadBadge) {
    serverUnreadBadge.hidden = serverUnread <= 0;
    serverUnreadBadge.textContent = badgeText(serverUnread, serverHasMention);
  }

  updateTaskbarUnreadBadge();
}

// Reflete o total de mensagens não lidas (todas as conversas e canais de
// texto somados) na bolinha do ícone da barra de tarefas do Windows -- assim
// dá pra notar que tem mensagem nova mesmo com o PrimalVoice minimizado, sem
// precisar abrir o app pra ver.
function updateTaskbarUnreadBadge() {
  let total = 0;
  unreadCounts.forEach((count) => {
    total += count;
  });
  window.vortex?.setUnreadBadge?.(total);
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
    // Só usa esse evento do LiveKit pra pegar rápido o caso de conexão
    // realmente perdida -- excellent/good/poor ficam por conta só do ping de
    // verdade (medido a cada 3s em updateVoiceQualityTooltip/pingQualityTier),
    // porque a classificação do próprio LiveKit é mais generosa (não bate
    // com o "Ping: Xms" mostrado no balãozinho) e ficava sobrescrevendo a
    // cor certa segundos depois de cada correção.
    if (participant === vr.localParticipant && quality === ConnectionQuality.Lost) {
      setVoiceQuality('lost');
    }
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
    else if (publication.source === Track.Source.Camera) {
      setVoiceMemberStatus(participant.identity, { camera: true });
      // 2ª vez em diante ligando a câmera não republica o track (só
      // desmuta a mesma publicação -- ver comentário acima), então é
      // aqui, e não em TrackPublished, que precisa avisar com som.
      if (!isMyIdentity(participant.identity)) playSound(sharingSound);
    }
  });
  const handleTrackPublishedChange = (isPublished, opts = {}) => (publication, participant) => {
    if (publication.source === Track.Source.Camera) setVoiceMemberStatus(participant.identity, { camera: isPublished });
    else if (publication.source === Track.Source.ScreenShare) setVoiceMemberStatus(participant.identity, { screenShare: isPublished });
    // Avisa com um barulhinho quando ALGUÉM (nunca eu mesmo, eu já sei que
    // cliquei) começa a compartilhar tela ou liga a câmera pela primeira
    // vez na chamada -- ajuda a notar sem precisar ficar de olho na tela.
    if (
      opts.playSoundForRemote &&
      isPublished &&
      (publication.source === Track.Source.Camera || publication.source === Track.Source.ScreenShare)
    ) {
      playSound(sharingSound);
    }
  };
  vr.on(RoomEvent.TrackPublished, handleTrackPublishedChange(true, { playSoundForRemote: true }));
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
  // respeita o estado de mic/fone que a pessoa já tinha escolhido ANTES de
  // clicar no canal (pré-mudo, igual Discord) -- só entra com o mic ligado
  // de fato se ela não tinha se mutado nem se ensurdecido antes.
  const startMicOn = micBtn.dataset.on === 'true' && !isDeafened;
  await vr.localParticipant.setMicrophoneEnabled(startMicOn);

  micBtn.dataset.on = String(startMicOn);
  micBtn.classList.toggle('off', !startMicOn);
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
  watchingScreenShare.clear();
  // sem isso a barra flutuante (câmera/volume/parar/mic/desligar) ficava
  // presa na tela mesmo depois de sair da chamada -- inclusive aparecendo
  // por cima de outras telas do app, tipo o chat -- porque nada mais aqui
  // reavaliava se ela deveria continuar visível.
  updateFloatingBarVisibility();
  resetAudioState();
  resetVoiceControlsUI({ keepMicState: true });
  playSound(leaveSound);

  if (!opts.silent) {
    const fallback = serverState.channels.text.find((c) => c.id === activeTextChannelId) || serverState.channels.text[0];
    if (fallback) switchTextChannel(fallback.id);
    else showTextView();
  }
  renderChannelLists();
}

// opts.keepMicState: true quando chamado ao SAIR de uma chamada (ver
// leaveVoiceChannel) -- igual Discord, o estado de mic/fone (mutado ou não)
// continua o mesmo de antes de sair, em vez de sempre voltar mudo. Só NÃO
// preserva no primeiro carregamento do app (login/registro, antes de
// qualquer chamada), onde não existe estado anterior de verdade.
function resetVoiceControlsUI(opts = {}) {
  micBtn.dataset.tooltip = 'Microfone';
  camBtn.dataset.on = 'false';
  camBtn.classList.add('off');
  shareBtn.dataset.on = 'false';
  shareBtn.classList.add('off');
  shareBtn.classList.remove('sharing');
  shareBtn.dataset.tooltip = 'Compartilhar tela';
  currentShareChoice = null;
  // se a pessoa sair do canal de voz (ou desconectar de vez) SEM antes
  // clicar em "parar de compartilhar", o botão de compartilhar zerava aqui
  // mas o overlay por cima de outras janelas ficava esquecido, ligado --
  // preso na tela dela pra sempre até fechar o app de vez pela bandeja.
  // isso tem que ser desligado sempre que a chamada acaba, não só quando
  // a pessoa clica pra parar de compartilhar.
  window.vortex.hideShareOverlay?.();
  if (!opts.keepMicState) {
    setDeafened(false, { silent: true });
    micMutedBeforeDeafen = false;
    // igual Discord: por padrão (primeira vez, sem nenhuma escolha prévia)
    // o microfone começa LIGADO -- a pessoa que preferir entrar mutada
    // desliga antes mesmo de entrar num canal, e essa escolha é respeitada
    // na hora de conectar de fato (ver completeConnect).
    micBtn.dataset.on = 'true';
    micBtn.classList.remove('off');
  }
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
  // Onde entra a linha vermelha "NOVO" (ver channelUnreadMarker): logo antes
  // das últimas N mensagens do histórico, sendo N a quantidade que estava
  // sem ler quando a pessoa abriu essa conversa agora.
  const unreadMarkCount = channelUnreadMarker.get(activeTextChannelId) || 0;
  const dividerBeforeIndex = unreadMarkCount > 0 ? Math.max(0, history.length - unreadMarkCount) : -1;
  history.forEach((msg, index) => {
    if (index === dividerBeforeIndex) appendNewMessagesDivider();
    appendChatMessageEl(msg);
  });
}

function appendNewMessagesDivider() {
  const empty = chatMessages.querySelector('.chat-empty');
  if (empty) empty.remove();

  const divider = document.createElement('div');
  divider.className = 'new-messages-divider';
  const line = document.createElement('span');
  line.className = 'new-messages-divider-line';
  divider.appendChild(line);
  const label = document.createElement('span');
  label.className = 'new-messages-divider-label';
  label.textContent = 'NOVO';
  divider.appendChild(label);
  chatMessages.appendChild(divider);
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
      appendTextWithMentions(container, text.slice(lastIndex, match.index));
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
    appendTextWithMentions(container, text.slice(lastIndex));
  }
}

// Escreve um pedaço de texto (sem nenhum link já identificado ali dentro),
// destacando em azul qualquer "@Nome" que bata com alguém conhecido —
// exatamente igual um link (mesma cor), só que sem abrir nada ao clicar.
function appendTextWithMentions(container, segment) {
  const mentionRe = buildMentionRegex();
  if (!mentionRe) {
    container.appendChild(document.createTextNode(segment));
    return;
  }
  let last = 0;
  let m;
  mentionRe.lastIndex = 0;
  while ((m = mentionRe.exec(segment))) {
    if (m.index > last) container.appendChild(document.createTextNode(segment.slice(last, m.index)));
    const span = document.createElement('span');
    span.className = 'chat-mention';
    span.textContent = m[0];
    const mentionedIdentity = identityForMentionName(m[0].slice(1));
    if (mentionedIdentity) span.dataset.identity = mentionedIdentity;
    container.appendChild(span);
    last = m.index + m[0].length;
  }
  if (last < segment.length) container.appendChild(document.createTextNode(segment.slice(last)));
}

// Redesenha a div .chat-input-highlight por trás do campo de mensagem,
// mostrando o texto atual com qualquer "@Nome" já em chip -- reaproveita
// EXATAMENTE a mesma função usada pra desenhar mensagens já enviadas
// (appendTextWithMentions), então o chip fica idêntico enquanto digita e
// depois de mandado. Chamada a cada tecla (evento 'input' do campo) e toda
// vez que o próprio código muda chatInput.value programaticamente (menção
// inserida pelo autocomplete/menu de contexto, campo limpo ao enviar etc.)
// -- essas mudanças não disparam 'input' sozinhas.
function renderChatInputHighlight() {
  if (!chatInputHighlight) return;
  chatInputHighlight.innerHTML = '';
  appendTextWithMentions(chatInputHighlight, chatInput.value);
  chatInputHighlight.scrollLeft = chatInput.scrollLeft;
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
  upgradeTooltip(thumbWrap, { text: 'Tocar vídeo', dir: 'top' });
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
  upgradeTooltip(externalBtn, { text: 'Abrir no navegador', dir: 'top' });
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
const EYE_ICON_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
const REPLY_ICON_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 17 4 12 9 7"></polyline><path d="M20 18v-2a4 4 0 0 0-4-4H4"></path></svg>';
const REACTION_ICON_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M8 14s1.5 2 4 2 4-2 4-2"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg>';
const HIDE_FOR_ME_ICON_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a18.5 18.5 0 0 1 5.06-5.94M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>';
// Emojis fixos pro seletor rápido de reação (ver openReactionPicker) --
// conjunto pequeno e curado (mesma ideia do soundboard: não precisa de um
// seletor de emoji completo igual Discord pra cobrir o pedido "adicionar
// reação").
const QUICK_REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥', '🎉', '👎'];
const PERSON_ICON_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>';
const KEBAB_ICON_SVG =
  '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><circle cx="12" cy="5" r="2"></circle><circle cx="12" cy="12" r="2"></circle><circle cx="12" cy="19" r="2"></circle></svg>';

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

// Abre uma imagem do chat em tamanho grande por cima de tudo, igual
// Discord: clica na miniatura, aparece um fundo escuro com a foto grande no
// meio; clica em qualquer lugar fora dela (ou no X, ou aperta Esc) fecha de
// novo. Só imagem -- vídeo já tem os próprios controles nativos (play,
// tela cheia), não precisa desse tratamento.
function openImageLightbox(src, alt) {
  const overlay = document.createElement('div');
  overlay.className = 'image-lightbox-overlay';
  overlay.addEventListener('click', () => close());

  const img = document.createElement('img');
  img.className = 'image-lightbox-img';
  img.src = src;
  img.alt = alt || '';
  img.addEventListener('click', (e) => e.stopPropagation());
  overlay.appendChild(img);

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'image-lightbox-close';
  closeBtn.title = 'Fechar';
  closeBtn.innerHTML =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    close();
  });
  overlay.appendChild(closeBtn);

  function onKeyDown(e) {
    if (e.key === 'Escape') close();
  }
  function close() {
    overlay.remove();
    document.removeEventListener('keydown', onKeyDown);
  }
  document.addEventListener('keydown', onKeyDown);

  document.body.appendChild(overlay);
}

// "1.2 MB", "340 KB", "87 B" -- pro cartãozinho de anexo/documento e pra
// prévia de anexo antes de mandar.
function formatFileSize(bytes) {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const FILE_ICON_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>';

// Cartão de "documento" (pdf, word, zip, etc.) -- igual Discord mostra pra
// anexos que não dá pra prever em miniatura: ícone + nome + tamanho, clica
// pra abrir/baixar. Usado tanto numa mensagem já enviada quanto na prévia
// de anexo antes de mandar (ver renderAttachmentPreview).
function buildFileAttachmentCard(src, name, size) {
  const card = document.createElement(src ? 'a' : 'div');
  card.className = 'attachment-file-card';
  if (src) {
    card.href = src;
    card.target = '_blank';
    card.rel = 'noopener noreferrer';
  }
  const icon = document.createElement('span');
  icon.className = 'attachment-file-icon';
  icon.innerHTML = FILE_ICON_SVG;
  card.appendChild(icon);

  const info = document.createElement('span');
  info.className = 'attachment-file-info';
  const nameEl = document.createElement('span');
  nameEl.className = 'attachment-file-name';
  nameEl.textContent = name || 'arquivo';
  info.appendChild(nameEl);
  const sizeText = formatFileSize(size);
  if (sizeText) {
    const sizeEl = document.createElement('span');
    sizeEl.className = 'attachment-file-size';
    sizeEl.textContent = sizeText;
    info.appendChild(sizeEl);
  }
  card.appendChild(info);
  return card;
}

// Anexos novos (foto/vídeo/documento) já vêm com a URL completa do Cloudinary
// (https://res.cloudinary.com/...), guardada permanentemente lá -- mas
// mensagens antigas, de antes dessa mudança, ainda têm só o caminho relativo
// tipo "/uploads/xxx.png" que era servido pelo próprio backend (esses
// arquivos específicos já foram perdidos quando o Render reiniciou, mas a
// função continua funcionando pros dois formatos, sem quebrar mensagem
// antiga nem duplicar o servidor na frente de uma URL que já é completa).
function resolveAttachmentUrl(url) {
  return /^https?:\/\//.test(url) ? url : `${serverUrl}${url}`;
}

function appendChatMessageEl({ id, name, text, isSelf, identity, attachment, ts, editedAt, replyTo, reactions }) {
  // mensagem que a própria pessoa escondeu com "Excluir (para mim)" --
  // nunca desenha (nem entra na lista, nem conta como "vazia"/etc.)
  if (id && locallyHiddenMessageIds.has(id)) return;

  const empty = chatMessages.querySelector('.chat-empty');
  if (empty) empty.remove();

  // Agrupa com a mensagem imediatamente anterior na tela, igual Discord:
  // se for da MESMA pessoa e tiver sido mandada há menos de 5 minutos da
  // anterior, não repete avatar/nome/hora de novo -- só o texto, colado
  // embaixo da mensagem anterior. A hora ainda dá pra ver passando o mouse
  // em cima (.chat-message-hover-time, ver CSS). Como cada mensagem entra
  // sempre em ORDEM (histórico carregado em sequência, mensagens ao vivo
  // chegando depois), o ":last-child" no momento de montar esta linha é
  // sempre a mensagem imediatamente anterior de verdade. Uma mensagem que
  // é RESPOSTA a outra nunca agrupa -- ela precisa do próprio cabeçalho
  // (avatar/nome) pra a citação acima fazer sentido visualmente.
  const GROUP_WINDOW_MS = 5 * 60 * 1000;
  const effectiveTs = ts || Date.now();
  const prevRow = chatMessages.querySelector('.chat-message:last-child');
  const prevTs = prevRow ? Number(prevRow.dataset.ts) : NaN;
  const isGrouped = !!(
    !replyTo &&
    prevRow &&
    identity &&
    prevRow.dataset.identity === identity &&
    Number.isFinite(prevTs) &&
    effectiveTs - prevTs >= 0 &&
    effectiveTs - prevTs < GROUP_WINDOW_MS
  );

  const row = document.createElement('div');
  row.className = isSelf ? 'chat-message self' : 'chat-message';
  if (isGrouped) row.classList.add('grouped');
  if (identity) row.dataset.identity = identity;
  if (id) row.dataset.messageId = id;
  row.dataset.ts = String(effectiveTs);

  // Citação de "respondendo a" -- igual Discord: uma linha fininha em cima
  // do resto da mensagem, com o mini-avatar/nome de quem foi respondido e
  // um pedaço do texto original. Clicar nela pula pra mensagem original,
  // SE ela ainda estiver carregada na tela (não busca no servidor).
  if (replyTo && replyTo.id) {
    const replyRef = document.createElement('div');
    replyRef.className = 'chat-reply-reference';
    const connector = document.createElement('span');
    connector.className = 'chat-reply-reference-connector';
    replyRef.appendChild(connector);
    const replyAvatar = document.createElement('span');
    replyAvatar.className = 'avatar chat-reply-reference-avatar';
    replyAvatar.textContent = (replyTo.name || '?').charAt(0).toUpperCase();
    if (replyTo.identity) applyAvatarToEl(replyAvatar, replyTo.identity);
    replyRef.appendChild(replyAvatar);
    const replyName = document.createElement('span');
    replyName.className = 'chat-reply-reference-name';
    replyName.textContent = `@${replyTo.name || 'Alguém'}`;
    replyRef.appendChild(replyName);
    const replyText = document.createElement('span');
    replyText.className = 'chat-reply-reference-text';
    replyText.textContent = replyTo.text || '📎 Anexo';
    replyRef.appendChild(replyText);
    replyRef.addEventListener('click', () => {
      const target = chatMessages.querySelector(`.chat-message[data-message-id="${cssEscape(replyTo.id)}"]`);
      target?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    });
    row.appendChild(replyRef);
  }

  // Tudo que era filho direto de .chat-message antes (avatar + corpo) agora
  // mora dentro dessa linha própria -- é o que permite a citação de resposta
  // acima ficar numa linha inteira separada por cima, sem empurrar o layout
  // avatar/corpo pro lado errado.
  const mainRow = document.createElement('div');
  mainRow.className = 'chat-message-main';
  row.appendChild(mainRow);

  const avatar = document.createElement('span');
  avatar.className = 'avatar';
  avatar.textContent = (name || '?').charAt(0).toUpperCase();
  if (identity) applyAvatarToEl(avatar, identity);
  mainRow.appendChild(avatar);

  if (isGrouped) {
    const hoverTime = document.createElement('span');
    hoverTime.className = 'chat-message-hover-time';
    hoverTime.textContent = new Date(effectiveTs).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    mainRow.appendChild(hoverTime);
  }

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

  // guarda uma referência pro .text (se existir) fora do "if" -- o botão de
  // editar (mais embaixo) precisa dele mesmo quando a mensagem só tem um
  // anexo e nenhum texto ainda (editar aí vira "adicionar uma legenda",
  // igual Discord permite)
  let textEl = null;
  if (text) {
    textEl = document.createElement('div');
    textEl.className = 'text';
    renderMessageTextWithLinks(textEl, text);
    body.appendChild(textEl);

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
    const src = resolveAttachmentUrl(attachment.url);
    if (attachment.type === 'video') {
      const video = document.createElement('video');
      video.src = src;
      video.controls = true;
      wrap.appendChild(video);
    } else if (attachment.type === 'image') {
      const img = document.createElement('img');
      img.src = src;
      img.alt = attachment.name || 'imagem';
      // clica na miniatura e abre em tamanho grande, igual Discord
      img.addEventListener('click', () => openImageLightbox(src, img.alt));
      wrap.appendChild(img);
    } else {
      // documento (pdf, word, zip, etc.) -- não dá pra mostrar miniatura,
      // então mostra um cartãozinho com ícone + nome + tamanho, igual
      // Discord faz com anexos que não são imagem/vídeo. Clicar abre/baixa.
      wrap.appendChild(buildFileAttachmentCard(src, attachment.name, attachment.size));
    }
    body.appendChild(wrap);
  }

  // reações (emoji) embaixo do texto/anexo, igual Discord
  renderMessageReactions(body, reactions, activeTextChannelId, id);

  // Barrinha de ações no hover -- igual Discord: reagir/responder/esconder
  // pra mim aparecem em QUALQUER mensagem (própria ou de outra pessoa);
  // editar/apagar de verdade só na própria.
  if (id) {
    const hasImageAttachment = isSelf && attachment && attachment.url && attachment.type === 'image';
    const actions = document.createElement('div');
    actions.className = 'chat-message-actions';

    if (hasImageAttachment) {
      const viewBtn = document.createElement('button');
      viewBtn.type = 'button';
      viewBtn.className = 'chat-message-action-btn';
      upgradeTooltip(viewBtn, { text: 'Ver imagem', dir: 'top' });
      viewBtn.innerHTML = EYE_ICON_SVG;
      viewBtn.addEventListener('click', () => {
        openImageLightbox(resolveAttachmentUrl(attachment.url), attachment.name || 'imagem');
      });
      actions.appendChild(viewBtn);
    }

    const reactBtn = document.createElement('button');
    reactBtn.type = 'button';
    reactBtn.className = 'chat-message-action-btn';
    upgradeTooltip(reactBtn, { text: 'Adicionar reação', dir: 'top' });
    reactBtn.innerHTML = REACTION_ICON_SVG;
    reactBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openReactionPicker(reactBtn, activeTextChannelId, id);
    });
    actions.appendChild(reactBtn);

    const replyBtn = document.createElement('button');
    replyBtn.type = 'button';
    replyBtn.className = 'chat-message-action-btn';
    upgradeTooltip(replyBtn, { text: 'Responder', dir: 'top' });
    replyBtn.innerHTML = REPLY_ICON_SVG;
    replyBtn.addEventListener('click', () => {
      setReplyingTo({ id, name: name || 'Alguém', text: text || '' });
    });
    actions.appendChild(replyBtn);

    // só a própria pessoa pode editar/apagar a própria mensagem -- aparece
    // igual tenha texto, anexo, ou os dois (uma mensagem só com foto também
    // pode ser editada pra ganhar uma legenda, ou apagada, igual Discord)
    if (isSelf) {
      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'chat-message-action-btn';
      upgradeTooltip(editBtn, { text: 'Editar', dir: 'top' });
      editBtn.innerHTML = EDIT_ICON_SVG;
      editBtn.addEventListener('click', () => {
        // mensagem só tinha anexo, sem legenda nenhuma -- cria o campinho de
        // texto na hora (editável), logo depois do cabeçalho autor/hora
        if (!textEl) {
          textEl = document.createElement('div');
          textEl.className = 'text';
          body.insertBefore(textEl, meta.nextSibling);
        }
        // busca o texto ATUAL no histórico (não o "text" capturado quando a
        // linha foi desenhada) — senão, editar a mesma mensagem duas vezes e
        // cancelar com Esc na segunda vez voltava pro texto original de
        // antes da primeira edição, perdendo a edição já salva
        const current = findMessageInHistory(activeTextChannelId, id);
        startInlineMessageEdit(textEl, activeTextChannelId, id, current ? current.text || '' : text || '');
      });
      actions.appendChild(editBtn);
    }

    const hideBtn = document.createElement('button');
    hideBtn.type = 'button';
    hideBtn.className = 'chat-message-action-btn';
    upgradeTooltip(hideBtn, { text: 'Excluir (para mim)', dir: 'top' });
    hideBtn.innerHTML = HIDE_FOR_ME_ICON_SVG;
    hideBtn.addEventListener('click', () => {
      hideMessageForMe(id);
    });
    actions.appendChild(hideBtn);

    if (isSelf) {
      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'chat-message-action-btn';
      upgradeTooltip(deleteBtn, { text: 'Apagar', dir: 'top' });
      deleteBtn.innerHTML = DELETE_ICON_SVG;
      deleteBtn.addEventListener('click', async () => {
        if (await confirmDialog('Apagar essa mensagem?', { confirmLabel: 'Apagar' })) deleteChatMessage(activeTextChannelId, id);
      });
      actions.appendChild(deleteBtn);
    }

    row.appendChild(actions);
  }

  mainRow.appendChild(body);
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
    if (messageMentionsMe(msg.text)) mentionedChannels.add(channelId);
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
        replyTo: m.replyTo || null,
        reactions: m.reactions || {},
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
function persistChatMessage(channelId, { id, text, attachment, replyTo }) {
  const path = isDmChannelId(channelId)
    ? `/api/dm/${encodeURIComponent(dmPeerFromChannelId(channelId))}/messages`
    : `/api/messages/${encodeURIComponent(channelId)}`;
  // manda o id JÁ GERADO no cliente — o servidor usa esse id em vez de
  // inventar um novo, senão a mensagem "ao vivo" (que já foi desenhada com
  // esse id) e a copia salva no servidor (recarregada depois) ficariam
  // com ids diferentes, e editar/apagar não acharia a mensagem certa.
  apiFetch(path, { method: 'POST', body: JSON.stringify({ id, text, attachment: attachment || null, replyTo: replyTo || null }) }).catch((err) => {
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

// Anexo "em espera" -- igual Discord: escolher/colar/arrastar um arquivo
// não manda na hora. Ele fica anexado (com prévia acima do campo) e a
// pessoa ainda pode escrever mais texto pra mandar os dois juntos, ou
// desistir (botão de remover na prévia) antes de apertar enviar.
let pendingAttachment = null; // { file, previewUrl } ou null

// Trava contra clique/Enter duplicado: com anexo, sendComposedMessage fica
// um tempo "no ar" esperando o upload (uploadChatAttachment) antes de
// limpar o campo e o anexo pendente -- se a pessoa apertar Enter de novo
// (ou clicar em enviar de novo) NESSE meio-tempo, pendingAttachment ainda
// está preenchido e mandava a mesma mensagem de novo, duplicada. Essa
// flag garante que só existe um envio em andamento por vez.
let isSendingMessage = false;

// "Respondendo a" -- igual Discord: clicar em "Responder" numa mensagem
// (ver o botão na barrinha de ações que aparece no hover, em
// appendChatMessageEl) guarda aqui só o essencial (id/nome/trecho do
// texto) e mostra a prévia acima do campo de digitar; enviar a mensagem
// manda esse "replyTo" junto, e limpa isso de novo (sem ficar "preso"
// respondendo pra sempre).
let replyingTo = null; // { id, name, text } ou null

function setReplyingTo(msg) {
  if (!msg || !msg.id) return;
  replyingTo = { id: msg.id, name: msg.name || 'Alguém', text: msg.text || '' };
  renderReplyPreview();
  chatInput.focus();
}

function clearReplyingTo() {
  if (!replyingTo) return;
  replyingTo = null;
  renderReplyPreview();
}

function renderReplyPreview() {
  if (!chatReplyPreview) return;
  if (!replyingTo) {
    chatReplyPreview.hidden = true;
    return;
  }
  chatReplyPreviewName.textContent = replyingTo.name;
  chatReplyPreviewSnippet.textContent = replyingTo.text || '📎 Anexo';
  chatReplyPreview.hidden = false;
}

chatReplyPreviewCancelBtn?.addEventListener('click', () => clearReplyingTo());

function clearPendingAttachment() {
  if (pendingAttachment && pendingAttachment.previewUrl) {
    URL.revokeObjectURL(pendingAttachment.previewUrl);
  }
  pendingAttachment = null;
  chatAttachmentPreview.hidden = true;
  chatAttachmentPreview.innerHTML = '';
}

function stageAttachment(file) {
  if (!file) return;
  if (file.size > 25 * 1024 * 1024) {
    alert('Arquivo muito grande (máx. 25MB).');
    return;
  }
  clearPendingAttachment();
  const isImage = file.type.startsWith('image/');
  const previewUrl = isImage ? URL.createObjectURL(file) : null;
  pendingAttachment = { file, previewUrl };
  renderAttachmentPreview();
  chatInput.focus();
}

function renderAttachmentPreview() {
  chatAttachmentPreview.innerHTML = '';
  if (!pendingAttachment) {
    chatAttachmentPreview.hidden = true;
    return;
  }
  const { file, previewUrl } = pendingAttachment;
  const card = document.createElement('div');
  card.className = 'chat-attachment-preview-card';

  if (previewUrl) {
    const img = document.createElement('img');
    img.className = 'chat-attachment-preview-thumb';
    img.src = previewUrl;
    img.alt = file.name;
    card.appendChild(img);
  } else {
    const fileCard = buildFileAttachmentCard(null, file.name, file.size);
    fileCard.classList.add('chat-attachment-preview-thumb-file');
    card.appendChild(fileCard);
  }

  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'chat-attachment-preview-remove';
  removeBtn.title = 'Remover anexo';
  removeBtn.innerHTML =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
  removeBtn.addEventListener('click', () => clearPendingAttachment());
  card.appendChild(removeBtn);

  chatAttachmentPreview.appendChild(card);
  chatAttachmentPreview.hidden = false;
}

// Ponto único de envio do campo de mensagem: junta texto (pode estar vazio
// se tiver um anexo) + o anexo em espera (se tiver um) numa mensagem só,
// igual Discord manda foto+legenda juntos.
async function sendComposedMessage() {
  if (isSendingMessage) return;
  const text = chatInput.value.trim();
  const file = pendingAttachment ? pendingAttachment.file : null;
  if (!text && !file) return;
  if (!lobbyRoom || !activeTextChannelId) return;

  isSendingMessage = true;
  chatAttachmentBtn.disabled = true;
  try {
    let attachment = null;
    if (file) attachment = await uploadChatAttachment(file);

    // captura o replyTo ANTES de limpar (clearReplyingTo lá embaixo já
    // zera "replyingTo" pra próxima mensagem não vir respondendo à toa)
    const replyTo = replyingTo ? { id: replyingTo.id, name: replyingTo.name, text: replyingTo.text } : null;

    chatInput.value = '';
    renderChatInputHighlight();
    clearPendingAttachment();

    if (isDmChannelId(activeTextChannelId)) {
      const to = dmPeerFromChannelId(activeTextChannelId);
      const ts = Date.now();
      const id = crypto.randomUUID();
      const payload = { type: 'dm', to, from: myIdentity, name: myDisplayName || myName, text, ts, attachment, id, replyTo };
      lobbyRoom.localParticipant.publishData(chatEncoder.encode(JSON.stringify(payload)), {
        reliable: true,
        destinationIdentities: [to],
      });
      pushChatMessage(activeTextChannelId, { id, name: myDisplayName || myName, text, ts, isSelf: true, identity: myIdentity, attachment, replyTo, reactions: {} });
      persistChatMessage(activeTextChannelId, { id, text, attachment, replyTo });
      clearReplyingTo();
      return;
    }
    const ts = Date.now();
    const id = crypto.randomUUID();
    const payload = { type: 'chat', channelId: activeTextChannelId, name: myDisplayName || myName, text, ts, attachment, id, replyTo };
    lobbyRoom.localParticipant.publishData(chatEncoder.encode(JSON.stringify(payload)), { reliable: true });
    pushChatMessage(activeTextChannelId, { id, name: myDisplayName || myName, text, ts, isSelf: true, identity: myIdentity, attachment, replyTo, reactions: {} });
    persistChatMessage(activeTextChannelId, { id, text, attachment, replyTo });
    clearReplyingTo();
  } catch (err) {
    alert(err.message || 'Não consegui enviar a mensagem.');
  } finally {
    chatAttachmentBtn.disabled = false;
    isSendingMessage = false;
  }
}

chatForm.addEventListener('submit', (e) => {
  e.preventDefault();
  closeMentionAutocomplete();
  sendComposedMessage();
});

// ---------- autocomplete de @menção no campo de mensagem ----------
// Igual Discord: digitar "@" no meio da mensagem abre uma listinha de quem
// dá pra mencionar, filtrando conforme continua digitando; Enter/Tab ou
// clicar escolhe alguém, ArrowUp/ArrowDown navega, Esc fecha. O texto final
// inserido é sempre "@NomeDeExibição " puro (mesmo formato que insertMention
// já usa vindo do menu de contexto) -- é o que buildMentionRegex reconhece
// depois pra destacar em azul, e o que messageMentionsMe usa pra saber se
// alguém foi mencionado.
let mentionAutocompleteEl = null;
let mentionAutocompleteMatches = [];
let mentionAutocompleteIndex = 0;
let mentionAutocompleteRange = null; // { start, end } dentro de chatInput.value

function closeMentionAutocomplete() {
  if (mentionAutocompleteEl) mentionAutocompleteEl.remove();
  mentionAutocompleteEl = null;
  mentionAutocompleteMatches = [];
  mentionAutocompleteRange = null;
}

// Acha o "@fragmento" que está sendo digitado bem antes do cursor, se
// houver -- só conta como "em andamento" quando não tem espaço nenhum entre
// o @ e o cursor, e o próprio @ está no começo do texto ou logo depois de
// um espaço (senão "fulano@dominio.com" ia abrir a listinha no meio de um
// e-mail, por exemplo).
function findMentionTrigger() {
  const cursor = chatInput.selectionStart;
  if (cursor == null) return null;
  const text = chatInput.value;
  let at = -1;
  for (let i = cursor - 1; i >= 0; i--) {
    const ch = text[i];
    if (ch === '@') {
      at = i;
      break;
    }
    if (/\s/.test(ch)) break;
  }
  if (at === -1) return null;
  if (at > 0 && !/\s/.test(text[at - 1])) return null;
  return { start: at, end: cursor, fragment: text.slice(at + 1, cursor) };
}

function renderMentionAutocomplete() {
  if (mentionAutocompleteEl) mentionAutocompleteEl.remove();

  const menu = document.createElement('div');
  menu.className = 'mention-autocomplete';
  mentionAutocompleteMatches.forEach((m, idx) => {
    const item = document.createElement('div');
    item.className = 'mention-autocomplete-item';
    item.classList.toggle('active', idx === mentionAutocompleteIndex);
    const avatar = document.createElement('span');
    avatar.className = 'avatar';
    avatar.textContent = m.name.charAt(0).toUpperCase();
    applyAvatarToEl(avatar, m.identity);
    item.appendChild(avatar);
    const label = document.createElement('span');
    label.textContent = m.name;
    item.appendChild(label);
    // mousedown (não click) + preventDefault pra não roubar o foco do campo
    // de digitação antes da gente conseguir usar a seleção atual dele
    item.addEventListener('mousedown', (e) => {
      e.preventDefault();
      selectMentionCandidate(idx);
    });
    menu.appendChild(item);
  });

  document.body.appendChild(menu);
  const rect = chatInput.getBoundingClientRect();
  menu.style.left = `${rect.left}px`;
  menu.style.width = `${rect.width}px`;
  menu.style.bottom = `${window.innerHeight - rect.top + 6}px`;
  mentionAutocompleteEl = menu;
}

function updateMentionAutocomplete() {
  const trigger = findMentionTrigger();
  if (!trigger) {
    closeMentionAutocomplete();
    return;
  }
  const query = trigger.fragment.toLowerCase();
  const matches = allKnownMemberIdentities()
    .map((identity) => ({ identity, name: displayNameFor(identity) }))
    .filter((m) => m.name && m.name.toLowerCase().startsWith(query))
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, 8);

  if (matches.length === 0) {
    closeMentionAutocomplete();
    return;
  }
  mentionAutocompleteMatches = matches;
  mentionAutocompleteRange = { start: trigger.start, end: trigger.end };
  mentionAutocompleteIndex = Math.min(mentionAutocompleteIndex, matches.length - 1);
  renderMentionAutocomplete();
}

function selectMentionCandidate(idx) {
  const candidate = mentionAutocompleteMatches[idx];
  if (!candidate || !mentionAutocompleteRange) return;
  const { start, end } = mentionAutocompleteRange;
  const inserted = `@${candidate.name} `;
  chatInput.value = chatInput.value.slice(0, start) + inserted + chatInput.value.slice(end);
  renderChatInputHighlight();
  const cursor = start + inserted.length;
  closeMentionAutocomplete();
  chatInput.focus();
  chatInput.setSelectionRange(cursor, cursor);
}

chatInput.addEventListener('input', () => {
  renderChatInputHighlight();
  updateMentionAutocomplete();
});
// o próprio <input> rola sozinho quando o texto/cursor passa da largura
// visível -- sincroniza a div de destaque atrás pra acompanhar (senão o
// texto "de verdade" (transparente) desalinha do texto colorido por trás)
chatInput.addEventListener('scroll', () => {
  chatInputHighlight.scrollLeft = chatInput.scrollLeft;
});

chatInput.addEventListener('keydown', (e) => {
  if (!mentionAutocompleteEl || mentionAutocompleteMatches.length === 0) return;
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    mentionAutocompleteIndex = (mentionAutocompleteIndex + 1) % mentionAutocompleteMatches.length;
    renderMentionAutocomplete();
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    mentionAutocompleteIndex =
      (mentionAutocompleteIndex - 1 + mentionAutocompleteMatches.length) % mentionAutocompleteMatches.length;
    renderMentionAutocomplete();
  } else if (e.key === 'Enter' || e.key === 'Tab') {
    e.preventDefault();
    selectMentionCandidate(mentionAutocompleteIndex);
  } else if (e.key === 'Escape') {
    e.preventDefault();
    closeMentionAutocomplete();
  }
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

// ---------- reações (emoji) nas mensagens ----------
// Mesmo esquema de editChatMessage/deleteChatMessage acima: atualiza local
// na hora (otimista), avisa quem mais está na conversa/canal pelo canal de
// dados do LiveKit, e salva no servidor em segundo plano (sem travar nem
// mostrar erro se falhar -- a reação já apareceu na tela de quem reagiu e
// de quem recebeu ao vivo de qualquer forma).
function chatMessageReactionsPath(channelId, id) {
  return isDmChannelId(channelId)
    ? `/api/dm/${encodeURIComponent(dmPeerFromChannelId(channelId))}/messages/${encodeURIComponent(id)}/reactions`
    : `/api/messages/${encodeURIComponent(channelId)}/${encodeURIComponent(id)}/reactions`;
}

// Aplica um objeto de reações (já pronto, { emoji: [identities] }) na
// mensagem em memória e, se ela estiver na tela agora, redesenha só os
// "pills" de reação dela (sem redesenhar a mensagem inteira).
function applyMessageReaction(channelId, id, reactions) {
  const msg = findMessageInHistory(channelId, id);
  if (msg) msg.reactions = reactions;
  if (channelId === activeTextChannelId && !textView.hidden) {
    const row = chatMessages.querySelector(`.chat-message[data-message-id="${cssEscape(id)}"]`);
    const body = row?.querySelector('.body');
    if (body) {
      body.querySelector('.chat-message-reactions')?.remove();
      renderMessageReactions(body, reactions, channelId, id);
    }
  }
}

// Alterna a reação de emoji da PRÓPRIA pessoa numa mensagem (adiciona se
// ainda não tinha reagido com esse emoji, remove se já tinha).
function toggleMessageReaction(channelId, id, emoji) {
  if (!lobbyRoom || !myIdentity || !channelId || !id) return;
  const msg = findMessageInHistory(channelId, id);
  const current = (msg && msg.reactions) || {};
  const people = current[emoji] || [];
  const nextReactions = { ...current };
  const idx = people.indexOf(myIdentity);
  if (idx === -1) {
    nextReactions[emoji] = [...people, myIdentity];
  } else {
    const rest = people.filter((i) => i !== myIdentity);
    if (rest.length > 0) nextReactions[emoji] = rest;
    else delete nextReactions[emoji];
  }
  applyMessageReaction(channelId, id, nextReactions);

  const isDm = isDmChannelId(channelId);
  const payload = isDm
    ? { type: 'message-reaction', dm: true, to: dmPeerFromChannelId(channelId), from: myIdentity, id, reactions: nextReactions }
    : { type: 'message-reaction', channelId, from: myIdentity, id, reactions: nextReactions };
  const options = isDm
    ? { reliable: true, destinationIdentities: [dmPeerFromChannelId(channelId)] }
    : { reliable: true };
  lobbyRoom.localParticipant.publishData(chatEncoder.encode(JSON.stringify(payload)), options);

  apiFetch(chatMessageReactionsPath(channelId, id), { method: 'POST', body: JSON.stringify({ emoji }) }).catch((err) => {
    console.warn('Não consegui salvar a reação no servidor:', err);
  });
}

// Desenha os "pills" de reação (emoji + contagem) embaixo do texto/anexo da
// mensagem, igual Discord -- clicar num pill já existente alterna a SUA
// reação com aquele emoji (não precisa reabrir o seletor).
function renderMessageReactions(body, reactions, channelId, id) {
  const entries = Object.entries(reactions || {}).filter(([, people]) => Array.isArray(people) && people.length > 0);
  if (entries.length === 0) return;
  const wrap = document.createElement('div');
  wrap.className = 'chat-message-reactions';
  entries.forEach(([emoji, people]) => {
    const pill = document.createElement('button');
    pill.type = 'button';
    pill.className = 'chat-reaction-pill';
    if (myIdentity && people.includes(myIdentity)) pill.classList.add('mine');
    const emojiEl = document.createElement('span');
    emojiEl.className = 'chat-reaction-emoji';
    emojiEl.textContent = emoji;
    pill.appendChild(emojiEl);
    const countEl = document.createElement('span');
    countEl.className = 'chat-reaction-count';
    countEl.textContent = String(people.length);
    pill.appendChild(countEl);
    const names = people.map((i) => displayNameFor(i)).filter(Boolean);
    if (names.length) upgradeTooltip(pill, { text: names.join(', '), dir: 'top' });
    pill.addEventListener('click', () => toggleMessageReaction(channelId, id, emoji));
    wrap.appendChild(pill);
  });
  body.appendChild(wrap);
}

// Seletor rápido de reação -- reaproveita a mesma infraestrutura do menu de
// botão direito (contextMenuEl/positionContextMenu/fechar ao clicar fora ou
// Esc, já feita lá embaixo) em vez de duplicar tudo isso de novo.
function openReactionPicker(anchorEl, channelId, id) {
  closeContextMenu();
  const picker = document.createElement('div');
  picker.className = 'context-menu reaction-picker';
  QUICK_REACTION_EMOJIS.forEach((emoji) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'reaction-picker-emoji';
    btn.textContent = emoji;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleMessageReaction(channelId, id, emoji);
      closeContextMenu();
    });
    picker.appendChild(btn);
  });
  document.body.appendChild(picker);
  contextMenuEl = picker;
  const rect = anchorEl.getBoundingClientRect();
  positionContextMenu(rect.left, rect.bottom + 6, picker);
}

// ---------- "Excluir (para mim)" -- esconde só na sua tela ----------
// Diferente de "Apagar" (deleteChatMessage, só pra mensagem própria, some
// pra todo mundo): isso aqui NUNCA avisa os outros nem mexe no servidor --
// só entra numa listinha local (persistida, ver loadLocallyHiddenFromConfig/
// saveLocallyHiddenToConfig lá em cima) que appendChatMessageEl confere
// antes de desenhar qualquer mensagem.
function hideMessageForMe(id) {
  if (!id || locallyHiddenMessageIds.has(id)) return;
  locallyHiddenMessageIds.add(id);
  saveLocallyHiddenToConfig().catch(() => {});
  const row = chatMessages.querySelector(`.chat-message[data-message-id="${cssEscape(id)}"]`);
  row?.remove();
  if (!chatMessages.querySelector('.chat-message')) {
    chatMessages.innerHTML = '<p class="chat-empty">Nenhuma mensagem ainda. Comece a conversa.</p>';
  }
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

chatAttachmentBtn.addEventListener('click', () => {
  if (!lobbyRoom || !activeTextChannelId) return;
  chatAttachmentInput.click();
});

chatAttachmentInput.addEventListener('change', () => {
  const file = chatAttachmentInput.files[0];
  chatAttachmentInput.value = '';
  if (lobbyRoom && activeTextChannelId) stageAttachment(file);
});

// Arrastar um arquivo (da área de trabalho, do explorador, de outra janela)
// e soltar em cima da conversa anexa ele igual clicar no clipezinho (só um
// por vez -- solta vários e só o primeiro fica anexado, igual Discord só
// deixa colar/anexar um de cada vez neste app).
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
  const file = e.dataTransfer?.files?.[0];
  if (file) stageAttachment(file);
});

// Colar (Ctrl+V) uma imagem copiada — print de tela (Win+Shift+S, PrtScn) ou
// uma imagem copiada de qualquer lugar — anexa ela igual um anexo escolhido
// pelo clipezinho. Só entra nesse caminho se realmente tiver uma IMAGEM na
// área de transferência; colar texto normal continua funcionando, sem mudar
// nada.
chatInput.addEventListener('paste', (e) => {
  if (!lobbyRoom || !activeTextChannelId) return;
  const items = Array.from(e.clipboardData?.items || []);
  const imageItem = items.find((item) => item.kind === 'file' && item.type.startsWith('image/'));
  if (!imageItem) return; // sem imagem colada -> deixa o colar de texto normal acontecer
  e.preventDefault();
  const file = imageItem.getAsFile();
  if (file) stageAttachment(file);
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

    // (Sem ícone de "expandir" no canto -- a telinha inteira já é clicável
    // pra expandir/recolher, ver o listener de click do grid mais abaixo;
    // o ícone ali era só decorativo e ficava se sobrepondo com os outros
    // botões da transmissão, no canto.)

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

// Badge vermelho "AO VIVO" no canto da telinha de quem está compartilhando
// a tela agora -- aparece assim que a transmissão começa (mesmo antes de
// alguém clicar em "Assistir transmissão") e só some de vez quando ela
// termina de verdade (ver detachTrack).
function addLiveBadge(tile) {
  if (tile.querySelector('.tile-live-badge')) return;
  const badge = document.createElement('div');
  badge.className = 'tile-live-badge';
  badge.textContent = 'AO VIVO';
  tile.appendChild(badge);
}

function showWatchStreamPrompt(tile, participant) {
  if (tile.querySelector('.watch-stream-prompt')) return;
  tile.classList.add('screen-pending');
  const prompt = document.createElement('div');
  prompt.className = 'watch-stream-prompt';
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'watch-stream-btn';
  // Mascote do PrimalVoice no lugar do botão branco de antes -- passa o
  // mouse em cima e ele troca pra outra pose (ver .watch-stream-btn no CSS,
  // é só opacidade trocando entre as duas imagens empilhadas, sem JS).
  btn.innerHTML =
    '<img class="watch-stream-img watch-stream-img-default" src="assets/watch-stream-monkey.png" alt="" />' +
    '<img class="watch-stream-img watch-stream-img-hover" src="assets/watch-stream-monkey-hover.png" alt="" />';
  upgradeTooltip(btn, { text: 'Assistir transmissão', dir: 'top' });
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

const STOP_WATCH_ICON_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';

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
  volumeBtn.innerHTML = VOLUME_ICON_SVG + VOLUME_MUTED_ICON_SVG;
  upgradeTooltip(volumeBtn, { text: 'Volume da transmissão', dir: 'top' });
  volumeBtn.classList.toggle('is-muted', (streamVolumes.get(participant.identity) ?? 1) === 0 || mutedForMe.has(participant.identity) || isDeafened);
  volumeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    openStreamVolumePopover(volumeBtn, participant.identity);
  });

  // Botão de parar de assistir, visível ao passar o mouse (igual os outros
  // dessa barra) -- antes só dava pra fazer isso pelo menu do botão direito,
  // que ficou escondido demais.
  // (Não tem mais botão de "Tela cheia" aqui -- só duplicava o clique na
  // própria telinha, que já expande/recolhe normal (grid.click, mais
  // abaixo), e pulava direto pro modo cinema sem passar pela visão normal
  // expandida antes. Pra entrar em tela cheia de verdade agora é: clica na
  // telinha pra expandir normal, depois dá dois cliques nela -- ver o
  // listener de dblclick do grid, mais abaixo.)
  const stopWatchBtn = document.createElement('button');
  stopWatchBtn.type = 'button';
  stopWatchBtn.className = 'screen-share-ctrl-btn screen-share-stopwatch-btn';
  stopWatchBtn.innerHTML = STOP_WATCH_ICON_SVG;
  upgradeTooltip(stopWatchBtn, { text: 'Parar de assistir', dir: 'top' });
  stopWatchBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    stopWatchingScreenShare(participant);
  });

  bar.appendChild(volumeBtn);
  bar.appendChild(stopWatchBtn);
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
    addLiveBadge(tile);
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
      el.muted = blocked;
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
      tile.querySelector('.tile-live-badge')?.remove();
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
    cinemaFullscreenBtn.classList.toggle('is-fullscreen', cinemaTileIdentity === identity);
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
    // mantém o modo, só muda quem é a telinha de dono do cinema
    if (cinemaTileIdentity && cinemaTileIdentity !== tile.dataset.identity) {
      cinemaTileIdentity = tile.dataset.identity;
    }
  }
  updateFloatingBarVisibility();
});

// Duplo-clique numa telinha de transmissão entra no modo cinema de verdade
// (tela cheia da janela) -- só funciona numa telinha que JÁ está expandida
// (visão normal), nunca direto da miniatura pequena: primeiro clique (só
// um clique) expande/recolhe dentro da grade, tela cheia de verdade exige
// já estar na visão normal expandida antes (ver addScreenShareControls, que
// não tem mais botão de "Tela cheia" nenhum -- só duplicava esse caminho e
// pulava direto pra tela cheia sem passar pela visão normal).
grid.addEventListener('dblclick', (e) => {
  const tile = e.target.closest('.tile');
  if (!tile || !tile.dataset.identity) return;
  if (!tile.classList.contains('expanded')) return;
  if (!watchingScreenShare.has(tile.dataset.identity)) return;
  enterCinemaFullscreen(tile, participantFromRow(tile));
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && grid.classList.contains('has-expanded')) {
    collapseExpandedTile();
  }
});

// ---------- áudio (volume por pessoa, mute local, ensurdecer) ----------
// Volume por pessoa combina: um ajuste feito NESTA chamada (participantVolumes,
// zerado ao sair da chamada) e, quando não há ajuste nesta chamada ainda, o
// que a pessoa deixou salvo de uma chamada anterior (savedMemberVolumes,
// persistido em disco) -- assim não precisa reajustar todo mundo de novo
// toda vez que entra numa chamada.
function getEffectiveVolume(identity) {
  if (participantVolumes.has(identity)) return participantVolumes.get(identity);
  const saved = savedMemberVolumes[identity];
  return typeof saved === 'number' ? saved : 1;
}

function getSharedAudioCtx() {
  if (!sharedAudioCtx) {
    const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtxClass) return null;
    sharedAudioCtx = new AudioCtxClass();
  }
  if (sharedAudioCtx.state === 'suspended') sharedAudioCtx.resume().catch(() => {});
  return sharedAudioCtx;
}

function registerAudioEl(identity, el) {
  if (!audioElsByIdentity.has(identity)) audioElsByIdentity.set(identity, new Set());
  audioElsByIdentity.get(identity).add(el);
  // O <audio>.volume nativo trava em 1.0 (100%) -- pra dar boost até 200%
  // (igual ao Discord) a gente cria um GainNode e passa a controlar o
  // volume por ele em vez do .volume do elemento. Se o Web Audio falhar por
  // algum motivo, cai pro volume nativo (fica limitado a 100%, mas não quebra).
  try {
    const ctx = getSharedAudioCtx();
    if (ctx) {
      const source = ctx.createMediaElementSource(el);
      const gainNode = ctx.createGain();
      source.connect(gainNode);
      gainNode.connect(ctx.destination);
      gainNodeByAudioEl.set(el, gainNode);
      if (!gainNodesByIdentity.has(identity)) gainNodesByIdentity.set(identity, new Set());
      gainNodesByIdentity.get(identity).add(gainNode);
    }
  } catch (err) {
    console.warn('Não foi possível criar GainNode pro áudio de', identity, err);
  }
  applyVolume(identity);
}

function unregisterAudioEl(identity, el) {
  audioElsByIdentity.get(identity)?.delete(el);
  const gainNode = gainNodeByAudioEl.get(el);
  if (gainNode) {
    gainNodesByIdentity.get(identity)?.delete(gainNode);
    gainNodeByAudioEl.delete(el);
    try { gainNode.disconnect(); } catch (err) { /* já desconectado */ }
  }
}

function applyVolume(identity) {
  const blocked = mutedForMe.has(identity) || isDeafened;
  const volume = blocked ? 0 : getEffectiveVolume(identity) * masterOutputVolume;
  const gains = gainNodesByIdentity.get(identity);
  if (gains && gains.size) {
    gains.forEach((gainNode) => {
      gainNode.gain.value = volume;
    });
  } else {
    // Sem GainNode disponível (Web Audio falhou) -- volume nativo, travado em 100%.
    audioElsByIdentity.get(identity)?.forEach((el) => {
      el.volume = Math.min(volume, 1);
    });
  }
  // Cinto de segurança: além do GainNode/volume, muta o <audio> DE VERDADE
  // (a propriedade .muted nativa, que corta o som de vez, sem depender do
  // Web Audio estar funcionando direito) -- reclamação de que ensurdecer
  // (ou silenciar alguém) não cortava o áudio de verdade, continuava
  // escutando a pessoa falando mesmo com o app mostrando "ensurdecido".
  audioElsByIdentity.get(identity)?.forEach((el) => {
    el.muted = blocked;
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

// Lembra esse volume pra próxima vez que a gente estiver em chamada com essa
// pessoa (ver getEffectiveVolume/loadMemberVolumesFromConfig acima).
function saveParticipantVolumePreference(identity, v) {
  savedMemberVolumes[identity] = v;
  scheduleSaveMemberVolumes();
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
  const blocked = mutedForMe.has(identity) || isDeafened;
  const volume = blocked ? 0 : (streamVolumes.get(identity) ?? 1) * masterOutputVolume;
  streamAudioElsByIdentity.get(identity)?.forEach((el) => {
    el.volume = volume;
    // mesmo cinto de segurança do applyVolume acima -- corta o som do
    // compartilhamento de tela/jogo de verdade, não só o volume
    el.muted = blocked;
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
  gainNodesByIdentity.clear();
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
    upgradeTooltip(liveBadge, { text: 'Compartilhando tela' });
    liveBadge.textContent = 'AO VIVO';
    badges.appendChild(liveBadge);

    const cameraBadge = document.createElement('span');
    cameraBadge.className = 'status-badge camera-badge';
    upgradeTooltip(cameraBadge, { text: 'Câmera ligada' });
    cameraBadge.innerHTML = CAMERA_BADGE_SVG;
    badges.appendChild(cameraBadge);

    // Emoji de macaquinho no lugar dos ícones genéricos de mic mudo/
    // ensurdecido -- 🙊 (mão na boca) pra mudo, 🙉 (mão na orelha) pra
    // ensurdecido. Emoji em vez de imagem própria: sempre nítido em
    // qualquer tamanho (fonte do sistema, não escala feito PNG) e já é
    // reconhecível de cara. Só aparecem quando badge-on (ver
    // applyStatusBadges), então já são só os dois estados "isso está
    // ativado agora" mesmo.
    const micBadge = document.createElement('span');
    micBadge.className = 'status-badge mic-badge';
    upgradeTooltip(micBadge, { text: 'Microfone mudo' });
    micBadge.textContent = '🙊';
    badges.appendChild(micBadge);

    const deafenBadge = document.createElement('span');
    deafenBadge.className = 'status-badge deafen-badge';
    upgradeTooltip(deafenBadge, { text: 'Ensurdecido' });
    deafenBadge.textContent = '🙉';
    badges.appendChild(deafenBadge);

    const watchingBadge = document.createElement('span');
    watchingBadge.className = 'status-badge watching-badge';
    upgradeTooltip(watchingBadge, { text: 'Assistindo uma transmissão' });
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
    // o "cargo mais alto" tem que seguir a ORDEM DE serverState.roles (a
    // hierarquia definida em Configurações -> Cargos, de cima pra baixo),
    // não a ordem em que os cargos foram atribuídos a essa pessoa -- senão
    // arrastar um cargo pra cima na lista de hierarquia não mudava nada
    // aqui (era exatamente esse bug antes: usava assigned.find, que segue
    // a ordem de atribuição de CADA pessoa, não a hierarquia do servidor).
    // Mesma lógica de topRoleColorFor, só que devolvendo o cargo inteiro.
    const topRole = (serverState.roles || []).find((role) => assigned.includes(role.id));
    if (topRole) roleGroupById.get(topRole.id).identities.push(identity);
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
    header.textContent = `${label} (${identities.length})`;
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
  upgradeTooltip(tile, { text: sound.name });
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
    upgradeTooltip(removeBtn, { text: 'Remover' });
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
    ? 'Clique num efeito pra tocar. Todo mundo no canal de voz escuta.'
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
  upgradeTooltip(volumeBtn, { text: 'Mutar/reativar efeitos sonoros' });
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
  upgradeTooltip(volumeSlider, { text: 'Volume dos efeitos sonoros (só o que você escuta)' });
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
    alert(`Esse áudio é muito grande (máximo ${(MAX_SOUND_BYTES / 1_000_000).toFixed(1)}MB, dá pra usar um trecho bem curtinho).`);
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
      alert(`Esse áudio dura ${duration.toFixed(1)}s, e o limite pra efeito sonoro é ${MAX_SOUND_SECONDS}s.`);
      return;
    }
    const dataUrl = await readFileAsDataUrl(file);
    const name = file.name.replace(/\.[^./\\]+$/, '').slice(0, 32) || 'Som';
    mySounds.push({ id: `snd-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, name, dataUrl, useCount: 0 });
    await saveSoundboardToConfig();
    openSoundboardPanel();
  } catch (err) {
    console.warn('Não consegui usar esse arquivo de áudio:', err);
    alert('Não consegui usar esse arquivo. Confira se é mesmo um áudio válido.');
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

// Em qual canal de voz essa identity está conectada agora, se algum --
// voicePresence é channelId -> Map(identity -> name), então é só procurar
// em qual mapa ela aparece. Usado pra mostrar "Em voz" no cartão de perfil.
function voiceChannelIdFor(identity) {
  for (const [channelId, members] of voicePresence) {
    if (members.has(identity)) return channelId;
  }
  return null;
}

// ---------- cartão de perfil (clique com botão esquerdo) ----------
function openProfileCard(x, y, identity) {
  closeContextMenu();
  if (!identity) return;
  const isSelf = identity === myIdentity;
  const profile = isSelf
    ? { avatar: myAvatarDataUrl, banner: myBannerDataUrl, status: myStatusText, bio: myBioText }
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

  const nameRow = document.createElement('div');
  nameRow.className = 'profile-card-name-row';

  // Coroa de dono da sala, igual a que já aparece do lado do nome na lista
  // de membros da aba Cargos (mesmo ícone/cor, ver renderRoleMembers).
  if (identity === serverState.ownerIdentity) {
    const crown = document.createElement('span');
    crown.className = 'owner-crown';
    crown.title = 'Dono da sala';
    crown.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 19h18l-1.4-9.2-4.6 4-3-6.8-3 6.8-4.6-4z"/></svg>';
    nameRow.appendChild(crown);
  }

  const nameEl = document.createElement('div');
  nameEl.className = 'profile-card-name';
  nameEl.textContent = displayNameFor(identity);
  nameRow.appendChild(nameEl);
  body.appendChild(nameRow);

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

  // "Sobre mim" -- texto livre que a pessoa escreve no perfil dela (ver
  // profile-bio-input no modal de configurações), igual o Discord.
  if (profile.bio) {
    const bioTitle = document.createElement('div');
    bioTitle.className = 'profile-card-section-title';
    bioTitle.textContent = 'Sobre mim';
    body.appendChild(bioTitle);

    const bioEl = document.createElement('div');
    bioEl.className = 'profile-card-bio';
    bioEl.textContent = profile.bio;
    body.appendChild(bioEl);
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

  // "Em voz" -- se a pessoa estiver conectada AGORA num canal de voz,
  // mostra qual e dá um jeito de entrar direto na chamada, igual o Discord.
  const currentVoiceChannelId = voiceChannelIdFor(identity);
  const currentVoiceChannel = currentVoiceChannelId
    ? serverState.channels?.voice?.find((c) => c.id === currentVoiceChannelId)
    : null;
  if (currentVoiceChannel) {
    const voiceTitle = document.createElement('div');
    voiceTitle.className = 'profile-card-section-title';
    voiceTitle.textContent = 'Em voz';
    body.appendChild(voiceTitle);

    // Cartão igual o Discord: quem mais está na chamada (em miniatura, com
    // "+N" se não couber todo mundo), o canal, quantas pessoas tem, e um
    // "Juntar-se" -- só o "Juntar-se" é clicável, o resto do cartão é só
    // informativo.
    const voiceCard = document.createElement('div');
    voiceCard.className = 'profile-card-voice-card';

    const participants = Array.from((voicePresence.get(currentVoiceChannelId) || new Map()).keys());
    const MAX_AVATARS_SHOWN = 3;

    const avatarsWrap = document.createElement('div');
    avatarsWrap.className = 'profile-card-voice-avatars';
    participants.slice(0, MAX_AVATARS_SHOWN).forEach((pid) => {
      const av = document.createElement('span');
      av.className = 'avatar profile-card-voice-avatar';
      av.textContent = displayNameFor(pid).charAt(0).toUpperCase();
      applyAvatarToEl(av, pid);
      avatarsWrap.appendChild(av);
    });
    const extraCount = participants.length - MAX_AVATARS_SHOWN;
    if (extraCount > 0) {
      const more = document.createElement('span');
      more.className = 'profile-card-voice-avatar-more';
      more.textContent = `+${extraCount}`;
      avatarsWrap.appendChild(more);
    }
    voiceCard.appendChild(avatarsWrap);

    const info = document.createElement('div');
    info.className = 'profile-card-voice-info';

    const nameRow = document.createElement('div');
    nameRow.className = 'profile-card-voice-name';
    nameRow.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>';
    const nameText = document.createElement('span');
    nameText.textContent = currentVoiceChannel.name;
    nameRow.appendChild(nameText);
    info.appendChild(nameRow);

    const sub = document.createElement('div');
    sub.className = 'profile-card-voice-sub';
    sub.textContent = participants.length === 1 ? '1 pessoa na chamada' : `${participants.length} pessoas na chamada`;
    info.appendChild(sub);

    const joinPill = document.createElement('button');
    joinPill.type = 'button';
    joinPill.className = 'profile-card-voice-join';
    joinPill.textContent = 'Juntar-se';
    joinPill.addEventListener('click', () => {
      closeContextMenu();
      enterVoiceChannel(currentVoiceChannelId);
    });
    info.appendChild(joinPill);

    voiceCard.appendChild(info);
    body.appendChild(voiceCard);
  }

  // Se a pessoa clicada estiver AGORA compartilhando tela ou com a câmera
  // ligada, clicar nela já leva direto pro canal de voz dela (mesma coisa
  // que o botão "Juntar-se" do cartão acima faz) -- assim dá pra ver a
  // transmissão sem precisar de mais um clique, além do cartão de perfil
  // continuar abrindo normalmente.
  if (currentVoiceChannelId && identity !== myIdentity) {
    const liveStatus = ensureVoiceStatus(identity);
    if (liveStatus.screenShare || liveStatus.camera) {
      enterVoiceChannel(currentVoiceChannelId);
    }
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
  // (o cartão "Em voz" lá em cima já é o botão de entrar na chamada --
  // igual Discord, não precisa de mais um botão duplicado aqui embaixo.)
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

  // Alguém offline: nada de volume/silenciar/vídeo/expulsar faz sentido (ela
  // nem está conectada agora) -- menu simplificado só com ver perfil e,
  // pra quem pode gerenciar cargos, atribuir cargo mesmo assim (isso não
  // depende da pessoa estar online).
  if (opts.isOffline) {
    appendSocialSection(menu, identity, x, y);
    appendRolesSection(menu, identity);
    // silenciar/vídeo/expulsar da chamada/mover não fazem sentido pra quem
    // nem está conectada -- mas banir do servidor sim (não depende disso),
    // por isso appendModerationSection continua sendo chamado aqui também;
    // ela mesma decide sozinha, por dentro, o que mostra ou não.
    appendModerationSection(menu, identity);

    document.body.appendChild(menu);
    contextMenuEl = menu;
    positionContextMenu(x, y, menu);
    return;
  }

  appendSocialSection(menu, identity, x, y);
  menu.appendChild(dividerEl());

  // Se o menu foi aberto em cima da transmissão de tela dela (não só a
  // câmera), diferencia os dois volumes -- senão "Volume" sozinho ficaria
  // ambíguo (voz ou transmissão?).
  const volumeWrap = document.createElement('div');
  volumeWrap.className = 'context-menu-volume';
  const volumeLabel = document.createElement('span');
  volumeLabel.className = 'label';
  volumeLabel.textContent = opts.showStreamVolume ? 'Volume (voz)' : 'Volume';
  volumeWrap.appendChild(volumeLabel);
  // Igual ao Discord: dá pra dar boost até 200% (não só 0-100%), com uma
  // bolinha mostrando a porcentagem enquanto arrasta (ver getEffectiveVolume/
  // registerAudioEl com GainNode lá em cima, que é o que permite passar de 100%).
  const volumeSliderWrap = document.createElement('div');
  volumeSliderWrap.className = 'volume-slider-wrap';
  const volumeBubble = document.createElement('div');
  volumeBubble.className = 'volume-bubble';
  volumeBubble.hidden = true;
  const volumeSlider = document.createElement('input');
  volumeSlider.type = 'range';
  volumeSlider.min = '0';
  volumeSlider.max = '200';
  volumeSlider.value = String(Math.round(getEffectiveVolume(identity) * 100));
  volumeSliderWrap.appendChild(volumeBubble);
  volumeSliderWrap.appendChild(volumeSlider);
  volumeWrap.appendChild(volumeSliderWrap);
  menu.appendChild(volumeWrap);

  function positionVolumeBubble() {
    const min = Number(volumeSlider.min);
    const max = Number(volumeSlider.max);
    const percent = (Number(volumeSlider.value) - min) / (max - min);
    volumeBubble.style.left = `${percent * 100}%`;
    volumeBubble.textContent = `${volumeSlider.value}%`;
  }
  let volumeBubbleHideTimer = null;

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
    positionVolumeBubble();
    volumeBubble.hidden = false;
    clearTimeout(volumeBubbleHideTimer);
  });
  // Só salva (e some com a bolinha de %) quando solta o slider -- não a cada
  // tiquinho, senão gravaria o config.json o tempo todo enquanto arrasta.
  volumeSlider.addEventListener('change', () => {
    saveParticipantVolumePreference(identity, Number(volumeSlider.value) / 100);
    clearTimeout(volumeBubbleHideTimer);
    volumeBubbleHideTimer = setTimeout(() => { volumeBubble.hidden = true; }, 600);
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

  appendRolesSection(menu, identity);
  appendModerationSection(menu, identity);

  document.body.appendChild(menu);
  contextMenuEl = menu;
  positionContextMenu(x, y, menu);
}

// Monta a seção "social" do menu de contexto de um membro -- Ver perfil,
// Mencionar, Mensagem e Adicionar/Editar nota, igual Discord. Reaproveitada
// tanto pro menu normal (gente online) quanto pro de gente offline: nenhuma
// dessas 4 ações depende da pessoa estar conectada agora (ver perfil, mandar
// mensagem, mencionar no chat ou anotar algo sobre ela funcionam do mesmo
// jeito). "Iniciar chamada" fica de fora por enquanto -- ainda não existe
// nenhum sistema de chamada privada no app, é um projeto maior à parte.
function appendSocialSection(menu, identity, x, y) {
  const profileItem = document.createElement('div');
  profileItem.className = 'context-menu-item';
  const profileLabel = document.createElement('span');
  profileLabel.className = 'label';
  profileLabel.textContent = 'Ver perfil';
  profileItem.appendChild(profileLabel);
  profileItem.addEventListener('click', (e) => {
    e.stopPropagation();
    closeContextMenu();
    openProfileCard(x, y, identity);
  });
  menu.appendChild(profileItem);

  const mentionItem = document.createElement('div');
  mentionItem.className = 'context-menu-item';
  const mentionLabel = document.createElement('span');
  mentionLabel.className = 'label';
  mentionLabel.textContent = 'Mencionar';
  mentionItem.appendChild(mentionLabel);
  mentionItem.addEventListener('click', (e) => {
    e.stopPropagation();
    closeContextMenu();
    insertMention(identity);
  });
  menu.appendChild(mentionItem);

  const messageItem = document.createElement('div');
  messageItem.className = 'context-menu-item';
  const messageLabel = document.createElement('span');
  messageLabel.className = 'label';
  messageLabel.textContent = 'Mensagem';
  messageItem.appendChild(messageLabel);
  messageItem.addEventListener('click', (e) => {
    e.stopPropagation();
    closeContextMenu();
    switchToDm(identity);
  });
  menu.appendChild(messageItem);

  appendNicknameSection(menu, identity);
  appendMemberNoteSection(menu, identity);
}

// Item "Alterar apelido" expansível -- troca como essa pessoa aparece SÓ
// neste servidor (não mexe no nome de exibição da conta dela). Só aparece
// pra quem tem a permissão de gerenciar apelidos (dono do servidor sempre
// tem). Igual "Adicionar nota": clica pra abrir um campinho embaixo, dá
// Enter pra salvar, sem fechar o menu.
function appendNicknameSection(menu, identity) {
  if (!myPermissions.manageNicknames) return;

  const currentNickname = serverState.nicknames?.[identity] || '';

  const toggleItem = document.createElement('div');
  toggleItem.className = 'context-menu-item';
  const label = document.createElement('span');
  label.className = 'label';
  label.textContent = 'Alterar apelido';
  toggleItem.appendChild(label);
  const chevron = document.createElement('span');
  chevron.className = 'context-menu-chevron';
  chevron.innerHTML =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>';
  toggleItem.appendChild(chevron);
  menu.appendChild(toggleItem);

  const wrap = document.createElement('div');
  wrap.className = 'context-menu-submenu context-menu-nickname';
  wrap.hidden = true;

  const form = document.createElement('form');
  form.className = 'context-menu-nickname-form';
  form.addEventListener('click', (e) => e.stopPropagation());
  const input = document.createElement('input');
  input.type = 'text';
  input.maxLength = 32;
  input.placeholder = displayNameFor(identity);
  input.value = currentNickname;
  form.appendChild(input);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const data = await apiFetch(`/api/members/${encodeURIComponent(identity)}/nickname`, {
        method: 'POST',
        body: JSON.stringify({ nickname: input.value }),
      });
      serverState.nicknames = data.nicknames;
      applyProfileEverywhere(identity);
      renderMemberSidebar();
      broadcastStateChanged();
      closeContextMenu();
    } catch (err) {
      alert(err.message);
    }
  });
  wrap.appendChild(form);
  menu.appendChild(wrap);

  toggleItem.addEventListener('click', (e) => {
    e.stopPropagation();
    wrap.hidden = !wrap.hidden;
    chevron.classList.toggle('open', !wrap.hidden);
    if (!wrap.hidden) input.focus();
  });
}

// Item "Adicionar nota"/"Editar nota" expansível (igual "Cargos": clica pra
// abrir uma caixinha de texto embaixo, sem fechar o menu). A nota é só
// local -- guardada no config.json deste PC via memberNotes, nunca vai pro
// servidor nem aparece pra mais ninguém, exatamente o "visível apenas para
// você" do Discord.
function appendMemberNoteSection(menu, identity) {
  const hasNote = !!(memberNotes[identity] || '').trim();

  const noteToggleItem = document.createElement('div');
  noteToggleItem.className = 'context-menu-item';
  const noteLabel = document.createElement('span');
  noteLabel.className = 'label';
  noteLabel.textContent = hasNote ? 'Editar nota' : 'Adicionar nota';
  noteToggleItem.appendChild(noteLabel);
  const chevron = document.createElement('span');
  chevron.className = 'context-menu-chevron';
  chevron.innerHTML =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>';
  noteToggleItem.appendChild(chevron);
  menu.appendChild(noteToggleItem);

  const noteWrap = document.createElement('div');
  noteWrap.className = 'context-menu-submenu context-menu-note';
  noteWrap.hidden = true;
  const noteTextarea = document.createElement('textarea');
  noteTextarea.className = 'context-menu-note-textarea';
  noteTextarea.maxLength = 300;
  noteTextarea.placeholder = 'Só você vê essa nota';
  noteTextarea.value = memberNotes[identity] || '';
  noteTextarea.addEventListener('click', (e) => e.stopPropagation());
  noteTextarea.addEventListener('input', () => {
    const text = noteTextarea.value;
    if (text.trim()) memberNotes[identity] = text;
    else delete memberNotes[identity];
    scheduleSaveMemberNotes();
  });
  noteWrap.appendChild(noteTextarea);
  menu.appendChild(noteWrap);

  noteToggleItem.addEventListener('click', (e) => {
    e.stopPropagation();
    noteWrap.hidden = !noteWrap.hidden;
    chevron.classList.toggle('open', !noteWrap.hidden);
    if (!noteWrap.hidden) noteTextarea.focus();
  });
}

// Monta a seção "Cargos" (expansível, clica pra abrir/fechar) dentro de um
// menu de contexto já existente -- reaproveitada tanto no menu normal
// quanto no de gente offline. Só aparece pra quem tem permissão de
// gerenciar cargos e só se já existir pelo menos um cargo criado no
// servidor. Igual a lista da aba de Cargos, clicar num cargo atribui/tira
// na hora, sem fechar o menu, pra dar pra marcar vários de uma vez.
function appendRolesSection(menu, identity) {
  if (!myPermissions.manageRoles || !(serverState.roles || []).length) return;

  menu.appendChild(dividerEl());

  const rolesToggleItem = document.createElement('div');
  rolesToggleItem.className = 'context-menu-item';
  const rolesLabel = document.createElement('span');
  rolesLabel.className = 'label';
  rolesLabel.textContent = 'Cargos';
  rolesToggleItem.appendChild(rolesLabel);
  const chevron = document.createElement('span');
  chevron.className = 'context-menu-chevron';
  chevron.innerHTML =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>';
  rolesToggleItem.appendChild(chevron);
  menu.appendChild(rolesToggleItem);

  const rolesSubmenu = document.createElement('div');
  rolesSubmenu.className = 'context-menu-submenu';
  rolesSubmenu.hidden = true;
  serverState.roles.forEach((role) => {
    const assigned = new Set(serverState.memberRoles[identity] || []).has(role.id);
    const roleItem = buildToggleItem(role.name, assigned, async (checked) => {
      try {
        const data = await apiFetch(`/api/members/${encodeURIComponent(identity)}/roles`, {
          method: 'POST',
          body: JSON.stringify({ roleId: role.id, action: checked ? 'add' : 'remove' }),
        });
        serverState.memberRoles = data.memberRoles;
        renderMemberSidebar();
        refreshAllChatAuthorColors();
        broadcastStateChanged();
      } catch (err) {
        alert(err.message);
      }
    });
    roleItem.querySelector('.label').style.color = role.color;
    rolesSubmenu.appendChild(roleItem);
  });
  menu.appendChild(rolesSubmenu);

  rolesToggleItem.addEventListener('click', (e) => {
    e.stopPropagation();
    rolesSubmenu.hidden = !rolesSubmenu.hidden;
    chevron.classList.toggle('open', !rolesSubmenu.hidden);
  });
}

// Manda um avisinho direcionado SÓ pra identity (destinationIdentities),
// pelo canal de dados sempre ativo (lobbyRoom) -- é assim que a gente
// consegue fazer o APP DELA reagir a uma ação de moderação tomada por
// outra pessoa (entrar sozinha num canal de voz novo depois de ser movida,
// ou limpar a UI de chamada depois de ser expulsa/banida), já que o
// servidor sabe mexer no LiveKit mas não tem como "clicar" em nada dentro
// do app de quem foi afetado.
function notifyModeration(identity, payload) {
  if (!lobbyRoom || !identity) return;
  lobbyRoom.localParticipant.publishData(chatEncoder.encode(JSON.stringify({ ...payload, to: identity })), {
    reliable: true,
    destinationIdentities: [identity],
  });
}

// Seção de moderação (Expulsar da chamada / Mover pra outro canal de voz /
// Banir do servidor) -- reaproveitada tanto no menu de gente online quanto
// no de gente offline (banir não depende de estar conectada; expulsar/mover
// simplesmente não aparecem se ela não estiver em nenhum canal de voz
// agora, o que já resolve sozinho o caso offline sem precisar de mais
// nenhuma checagem). Cada ação aparece só pra quem tem a permissão dela.
function appendModerationSection(menu, identity) {
  const targetVoiceChannelId = voiceChannelIdFor(identity);
  const canKick = myPermissions.kickMembers && targetVoiceChannelId;
  const otherVoiceChannels = (serverState.channels?.voice || []).filter((c) => c.id !== targetVoiceChannelId);
  const canMove = myPermissions.moveMembers && targetVoiceChannelId && otherVoiceChannels.length > 0;
  const canBan = myPermissions.banMembers;
  if (!canKick && !canMove && !canBan) return;

  menu.appendChild(dividerEl());

  if (canKick) {
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
      if (!(await confirmDialog(`Expulsar ${displayNameFor(identity)} da chamada?`, { confirmLabel: 'Expulsar' }))) return;
      try {
        await apiFetch('/api/moderation/kick', {
          method: 'POST',
          body: JSON.stringify({ identity, channelId: targetVoiceChannelId }),
        });
        notifyModeration(identity, { type: 'moderation-kicked', channelId: targetVoiceChannelId });
      } catch (err) {
        alert(err.message);
      }
    });
    menu.appendChild(kickItem);
  }

  if (canMove) {
    const moveToggleItem = document.createElement('div');
    moveToggleItem.className = 'context-menu-item';
    const moveLabel = document.createElement('span');
    moveLabel.className = 'label';
    moveLabel.textContent = 'Mover para';
    moveToggleItem.appendChild(moveLabel);
    const chevron = document.createElement('span');
    chevron.className = 'context-menu-chevron';
    chevron.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>';
    moveToggleItem.appendChild(chevron);
    menu.appendChild(moveToggleItem);

    const moveSubmenu = document.createElement('div');
    moveSubmenu.className = 'context-menu-submenu';
    moveSubmenu.hidden = true;
    otherVoiceChannels.forEach((channel) => {
      const channelItem = document.createElement('div');
      channelItem.className = 'context-menu-item';
      const channelLabel = document.createElement('span');
      channelLabel.className = 'label';
      channelLabel.textContent = channel.name;
      channelItem.appendChild(channelLabel);
      channelItem.addEventListener('click', async (e) => {
        e.stopPropagation();
        closeContextMenu();
        try {
          await apiFetch('/api/moderation/move', {
            method: 'POST',
            body: JSON.stringify({ identity, toChannelId: channel.id }),
          });
          notifyModeration(identity, { type: 'moderation-move', channelId: channel.id });
        } catch (err) {
          alert(err.message);
        }
      });
      moveSubmenu.appendChild(channelItem);
    });
    menu.appendChild(moveSubmenu);

    moveToggleItem.addEventListener('click', (e) => {
      e.stopPropagation();
      moveSubmenu.hidden = !moveSubmenu.hidden;
      chevron.classList.toggle('open', !moveSubmenu.hidden);
    });
  }

  if (canBan) {
    const banItem = document.createElement('div');
    banItem.className = 'context-menu-item';
    const banLabel = document.createElement('span');
    banLabel.className = 'label';
    banLabel.style.color = 'var(--danger)';
    banLabel.textContent = 'Banir do servidor';
    banItem.appendChild(banLabel);
    banItem.addEventListener('click', async (e) => {
      e.stopPropagation();
      closeContextMenu();
      if (!(await confirmDialog(`Banir ${displayNameFor(identity)} do servidor? Ela não vai conseguir entrar de novo até alguém desbanir.`, { confirmLabel: 'Banir' }))) return;
      try {
        await apiFetch('/api/moderation/ban', { method: 'POST', body: JSON.stringify({ identity }) });
        notifyModeration(identity, { type: 'moderation-banned' });
      } catch (err) {
        alert(err.message);
      }
    });
    menu.appendChild(banItem);
  }
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
  const onlineRow = e.target.closest('.member-row');
  const offlineRow = e.target.closest('.offline-member-row');
  const row = onlineRow || offlineRow;
  if (!row || !row.dataset.identity) return;
  e.preventDefault();
  openContextMenu(e.clientX, e.clientY, participantFromRow(row), { isOffline: !!offlineRow });
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
  // Clicar no NOME DO CANAL entra na chamada (listener próprio dele, ver
  // renderChannelLists); clicar numa PESSOA dentro da lista de membros do
  // canal abre o perfil dela -- igual o Discord (antes entrava direto na
  // chamada também, o que não dava pra ver o perfil de quem já tá
  // conectado sem abrir o menu de contexto).
  openProfileCard(e.clientX, e.clientY, row.dataset.identity);
});

// mesma coisa nas mensagens do chat de texto — clicar na foto ou no nome de
// quem mandou abre o cartão de perfil, igual em qualquer outro lugar do app
// (clicar no TEXTO da mensagem não abre nada, só na foto/nome, igual Discord)
chatMessages.addEventListener('click', (e) => {
  // clicar numa "@menção" dentro do texto abre o perfil de QUEM FOI
  // MENCIONADO (não de quem mandou a mensagem) -- igual Discord. Só
  // funciona quando dá pra identificar a pessoa (ver identityForMentionName).
  const mentionEl = e.target.closest('.chat-mention');
  if (mentionEl && mentionEl.dataset.identity) {
    e.stopPropagation();
    openProfileCard(e.clientX, e.clientY, mentionEl.dataset.identity);
    return;
  }
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
  openContextMenu(e.clientX, e.clientY, participantFromRow(tile), { showStreamVolume: isScreenShareTile });
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
  watchingScreenShare.clear();
  updateFloatingBarVisibility();
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
        replyTo: msg.replyTo || null,
        reactions: {},
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
        bio: msg.bio || '',
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
      const isNewPeer = !dmPeers.has(peer);
      dmPeers.add(peer);
      if (isNewPeer) saveDmPeersToConfig().catch(() => {});
      renderDmList();
      pushChatMessage(dmChannelKey(peer), {
        id: msg.id,
        name: msg.from === myIdentity ? (myDisplayName || myName) : (msg.name || displayNameFor(peer)),
        text: msg.text,
        ts: msg.ts,
        isSelf: msg.from === myIdentity,
        identity: msg.from,
        attachment: msg.attachment || null,
        replyTo: msg.replyTo || null,
        reactions: {},
      });
      if (msg.from !== myIdentity) {
        notifyNewMessage(peer, msg.name || displayNameFor(peer), msg.text);
      }
    } else if (msg.type === 'message-edited' || msg.type === 'message-deleted') {
      // mesma checagem de privacidade do 'dm' acima: numa edição/apagada de
      // DM, só aceita se eu for de fato remetente ou destinatário
      if (msg.dm && msg.from !== myIdentity && msg.to !== myIdentity) return;
      const channelId = msg.dm ? dmChannelKey(msg.from === myIdentity ? msg.to : msg.from) : msg.channelId;
      if (!channelId || !msg.id) return;
      if (msg.type === 'message-edited') applyMessageEdited(channelId, msg.id, msg.text);
      else applyMessageDeleted(channelId, msg.id);
    } else if (msg.type === 'message-reaction') {
      // mesma checagem de privacidade do 'dm' acima -- e nunca recebe a
      // PRÓPRIA reação de volta (publishData não ecoa pro remetente), só as
      // reações de quem mais está na conversa/canal
      if (msg.dm && msg.from !== myIdentity && msg.to !== myIdentity) return;
      const channelId = msg.dm ? dmChannelKey(msg.from === myIdentity ? msg.to : msg.from) : msg.channelId;
      if (!channelId || !msg.id) return;
      applyMessageReaction(channelId, msg.id, msg.reactions || {});
    } else if (msg.type === 'moderation-move') {
      // avisado (por quem tem permissão) que fui movido pra outro canal de
      // voz -- igual checagem de privacidade da DM acima, só age se o
      // aviso for mesmo endereçado a mim (destinationIdentities já filtra
      // a entrega, isso aqui é reforço extra). joinVoiceChannel já cuida
      // sozinho de sair do canal atual antes de entrar no novo.
      if (msg.to !== myIdentity || !msg.channelId) return;
      joinVoiceChannel(msg.channelId);
    } else if (msg.type === 'moderation-kicked') {
      // fui expulso de um canal de voz específico -- o servidor já derrubou
      // minha conexão do LADO do LiveKit (removeParticipant), mas essa sala
      // de voz não tem listener de Disconnected próprio (só a lobbyRoom
      // tem), então sem isso minha UI de chamada ficaria "presa" mostrando
      // que eu ainda estou conectado. Só limpa se for de fato o canal em
      // que eu estava (evita fechar uma chamada nova caso as mensagens
      // cheguem fora de ordem).
      if (msg.to !== myIdentity) return;
      if (msg.channelId && msg.channelId !== activeVoiceChannelId) return;
      if (activeVoiceChannelId) leaveVoiceChannel();
    } else if (msg.type === 'moderation-banned') {
      // fui banido do servidor -- o servidor já está me removendo da sala
      // principal (lobbyRoom), o que por si só dispara handleFullDisconnect
      // via RoomEvent.Disconnected (ver acima); isso aqui é só o aviso do
      // motivo, pra não parecer uma queda de conexão sem explicação.
      if (msg.to !== myIdentity) return;
      alert('Você foi banido deste servidor.');
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

  // Se a pessoa estava numa chamada de voz quando mandou instalar uma
  // atualização (ver updateBannerBtn), volta pra ela sozinho agora que
  // reconectou -- sem precisar entrar de novo na mão. Só usa isso uma vez
  // (apaga a marca logo em seguida, connect com sucesso ou não) pra nunca
  // entrar de volta numa chamada antiga sem querer numa abertura futura.
  try {
    const cfg = (await window.vortex.getConfig()) || {};
    const rejoinChannelId = cfg.rejoinVoiceChannelAfterUpdate;
    if (rejoinChannelId) {
      delete cfg.rejoinVoiceChannelAfterUpdate;
      await window.vortex.setConfig(cfg);
      const stillExists = serverState.channels?.voice?.some((c) => c.id === rejoinChannelId);
      if (stillExists) joinVoiceChannel(rejoinChannelId).catch(() => {});
    }
  } catch {
    // sem problema -- só não volta sozinho pra chamada
  }
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

// Igual Discord: dá pra mutar/desmutar (e ensurdecer) mesmo ANTES de entrar
// numa chamada -- não é preciso estar conectado num canal de voz pra
// mexer nesses botões. Só a chamada de verdade pro LiveKit
// (setMicrophoneEnabled) é que fica condicionada a estar conectado
// (voiceRoom); fora de uma chamada, é só um estado visual que fica
// guardado pra quando a pessoa entrar de fato (ver completeConnect).
micBtn.addEventListener('click', async () => {
  // clicar no microfone enquanto está ensurdecido sempre desfaz o
  // ensurdecer (igual Discord) — a voz volta pro estado de antes de
  // ensurdecer, dentro do setDeafened
  if (isDeafened) {
    setDeafened(false);
    return;
  }
  const newOn = micBtn.dataset.on !== 'true';
  if (voiceRoom) await voiceRoom.localParticipant.setMicrophoneEnabled(newOn);
  micBtn.dataset.on = String(newOn);
  micBtn.classList.toggle('off', !newOn);
  playSound(newOn ? unmuteSound : muteSound); // só toca pra quem clicou, não é avisado pros outros
  animateIconKick(micBtn);
  updateVoiceOverlay();
});

const deafenBtn = document.getElementById('deafen-btn');
deafenBtn.addEventListener('click', () => {
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
upgradeTooltip(myLiveStopBtn, { dir: 'top' });
upgradeTooltip(hangupBtn, { dir: 'top' });
upgradeTooltip(cinemaCamBtn, { dir: 'top' });
upgradeTooltip(cinemaVolumeBtn, { dir: 'top' });
upgradeTooltip(cinemaFullscreenBtn, { dir: 'top' });
upgradeTooltip(cinemaStopWatchBtn, { dir: 'top' });
upgradeTooltip(cinemaMicBtn, { dir: 'top' });
upgradeTooltip(cinemaHangupBtn, { dir: 'top' });
upgradeTooltip(gearBtn);
upgradeTooltip(addTextChannelBtn);
upgradeTooltip(addVoiceChannelBtn);
upgradeTooltip(selfAvatar);
upgradeTooltip(selfNameBtn);
upgradeTooltip(chatAttachmentBtn);
// dir: 'top' -- agora que o X mora no canto superior direito do próprio
// modal (perto da borda direita da janela), o balãozinho padrão (que
// aparece à direita do botão) não cabia e vazava pra fora da tela.
upgradeTooltip(settingsModalClose, { dir: 'top' });
upgradeTooltip(exitAppBtn);
upgradeTooltip(keybindMuteClearBtn);
upgradeTooltip(keybindDeafenClearBtn);
// texto muda (mostrar/ocultar) então usa getText em vez de fixar o
// dataset.tooltip uma vez só
upgradeTooltip(toggleMembersBtn, { getText: () => toggleMembersBtn.title || toggleMembersBtn.dataset.tooltip });

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
// Guarda a última escolha (tela/janela + áudio) enquanto a transmissão atual
// está no ar -- serve só pra reabrir o popup de "o que compartilhar" já com
// a mesma tela/áudio marcados quando a pessoa clica no botão de novo pra
// TROCAR de tela/qualidade (ver shareBtn abaixo). Fica null sempre que não
// tá compartilhando.
let currentShareChoice = null;

function stopScreenShareUI() {
  shareBtn.dataset.on = 'false';
  shareBtn.classList.add('off');
  shareBtn.classList.remove('sharing');
  shareBtn.dataset.tooltip = 'Compartilhar tela';
  currentShareChoice = null;
  window.vortex.hideShareOverlay?.();
  if (!voiceRoom) return;
  const tile = document.getElementById(tileId(voiceRoom.localParticipant.identity));
  tile?.querySelectorAll('video').forEach((el) => el.remove());
  if (tile && !tile.querySelector('video')) tile.classList.remove('has-video');
}

// Encerra a transmissão de verdade (desliga o track no LiveKit + zera a UI).
// Usado pelos botões DEDICADOS de parar (X na barrinha "AO VIVO" e no
// overlay por cima de outras janelas) -- diferente de clicar no botão
// principal de compartilhar ENQUANTO já tá ao vivo, que agora reabre o
// popup pra TROCAR de tela/qualidade em vez de encerrar (ver shareBtn).
async function stopScreenShare() {
  if (!voiceRoom) return;
  await voiceRoom.localParticipant.setScreenShareEnabled(false);
  stopScreenShareUI();
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

async function openScreenShareModal(opts = {}) {
  const presetChoice = opts.presetChoice || null;
  sharepickSelectedId = null;
  sharepickKind = 'screen';
  sharepickAudioCheckbox.checked = presetChoice ? presetChoice.withAudio : false;
  sharepickConfirmBtn.disabled = true;
  sharepickTabs.forEach((t) => t.classList.toggle('active', t.dataset.kind === 'screen'));
  sharepickGrid.innerHTML = '<p class="sharepick-empty">Carregando...</p>';
  sharepickOverlay.hidden = false;

  try {
    sharepickSources = await window.vortex.listScreenShareSources();
  } catch {
    sharepickSources = [];
  }
  // Reabrindo pra TROCAR de tela enquanto já tá compartilhando -- já marca a
  // mesma tela/janela de antes selecionada, se ela ainda existir na lista.
  if (presetChoice && sharepickSources.some((s) => s.id === presetChoice.sourceId)) {
    sharepickSelectedId = presetChoice.sourceId;
    sharepickConfirmBtn.disabled = false;
  }
  renderSharepickGrid();

  return new Promise((resolve) => {
    sharepickResolve = resolve;
  });
}

shareBtn.addEventListener('click', async () => {
  if (!voiceRoom) return;

  // Já tá compartilhando: clicar aqui de novo NÃO encerra mais a
  // transmissão -- reabre o popup pra trocar de tela/janela, qualidade ou
  // áudio (igual o "Configurações de tela" do Discord). Pra encerrar de
  // verdade agora é pelo X dedicado (barrinha "AO VIVO" ou overlay).
  const alreadySharing = shareBtn.dataset.on === 'true';

  const choice = await openScreenShareModal({ presetChoice: alreadySharing ? currentShareChoice : null });
  if (!choice) return; // cancelou -- se já tava compartilhando, continua exatamente como estava

  await window.vortex.chooseScreenShareSource(choice);
  const { resolution: sizeConstraint, maxBitrate } = screenShareQualitySettings(choice.resolution, choice.frameRate);

  if (alreadySharing) {
    // troca a tela/qualidade por baixo dos panos -- desliga o track antigo
    // antes de ligar o novo (LiveKit não tem "trocar sem soltar")
    await voiceRoom.localParticipant.setScreenShareEnabled(false);
  }

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
    if (alreadySharing) stopScreenShareUI(); // já tinha desligado o track antigo, então zera a UI tb
    return;
  }

  currentShareChoice = choice;
  shareBtn.dataset.on = 'true';
  shareBtn.classList.remove('off');
  shareBtn.classList.add('sharing');
  shareBtn.dataset.tooltip = 'Alterar configurações da tela';
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
  if (!(await confirmDialog('Sair do PrimalVoice? Você volta pra tela de login.', { confirmLabel: 'Sair' }))) return;
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

// ---------- popovers de entrada/saída (setinha do lado do mic/fone,
// igual o Discord) ----------
// Não tem "Perfil de entrada" (isolamento de voz/estúdio) nem "Volume de
// entrada" (ganho do mic) igual o Discord porque o PrimalVoice não tem
// processamento de áudio de verdade por trás disso ainda — melhor não ter
// o controle do que ter um de mentirinha que não faz nada.
const DEVICE_POPOVER_GEAR_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>';

function buildDeviceRow(label, isSelected, onClick) {
  const item = document.createElement('div');
  item.className = 'context-menu-item';
  const labelEl = document.createElement('span');
  labelEl.className = 'label';
  labelEl.textContent = label;
  item.appendChild(labelEl);
  const radio = document.createElement('span');
  radio.className = 'device-radio';
  radio.classList.toggle('checked', isSelected);
  item.appendChild(radio);
  item.addEventListener('click', (e) => {
    e.stopPropagation();
    onClick();
    closeContextMenu();
  });
  return item;
}

function buildVoiceSettingsRow() {
  const item = document.createElement('div');
  item.className = 'context-menu-item';
  const labelEl = document.createElement('span');
  labelEl.className = 'label';
  labelEl.textContent = 'Configurações de voz';
  item.appendChild(labelEl);
  const gear = document.createElement('span');
  gear.className = 'device-popover-gear';
  gear.innerHTML = DEVICE_POPOVER_GEAR_SVG;
  item.appendChild(gear);
  item.addEventListener('click', (e) => {
    e.stopPropagation();
    closeContextMenu();
    openSettingsModal('voice');
  });
  return item;
}

// Abre pra CIMA do botão que foi clicado (mesma ideia do soundboard: esses
// botões ficam no rodapé da barra lateral, "abrir pra baixo" sairia da tela).
function positionPopoverAboveAnchor(anchorBtn, panel) {
  const anchorRect = anchorBtn.getBoundingClientRect();
  const panelRect = panel.getBoundingClientRect();
  let left = anchorRect.left;
  if (left + panelRect.width > window.innerWidth) left = window.innerWidth - panelRect.width - 8;
  let top = anchorRect.top - panelRect.height - 10;
  panel.style.left = `${Math.max(8, left)}px`;
  panel.style.top = `${Math.max(8, top)}px`;
}

async function openInputOptionsPopover(anchorBtn) {
  closeContextMenu();
  await populateDeviceSelects();

  const panel = document.createElement('div');
  panel.className = 'context-menu device-popover';
  panel.addEventListener('click', (e) => e.stopPropagation());

  const header = document.createElement('div');
  header.className = 'context-menu-header';
  header.textContent = 'Dispositivo de entrada';
  panel.appendChild(header);

  Array.from(micSelect.options).forEach((opt) => {
    panel.appendChild(
      buildDeviceRow(opt.textContent, opt.value === micSelect.value, () => {
        micSelect.value = opt.value;
        micSelect.dispatchEvent(new Event('change'));
      })
    );
  });

  panel.appendChild(dividerEl());
  panel.appendChild(buildVoiceSettingsRow());

  document.body.appendChild(panel);
  contextMenuEl = panel;
  positionPopoverAboveAnchor(anchorBtn, panel);
}

async function openOutputOptionsPopover(anchorBtn) {
  closeContextMenu();
  await populateDeviceSelects();

  const panel = document.createElement('div');
  panel.className = 'context-menu device-popover';
  panel.addEventListener('click', (e) => e.stopPropagation());

  const header = document.createElement('div');
  header.className = 'context-menu-header';
  header.textContent = 'Dispositivo de saída';
  panel.appendChild(header);

  if (speakerSelect.disabled) {
    const info = document.createElement('div');
    info.className = 'context-menu-info';
    info.textContent = 'Não suportado neste sistema';
    panel.appendChild(info);
  } else {
    Array.from(speakerSelect.options).forEach((opt) => {
      panel.appendChild(
        buildDeviceRow(opt.textContent, opt.value === speakerSelect.value, () => {
          speakerSelect.value = opt.value;
          speakerSelect.dispatchEvent(new Event('change'));
        })
      );
    });
  }

  panel.appendChild(dividerEl());

  const volumeWrap = document.createElement('div');
  volumeWrap.className = 'context-menu-volume';
  const volumeLabel = document.createElement('span');
  volumeLabel.className = 'label';
  volumeLabel.textContent = 'Volume de saída';
  volumeWrap.appendChild(volumeLabel);
  const volumeSlider = document.createElement('input');
  volumeSlider.type = 'range';
  volumeSlider.min = '0';
  volumeSlider.max = '100';
  volumeSlider.value = String(Math.round(masterOutputVolume * 100));
  volumeWrap.appendChild(volumeSlider);
  volumeSlider.addEventListener('input', () => {
    setMasterOutputVolume(Number(volumeSlider.value) / 100);
  });
  panel.appendChild(volumeWrap);

  panel.appendChild(dividerEl());
  panel.appendChild(buildVoiceSettingsRow());

  document.body.appendChild(panel);
  contextMenuEl = panel;
  positionPopoverAboveAnchor(anchorBtn, panel);
}

micOptionsBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  openInputOptionsPopover(micOptionsBtn);
});
outputOptionsBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  openOutputOptionsPopover(outputOptionsBtn);
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
  if (myPermissions.banMembers) renderBansTab();
  switchModalTab(defaultTab || 'voice');
}

// ---------- aba "Banidos" (dentro do modal) ----------
async function renderBansTab() {
  if (!bansListEl) return;
  let bannedIdentities = [];
  try {
    const data = await apiFetch('/api/moderation/bans');
    bannedIdentities = data.bannedIdentities || [];
  } catch {
    return; // sem permissão ou servidor fora do ar -- deixa a aba vazia
  }
  bansListEl.innerHTML = '';
  if (bansEmptyHint) bansEmptyHint.hidden = bannedIdentities.length > 0;
  bannedIdentities.forEach((identity) => {
    const row = document.createElement('div');
    row.className = 'ban-row';
    const name = document.createElement('span');
    name.className = 'ban-row-name';
    name.textContent = identity;
    row.appendChild(name);
    const unbanBtn = document.createElement('button');
    unbanBtn.type = 'button';
    unbanBtn.textContent = 'Desbanir';
    unbanBtn.addEventListener('click', async () => {
      try {
        await apiFetch('/api/moderation/unban', { method: 'POST', body: JSON.stringify({ identity }) });
        renderBansTab();
      } catch (err) {
        alert(err.message);
      }
    });
    row.appendChild(unbanBtn);
    bansListEl.appendChild(row);
  });
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
    if (!(await confirmDialog(`Apagar o canal "${channel.name}"?`, { confirmLabel: 'Apagar' }))) return;
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

// Conta quantos membros têm esse cargo atribuído (pro número que aparece do
// lado direito de cada linha na lista, igual Discord).
function roleMemberCount(roleId) {
  return Object.values(serverState.memberRoles || {}).filter((ids) => (ids || []).includes(roleId)).length;
}

function renderRolesTab() {
  const query = rolesSearchQuery.trim().toLowerCase();
  const visibleRoles = query ? serverState.roles.filter((role) => role.name.toLowerCase().includes(query)) : serverState.roles;

  if (rolesCountLabel) rolesCountLabel.textContent = `CARGOS (${serverState.roles.length})`;

  rolesListEl.innerHTML = '';
  visibleRoles.forEach((role) => {
    const item = document.createElement('div');
    item.className = 'role-list-item';
    item.classList.toggle('active', role.id === selectedRoleId);
    item.draggable = true;
    item.dataset.roleId = role.id;

    const dot = document.createElement('span');
    dot.className = 'role-color-dot';
    dot.style.background = role.color;
    item.appendChild(dot);

    const name = document.createElement('span');
    name.className = 'role-name';
    name.textContent = role.name;
    item.appendChild(name);

    const count = document.createElement('span');
    count.className = 'role-member-count';
    count.innerHTML = `${PERSON_ICON_SVG}<span>${roleMemberCount(role.id)}</span>`;
    item.appendChild(count);

    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'role-row-btn';
    editBtn.title = 'Editar cargo';
    editBtn.innerHTML = EDIT_ICON_SVG;
    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      selectedRoleId = role.id;
      renderRolesTab();
    });
    item.appendChild(editBtn);

    const kebabBtn = document.createElement('button');
    kebabBtn.type = 'button';
    kebabBtn.className = 'role-row-btn';
    kebabBtn.title = 'Mais opções';
    kebabBtn.innerHTML = KEBAB_ICON_SVG;
    kebabBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openRoleKebabMenu(e, role);
    });
    item.appendChild(kebabBtn);

    item.addEventListener('click', () => {
      selectedRoleId = role.id;
      renderRolesTab();
    });

    // arrastar pra reordenar (igual Discord) -- a ordem da lista É a
    // hierarquia (ver topRoleColorFor/renderMemberSidebar), então soltar um
    // cargo acima/abaixo de outro já reordena de verdade, não é só visual.
    item.addEventListener('dragstart', (e) => {
      draggedRoleId = role.id;
      item.classList.add('dragging');
      if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
    });
    item.addEventListener('dragend', () => {
      item.classList.remove('dragging');
      rolesListEl.querySelectorAll('.role-list-item').forEach((el) => {
        el.classList.remove('drag-over-top', 'drag-over-bottom');
      });
      draggedRoleId = null;
    });
    item.addEventListener('dragover', (e) => {
      if (!draggedRoleId || draggedRoleId === role.id) return;
      e.preventDefault();
      const rect = item.getBoundingClientRect();
      const before = e.clientY < rect.top + rect.height / 2;
      item.classList.toggle('drag-over-top', before);
      item.classList.toggle('drag-over-bottom', !before);
    });
    item.addEventListener('dragleave', () => {
      item.classList.remove('drag-over-top', 'drag-over-bottom');
    });
    item.addEventListener('drop', (e) => {
      e.preventDefault();
      item.classList.remove('drag-over-top', 'drag-over-bottom');
      if (!draggedRoleId || draggedRoleId === role.id) return;
      const rect = item.getBoundingClientRect();
      const before = e.clientY < rect.top + rect.height / 2;
      reorderRoles(draggedRoleId, role.id, before);
    });

    rolesListEl.appendChild(item);
  });

  renderRoleEditor();
  renderRoleMembers();
}

if (rolesSearchInput) {
  rolesSearchInput.addEventListener('input', () => {
    rolesSearchQuery = rolesSearchInput.value;
    renderRolesTab();
  });
}

// Reordena os cargos localmente (feedback na hora, igual Discord) e depois
// persiste no back-end -- se a chamada falhar por qualquer motivo, desfaz e
// avisa, pra nunca ficar com a tela mostrando uma ordem que não foi salva.
async function reorderRoles(draggedId, targetId, before) {
  const previousOrder = serverState.roles;
  const roles = previousOrder.slice();
  const fromIdx = roles.findIndex((r) => r.id === draggedId);
  if (fromIdx === -1) return;
  const [moved] = roles.splice(fromIdx, 1);
  let toIdx = roles.findIndex((r) => r.id === targetId);
  if (toIdx === -1) toIdx = roles.length;
  else if (!before) toIdx += 1;
  roles.splice(toIdx, 0, moved);

  serverState.roles = roles;
  renderRolesTab();
  renderMemberSidebar();
  refreshAllChatAuthorColors();

  try {
    const data = await apiFetch('/api/roles/reorder', {
      method: 'PATCH',
      body: JSON.stringify({ order: roles.map((r) => r.id) }),
    });
    serverState.roles = data.roles;
    renderRolesTab();
    renderMemberSidebar();
    refreshAllChatAuthorColors();
    broadcastStateChanged();
  } catch (err) {
    serverState.roles = previousOrder;
    renderRolesTab();
    renderMemberSidebar();
    refreshAllChatAuthorColors();
    alert(err.message);
  }
}

// Menu "..." de cada linha -- por enquanto só "Apagar cargo" (editar já é o
// lápis/clicar na linha). Reusa a infra de context-menu já existente, só que
// com uma classe extra (.role-kebab-menu) pra ficar por cima do modal de
// configurações aberto (modal tem z-index maior que o context-menu comum).
function openRoleKebabMenu(e, role) {
  closeContextMenu();
  const menu = document.createElement('div');
  menu.className = 'context-menu role-kebab-menu';
  menu.addEventListener('click', (ev) => ev.stopPropagation());

  const delItem = document.createElement('div');
  delItem.className = 'context-menu-item danger';
  const delLabel = document.createElement('span');
  delLabel.className = 'label';
  delLabel.textContent = 'Apagar cargo';
  delItem.appendChild(delLabel);
  delItem.addEventListener('click', async (ev) => {
    ev.stopPropagation();
    closeContextMenu();
    if (!(await confirmDialog(`Apagar o cargo "${role.name}"?`, { confirmLabel: 'Apagar' }))) return;
    try {
      const data = await apiFetch(`/api/roles/${role.id}`, { method: 'DELETE' });
      serverState.roles = data.roles;
      serverState.memberRoles = data.memberRoles;
      if (selectedRoleId === role.id) selectedRoleId = null;
      renderRolesTab();
      renderMemberSidebar();
      refreshAllChatAuthorColors();
      broadcastStateChanged();
    } catch (err) {
      alert(err.message);
    }
  });
  menu.appendChild(delItem);

  document.body.appendChild(menu);
  contextMenuEl = menu;
  positionContextMenu(e.clientX, e.clientY, menu);
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
      // fecha o painel de edição depois de salvar -- antes ele continuava
      // aberto com os mesmos campos, sem nenhum sinal visível de que
      // salvou de verdade (parecia que não tinha acontecido nada)
      selectedRoleId = null;
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
    if (!(await confirmDialog(`Apagar o cargo "${role.name}"?`, { confirmLabel: 'Apagar' }))) return;
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

    // dono da sala: coroa antes do nome (igual Discord), em vez da tag
    // "Dono" separada lá nas badges de cargo -- não é um cargo de verdade,
    // então não faz sentido ficar misturada com eles.
    if (identity === serverState.ownerIdentity) {
      const crown = document.createElement('span');
      crown.className = 'owner-crown';
      crown.title = 'Dono da sala';
      crown.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 19h18l-1.4-9.2-4.6 4-3-6.8-3 6.8-4.6-4z"/></svg>';
      row.appendChild(crown);
    }

    const nameEl = document.createElement('span');
    nameEl.className = 'name';
    nameEl.textContent = name;
    row.appendChild(nameEl);

    const badges = document.createElement('div');
    badges.className = 'role-member-badges';
    const assignedIds = new Set(serverState.memberRoles[identity] || []);

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
upgradeTooltip(updateBannerDismiss);
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

updateBannerBtn.addEventListener('click', async () => {
  if (!updateReadyToInstall) return;
  // evita clique duplo mandando instalar 2x (ex: cliques rápidos antes do
  // botão sumir de vista com o resto do banner)
  updateReadyToInstall = false;
  updateBannerBtn.disabled = true;

  // Se a pessoa está numa chamada de voz agora, guarda qual canal era —
  // depois que a atualização reiniciar o app sozinho (ver main.js), a gente
  // usa isso pra voltar direto pra ela, sem precisar entrar nada de novo na
  // mão (ver o fim de completeConnect).
  if (activeVoiceChannelId) {
    try {
      const cfg = (await window.vortex.getConfig()) || {};
      cfg.rejoinVoiceChannelAfterUpdate = activeVoiceChannelId;
      await window.vortex.setConfig(cfg);
    } catch {
      // se não salvar, sem problema -- só significa que não volta sozinho
      // pra chamada depois de atualizar
    }
  }

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
