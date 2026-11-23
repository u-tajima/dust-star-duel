import './style.css';
import QRCode from 'qrcode';
import { sound } from './audio';
import { GameEngine } from './game';
import { NetManager, type NetPacket } from './net';
import { SketchRenderer } from './renderer';
import { VIEW_H, VIEW_W } from './stages';
import type { InputState, MatchRules } from './types';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

const overlayTitle = document.getElementById('overlay-title')!;
const overlayLobby = document.getElementById('overlay-lobby')!;
const overlayResult = document.getElementById('overlay-result')!;
const resultTitle = document.getElementById('result-title')!;
const resultScore = document.getElementById('result-score')!;
const resultEmblem = document.getElementById('result-emblem')!;
const p1GoldEl = document.getElementById('p1-gold')!;
const p2GoldEl = document.getElementById('p2-gold')!;
const p1LivesEl = document.getElementById('p1-lives')!;
const p2LivesEl = document.getElementById('p2-lives')!;
const p1GearEl = document.getElementById('p1-gear')!;
const p2GearEl = document.getElementById('p2-gear')!;
const stagePicker = document.getElementById('stage-picker')!;
const goldPicker = document.getElementById('gold-picker')!;
const livesPicker = document.getElementById('lives-picker')!;
const btnStart = document.getElementById('btn-start') as HTMLButtonElement;
const btnOpenLobby = document.getElementById('btn-open-lobby')!;
const btnLobbyBack = document.getElementById('btn-lobby-back')!;
const btnCreateRoom = document.getElementById('btn-create-room')!;
const hostInviteEl = document.getElementById('host-invite')!;
const lobbyQrCanvas = document.getElementById('lobby-qr') as HTMLCanvasElement;
const inviteCodeEl = document.getElementById('invite-code')!;
const btnCopyLink = document.getElementById('btn-copy-link')!;
const btnShareLink = document.getElementById('btn-share-link')!;
const btnOnlineStart = document.getElementById('btn-online-start') as HTMLButtonElement;
const btnJoinRoom = document.getElementById('btn-join-room')!;
const inputRoomCode = document.getElementById('input-room-code') as HTMLInputElement;
const joinHintEl = document.getElementById('join-hint')!;
const roomStatusEl = document.getElementById('room-status')!;
const btnRematch = document.getElementById('btn-rematch')!;
const btnToTitle = document.getElementById('btn-to-title')!;
const btnHome = document.getElementById('btn-home')!;
const btnMute = document.getElementById('btn-mute')!;
const iconSoundOn = document.getElementById('icon-sound-on')!;
const iconSoundOff = document.getElementById('icon-sound-off')!;
const controllerDeck = document.getElementById('controller-deck')!;

const selectedRules: MatchRules = { targetGold: 5, maxLives: 3 };
let remoteP2Input: InputState = { left: false, right: false, jump: false, jumpPressed: false, shoot: false };
let netSyncAccum = 0;

const game = new GameEngine();
const renderer = new SketchRenderer();

if ('share' in navigator) {
  btnShareLink.classList.remove('hidden');
}

function getInviteUrl(code: string): string {
  const url = new URL(window.location.href);
  url.searchParams.set('room', code);
  return url.toString();
}

function updateLobbyState(): void {
  if (net.role === 'host' && net.connected) {
    btnOnlineStart.disabled = false;
    btnOnlineStart.textContent = 'DUEL';
  } else {
    btnOnlineStart.disabled = true;
    btnOnlineStart.textContent = 'WAIT';
  }

  if (net.role === 'guest' && net.connected) {
    joinHintEl.textContent = 'READY - WAITING HOST';
  }
}

const net = new NetManager({
  onStatus(status, connected) {
    roomStatusEl.textContent = status;
    roomStatusEl.classList.remove('hidden');
    roomStatusEl.classList.toggle('ready', connected);
    if (net.role === 'guest') {
      joinHintEl.textContent = connected ? 'READY - WAITING HOST' : status;
    }
    updateLobbyState();
  },
  onPacket(pkt: NetPacket) {
    if (pkt.type === 'input' && net.role === 'host') {
      remoteP2Input = {
        ...pkt.input,
        jumpPressed: remoteP2Input.jumpPressed || pkt.input.jumpPressed,
      };
    } else if (pkt.type === 'start' && net.role === 'guest') {
      clearAllInputs();
      game.localPlayer = 'p2';
      game.startMatch(pkt.stageIndex, pkt.rules);
      overlayTitle.classList.add('hidden');
      overlayLobby.classList.add('hidden');
      overlayResult.classList.add('hidden');
      controllerDeck.classList.remove('hidden');
      syncHUD(true);
    } else if (pkt.type === 'state' && net.role === 'guest') {
      game.applySnapshot(pkt.snap as ReturnType<GameEngine['exportSnapshot']>, 1 / 30);
    } else if (pkt.type === 'rematch' && net.role === 'host') {
      startOnlineDuel();
    }
  },
  onDisconnect() {
    updateLobbyState();
    if (game.mode === 'playing') {
      showTitle();
    }
  },
});

