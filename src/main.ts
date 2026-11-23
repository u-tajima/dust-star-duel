import './style.css';
import { sound } from './audio';
import { GameEngine } from './game';
import { SketchRenderer } from './renderer';
import { VIEW_H, VIEW_W } from './stages';
import type { InputState, MatchRules } from './types';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

const overlayTitle = document.getElementById('overlay-title')!;
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
const btnStart = document.getElementById('btn-start')!;
const btnRematch = document.getElementById('btn-rematch')!;
const btnToTitle = document.getElementById('btn-to-title')!;
const btnHome = document.getElementById('btn-home')!;
const btnMute = document.getElementById('btn-mute')!;
const iconSoundOn = document.getElementById('icon-sound-on')!;
const iconSoundOff = document.getElementById('icon-sound-off')!;
const controllerDeck = document.getElementById('controller-deck')!;

const selectedRules: MatchRules = { targetGold: 5, maxLives: 3 };
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
  game.startMatch(game.stageIndex, selectedRules);
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
    const won = game.winner === 'p1';
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
