// Preload da janela do OVERLAY (a que fica por cima de outros programas/
// jogos enquanto você compartilha a tela) -- API separada e bem menor que a
// do preload.js principal, porque essa janela não faz nada sozinha: só
// mostra botões e repassa cliques pra janela principal decidir o que fazer
// de verdade (câmera/mic/LiveKit/etc não existem aqui).
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('overlayApi', {
  // avisa o processo principal que o mouse entrou/saiu de cima de um botão
  // -- só assim dá pra clicar nos botões sem bloquear o clique no jogo por
  // baixo o resto do tempo (ver setIgnoreMouseEvents no main.js)
  setIgnoreMouseEvents: (ignore) => ipcRenderer.send('overlay:ignore-mouse', ignore),
  // pede pra janela principal executar uma ação (câmera/mic/parar de
  // compartilhar/desligar) -- é lá que mora toda a lógica de verdade
  sendAction: (action) => ipcRenderer.send('overlay:action', action),
  // estado atual (câmera/mic ligado ou não), mandado pela janela principal,
  // pra refletir nos ícones daqui
  onState: (callback) => {
    const listener = (_event, state) => callback(state);
    ipcRenderer.on('overlay-state', listener);
    return () => ipcRenderer.removeListener('overlay-state', listener);
  },
});