// Crisp high-DPI canvas scaling for VIEW_W x VIEW_H
function resizeCanvas(): void {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(VIEW_W * dpr);
  canvas.height = Math.round(VIEW_H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Input state (keyboard + unified slide-capable TouchList + guarded mouse fallback)
const keyState = { left: false, right: false, jump: false, shoot: false };
const touchState = { left: false, right: false, jump: false, shoot: false };
const mouseState = { left: false, right: false, jump: false, shoot: false };
let prevJump = false;
let pendingJumpPress = false;
let pendingShootPress = false;
let lastTouchMs = 0;

const padMoveEl = document.querySelector<HTMLElement>('.pad-move')!;
const ctrlButtons: Record<keyof typeof touchState, HTMLElement> = {
  left: document.getElementById('ctrl-left')!,
  right: document.getElementById('ctrl-right')!,
  jump: document.getElementById('ctrl-jump')!,
  shoot: document.getElementById('ctrl-shoot')!,
};

function syncButtonVisuals(): void {
  (Object.keys(ctrlButtons) as (keyof typeof touchState)[]).forEach((k) => {
    ctrlButtons[k].classList.toggle('pressed', touchState[k] || mouseState[k]);
  });
}

function clearAllInputs(): void {
  keyState.left = keyState.right = keyState.jump = keyState.shoot = false;
  touchState.left = touchState.right = touchState.jump = touchState.shoot = false;
  mouseState.left = mouseState.right = mouseState.jump = mouseState.shoot = false;
  prevJump = false;
  pendingJumpPress = false;
  pendingShootPress = false;
  syncButtonVisuals();
}

window.addEventListener('blur', clearAllInputs);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) clearAllInputs();
});

window.addEventListener('keydown', (e) => {
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') keyState.left = true;
  if (e.code === 'ArrowRight' || e.code === 'KeyD') keyState.right = true;
  if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'KeyZ') {
    if (!keyState.jump) pendingJumpPress = true;
    keyState.jump = true;
  }
  if (e.code === 'KeyX' || e.code === 'KeyJ' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
    if (!keyState.shoot) pendingShootPress = true;
    keyState.shoot = true;
  }
});

window.addEventListener('keyup', (e) => {
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') keyState.left = false;
  if (e.code === 'ArrowRight' || e.code === 'KeyD') keyState.right = false;
  if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'KeyZ') {
    keyState.jump = false;
  }
  if (e.code === 'KeyX' || e.code === 'KeyJ' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
    keyState.shoot = false;
  }
});

// Unified slide-friendly touch recomputation directly from OS live TouchList:
// - Left/Right act as a single continuous D-pad rocker (zero dead-zone, zero L+R conflict)
// - Shoot/Jump support both sliding between them and thumb-rolling both simultaneously
// - Rising edge of Jump/Shoot latches pendingJumpPress/pendingShootPress so fast taps never drop
function recomputeTouches(touches: TouchList): void {
  const wasJump = touchState.jump;
  const wasShoot = touchState.shoot;

  let nextLeft = false;
  let nextRight = false;
  let nextJump = false;
  let nextShoot = false;

  const moveRect = padMoveEl.getBoundingClientRect();
  const leftRect = ctrlButtons.left.getBoundingClientRect();
  const rightRect = ctrlButtons.right.getBoundingClientRect();
  const jumpRect = ctrlButtons.jump.getBoundingClientRect();
  const shootRect = ctrlButtons.shoot.getBoundingClientRect();

  const dpadMidX = (leftRect.right + rightRect.left) * 0.5;
  const dpadPadX = 24;
  const dpadPadY = 26;

  const jCx = (jumpRect.left + jumpRect.right) * 0.5;
  const jCy = (jumpRect.top + jumpRect.bottom) * 0.5;
  const jRad = Math.max(jumpRect.width, jumpRect.height) * 0.5 + 14;

  const sCx = (shootRect.left + shootRect.right) * 0.5;
  const sCy = (shootRect.top + shootRect.bottom) * 0.5;
  const sRad = Math.max(shootRect.width, shootRect.height) * 0.5 + 14;

  for (let i = 0; i < touches.length; i++) {
    const t = touches[i];
    const x = t.clientX;
    const y = t.clientY;

    // 1. Unified Left/Right D-pad rocker zone (smooth thumb sliding without dead-zone)
    if (
      x >= moveRect.left - dpadPadX &&
      x <= moveRect.right + dpadPadX &&
      y >= moveRect.top - dpadPadY &&
      y <= moveRect.bottom + dpadPadY
    ) {
      if (x < dpadMidX) nextLeft = true;
      else nextRight = true;
      continue;
    }

    // 2. Action buttons (circular hit regions for natural thumb rolling & sliding)
    const dJump = Math.hypot(x - jCx, y - jCy);
    const dShoot = Math.hypot(x - sCx, y - sCy);
    if (dJump <= jRad) nextJump = true;
    if (dShoot <= sRad) nextShoot = true;
  }

  // Latch rising edges immediately so <16ms quick taps or slide-ins never get dropped
  if (nextJump && !wasJump) pendingJumpPress = true;
  if (nextShoot && !wasShoot) pendingShootPress = true;

  touchState.left = nextLeft;
  touchState.right = nextRight;
  touchState.jump = nextJump;
  touchState.shoot = nextShoot;
  syncButtonVisuals();
}

