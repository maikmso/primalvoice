const { Room, RoomEvent } = LivekitClient;

const joinScreen = document.getElementById('join-screen');
const roomScreen = document.getElementById('room-screen');
const joinForm = document.getElementById('join-form');
const nameInput = document.getElementById('name-input');
const passwordInput = document.getElementById('password-input');
const joinError = document.getElementById('join-error');
const grid = document.getElementById('grid');
const participantCount = document.getElementById('participant-count');
const micBtn = document.getElementById('mic-btn');
const camBtn = document.getElementById('cam-btn');
const shareBtn = document.getElementById('share-btn');
const leaveBtn = document.getElementById('leave-btn');

let room;

function tileId(identity) {
  return `tile-${identity.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
}

function ensureTile(participant) {
  let tile = document.getElementById(tileId(participant.identity));
  if (!tile) {
    tile = document.createElement('div');
    tile.className = 'tile';
    tile.id = tileId(participant.identity);

    const initial = document.createElement('span');
    initial.className = 'initial';
    initial.textContent = (participant.name || participant.identity).charAt(0).toUpperCase();
    tile.appendChild(initial);

    const label = document.createElement('div');
    label.className = 'label';
    label.textContent = participant.name || participant.identity;
    tile.appendChild(label);

    grid.appendChild(tile);
  }
  return tile;
}

function attachTrack(track, participant) {
  const tile = ensureTile(participant);
  const el = track.attach();
  if (track.kind === 'video') {
    el.classList.add('video-el');
    const old = tile.querySelector('video');
    if (old) old.remove();
    tile.appendChild(el);
  } else {
    el.classList.add('audio-el');
    tile.appendChild(el);
  }
}

function detachTrack(track) {
  track.detach().forEach((el) => el.remove());
}

function removeTile(participant) {
  const tile = document.getElementById(tileId(participant.identity));
  if (tile) tile.remove();
}

function updateParticipantCount() {
  if (!room) return;
  const total = room.numParticipants + 1;
  participantCount.textContent = `${total} na sala`;
}

joinForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  joinError.hidden = true;

  const name = nameInput.value.trim();
  const password = passwordInput.value;

  try {
    const configRes = await fetch('/api/config');
    if (!configRes.ok) throw new Error('Não foi possível falar com o servidor.');
    const { livekitUrl } = await configRes.json();

    const tokenRes = await fetch('/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, password }),
    });

    if (!tokenRes.ok) {
      const data = await tokenRes.json().catch(() => ({}));
      throw new Error(data.error || 'Não foi possível entrar.');
    }

    const { token } = await tokenRes.json();

    room = new Room({ adaptiveStream: true, dynacast: true });

    room.on(RoomEvent.TrackSubscribed, (track, _pub, participant) => {
      attachTrack(track, participant);
      updateParticipantCount();
    });
    room.on(RoomEvent.TrackUnsubscribed, (track) => {
      detachTrack(track);
    });
    room.on(RoomEvent.ParticipantConnected, () => updateParticipantCount());
    room.on(RoomEvent.ParticipantDisconnected, (participant) => {
      removeTile(participant);
      updateParticipantCount();
    });
    room.on(RoomEvent.Disconnected, () => {
      window.location.reload();
    });

    await room.connect(livekitUrl, token);
    ensureTile(room.localParticipant);
    await room.localParticipant.setMicrophoneEnabled(true);

    joinScreen.hidden = true;
    roomScreen.hidden = false;
    updateParticipantCount();
  } catch (err) {
    joinError.textContent = err.message || 'Erro ao entrar na sala.';
    joinError.hidden = false;
  }
});

micBtn.addEventListener('click', async () => {
  const newOn = micBtn.dataset.on !== 'true';
  await room.localParticipant.setMicrophoneEnabled(newOn);
  micBtn.dataset.on = String(newOn);
  micBtn.classList.toggle('off', !newOn);
});

camBtn.addEventListener('click', async () => {
  const newOn = camBtn.dataset.on !== 'true';
  await room.localParticipant.setCameraEnabled(newOn);
  camBtn.dataset.on = String(newOn);
  camBtn.classList.toggle('off', !newOn);
});

shareBtn.addEventListener('click', async () => {
  const newOn = shareBtn.dataset.on !== 'true';
  await room.localParticipant.setScreenShareEnabled(newOn);
  shareBtn.dataset.on = String(newOn);
  shareBtn.classList.toggle('off', !newOn);
});

leaveBtn.addEventListener('click', async () => {
  if (room) await room.disconnect();
  window.location.reload();
});
