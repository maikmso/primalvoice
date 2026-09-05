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
});
