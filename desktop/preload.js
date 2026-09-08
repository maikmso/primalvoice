const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('vortex', {
  getConfig: () => ipcRenderer.invoke('config:get'),
  setConfig: (cfg) => ipcRenderer.invoke('config:set', cfg),
  // action: 'muteSelf' | 'deafen'. accelerator: string tipo "Control+Shift+M", ou null pra remover o atalho.
  setShortcut: (action, accelerator) => ipcRenderer.invoke('shortcuts:set', { action, accelerator }),
  onShortcut: (callback) => {
    const listener = (_event, action) => callback(action);
    ipcRenderer.on('shortcut-triggered', listener);
    return () => ipcRenderer.removeListener('shortcut-triggered', listener);
  },
  // Lista as telas/janelas disponíveis pra compartilhar (com miniatura em base64).
  listScreenShareSources: () => ipcRenderer.invoke('screenshare:list-sources'),
  // Avisa o processo principal qual fonte (e se com áudio) usar na próxima
  // chamada de getDisplayMedia — precisa ser chamado bem antes.
  chooseScreenShareSource: (choice) => ipcRenderer.invoke('screenshare:choose', choice),
  // Atualização automática (igual Discord): checar manualmente, instalar a
  // que já foi baixada, e escutar o status (checando/disponível/baixando/pronta/erro).
  checkForUpdate: () => ipcRenderer.invoke('update:check'),
  installUpdate: () => ipcRenderer.invoke('update:install'),
  onUpdateStatus: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('update-status', listener);
    return () => ipcRenderer.removeListener('update-status', listener);
  },
  getAppVersion: () => ipcRenderer.invoke('app:getVersion'),
  // Tela cheia de verdade da janela (cinema mode do compartilhamento de tela).
  setWindowFullscreen: (value) => ipcRenderer.invoke('window:setFullscreen', value),
  onWindowFullscreenChanged: (callback) => {
    const listener = (_event, value) => callback(value);
    ipcRenderer.on('window-fullscreen-changed', listener);
    return () => ipcRenderer.removeListener('window-fullscreen-changed', listener);
  },
  // status: 'none' | 'idle' | 'speaking' | 'muted' | 'deafened' — mostra uma
  // bolinha no ícone da barra de tarefas (só no Windows) igual o Discord.
  setVoiceOverlay: (status) => ipcRenderer.invoke('voiceOverlay:set', status),
  // Overlay por cima de OUTRAS janelas/jogos enquanto compartilha a tela
  // (câmera/mic/parar de compartilhar/desligar, mais o aviso "AO VIVO") --
  // igual o "Discord Overlay". showShareOverlay/hideShareOverlay ligam e
  // desligam a janela separada; setShareOverlayState manda o estado atual
  // (câmera/mic ligado ou não) pra ela refletir nos ícones; onOverlayAction
  // escuta os cliques que acontecem NELA (câmera/mic/parar/desligar), que
  // precisam ser tratados aqui porque é aqui que mora o LiveKit de verdade.
  showShareOverlay: () => ipcRenderer.invoke('overlay:show'),
  hideShareOverlay: () => ipcRenderer.invoke('overlay:hide'),
  setShareOverlayState: (state) => ipcRenderer.send('overlay:state-update', state),
  onOverlayAction: (callback) => {
    const listener = (_event, action) => callback(action);
    ipcRenderer.on('overlay-action', listener);
    return () => ipcRenderer.removeListener('overlay-action', listener);
  },
});