const handleTouch = (e: TouchEvent) => {
  lastTouchMs = performance.now();
  // Never let stale mouse state linger on touch devices
  mouseState.left = mouseState.right = mouseState.jump = mouseState.shoot = false;

  if (game.mode !== 'playing') return;
  // Allow tapping top HUD buttons (Mute / Home) normally
  if ((e.target as HTMLElement)?.closest('.hud-center')) return;

  // Prevent browser scroll/zoom/synthetic-mouse anywhere on the playfield or pad gaps
  e.preventDefault();
  if (e.type === 'touchstart') sound.unlock();
  recomputeTouches(e.touches);
};

window.addEventListener('touchstart', handleTouch, { passive: false });
window.addEventListener('touchmove', handleTouch, { passive: false });
window.addEventListener('touchend', handleTouch, { passive: false });
window.addEventListener('touchcancel', () => {
  lastTouchMs = performance.now();
  touchState.left = touchState.right = touchState.jump = touchState.shoot = false;
  syncButtonVisuals();
});

// Desktop mouse support on on-screen buttons (strictly ignored right after real touch events)
(Object.keys(ctrlButtons) as (keyof typeof mouseState)[]).forEach((field) => {
  const el = ctrlButtons[field];
  el.addEventListener('mousedown', (e) => {
    if (performance.now() - lastTouchMs < 700) return;
    e.preventDefault();
    sound.unlock();
    if (field === 'jump' && !mouseState.jump) pendingJumpPress = true;
    if (field === 'shoot' && !mouseState.shoot) pendingShootPress = true;
    mouseState[field] = true;
    syncButtonVisuals();
  });
});

window.addEventListener('mouseup', () => {
  mouseState.left = mouseState.right = mouseState.jump = mouseState.shoot = false;
  syncButtonVisuals();
});

// Stage / Gold / Lives pickers
stagePicker.addEventListener('click', (e) => {
  const target = (e.target as HTMLElement).closest<HTMLButtonElement>('.stage-chip');
  if (!target) return;
  const idx = Number(target.dataset.stage || '0');
  game.loadStage(idx);
  stagePicker.querySelectorAll('.stage-chip').forEach((chip) => {
    chip.classList.toggle('active', chip === target);
  });
});

goldPicker.addEventListener('click', (e) => {
  const target = (e.target as HTMLElement).closest<HTMLButtonElement>('.mini-chip');
  if (!target) return;
  selectedRules.targetGold = Number(target.dataset.gold || '5');
  goldPicker.querySelectorAll('.mini-chip').forEach((chip) => {
    chip.classList.toggle('active', chip === target);
  });
});

livesPicker.addEventListener('click', (e) => {
  const target = (e.target as HTMLElement).closest<HTMLButtonElement>('.mini-chip');
  if (!target) return;
  selectedRules.maxLives = Number(target.dataset.lives || '3');
  livesPicker.querySelectorAll('.mini-chip').forEach((chip) => {
    chip.classList.toggle('active', chip === target);
  });
});

// Dedicated Matchmaking Lobby handlers
function openLobby(): void {
  clearAllInputs();
  overlayTitle.classList.add('hidden');
  overlayResult.classList.add('hidden');
  overlayLobby.classList.remove('hidden');
  controllerDeck.classList.add('hidden');
  updateLobbyState();
}

btnOpenLobby.addEventListener('click', openLobby);

