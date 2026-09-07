const { app, BrowserWindow, Tray, Menu, session, desktopCapturer, ipcMain, nativeImage, globalShortcut, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const express = require('express');
const { autoUpdater } = require('electron-updater');

let mainWindow;
let splashWindow;
let tray;
let localPort = 0;

// Tempo mínimo que a telinha de abertura (só o cartãozinho com a logo,
// numa janela pequena própria — sem nenhuma janela grande por trás) fica
// visível, mesmo que o app carregue mais rápido que isso.
const SPLASH_MIN_MS = 4500;
const appBootStartedAt = Date.now();
let mainWindowReadyToShow = false;

function finishBootIfReady() {
  if (!mainWindowReadyToShow) return;
  const elapsed = Date.now() - appBootStartedAt;
  const wait = Math.max(0, SPLASH_MIN_MS - elapsed);
  setTimeout(() => {
    if (mainWindow) mainWindow.show();
    if (splashWindow && !splashWindow.isDestroyed()) splashWindow.close();
  }, wait);
}

function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 220,
    height: 260,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    center: true,
    skipTaskbar: true,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  splashWindow.once('ready-to-show', () => splashWindow.show());
  splashWindow.loadURL(`http://127.0.0.1:${localPort}/splash.html`);
}

// Só deixa um PrimalVoice aberto por vez — abrir de novo (ex: clicou 2x no
// atalho sem perceber que já tinha um aberto) só foca a janela existente em
// vez de subir um segundo processo inteiro do Chromium do zero (isso sozinho
// evita gastar o dobro de RAM/CPU à toa).
const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
  return;
}
app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }
});

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
    // Sem a barra de título nativa (ícone + "PrimalVoice" + os 3 botões
    // padrão do Windows) — igual o Discord, que não mostra nome/logo lá em
    // cima. `titleBarOverlay` mantém só os botõezinhos de minimizar/
    // maximizar/fechar desenhados pelo próprio Windows (sem eles some
    // qualquer jeito de fechar a janela), encostados no canto direito;
    // o resto da faixa de cima vira nossa (ver #app-titlebar no HTML/CSS).
    frame: false,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#1e1f22',
      symbolColor: '#c8ccd1',
      height: 36,
    },
    // Preenche com a cor do tema escuro em vez de branco — evita o "flash"
    // de tela branca antes da página carregar.
    backgroundColor: '#1e1f22',
    // Só mostra a janela quando o conteúdo já está pronto pra desenhar —
    // sem isso o Chromium mostra uma janela vazia por uma fração de
    // segundo, o que passa a sensação de estar mais lento do que é.
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      // O chat é rápido e informal, não é editor de texto — desliga o
      // corretor ortográfico do Chromium, que fica de olho em toda tecla
      // digitada e consome memória/CPU à toa.
      spellcheck: false,
    },
  });

  // Não mostra na hora — só quando a splash já cumpriu o tempo mínimo dela
  // (finishBootIfReady cuida disso), pra nunca ter duas telas de carregamento
  // ao mesmo tempo nem a janela principal aparecendo vazia antes da hora.
  mainWindow.once('ready-to-show', () => {
    mainWindowReadyToShow = true;
    finishBootIfReady();
  });

  mainWindow.loadURL(`http://127.0.0.1:${localPort}/index.html`);

  // Link clicado no chat (target="_blank") abre no navegador de verdade da
  // pessoa, não numa janela nova do próprio PrimalVoice.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

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

// Guarda a escolha feita no seletor próprio do app (tela/janela + com ou sem
// áudio) entre o clique em "Compartilhar" e o getDisplayMedia() que o
// LiveKit dispara logo em seguida — é assim que o Electron sabe qual fonte
// usar, já que ele mesmo não tem UI de escolha quando useSystemPicker:false.
let pendingScreenShareChoice = null;

