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

// Input state (keyboard + rock-solid live TouchList + mouse fallback)
const keyState = { left: false, right: false, jump: false, shoot: false };
const touchState = { left: false, right: false, jump: false, shoot: false };
const mouseState = { left: false, right: false, jump: false, shoot: false };
let prevJump = false;

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
    keyState.jump = true;
  }
  if (e.code === 'KeyX' || e.code === 'KeyJ' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
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

// Recompute touch controls directly from OS live TouchList (impossible to stick, supports thumb-sliding L<->R)
function recomputeTouches(touches: TouchList): void {
  touchState.left = false;
  touchState.right = false;
  touchState.jump = false;
  touchState.shoot = false;

  const pad = 10; // forgiving hit margin around buttons
  const rects = {
    left: ctrlButtons.left.getBoundingClientRect(),
    right: ctrlButtons.right.getBoundingClientRect(),
    jump: ctrlButtons.jump.getBoundingClientRect(),
    shoot: ctrlButtons.shoot.getBoundingClientRect(),
  };

  for (let i = 0; i < touches.length; i++) {
    const t = touches[i];
    const x = t.clientX;
    const y = t.clientY;
    for (const k of ['left', 'right', 'jump', 'shoot'] as const) {
      const r = rects[k];
      if (x >= r.left - pad && x <= r.right + pad && y >= r.top - pad && y <= r.bottom + pad) {
        touchState[k] = true;
      }
    }
  }
  syncButtonVisuals();
}

const handleTouch = (e: TouchEvent) => {
  if (game.mode !== 'playing') return;
  if ((e.target as HTMLElement)?.closest('.controller-deck')) {
    e.preventDefault();
  }
  if (e.type === 'touchstart') sound.unlock();
  recomputeTouches(e.touches);
};

window.addEventListener('touchstart', handleTouch, { passive: false });
window.addEventListener('touchmove', handleTouch, { passive: false });
window.addEventListener('touchend', handleTouch, { passive: false });
window.addEventListener('touchcancel', () => {
  touchState.left = touchState.right = touchState.jump = touchState.shoot = false;
  syncButtonVisuals();
});

// Desktop mouse support on touch buttons
(Object.keys(ctrlButtons) as (keyof typeof mouseState)[]).forEach((field) => {
  const el = ctrlButtons[field];
  el.addEventListener('mousedown', (e) => {
    e.preventDefault();
    sound.unlock();
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
  const input: InputState = {
    left: keyState.left || touchState.left || mouseState.left,
    right: keyState.right || touchState.right || mouseState.right,
    jump: jumpNow,
    jumpPressed: jumpNow && !prevJump,
    shoot: keyState.shoot || touchState.shoot || mouseState.shoot,
  };
  prevJump = jumpNow;

  game.update(dt, input);
  renderer.render(ctx, game);
  syncHUD();

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
