const { app, BrowserWindow, Tray, Menu, session, desktopCapturer, ipcMain, nativeImage, globalShortcut, shell, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const express = require('express');
const { autoUpdater } = require('electron-updater');
const { spawn } = require('child_process');

// ---------- processo auxiliar de atualização (janelinha "Atualizando...") ----------
// Pra instalar uma atualização o Windows PRECISA que o .exe do PrimalVoice
// feche de vez (não dá pra sobrescrever os arquivos de um programa rodando)
// — então não tem como literalmente "não fechar o app". O que dá pra fazer,
// e é o que isso aqui resolve, é a pessoa nunca ver a área de trabalho
// "pelada" no meio do processo: antes de fechar de verdade (ver
// ipcMain.handle('update:install') lá embaixo), o app de verdade abre uma
// SEGUNDA cópia de si mesmo, só que com essa flag `--pv-update-helper`, que
// não faz mais nada além de mostrar essa janelinha flutuante "Atualizando o
// PrimalVoice..." por cima de tudo. Ela fica esperando o app de verdade
// terminar de reinstalar e abrir de novo sozinho (isso o electron-updater já
// faz com quitAndInstall(true, true)) — o sinal de "já pode fechar" é um
// arquivinho vazio que o app de verdade escreve assim que a janela principal
// dele está prestes a aparecer de novo (ver finishBootIfReady). Tem também
// um limite de segurança (MAX_WAIT_MS) pra essa janelinha nunca ficar aberta
// pra sempre caso alguma coisa dê errado no meio do caminho.
if (process.argv.includes('--pv-update-helper')) {
  // Descobre o caminho de dados REAL do app (onde o config.json de verdade
  // mora) antes de trocar o userData deste processo auxiliar pra uma pasta
  // temporária só dele — assim ele nunca disputa o mesmo perfil do Chromium
  // com o app de verdade, que pode estar bem no meio de fechar nesse instante.
  const realUserDataPath = app.getPath('userData');
  app.setPath('userData', path.join(app.getPath('temp'), 'primalvoice-update-helper'));

  app.whenReady().then(() => {
    const helperWin = new BrowserWindow({
      width: 220,
      height: 260,
      frame: false,
      transparent: true,
      backgroundColor: '#00000000',
      resizable: false,
      movable: false,
      minimizable: false,
      maximizable: false,
      alwaysOnTop: true,
      center: true,
      skipTaskbar: true,
      show: false,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
      },
    });
    helperWin.once('ready-to-show', () => helperWin.show());
    helperWin.loadFile(path.join(__dirname, 'renderer', 'updating.html'));

    const flagPath = path.join(realUserDataPath, '.update-restarting');
    try {
      fs.unlinkSync(flagPath); // limpa qualquer resto de uma vez anterior antes de começar a esperar
    } catch {
      // não tinha mesmo, sem problema
    }
    const startedAt = Date.now();
    const MAX_WAIT_MS = 25000; // trava de segurança: nunca fica pra sempre nessa telinha
    const poll = setInterval(() => {
      const done = fs.existsSync(flagPath) || Date.now() - startedAt > MAX_WAIT_MS;
      if (!done) return;
      clearInterval(poll);
      try {
        fs.unlinkSync(flagPath);
      } catch {
        // idem
      }
      app.quit();
    }, 300);
  });
  return; // nada do resto do arquivo roda aqui -- esse processo só existe pra essa janelinha
}

// Sem isso, o Windows não sabe "quem" é o app de verdade e mostra as
// notificações com o nome genérico "electron.app.Electron" (a identidade do
// Electron em si) em vez de "PrimalVoice" -- precisa bater com o mesmo id
// usado lá no package.json (build.appId), que é o que o instalador NSIS
// registra pro atalho do menu iniciar.
app.setAppUserModelId('com.primalvoice.app');

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
    // Se isso aqui é a reabertura automática logo depois de instalar uma
    // atualização, avisa a janelinha "Atualizando..." (ver o bloco
    // --pv-update-helper lá em cima) que já pode fechar — a janela principal
    // já está prestes a aparecer. É a PRÓPRIA janelinha quem apaga esse
    // arquivo depois de perceber (ela confere a cada 300ms); numa abertura
    // normal (sem atualização em andamento) ele fica órfão até a próxima vez
    // que uma atualização for instalada, quando é limpo antes de começar a
    // espera de novo — sem efeito nenhum nesse meio tempo.
    try {
      fs.writeFileSync(updateRestartFlagPath, '1');
    } catch {
      // sem problema -- na pior das hipóteses a janelinha fecha sozinha
      // depois pelo limite de segurança dela (MAX_WAIT_MS)
    }
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
  checkForUpdatesThrottled();
});