app.whenReady().then(async () => {
  // Autoriza pedidos de câmera/mic/tela sem o Electron bloquear silenciosamente.
  session.defaultSession.setPermissionRequestHandler((_wc, permission, callback) => {
    if (permission === 'media' || permission === 'display-capture') {
      return callback(true);
    }
    callback(false);
  });

  // Necessário pro getDisplayMedia() (compartilhar tela) funcionar no Electron.
  // useSystemPicker:false porque temos nosso próprio seletor (tela/janela +
  // com/sem áudio do sistema) na tela de "Compartilhar tela" do app.
  session.defaultSession.setDisplayMediaRequestHandler(
    (_request, callback) => {
      desktopCapturer.getSources({ types: ['screen', 'window'] }).then((sources) => {
        const choice = pendingScreenShareChoice;
        pendingScreenShareChoice = null;
        const chosen = (choice && sources.find((s) => s.id === choice.sourceId)) || sources[0];
        callback({ video: chosen, audio: choice && choice.withAudio ? 'loopback' : undefined });
      });
    },
    { useSystemPicker: false }
  );

  await startLocalServer();
  createSplashWindow();
  createWindow();
  createTray();

  // Primeira checagem alguns segundos após abrir (não trava a inicialização),
  // depois confere de novo a cada 30 minutos enquanto o app estiver aberto.
  setTimeout(checkForUpdates, 5000);
  setInterval(checkForUpdates, 30 * 60 * 1000);

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

// Lista telas e janelas disponíveis pra compartilhar, com miniatura, pro
// seletor próprio do app (estilo Discord: escolher tela 1, tela 2, janela X...).
ipcMain.handle('screenshare:list-sources', async () => {
  const sources = await desktopCapturer.getSources({
    types: ['screen', 'window'],
    thumbnailSize: { width: 320, height: 180 },
    fetchWindowIcons: true,
  });
  let screenCount = 0;
  return sources.map((s) => {
    const isScreen = s.id.startsWith('screen:');
    if (isScreen) screenCount += 1;
    return {
      id: s.id,
      kind: isScreen ? 'screen' : 'window',
      name: isScreen ? `Tela ${screenCount}` : s.name,
      thumbnail: s.thumbnail && !s.thumbnail.isEmpty() ? s.thumbnail.toDataURL() : '',
      appIcon: s.appIcon && !s.appIcon.isEmpty() ? s.appIcon.toDataURL() : '',
    };
  });
});

ipcMain.handle('screenshare:choose', (_event, choice) => {
  pendingScreenShareChoice = choice && choice.sourceId ? choice : null;
  return true;
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

// Atualização automática, igual ao Discord: o app confere sozinho se tem uma
// versão nova publicada como Release no GitHub, baixa em segundo plano e
// avisa a pessoa (banner "Nova atualização disponível") pra reiniciar quando
// quiser. Só funciona no instalador empacotado (app.isPackaged) — em
// desenvolvimento não existe update pra checar.
function sendUpdateStatus(status, extra = {}) {
  if (mainWindow) mainWindow.webContents.send('update-status', { status, ...extra });
}

autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

autoUpdater.on('checking-for-update', () => sendUpdateStatus('checking'));
autoUpdater.on('update-available', (info) => sendUpdateStatus('available', { version: info.version }));
autoUpdater.on('update-not-available', () => sendUpdateStatus('not-available'));
autoUpdater.on('download-progress', (progress) => sendUpdateStatus('downloading', { percent: Math.round(progress.percent) }));
autoUpdater.on('update-downloaded', (info) => sendUpdateStatus('downloaded', { version: info.version }));
autoUpdater.on('error', (err) => sendUpdateStatus('error', { message: err?.message || String(err) }));

function checkForUpdates() {
  if (!app.isPackaged) return; // sem update em modo desenvolvimento
  autoUpdater.checkForUpdates().catch((err) => {
    console.error('[primalvoice] erro ao checar atualização:', err);
  });
}

ipcMain.handle('update:check', () => {
  checkForUpdates();
  return true;
});

ipcMain.handle('update:install', () => {
  // silencioso (sem a telinha feia do instalador NSIS) + reabre sozinho
  // depois de instalar, igual ao Discord.
  autoUpdater.quitAndInstall(true, true);
});

ipcMain.handle('app:getVersion', () => app.getVersion());

// ---------- indicador de voz no ícone da barra de tarefas (desativado) ----------
// Tinha uma bolinha (cinza/verde/vermelha) sobreposta ao ícone do app na
// barra de tarefas do Windows pra mostrar o status de voz (parado/falando/
// mudo/ensurdecido), só que o pedido foi pra tirar isso — o ícone da barra
// de tarefas agora fica sempre só o PNG da logo, sem sobreposição nenhuma,
// não importa o que esteja acontecendo na chamada. O canal IPC continua
// aceitando a chamada (o renderer ainda avisa as mudanças de status), só
// que agora ela não faz mais nada — assim não precisa mexer no renderer.
ipcMain.handle('voiceOverlay:set', (_event, _status) => {
  if (!mainWindow || typeof mainWindow.setOverlayIcon !== 'function') return;
  mainWindow.setOverlayIcon(null, '');
});