btnLobbyBack.addEventListener('click', () => {
  net.disconnect();
  hostInviteEl.classList.add('hidden');
  roomStatusEl.classList.add('hidden');
  joinHintEl.textContent = '';
  // Clear ?room=... query if present
  if (window.location.search.includes('room=')) {
    const clean = new URL(window.location.href);
    clean.searchParams.delete('room');
    window.history.replaceState({}, '', clean.toString());
  }
  showTitle();
});

btnCreateRoom.addEventListener('click', () => {
  const code = net.createRoom();
  inviteCodeEl.textContent = code;
  hostInviteEl.classList.remove('hidden');
  joinHintEl.textContent = '';

  const inviteUrl = getInviteUrl(code);
  QRCode.toCanvas(
    lobbyQrCanvas,
    inviteUrl,
    {
      width: 128,
      margin: 1,
      color: { dark: '#2b2016', light: '#fdf6e6' },
    },
    () => {}
  );
});

btnCopyLink.addEventListener('click', () => {
  if (!net.roomCode) return;
  const url = getInviteUrl(net.roomCode);
  navigator.clipboard?.writeText(url).catch(() => {});
  btnCopyLink.textContent = 'COPIED';
  setTimeout(() => {
    btnCopyLink.textContent = 'COPY LINK';
  }, 1400);
});

btnShareLink.addEventListener('click', () => {
  if (!net.roomCode || !navigator.share) return;
  navigator
    .share({
      title: 'GOLD RUSH DUEL',
      url: getInviteUrl(net.roomCode),
    })
    .catch(() => {});
});

btnJoinRoom.addEventListener('click', () => {
  hostInviteEl.classList.add('hidden');
  net.joinRoom(inputRoomCode.value);
});

function showTitle(): void {
  clearAllInputs();
  game.localPlayer = 'p1';
  game.mode = 'title';
  game.loadStage(game.stageIndex);
  overlayTitle.classList.remove('hidden');
  overlayLobby.classList.add('hidden');
  overlayResult.classList.add('hidden');
  controllerDeck.classList.add('hidden');
  syncHUD(true);
}

function startSoloDuel(): void {
  net.disconnect();
  clearAllInputs();
  sound.unlock();
  game.localPlayer = 'p1';
  game.startMatch(game.stageIndex, selectedRules);
  overlayTitle.classList.add('hidden');
  overlayLobby.classList.add('hidden');
  overlayResult.classList.add('hidden');
  controllerDeck.classList.remove('hidden');
  syncHUD(true);
}

function startOnlineDuel(): void {
  if (net.role !== 'host' || !net.connected) return;
  clearAllInputs();
  sound.unlock();
  game.localPlayer = 'p1';
  game.startMatch(game.stageIndex, selectedRules);
  net.send({ type: 'start', stageIndex: game.stageIndex, rules: selectedRules });
  overlayTitle.classList.add('hidden');
  overlayLobby.classList.add('hidden');
  overlayResult.classList.add('hidden');
  controllerDeck.classList.remove('hidden');
  syncHUD(true);
}

btnStart.addEventListener('click', startSoloDuel);
btnOnlineStart.addEventListener('click', startOnlineDuel);
btnRematch.addEventListener('click', () => {
  if (net.role === 'guest' && net.connected) {
    net.send({ type: 'rematch' });
  } else if (net.role === 'host' && net.connected) {
    startOnlineDuel();
  } else {
    startSoloDuel();
  }
});
btnToTitle.addEventListener('click', showTitle);
btnHome.addEventListener('click', showTitle);

btnMute.addEventListener('click', () => {
  sound.muted = !sound.muted;
  iconSoundOn.classList.toggle('hidden', sound.muted);
  iconSoundOff.classList.toggle('hidden', !sound.muted);
});

const GOLD_ICON = `<svg viewBox="0 0 24 18" width="16" height="12"><path d="M2 15L6 4h12l4 11z" fill="#f2be3d" stroke="#2b2016" stroke-width="1.8" stroke-linejoin="round"/><path d="M6 4h12l-1.5 4h-9z" fill="#ffe188" stroke="#2b2016" stroke-width="1.2"/></svg>`;
const HAT_ICON = `<svg viewBox="0 0 24 16" width="14" height="10"><path d="M2 12q10 2 20 0l-3-2H5z" fill="#5c3c22" stroke="#2b2016" stroke-width="1.5"/><path d="M7 10l1.5-7h7L17 10z" fill="#5c3c22" stroke="#2b2016" stroke-width="1.5"/></svg>`;

function gearLabel(weapon: string, armorHits: number): string {
  if (armorHits > 0) return 'SHIELD';
  if (weapon === 'shotgun') return 'SHOTGUN';
  if (weapon === 'dynamite') return 'DYNAMITE';
  if (weapon === 'sniper') return 'SNIPER';
  return '';
}