const configPath = path.join(app.getPath('userData'), 'config.json');
const iconPath = path.join(__dirname, 'build', 'icon.png');
// Arquivo-sinal usado só durante uma atualização: avisa a janelinha
// "Atualizando..." (processo auxiliar, ver bloco --pv-update-helper lá em
// cima) que a janela principal está prestes a aparecer de novo.
const updateRestartFlagPath = path.join(app.getPath('userData'), '.update-restarting');

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

  // Avisa o renderer se a pessoa sair da tela cheia por fora do app (atalho
  // do Windows, ex: F11, ou o próprio SO) — usado pra desfazer o "cinema
  // mode" (esconder barras) do compartilhamento de tela quando isso acontece.
  mainWindow.on('enter-full-screen', () => mainWindow.webContents.send('window-fullscreen-changed', true));
  mainWindow.on('leave-full-screen', () => mainWindow.webContents.send('window-fullscreen-changed', false));

  // Esconde/mostra o overlay de compartilhamento conforme a janela principal
  // ganha/perde foco (ou é minimizada pra bandeja) -- ver syncShareOverlayVisibility.
  mainWindow.on('focus', () => syncShareOverlayVisibility());
  mainWindow.on('blur', () => syncShareOverlayVisibility());
  mainWindow.on('show', () => {
    syncShareOverlayVisibility();
    // Todo momento em que a pessoa volta a olhar pro app (reaberto da
    // bandeja, focado de novo, etc.) é uma chance boa de conferir uma
    // atualização nova sem esperar o próximo ciclo do setInterval lá embaixo
    // -- checkForUpdatesThrottled ignora se já checou há pouco tempo.
    checkForUpdatesThrottled();
  });
  mainWindow.on('hide', () => syncShareOverlayVisibility());
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
  // Autoriza pedidos de câmera/mic/tela e de notificação (avisos de DM nova,
  // igual Discord) sem o Electron bloquear silenciosamente.
  session.defaultSession.setPermissionRequestHandler((_wc, permission, callback) => {
    if (permission === 'media' || permission === 'display-capture' || permission === 'notifications') {
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
  // depois confere de novo a cada 5 minutos enquanto o app estiver aberto --
  // era 30 minutos, o que fazia a atualização demorar bem mais pra aparecer
  // pra quem já estava com o app aberto há um tempo. Some-se a isso as
  // checagens extras em checkForUpdatesThrottled (toda vez que a pessoa volta
  // a olhar pro app).
  setTimeout(checkForUpdates, 5000);
  setInterval(checkForUpdates, 5 * 60 * 1000);

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
  if (shareOverlayWindow && !shareOverlayWindow.isDestroyed()) shareOverlayWindow.destroy();
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

let lastUpdateCheckAt = 0;

function checkForUpdates() {
  if (!app.isPackaged) return; // sem update em modo desenvolvimento
  lastUpdateCheckAt = Date.now();
  autoUpdater.checkForUpdates().catch((err) => {
    console.error('[primalvoice] erro ao checar atualização:', err);
  });
}

// Mesma checagem de sempre, só que ignorada se já rodou há pouco tempo --
// usada nos momentos em que a pessoa volta a olhar pro app (reaberto,
// focado de novo...), pra não checar de novo o tempo todo à toa quando isso
// acontece em sequência rápida (troca de janela, minimizar/restaurar, etc.).
function checkForUpdatesThrottled() {
  if (Date.now() - lastUpdateCheckAt < 60 * 1000) return;
  checkForUpdates();
}

ipcMain.handle('update:check', () => {
  checkForUpdates();
  return true;
});

ipcMain.handle('update:install', () => {
  // Abre uma segunda cópia do próprio app só pra mostrar a janelinha
  // "Atualizando..." (ver o bloco --pv-update-helper lá no topo do arquivo)
  // -- é ela quem cobre visualmente o tempo em que ESTE processo vai ficar
  // fechado de vez pra instalar (não dá pra sobrescrever os arquivos de um
  // programa rodando). Se por algum motivo não conseguir abrir essa
  // janelinha, segue o processo normalmente mesmo assim (só sem esse
  // "enfeite" visual -- a atualização em si não depende dela).
  try {
    const helperArgs = app.isPackaged
      ? ['--pv-update-helper']
      : [...process.argv.slice(1), '--pv-update-helper'];
    spawn(process.execPath, helperArgs, { detached: true, stdio: 'ignore' }).unref();
  } catch (err) {
    console.error('[primalvoice] não consegui abrir a janelinha de atualização:', err);
  }

  // silencioso (sem a telinha feia do instalador NSIS) + reabre sozinho
  // depois de instalar, igual ao Discord.
  autoUpdater.quitAndInstall(true, true);
});

ipcMain.handle('app:getVersion', () => app.getVersion());

// Clicou numa notificação de DM nova (ver notifyNewMessage no renderer) --
// traz a janela de volta pra frente (pode estar minimizada na bandeja).
ipcMain.handle('window:focus', () => {
  if (!mainWindow) return false;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
  return true;
});

// Bolinha vermelha com o número de mensagens não lidas por cima do ícone do
// PrimalVoice na barra de tarefas do Windows -- igual o Discord faz. Só tem
// suporte nativo no Windows (setOverlayIcon não existe/não faz nada em
// outros sistemas). count <= 0 tira a bolinha; de 1 a 9 mostra o número
// certinho, e acima disso sempre "9+" (os ícones já vêm prontos, um PNG por
// número, pra não precisar desenhar nada na hora).
ipcMain.handle('badge:set', (_event, count) => {
  if (!mainWindow || process.platform !== 'win32') return false;
  try {
    if (!count || count <= 0) {
      mainWindow.setOverlayIcon(null, '');
      return true;
    }
    const n = Math.min(Math.max(Math.floor(count), 1), 9);
    const fileName = count > 9 ? 'badge-9plus.png' : `badge-${n}.png`;
    const badgeImage = nativeImage.createFromPath(path.join(__dirname, 'build', 'badges', fileName));
    mainWindow.setOverlayIcon(badgeImage, `${count} mensagem(ns) não lida(s)`);
    return true;
  } catch (err) {
    console.error('[primalvoice] não consegui atualizar a bolinha de não lidas:', err);
    return false;
  }
});

// Tela cheia de verdade (a janela inteira, sem moldura/barra de título) pro
// "cinema mode" de assistir compartilhamento de tela — ver enterCinemaFullscreen
// no renderer. Não usa a Fullscreen API do elemento <video> (que mostra um
// aviso "aperte Esc" próprio do Chromium por cima do vídeo).
ipcMain.handle('window:setFullscreen', (_event, value) => {
  if (!mainWindow) return false;
  mainWindow.setFullScreen(!!value);
  return true;
});

// ---------- overlay por cima de OUTRAS janelas/jogos enquanto compartilha a tela (DESATIVADO) ----------
// Igual o "Discord Overlay": uma janela própria, transparente, sem borda e
// sempre no topo, do tamanho da tela inteira, é a única forma de mostrar
// algo por cima de outro programa/jogo (mesmo com o PrimalVoice minimizado).
// Limitação real, do próprio Windows, não tem como contornar: não aparece
// por cima de jogos em tela cheia EXCLUSIVA (só em modo janela ou tela
// cheia sem borda) -- é a mesma limitação que o Discord tem.
//
// DESATIVADO a pedido do usuário: a janela do overlay cobre a TELA INTEIRA
// (não só a área da janela do PrimalVoice), então se outra janela (ex.:
// Chrome) não estiver maximizada/cobrindo tudo, a janela do PrimalVoice
// continuava aparecendo do lado E o overlay (aviso "AO VIVO" + barra de
// controles) aparecia por cima de tudo igual, duplicado -- além da barra de
// controles flutuar por cima de QUALQUER coisa que a pessoa estivesse
// clicando/mexendo em outro programa, atrapalhando. showShareOverlay() abaixo
// virou um no-op (não cria nem mostra mais a janela); o resto da
// infraestrutura (createShareOverlayWindow, syncShareOverlayVisibility, os
// canais IPC) continua aqui intacto, só não é mais chamado -- dá pra
// reativar no futuro revisando o design (por exemplo, só mostrar quando
// outra janela cobrir a tela inteira de verdade).
let shareOverlayWindow = null;
// true enquanto a pessoa estiver compartilhando a tela de verdade (entre um
// showShareOverlay() e o hideShareOverlay() correspondente). Serve pra saber
// se o overlay PRECISA reaparecer quando a janela principal perde o foco --
// ver syncShareOverlayVisibility abaixo.
let isSharingScreen = false;

function createShareOverlayWindow() {
  if (shareOverlayWindow && !shareOverlayWindow.isDestroyed()) return;
  // usa a tela onde está o cursor no momento (aproximação razoável de "qual
  // tela a pessoa está usando agora"; não temos como saber com certeza qual
  // tela específica está sendo compartilhada quando ela escolhe uma janela
  // em vez da tela toda)
  const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
  shareOverlayWindow = new BrowserWindow({
    x: display.bounds.x,
    y: display.bounds.y,
    width: display.bounds.width,
    height: display.bounds.height,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    closable: false,
    focusable: false,
    skipTaskbar: true,
    hasShadow: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload-overlay.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  // nível mais alto que o Electron permite no Windows -- dá a melhor chance
  // de ficar visível por cima de jogos/outros programas (sem garantia em
  // 100% dos casos, ver limitação acima)
  shareOverlayWindow.setAlwaysOnTop(true, 'screen-saver');
  shareOverlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  // clique atravessa a janela por padrão (senão bloquearia o jogo por baixo
  // o tempo todo) -- só os botões desativam isso quando o mouse passa em
  // cima deles, via overlay:ignore-mouse abaixo
  shareOverlayWindow.setIgnoreMouseEvents(true, { forward: true });
  shareOverlayWindow.loadURL(`http://127.0.0.1:${localPort}/overlay.html`);
}

function showShareOverlay() {
  // Desativado -- ver comentário completo lá em cima, perto de
  // "let shareOverlayWindow = null". Não cria nem mostra mais a janela.
}

function hideShareOverlay() {
  isSharingScreen = false;
  if (shareOverlayWindow && !shareOverlayWindow.isDestroyed()) shareOverlayWindow.hide();
}

// O overlay só faz sentido em cima de OUTRAS janelas/jogos -- enquanto a
// própria janela do PrimalVoice estiver em foco (ou seja, é ela mesma que a
// pessoa está olhando), os controles já aparecem normais ali dentro, então
// mostrar o overlay por cima só duplicava tudo (badge "AO VIVO" e barra de
// controles repetidos por cima da própria janela do app). Por isso o overlay
// só fica visível de fato quando: está compartilhando E a janela principal
// não está em foco (minimizada, na bandeja, ou outra janela/jogo em primeiro plano).
function syncShareOverlayVisibility() {
  if (!shareOverlayWindow || shareOverlayWindow.isDestroyed()) return;
  const mainIsFocused = mainWindow && !mainWindow.isDestroyed() && mainWindow.isFocused() && mainWindow.isVisible();
  if (isSharingScreen && !mainIsFocused) {
    shareOverlayWindow.showInactive(); // nunca rouba o foco de quem estiver jogando
  } else {
    shareOverlayWindow.hide();
  }
}

ipcMain.handle('overlay:show', () => {
  showShareOverlay();
  return true;
});
ipcMain.handle('overlay:hide', () => {
  hideShareOverlay();
  return true;
});
// Mouse passou em cima de um botão do overlay (ou saiu de cima) -- só troca
// se o clique atravessa a janela ou não, não afeta mais nada.
ipcMain.on('overlay:ignore-mouse', (_event, ignore) => {
  if (shareOverlayWindow && !shareOverlayWindow.isDestroyed()) {
    shareOverlayWindow.setIgnoreMouseEvents(!!ignore, { forward: true });
  }
});
// Clicou num botão do overlay -- o overlay não tem a lógica de verdade
// (LiveKit, etc), só repassa o pedido pra janela principal fazer.
ipcMain.on('overlay:action', (_event, action) => {
  if (mainWindow) mainWindow.webContents.send('overlay-action', action);
});
// Janela principal avisando que o estado (câmera/mic ligado ou não) mudou
// -- repassa pro overlay refletir os mesmos ícones.
ipcMain.on('overlay:state-update', (_event, state) => {
  if (shareOverlayWindow && !shareOverlayWindow.isDestroyed()) {
    shareOverlayWindow.webContents.send('overlay-state', state);
  }
});

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
