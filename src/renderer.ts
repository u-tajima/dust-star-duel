import { GameEngine, wrapDeltaX, wrapX } from './game';
import { VIEW_H, VIEW_W, WORLD_H, WORLD_W } from './stages';
import type { Fighter, Platform, SpringBarrel, StarItem } from './types';

const INK = '#2b2016';
const PARCHMENT_BG = '#e8d7b7';
const SPRITE_CELL = 160;

export class SketchRenderer {
  private bgImg: HTMLImageElement;
  private bgReady = false;
  private p1Sheet: HTMLImageElement;
  private p1Ready = false;
  private p2Sheet: HTMLImageElement;
  private p2Ready = false;
  private tileMesa: HTMLImageElement;
  private tileMesaReady = false;
  private tileWood: HTMLImageElement;
  private tileWoodReady = false;
  private tileBridge: HTMLImageElement;
  private tileBridgeReady = false;
  private propBarrel: HTMLImageElement;
  private propBarrelReady = false;

  constructor() {
    this.bgImg = new Image();
    this.bgImg.onload = () => {
      this.bgReady = true;
    };
    this.bgImg.src = './assets/western-bg.jpg';

    this.p1Sheet = new Image();
    this.p1Sheet.onload = () => {
      this.p1Ready = true;
    };
    this.p1Sheet.src = './assets/p1-sprites.png';

    this.p2Sheet = new Image();
    this.p2Sheet.onload = () => {
      this.p2Ready = true;
    };
    this.p2Sheet.src = './assets/p2-sprites.png';

    this.tileMesa = new Image();
    this.tileMesa.onload = () => {
      this.tileMesaReady = true;
    };
    this.tileMesa.src = './assets/tile-mesa.png';

    this.tileWood = new Image();
    this.tileWood.onload = () => {
      this.tileWoodReady = true;
    };
    this.tileWood.src = './assets/tile-wood.png';

    this.tileBridge = new Image();
    this.tileBridge.onload = () => {
      this.tileBridgeReady = true;
    };
    this.tileBridge.src = './assets/tile-bridge.png';

    this.propBarrel = new Image();
    this.propBarrel.onload = () => {
      this.propBarrelReady = true;
    };
    this.propBarrel.src = './assets/prop-barrel.png';
  }