let lastHudSig = '';
function syncHUD(force = false): void {
  const [p1, p2] = game.fighters;
  const sig = `${p1.gold}/${game.rules.targetGold}-${p1.lives}-${p1.weapon}-${p1.armorHits}|${p2.gold}-${p2.lives}-${p2.weapon}-${p2.armorHits}|${game.mode}`;
  if (!force && sig === lastHudSig) return;
  lastHudSig = sig;

  p1GoldEl.innerHTML = `${GOLD_ICON}<span>${p1.gold}/${game.rules.targetGold}</span>`;
  p2GoldEl.innerHTML = `<span>${p2.gold}/${game.rules.targetGold}</span>${GOLD_ICON}`;

  const p1LifeTxt = p1.lives < 0 ? '∞' : `${p1.lives}`;
  const p2LifeTxt = p2.lives < 0 ? '∞' : `${p2.lives}`;
  p1LivesEl.innerHTML = `${HAT_ICON}<span>${p1LifeTxt}</span>`;
  p2LivesEl.innerHTML = `<span>${p2LifeTxt}</span>${HAT_ICON}`;

  const g1 = gearLabel(p1.weapon, p1.armorHits);
  p1GearEl.textContent = g1;
  p1GearEl.classList.toggle('hidden', !g1);

  const g2 = gearLabel(p2.weapon, p2.armorHits);
  p2GearEl.textContent = g2;
  p2GearEl.classList.toggle('hidden', !g2);

  if (game.mode === 'result' && overlayResult.classList.contains('hidden')) {
    const won = game.winner === game.localPlayer;
    resultTitle.textContent = won ? 'VICTORY' : 'DEFEAT';
    resultScore.textContent =
      game.winReason === 'ko'
        ? `KO  (${p1.gold} - ${p2.gold})`
        : `${p1.gold} - ${p2.gold}`;
    resultEmblem.innerHTML = `<svg viewBox="0 0 48 36" width="56" height="42"><path d="M4 30L12 8h24l8 22z" fill="${
      won ? '#f2be3d' : '#354f70'
    }" stroke="#2b2016" stroke-width="2.5" stroke-linejoin="round"/></svg>`;
    overlayResult.classList.remove('hidden');
    controllerDeck.classList.add('hidden');
  }
}

showTitle();

// Auto-open lobby & join if opened via invite link / QR code (?room=XXXX)
const urlRoom = new URLSearchParams(window.location.search).get('room');
if (urlRoom && /^[A-Za-z0-9]{4}$/.test(urlRoom.trim())) {
  const code = urlRoom.trim().toUpperCase();
  openLobby();
  inputRoomCode.value = code;
  net.joinRoom(code);
}

// Main 60fps loop
let lastTs = performance.now();
function loop(ts: number): void {
  const dt = (ts - lastTs) / 1000;
  lastTs = ts;

  const jumpNow = keyState.jump || touchState.jump || mouseState.jump;
  const shootNow = keyState.shoot || touchState.shoot || mouseState.shoot;
  const jumpPressed = pendingJumpPress || (jumpNow && !prevJump);
  const input: InputState = {
    left: keyState.left || touchState.left || mouseState.left,
    right: keyState.right || touchState.right || mouseState.right,
    jump: jumpNow,
    jumpPressed,
    shoot: shootNow || pendingShootPress,
  };
  prevJump = jumpNow;

  // Only consume latched taps when game isn't frozen in hitstop
  if (game.hitstop <= 0) {
    pendingJumpPress = false;
    pendingShootPress = false;
  }

  netSyncAccum += dt;

  if (net.role === 'guest' && net.connected) {
    // Guest sends local inputs to Host (immediately on jump/shoot, or at 30Hz)
    if (input.jumpPressed || input.shoot || netSyncAccum >= 1 / 30) {
      netSyncAccum = 0;
      net.send({ type: 'input', input });
    }
    game.updateCamera(Math.min(dt, 0.04));
  } else if (net.role === 'host' && net.connected) {
    // Host runs authoritative simulation using Guest's input for P2
    const p2In = { ...remoteP2Input };
    remoteP2Input.jumpPressed = false;
    game.update(dt, input, p2In);
    if (netSyncAccum >= 1 / 30) {
      netSyncAccum = 0;
      net.send({ type: 'state', snap: game.exportSnapshot() });
    }
  } else {
    // Offline 1P vs CPU
    game.update(dt, input);
  }

  renderer.render(ctx, game);
  syncHUD();

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
