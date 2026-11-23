import './style.css';
import { sound } from './audio';
import { GameEngine } from './game';
import { SketchRenderer } from './renderer';
import { COINS_FOR_POWERUP, VIEW_H, VIEW_W, WIN_STARS } from './stages';
import type { InputState } from './types';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

const overlayTitle = document.getElementById('overlay-title')!;
const overlayResult = document.getElementById('overlay-result')!;
const resultTitle = document.getElementById('result-title')!;
const resultScore = document.getElementById('result-score')!;
const resultEmblem = document.getElementById('result-emblem')!;
const p1StarsEl = document.getElementById('p1-stars')!;
const p2StarsEl = document.getElementById('p2-stars')!;
const p1CoinsEl = document.getElementById('p1-coins')!;
const p2CoinsEl = document.getElementById('p2-coins')!;
const stagePicker = document.getElementById('stage-picker')!;
const btnStart = document.getElementById('btn-start')!;
const btnRematch = document.getElementById('btn-rematch')!;
const btnToTitle = document.getElementById('btn-to-title')!;
const btnHome = document.getElementById('btn-home')!;
const btnMute = document.getElementById('btn-mute')!;
const iconSoundOn = document.getElementById('icon-sound-on')!;
const iconSoundOff = document.getElementById('icon-sound-off')!;
const controllerDeck = document.getElementById('controller-deck')!;

const game = new GameEngine();
const renderer = new SketchRenderer();

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

// Stage picker
stagePicker.addEventListener('click', (e) => {
  const target = (e.target as HTMLElement).closest<HTMLButtonElement>('.stage-chip');
  if (!target) return;
  const idx = Number(target.dataset.stage || '0');
  game.loadStage(idx);
  stagePicker.querySelectorAll('.stage-chip').forEach((chip) => {
    chip.classList.toggle('active', chip === target);
  });
});

function showTitle(): void {
  clearAllInputs();
  game.mode = 'title';
  game.loadStage(game.stageIndex);
  overlayTitle.classList.remove('hidden');
  overlayResult.classList.add('hidden');
  controllerDeck.classList.add('hidden');
  syncHUD(true);
}

function startDuel(): void {
  clearAllInputs();
  sound.unlock();
  game.startMatch(game.stageIndex);
  overlayTitle.classList.add('hidden');
  overlayResult.classList.add('hidden');
  controllerDeck.classList.remove('hidden');
  syncHUD(true);
}

btnStart.addEventListener('click', startDuel);
btnRematch.addEventListener('click', startDuel);
btnToTitle.addEventListener('click', showTitle);
btnHome.addEventListener('click', showTitle);

btnMute.addEventListener('click', () => {
  sound.muted = !sound.muted;
  iconSoundOn.classList.toggle('hidden', sound.muted);
  iconSoundOff.classList.toggle('hidden', !sound.muted);
});

// HUD SVG helpers (zero Unicode emoji)
function starSvg(filled: boolean, color: string): string {
  const fill = filled ? color : 'rgba(43, 32, 22, 0.12)';
  return `<span class="star-slot"><svg viewBox="0 0 24 24" width="15" height="15"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.3 6.1 20.5l1.2-6.5-4.8-4.6 6.6-.9L12 2.5z" fill="${fill}" stroke="#2b2016" stroke-width="1.8" stroke-linejoin="round"/></svg></span>`;
}

let lastHudSig = '';
function syncHUD(force = false): void {
  const [p1, p2] = game.fighters;
  const sig = `${p1.stars}-${p1.coins}-${p2.stars}-${p2.coins}-${game.mode}`;
  if (!force && sig === lastHudSig) return;
  lastHudSig = sig;

  p1StarsEl.innerHTML = Array.from({ length: WIN_STARS }, (_, i) =>
    starSvg(i < p1.stars, '#e8aa2a')
  ).join('');
  p2StarsEl.innerHTML = Array.from({ length: WIN_STARS }, (_, i) =>
    starSvg(i < p2.stars, '#e8aa2a')
  ).join('');

  p1CoinsEl.innerHTML = Array.from({ length: COINS_FOR_POWERUP }, (_, i) =>
    `<span class="coin-pip${i < p1.coins ? ' filled' : ''}"></span>`
  ).join('');
  p2CoinsEl.innerHTML = Array.from({ length: COINS_FOR_POWERUP }, (_, i) =>
    `<span class="coin-pip${i < p2.coins ? ' filled' : ''}"></span>`
  ).join('');

  if (game.mode === 'result' && overlayResult.classList.contains('hidden')) {
    const won = game.winner === 'p1';
    resultTitle.textContent = won ? 'VICTORY' : 'DEFEAT';
    resultScore.textContent = `${p1.stars} - ${p2.stars}`;
    resultEmblem.innerHTML = `<svg viewBox="0 0 48 48" width="52" height="52"><path d="M24 4l5.8 12 13.2 1.8-9.6 9.2 2.4 13L24 33.8 12.2 40l2.4-13-9.6-9.2L18.2 16 24 4z" fill="${
      won ? '#e8aa2a' : '#354f70'
    }" stroke="#2b2016" stroke-width="2.5" stroke-linejoin="round"/></svg>`;
    overlayResult.classList.remove('hidden');
    controllerDeck.classList.add('hidden');
  }
}

showTitle();

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

  game.update(dt, input);
  renderer.render(ctx, game);
  syncHUD();

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
