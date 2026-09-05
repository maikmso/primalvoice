const { app, BrowserWindow, Tray, Menu, session, desktopCapturer, ipcMain, nativeImage, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');
const express = require('express');

let mainWindow;
let tray;
let localPort = 0;

const configPath = path.join(app.getPath('userData'), 'config.json');
const iconPath = path.join(__dirname, 'build', 'icon.png');

function readConfig() {
  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  } catch {
    return {};
  }
}

function writeConfig(cfg) {
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2));
}

// Serve o frontend em http://127.0.0.1:<porta> em vez de file://,
// pra garantir que o Chromium trate a página como "contexto seguro"
// (necessário pra câmera/microfone/tela funcionarem sem sustos).
function startLocalServer() {
  return new Promise((resolve) => {
    const staticApp = express();
    staticApp.use(express.static(path.join(__dirname, 'renderer')));
    const server = staticApp.listen(0, '127.0.0.1', () => {
      localPort = server.address().port;
      console.log(`[primalvoice] servidor estático local na porta ${localPort}`);
      resolve();
    });
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 700,
    minWidth: 900,
    minHeight: 560,
    title: 'PrimalVoice',
    icon: iconPath,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadURL(`http://127.0.0.1:${localPort}/index.html`);

  // Fechar a janela minimiza pra bandeja, igual Discord — só sai de fato pelo menu da bandeja.
  mainWindow.on('close', (event) => {
    if (!app.isQuiting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}

function createTray() {
  const trayIcon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
  tray = new Tray(trayIcon);
  tray.setToolTip('PrimalVoice');
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Abrir PrimalVoice', click: () => mainWindow.show() },
      { type: 'separator' },
      {
        label: 'Sair',
        click: () => {
          app.isQuiting = true;
          app.quit();
        },
      },
    ])
  );
  tray.on('click', () => mainWindow.show());
}

app.whenReady().then(async () => {
  // Autoriza pedidos de câmera/mic/tela sem o Electron bloquear silenciosamente.
  session.defaultSession.setPermissionRequestHandler((_wc, permission, callback) => {
    if (permission === 'media' || permission === 'display-capture') {
      return callback(true);
    }
    callback(false);
  });

  // Necessário pro getDisplayMedia() (compartilhar tela) funcionar no Electron.
  // useSystemPicker mostra o seletor nativo do Windows (escolher janela/tela).
  session.defaultSession.setDisplayMediaRequestHandler(
    (_request, callback) => {
      desktopCapturer.getSources({ types: ['screen', 'window'] }).then((sources) => {
        callback({ video: sources[0], audio: 'loopback' });
      });
    },
    { useSystemPicker: true }
  );

  await startLocalServer();
  createWindow();
  createTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
    else mainWindow.show();
  });
});

app.on('window-all-closed', () => {
  // Não sai do app ao fechar a janela (fica na bandeja) — não faz nada aqui de propósito.
});

ipcMain.handle('config:get', () => readConfig());
ipcMain.handle('config:set', (_event, cfg) => {
  writeConfig(cfg);
  return true;
});

// Atalhos de teclado globais (funcionam mesmo com o PrimalVoice minimizado
// ou sem foco) pra silenciar o próprio microfone e pra ensurdecer (parar de
// ouvir todo mundo). Cada um é registrado/trocado sob demanda pela tela de
// configurações do app.
const registeredShortcuts = {};

function registerShortcut(action, accelerator) {
  if (registeredShortcuts[action]) {
    try {
      globalShortcut.unregister(registeredShortcuts[action]);
    } catch {
      // ignora se já não estava registrado
    }
    delete registeredShortcuts[action];
  }
  if (!accelerator) return { ok: true };

  try {
    const ok = globalShortcut.register(accelerator, () => {
      if (mainWindow) mainWindow.webContents.send('shortcut-triggered', action);
    });
    if (!ok) return { ok: false, error: 'Esse atalho já está sendo usado por outro programa.' };
    registeredShortcuts[action] = accelerator;
    return { ok: true };
  } catch (err) {
    return { ok: false, error: 'Atalho inválido.' };
  }
}

ipcMain.handle('shortcuts:set', (_event, { action, accelerator }) => registerShortcut(action, accelerator));

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});
