// Clique atravessa essa janela por padrão (pro jogo/programa por baixo
// continuar recebendo cliques normalmente) -- só desativa isso enquanto o
// mouse está mesmo em cima de um botão, e reativa assim que sai. É assim
// que dá pra ter uma janela "fantasma" que só reage nos próprios botões.
document.querySelectorAll('.hoverable').forEach((el) => {
  el.addEventListener('mouseenter', () => window.overlayApi.setIgnoreMouseEvents(false));
  el.addEventListener('mouseleave', () => window.overlayApi.setIgnoreMouseEvents(true));
});

document.getElementById('overlay-cam-btn').addEventListener('click', () => window.overlayApi.sendAction('toggleCam'));
document.getElementById('overlay-mic-btn').addEventListener('click', () => window.overlayApi.sendAction('toggleMic'));
document.getElementById('overlay-hangup-btn').addEventListener('click', () => window.overlayApi.sendAction('hangup'));
document.getElementById('overlay-stop-share-btn').addEventListener('click', () => window.overlayApi.sendAction('stopShare'));
document.getElementById('overlay-stop-live-btn').addEventListener('click', () => window.overlayApi.sendAction('stopShare'));

window.overlayApi.onState((state) => {
  document.getElementById('overlay-cam-btn').classList.toggle('off', !!state.camOff);
  document.getElementById('overlay-mic-btn').classList.toggle('off', !!state.micOff);
});