  public render(ctx: CanvasRenderingContext2D, game: GameEngine): void {
    const wobbleStep = Math.floor(game.time * 8);
    const jx = ((wobbleStep * 17) % 3) - 1;
    const jy = ((wobbleStep * 31) % 3) - 1;

    ctx.save();

    // Screen shake on impact
    if (game.shakeTimer > 0) {
      const mag = game.shakePower * (game.shakeTimer / 0.22);
      ctx.translate((Math.random() - 0.5) * mag * 2, (Math.random() - 0.5) * mag * 2);
    }

    // 1. Sepia parchment parallax background
    this.drawBackground(ctx, game);

    // 2. Platforms (drawn across wrap seam if needed)
    for (const p of game.platforms) {
      this.drawPlatform(ctx, game, p, jx * 0.4, jy * 0.4);
    }

    // 3. Spring barrels
    for (const s of game.springs) {
      this.drawSpring(ctx, game, s);
    }

    // 4. Coins
    for (const c of game.coins) {
      if (c.collected) continue;
      const sx = this.worldToScreenX(game, c.x);
      const sy = c.y - game.camY + Math.sin(c.phase) * 3;
      if (sx < -24 || sx > VIEW_W + 24 || sy < -24 || sy > VIEW_H + 24) continue;
      this.drawCoin(ctx, sx, sy, c.phase);
    }

    // 5. Stars
    for (const st of game.stars) {
      this.drawStarItem(ctx, game, st);
    }

    // 6. Fighters
    this.drawFighter(ctx, game, game.fighters[1], jx, jy);
    this.drawFighter(ctx, game, game.fighters[0], jx, jy);

    // 7. Bullets
    for (const b of game.bullets) {
      const sx = this.worldToScreenX(game, b.x);
      const sy = b.y - game.camY;
      if (sx < -20 || sx > VIEW_W + 20 || sy < -20 || sy > VIEW_H + 20) continue;
      ctx.save();
      ctx.fillStyle = b.owner === 'p1' ? '#f5c249' : '#d6dfe8';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.ellipse(sx, sy, b.radius * 1.45, b.radius * 0.85, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // 8. Particles
    for (const pt of game.particles) {
      const sx = this.worldToScreenX(game, pt.x);
      const sy = pt.y - game.camY;
      if (sx < -20 || sx > VIEW_W + 20 || sy < -20 || sy > VIEW_H + 20) continue;
      const alpha = Math.max(0, Math.min(1, pt.life / pt.maxLife));
      ctx.save();
      ctx.globalAlpha = alpha;
      if (pt.kind === 'star') {
        this.drawFiveStar(ctx, sx, sy, pt.size, pt.color, INK);
      } else {
        ctx.fillStyle = pt.color;
        ctx.strokeStyle = INK;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(sx, sy, pt.size * (0.4 + alpha * 0.6), 0, Math.PI * 2);
        ctx.fill();
        if (pt.kind === 'smoke' || pt.kind === 'dust') ctx.stroke();
      }
      ctx.restore();
    }

    // 9. Paper vignette & subtle pencil grain overlay
    this.drawVignette(ctx);

    // 10. DS Mario vs Luigi off-screen indicators & mini-radar
    if (game.mode === 'playing') {
      this.drawOffscreenIndicators(ctx, game);
      this.drawMiniRadar(ctx, game);
    }

    ctx.restore();
  }

  private worldToScreenX(game: GameEngine, wx: number): number {
    const camCenter = wrapX(game.camX + VIEW_W * 0.5);
    return VIEW_W * 0.5 + wrapDeltaX(camCenter, wx);
  }

  private drawBackground(ctx: CanvasRenderingContext2D, game: GameEngine): void {
    ctx.fillStyle = PARCHMENT_BG;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    if (this.bgReady) {
      const tileW = VIEW_W;
      const tileH = VIEW_H;
      const offsetX = -((game.camX * 0.25) % tileW);
      const offsetY = -((game.camY / Math.max(1, WORLD_H - VIEW_H)) * 28);

      ctx.save();
      ctx.globalAlpha = 0.72;
      for (let i = -1; i <= 1; i++) {
        ctx.drawImage(this.bgImg, offsetX + i * tileW, offsetY, tileW, tileH + 30);
      }
      ctx.restore();
    }

    // Subtle sketchbook horizontal pencil lines
    ctx.save();
    ctx.strokeStyle = 'rgba(72, 50, 28, 0.06)';
    ctx.lineWidth = 1;
    for (let y = 18; y < VIEW_H; y += 22) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(VIEW_W, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawPlatform(
    ctx: CanvasRenderingContext2D,
    game: GameEngine,
    p: Platform,
    jx: number,
    jy: number
  ): void {
    const sy = p.y - game.camY;
    const visualH =
      p.style === 'mesa'
        ? Math.max(p.h + 8, 36)
        : p.style === 'bridge'
          ? Math.max(p.h + 18, 34)
          : Math.max(p.h + 14, 30);

    if (sy + visualH < -24 || sy > VIEW_H + 24) return;

    // Render across -WORLD_W, 0, +WORLD_W so wide platforms & seam-straddling ground never vanish
    for (let shift = -WORLD_W; shift <= WORLD_W; shift += WORLD_W) {
      const sx = p.x + shift - game.camX;
      if (sx + p.w < -24 || sx > VIEW_W + 24) continue;

      this.drawPlatformInstance(ctx, p, sx, sy, visualH, jx, jy);
    }
  }

  private drawPlatformInstance(
    ctx: CanvasRenderingContext2D,
    p: Platform,
    sx: number,
    sy: number,
    visualH: number,
    jx: number,
    jy: number
  ): void {
    const img =
      p.style === 'mesa'
        ? this.tileMesaReady
          ? this.tileMesa
          : null
        : p.style === 'wood'
          ? this.tileWoodReady
            ? this.tileWood
            : null
          : this.tileBridgeReady
            ? this.tileBridge
            : null;

    if (img) {
      ctx.save();
      // Clip to platform horizontal bounds (with slight vertical room for hand-drawn top/bottom edges)
      ctx.beginPath();
      ctx.rect(sx - 2, sy - 8, p.w + 4, visualH + 14);
      ctx.clip();

      const segW = p.style === 'mesa' ? 148 : p.style === 'bridge' ? 124 : 128;
      const count = Math.max(1, Math.round(p.w / segW));
      const actualSegW = p.w / count;
      const topOffset = p.style === 'mesa' ? -5 : p.style === 'wood' ? -6 : -3;

      for (let i = 0; i < count; i++) {
        const dx = sx + i * actualSegW;
        // Slight 2px overlap between tiled segments prevents hairline seams
        ctx.drawImage(
          img,
          dx - (i > 0 ? 2 : 0),
          sy + topOffset,
          actualSegW + (i > 0 ? 2 : 0) + (i < count - 1 ? 2 : 0),
          visualH
        );
      }

      ctx.restore();
      return;
    }

    // Fallback vector sketch while tile images load
    ctx.save();
    ctx.fillStyle = p.style === 'mesa' ? '#c49b66' : p.style === 'wood' ? '#a87948' : '#8f6a42';
    ctx.fillRect(sx, sy, p.w, p.h);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.strokeRect(sx, sy, p.w, p.h);
    ctx.lineWidth = 1;
    ctx.strokeRect(sx + jx, sy + jy, p.w, p.h);
    ctx.restore();
  }

  private drawSpring(ctx: CanvasRenderingContext2D, game: GameEngine, s: SpringBarrel): void {
    const sy = s.y + s.h - game.camY;
    if (sy < -48 || sy > VIEW_H + 48) return;

    const stretch = s.bounceTimer > 0 ? 1 + Math.sin((s.bounceTimer / 0.25) * Math.PI) * 0.35 : 1;

    for (let shift = -WORLD_W; shift <= WORLD_W; shift += WORLD_W) {
      const sx = s.x + s.w * 0.5 + shift - game.camX;
      if (sx < -40 || sx > VIEW_W + 40) continue;

      ctx.save();
      ctx.translate(sx, sy);

      if (this.propBarrelReady) {
        const dw = 34 / Math.sqrt(stretch);
        const dh = 44 * stretch;
        ctx.drawImage(this.propBarrel, -dw * 0.5, -dh + 2, dw, dh);
      } else {
        const w = s.w / Math.sqrt(stretch);
        const h = s.h * stretch;
        ctx.fillStyle = '#b97b3c';
        ctx.strokeStyle = INK;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(-w * 0.5, -h, w, h, 5);
        ctx.fill();
        ctx.stroke();
      }

      ctx.restore();
    }
  }

  private drawCoin(ctx: CanvasRenderingContext2D, x: number, y: number, phase: number): void {
    const spin = Math.max(0.28, Math.abs(Math.cos(phase)));
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = '#e7b137';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.ellipse(0, 0, 7 * spin, 8.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  private drawStarItem(ctx: CanvasRenderingContext2D, game: GameEngine, st: StarItem): void {
    const sx = this.worldToScreenX(game, st.x);
    const sy = st.y - game.camY + (st.dropped ? 0 : Math.sin(st.bobPhase) * 4.5);
    if (sx < -36 || sx > VIEW_W + 36 || sy < -36 || sy > VIEW_H + 36) return;

    ctx.save();
    ctx.translate(sx, sy);

    // Warm hand-drawn sunburst aura
    const pulse = 1 + Math.sin(st.bobPhase * 1.4) * 0.12;
    ctx.strokeStyle = 'rgba(218, 152, 34, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, st.radius * 1.35 * pulse, 0, Math.PI * 2);
    ctx.stroke();

    ctx.rotate(Math.sin(st.bobPhase * 0.6) * 0.14);
    this.drawFiveStar(ctx, 0, 0, st.radius * pulse, '#f2b830', INK);
    ctx.restore();
  }

  private drawFighter(
    ctx: CanvasRenderingContext2D,
    game: GameEngine,
    f: Fighter,
    jx: number,
    jy: number
  ): void {
    const sx = this.worldToScreenX(game, f.x);
    const sy = f.y - game.camY;
    if (sx < -48 || sx > VIEW_W + 48 || sy < -48 || sy > VIEW_H + 48) return;

    // Blink during invulnerability
    if (f.invulnTimer > 0 && Math.floor(f.invulnTimer * 18) % 2 === 0) return;

    const isP1 = f.id === 'p1';
    const sheet = isP1 ? this.p1Sheet : this.p2Sheet;
    const ready = isP1 ? this.p1Ready : this.p2Ready;

    // Select animation cell (3x2 grid: 0=Idle, 1=RunA, 2=RunB, 3=Jump, 4=Shoot, 5=Hurt)
    let col = 0;
    let row = 0;
    let runBob = 0;
    if (f.stunTimer > 0) {
      col = 2;
      row = 1;
    } else if (f.shootPoseTimer > 0) {
      col = 1;
      row = 1;
    } else if (!f.onGround) {
      col = 0;
      row = 1;
    } else if (Math.abs(f.vx) > 25) {
      const step = Math.floor(f.animTime * 11) % 2;
      col = step === 0 ? 1 : 2;
      row = 0;
      runBob = step === 0 ? -1.5 : 0;
    } else {
      col = 0;
      row = 0;
    }

    ctx.save();
    ctx.translate(sx, sy + f.h * 0.5);

    // Subtle ground contact shadow
    if (f.onGround) {
      ctx.fillStyle = 'rgba(43, 32, 22, 0.24)';
      ctx.beginPath();
      ctx.ellipse(0, -1, 14, 3.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.scale(f.facing * f.squashX, f.squashY);

    // Power-up golden sketch aura
    if (f.powerUp !== 'none') {
      ctx.save();
      ctx.strokeStyle = '#e8a825';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.ellipse(0, -24, 22, 26, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    if (ready) {
      const drawSize = 56;
      const idleBreath = col === 0 && row === 0 ? Math.sin(f.animTime * 3.5) * 0.015 : 0;
      ctx.save();
      ctx.scale(1 - idleBreath, 1 + idleBreath);
      ctx.drawImage(
        sheet,
        col * SPRITE_CELL,
        row * SPRITE_CELL,
        SPRITE_CELL,
        SPRITE_CELL,
        -drawSize * 0.5 + jx * 0.2,
        -drawSize + 4 + runBob + jy * 0.2,
        drawSize,
        drawSize
      );
      ctx.restore();

      // Comic muzzle flash aligned to extended revolver barrel in Shoot pose
      if (f.muzzleTimer > 0) {
        ctx.fillStyle = '#ffe594';
        ctx.strokeStyle = INK;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(24, -27);
        ctx.lineTo(35, -32);
        ctx.lineTo(31, -27);
        ctx.lineTo(36, -22);
        ctx.lineTo(24, -25);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    } else {
      // Fallback silhouette while sprite sheet loads
      ctx.fillStyle = isP1 ? '#b23b2a' : '#354f70';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2;
      ctx.fillRect(-10, -34, 20, 34);
      ctx.strokeRect(-10, -34, 20, 34);
    }

    ctx.restore();
  }

  private drawOffscreenIndicators(ctx: CanvasRenderingContext2D, game: GameEngine): void {
    const p1 = game.fighters[0];

    // 1. Primary Star indicator (or dropped star if closer)
    const targetStar = game.stars[0];
    if (targetStar) {
      this.drawEdgePointer(ctx, game, targetStar.x, targetStar.y, 'star', '#f2b830');
    }

    // 2. Rival indicator
    const rival = game.fighters[1];
    if (Math.abs(wrapDeltaX(p1.x, rival.x)) > VIEW_W * 0.45 || Math.abs(rival.y - p1.y) > VIEW_H * 0.45) {
      this.drawEdgePointer(ctx, game, rival.x, rival.y, 'rival', '#354f70');
    }
  }

  private drawEdgePointer(
    ctx: CanvasRenderingContext2D,
    game: GameEngine,
    wx: number,
    wy: number,
    kind: 'star' | 'rival',
    color: string
  ): void {
    const sx = this.worldToScreenX(game, wx);
    const sy = wy - game.camY;
    const pad = 22;

    if (sx >= pad && sx <= VIEW_W - pad && sy >= pad && sy <= VIEW_H - pad) {
      return; // Already visible on screen
    }

    const cx = VIEW_W * 0.5;
    const cy = VIEW_H * 0.5;
    const dx = sx - cx;
    const dy = sy - cy;
    const ang = Math.atan2(dy, dx);

    const maxX = VIEW_W * 0.5 - pad;
    const maxY = VIEW_H * 0.5 - pad;
    const scale = Math.min(
      Math.abs(dx) > 0.001 ? maxX / Math.abs(dx) : 999,
      Math.abs(dy) > 0.001 ? maxY / Math.abs(dy) : 999
    );

    const px = cx + dx * scale;
    const py = Math.max(36, Math.min(VIEW_H - 36, cy + dy * scale));

    ctx.save();
    ctx.translate(px, py);

    // Arrow triangle pointing outward
    ctx.save();
    ctx.rotate(ang);
    ctx.fillStyle = color;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(14, 0);
    ctx.lineTo(5, -6);
    ctx.lineTo(5, 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Emblem badge
    if (kind === 'star') {
      this.drawFiveStar(ctx, -2, 0, 7.5, '#f2b830', INK);
    } else {
      ctx.fillStyle = '#354f70';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(-2, 0, 6.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();
  }

  private drawMiniRadar(ctx: CanvasRenderingContext2D, game: GameEngine): void {
    const rw = 136;
    const rh = 32;
    const rx = (VIEW_W - rw) * 0.5;
    const ry = VIEW_H - rh - 8;

    ctx.save();
    ctx.fillStyle = 'rgba(232, 215, 183, 0.78)';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(rx, ry, rw, rh, 4);
    ctx.fill();
    ctx.stroke();

    const sx = rw / WORLD_W;
    const sy = rh / WORLD_H;

    // Tiny platform lines
    ctx.fillStyle = 'rgba(72, 50, 28, 0.35)';
    for (const p of game.platforms) {
      ctx.fillRect(rx + p.x * sx, ry + p.y * sy, Math.max(2, p.w * sx), Math.max(1.5, p.h * sy));
    }

    // Current viewport box
    const vx = rx + game.camX * sx;
    const vw = VIEW_W * sx;
    ctx.strokeStyle = 'rgba(43, 32, 22, 0.45)';
    ctx.lineWidth = 1;
    if (vx + vw <= rx + rw) {
      ctx.strokeRect(vx, ry + 1, vw, rh - 2);
    } else {
      const part1 = rx + rw - vx;
      ctx.strokeRect(vx, ry + 1, part1, rh - 2);
      ctx.strokeRect(rx, ry + 1, vw - part1, rh - 2);
    }

    // Stars on radar
    for (const st of game.stars) {
      this.drawFiveStar(ctx, rx + st.x * sx, ry + st.y * sy, 4, '#f2b830', INK);
    }

    // Rival & Player dots
    const [p1, p2] = game.fighters;
    ctx.fillStyle = '#354f70';
    ctx.beginPath();
    ctx.arc(rx + p2.x * sx, ry + p2.y * sy, 2.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#b23b2a';
    ctx.beginPath();
    ctx.arc(rx + p1.x * sx, ry + p1.y * sy, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff5dc';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();
  }

  private drawFiveStar(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    outerR: number,
    fill: string,
    stroke: string
  ): void {
    const innerR = outerR * 0.46;
    ctx.save();
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.5;
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  private drawVignette(ctx: CanvasRenderingContext2D): void {
    const grad = ctx.createRadialGradient(
      VIEW_W * 0.5,
      VIEW_H * 0.5,
      VIEW_W * 0.32,
      VIEW_W * 0.5,
      VIEW_H * 0.5,
      VIEW_W * 0.65
    );
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(54, 34, 16, 0.24)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }
}
