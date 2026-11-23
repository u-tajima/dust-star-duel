import { GameEngine, wrapDeltaX, wrapX } from './game';
import { VIEW_H, VIEW_W, WORLD_H, WORLD_W } from './stages';
import type { Fighter, GoldItem, Platform, SpringBarrel, TntBarrel, WeaponCrate } from './types';

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
  private propGold: HTMLImageElement;
  private propGoldReady = false;
  private propTnt: HTMLImageElement;
  private propTntReady = false;
  private propCrate: HTMLImageElement;
  private propCrateReady = false;
  private propBadge: HTMLImageElement;
  private propBadgeReady = false;

  constructor() {
    this.bgImg = this.loadImg('./assets/western-bg.jpg', () => (this.bgReady = true));
    this.p1Sheet = this.loadImg('./assets/p1-sprites.png', () => (this.p1Ready = true));
    this.p2Sheet = this.loadImg('./assets/p2-sprites.png', () => (this.p2Ready = true));
    this.tileMesa = this.loadImg('./assets/tile-mesa.png', () => (this.tileMesaReady = true));
    this.tileWood = this.loadImg('./assets/tile-wood.png', () => (this.tileWoodReady = true));
    this.tileBridge = this.loadImg('./assets/tile-bridge.png', () => (this.tileBridgeReady = true));
    this.propBarrel = this.loadImg('./assets/prop-barrel.png', () => (this.propBarrelReady = true));
    this.propGold = this.loadImg('./assets/prop-gold.png', () => (this.propGoldReady = true));
    this.propTnt = this.loadImg('./assets/prop-tnt.png', () => (this.propTntReady = true));
    this.propCrate = this.loadImg('./assets/prop-crate.png', () => (this.propCrateReady = true));
    this.propBadge = this.loadImg('./assets/prop-badge.png', () => (this.propBadgeReady = true));
  }

  private loadImg(src: string, onLoad: () => void): HTMLImageElement {
    const img = new Image();
    img.onload = onLoad;
    img.src = src;
    return img;
  }

  public render(ctx: CanvasRenderingContext2D, game: GameEngine): void {
    const wobbleStep = Math.floor(game.time * 8);
    const jx = ((wobbleStep * 17) % 3) - 1;
    const jy = ((wobbleStep * 31) % 3) - 1;

    ctx.save();

    if (game.shakeTimer > 0) {
      const mag = game.shakePower * (game.shakeTimer / 0.25);
      ctx.translate((Math.random() - 0.5) * mag * 2, (Math.random() - 0.5) * mag * 2);
    }

    // 1. Sepia parchment parallax background
    this.drawBackground(ctx, game);

    // 2. Platforms (3-shift seamless wrap)
    for (const p of game.platforms) {
      this.drawPlatform(ctx, game, p, jx * 0.4, jy * 0.4);
    }

    // 3. Stage props: springs, TNT barrels, weapon crates
    for (const s of game.springs) this.drawSpring(ctx, game, s);
    for (const t of game.tnts) {
      if (t.alive) this.drawTnt(ctx, game, t);
    }
    for (const cr of game.crates) {
      if (cr.alive) this.drawCrate(ctx, game, cr);
    }

    // 4. Coins
    for (const c of game.coins) {
      if (c.collected) continue;
      const sx = this.worldToScreenX(game, c.x);
      const sy = c.y - game.camY + Math.sin(c.phase) * 3;
      if (sx < -24 || sx > VIEW_W + 24 || sy < -24 || sy > VIEW_H + 24) continue;
      this.drawCoin(ctx, sx, sy, c.phase);
    }

    // 5. Gold Bullion Bars
    for (const g of game.golds) {
      this.drawGoldItem(ctx, game, g);
    }

    // 6. Fighters
    const wantedId = game.getWantedId();
    this.drawFighter(ctx, game, game.fighters[1], jx, jy, wantedId === 'p2');
    this.drawFighter(ctx, game, game.fighters[0], jx, jy, wantedId === 'p1');

    // 7. Projectiles (bullets, sniper rounds, spinning dynamite)
    for (const b of game.projectiles) {
      const sx = this.worldToScreenX(game, b.x);
      const sy = b.y - game.camY;
      if (sx < -28 || sx > VIEW_W + 28 || sy < -28 || sy > VIEW_H + 28) continue;
      ctx.save();
      ctx.translate(sx, sy);
      if (b.kind === 'dynamite') {
        ctx.rotate(b.spin);
        ctx.fillStyle = '#c43727';
        ctx.strokeStyle = INK;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.roundRect(-8, -3.5, 16, 7, 2);
        ctx.fill();
        ctx.stroke();
        // Sparking fuse
        ctx.strokeStyle = '#f5d259';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(8, 0);
        ctx.lineTo(12, -3);
        ctx.stroke();
        ctx.fillStyle = '#ffef9e';
        ctx.beginPath();
        ctx.arc(12.5, -3.5, 2.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (b.kind === 'sniper') {
        ctx.strokeStyle = '#fff5c4';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(-Math.sign(b.vx) * 22, 0);
        ctx.lineTo(0, 0);
        ctx.stroke();
        ctx.fillStyle = '#f5c249';
        ctx.strokeStyle = INK;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.ellipse(0, 0, 9, 3.2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.fillStyle = b.owner === 'p1' ? '#f5c249' : '#d6dfe8';
        ctx.strokeStyle = INK;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.ellipse(0, 0, b.radius * 1.45, b.radius * 0.85, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    }

    // 8. Explosions
    for (const ex of game.explosions) {
      const sx = this.worldToScreenX(game, ex.x);
      const sy = ex.y - game.camY;
      const t = 1 - ex.life / ex.maxLife;
      const r = ex.radius * (0.45 + t * 0.65);
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - t);
      ctx.fillStyle = '#f49b36';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#fff2b2';
      ctx.beginPath();
      ctx.arc(sx, sy, r * 0.55, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 9. Particles
    for (const pt of game.particles) {
      const sx = this.worldToScreenX(game, pt.x);
      const sy = pt.y - game.camY;
      if (sx < -20 || sx > VIEW_W + 20 || sy < -20 || sy > VIEW_H + 20) continue;
      const alpha = Math.max(0, Math.min(1, pt.life / pt.maxLife));
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = pt.color;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1;
      if (pt.kind === 'gold') {
        ctx.fillRect(sx - pt.size * 0.6, sy - pt.size * 0.35, pt.size * 1.2, pt.size * 0.7);
        ctx.strokeRect(sx - pt.size * 0.6, sy - pt.size * 0.35, pt.size * 1.2, pt.size * 0.7);
      } else {
        ctx.beginPath();
        ctx.arc(sx, sy, pt.size * (0.4 + alpha * 0.6), 0, Math.PI * 2);
        ctx.fill();
        if (pt.kind === 'smoke' || pt.kind === 'dust' || pt.kind === 'fire') ctx.stroke();
      }
      ctx.restore();
    }

    // 10. Paper vignette
    this.drawVignette(ctx);

    // 11. DS off-screen indicators & mini-radar
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
      ctx.beginPath();
      ctx.rect(sx - 2, sy - 8, p.w + 4, visualH + 14);
      ctx.clip();

      const segW = p.style === 'mesa' ? 148 : p.style === 'bridge' ? 124 : 128;
      const count = Math.max(1, Math.round(p.w / segW));
      const actualSegW = p.w / count;
      const topOffset = p.style === 'mesa' ? -5 : p.style === 'wood' ? -6 : -3;

      for (let i = 0; i < count; i++) {
        const dx = sx + i * actualSegW;
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

  private drawTnt(ctx: CanvasRenderingContext2D, game: GameEngine, t: TntBarrel): void {
    const sy = t.y + t.h - game.camY;
    if (sy < -48 || sy > VIEW_H + 48) return;
    const spark = Math.sin(game.time * 24) * 1.5;

    for (let shift = -WORLD_W; shift <= WORLD_W; shift += WORLD_W) {
      const sx = t.x + t.w * 0.5 + shift - game.camX;
      if (sx < -40 || sx > VIEW_W + 40) continue;

      ctx.save();
      ctx.translate(sx, sy);
      if (this.propTntReady) {
        ctx.drawImage(this.propTnt, -18, -42, 36, 44);
      } else {
        // Red western TNT keg
        ctx.fillStyle = '#b93828';
        ctx.strokeStyle = INK;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(-14, -34, 28, 34, 6);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#f4e4c1';
        ctx.fillRect(-13, -22, 26, 11);
        ctx.strokeRect(-13, -22, 26, 11);
        ctx.fillStyle = INK;
        ctx.font = 'bold 8.5px Georgia, serif';
        ctx.textAlign = 'center';
        ctx.fillText('TNT', 0, -13.5);
        ctx.fillStyle = '#ffdf6b';
        ctx.beginPath();
        ctx.arc(9, -39 + spark * 0.4, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  private drawCrate(ctx: CanvasRenderingContext2D, game: GameEngine, cr: WeaponCrate): void {
    const sy = cr.y + cr.h - game.camY;
    if (sy < -48 || sy > VIEW_H + 48) return;
    const pulse = 1 + Math.sin(cr.bobPhase) * 0.04;

    for (let shift = -WORLD_W; shift <= WORLD_W; shift += WORLD_W) {
      const sx = cr.x + cr.w * 0.5 + shift - game.camX;
      if (sx < -40 || sx > VIEW_W + 40) continue;

      ctx.save();
      ctx.translate(sx, sy);
      ctx.scale(pulse, pulse);
      if (this.propCrateReady) {
        ctx.drawImage(this.propCrate, -18, -36, 36, 36);
      } else {
        ctx.fillStyle = '#b9874c';
        ctx.strokeStyle = INK;
        ctx.lineWidth = 2;
        ctx.fillRect(-14, -30, 28, 30);
        ctx.strokeRect(-14, -30, 28, 30);
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

  private drawGoldItem(ctx: CanvasRenderingContext2D, game: GameEngine, g: GoldItem): void {
    const sx = this.worldToScreenX(game, g.x);
    const sy = g.y - game.camY + (g.dropped ? 0 : Math.sin(g.bobPhase) * 4.5);
    if (sx < -36 || sx > VIEW_W + 36 || sy < -36 || sy > VIEW_H + 36) return;

    ctx.save();
    ctx.translate(sx, sy);

    const pulse = 1 + Math.sin(g.bobPhase * 1.4) * 0.08;
    ctx.strokeStyle = 'rgba(218, 152, 34, 0.55)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, g.radius * 1.35 * pulse, 0, Math.PI * 2);
    ctx.stroke();

    ctx.scale(pulse, pulse);
    if (this.propGoldReady) {
      ctx.drawImage(this.propGold, -22, -17, 44, 34);
    } else {
      this.drawGoldIngot(ctx, -6, 4, 0.78);
      this.drawGoldIngot(ctx, 6, 4, 0.78);
      this.drawGoldIngot(ctx, 0, -4, 0.85);
    }
    ctx.restore();
  }

  private drawGoldIngot(ctx: CanvasRenderingContext2D, cx: number, cy: number, scale = 1): void {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    ctx.fillStyle = '#f2be3d';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-12, 6);
    ctx.lineTo(-8, -6);
    ctx.lineTo(8, -6);
    ctx.lineTo(12, 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Top gleam facet
    ctx.fillStyle = '#ffdf7e';
    ctx.beginPath();
    ctx.moveTo(-8, -6);
    ctx.lineTo(8, -6);
    ctx.lineTo(6, -1);
    ctx.lineTo(-6, -1);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  private drawFighter(
    ctx: CanvasRenderingContext2D,
    game: GameEngine,
    f: Fighter,
    jx: number,
    jy: number,
    isWanted: boolean
  ): void {
    if (f.respawnTimer > 0) return;

    const sx = this.worldToScreenX(game, f.x);
    const sy = f.y - game.camY;
    if (sx < -48 || sx > VIEW_W + 48 || sy < -48 || sy > VIEW_H + 48) return;

    if (f.invulnTimer > 0 && Math.floor(f.invulnTimer * 18) % 2 === 0) return;

    const isP1 = f.id === 'p1';
    const sheet = isP1 ? this.p1Sheet : this.p2Sheet;
    const ready = isP1 ? this.p1Ready : this.p2Ready;

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
    }

    ctx.save();
    ctx.translate(sx, sy + f.h * 0.5);

    if (f.onGround) {
      ctx.fillStyle = 'rgba(43, 32, 22, 0.24)';
      ctx.beginPath();
      ctx.ellipse(0, -1, 14, 3.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // HP pips right under character feet (minimal, zero clutter)
    const pipW = 6;
    const pipGap = 3;
    const totalW = f.maxHp * pipW + (f.maxHp - 1) * pipGap;
    for (let i = 0; i < f.maxHp; i++) {
      const px = -totalW * 0.5 + i * (pipW + pipGap);
      ctx.fillStyle = i < f.hp ? (isP1 ? '#c43e2d' : '#3d5f8a') : 'rgba(43, 32, 22, 0.2)';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1;
      ctx.fillRect(px, 3, pipW, 3.5);
      ctx.strokeRect(px, 3, pipW, 3.5);
    }

    // WANTED ribbon above leading fighter
    if (isWanted) {
      ctx.fillStyle = '#b23b2a';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.roundRect(-22, -62, 44, 12, 3);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#fdf0d0';
      ctx.font = 'bold 7.5px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText('WANTED', 0, -53.5);
    }

    ctx.scale(f.facing * f.squashX, f.squashY);

    // Sheriff Armor golden ring + badge icon
    if (f.armorHits > 0) {
      ctx.save();
      ctx.strokeStyle = '#f2be3d';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.ellipse(0, -24, 24, 28, 0, 0, Math.PI * 2);
      ctx.stroke();
      if (this.propBadgeReady) {
        ctx.drawImage(this.propBadge, 10, -46, 18, 18);
      }
      ctx.restore();
    } else if (f.weapon !== 'revolver') {
      ctx.save();
      ctx.strokeStyle = f.weapon === 'dynamite' ? '#d9532f' : f.weapon === 'sniper' ? '#3d6e8f' : '#e8a825';
      ctx.lineWidth = 1.8;
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

      if (f.muzzleTimer > 0 && f.weapon !== 'dynamite') {
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
      ctx.fillStyle = isP1 ? '#b23b2a' : '#354f70';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2;
      ctx.fillRect(-10, -34, 20, 34);
      ctx.strokeRect(-10, -34, 20, 34);
    }

    ctx.restore();
  }

  private drawOffscreenIndicators(ctx: CanvasRenderingContext2D, game: GameEngine): void {
    const me = game.localPlayer === 'p1' ? game.fighters[0] : game.fighters[1];
    const rival = game.localPlayer === 'p1' ? game.fighters[1] : game.fighters[0];
    const rivalColor = rival.id === 'p1' ? '#b23b2a' : '#354f70';

    const targetGold = game.golds[0];
    if (targetGold) {
      this.drawEdgePointer(ctx, game, targetGold.x, targetGold.y, 'gold', '#f2b830');
    }

    if (
      rival.respawnTimer <= 0 &&
      (Math.abs(wrapDeltaX(me.x, rival.x)) > VIEW_W * 0.45 || Math.abs(rival.y - me.y) > VIEW_H * 0.45)
    ) {
      this.drawEdgePointer(ctx, game, rival.x, rival.y, 'rival', rivalColor);
    }
  }

  private drawEdgePointer(
    ctx: CanvasRenderingContext2D,
    game: GameEngine,
    wx: number,
    wy: number,
    kind: 'gold' | 'rival',
    color: string
  ): void {
    const sx = this.worldToScreenX(game, wx);
    const sy = wy - game.camY;
    const pad = 22;

    if (sx >= pad && sx <= VIEW_W - pad && sy >= pad && sy <= VIEW_H - pad) return;

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
    const py = Math.max(38, Math.min(VIEW_H - 36, cy + dy * scale));

    ctx.save();
    ctx.translate(px, py);

    ctx.save();
    ctx.rotate(ang);
    ctx.fillStyle = color;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(15, 0);
    ctx.lineTo(6, -6);
    ctx.lineTo(6, 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    if (kind === 'gold') {
      this.drawGoldIngot(ctx, -3, 0, 0.58);
    } else {
      ctx.fillStyle = color;
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
    ctx.fillStyle = 'rgba(232, 215, 183, 0.8)';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(rx, ry, rw, rh, 4);
    ctx.fill();
    ctx.stroke();

    const sx = rw / WORLD_W;
    const sy = rh / WORLD_H;

    ctx.fillStyle = 'rgba(72, 50, 28, 0.35)';
    for (const p of game.platforms) {
      ctx.fillRect(rx + p.x * sx, ry + p.y * sy, Math.max(2, p.w * sx), Math.max(1.5, p.h * sy));
    }

    // Viewport frame
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

    // Gold Bars on radar
    for (const g of game.golds) {
      ctx.fillStyle = '#f2be3d';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1;
      ctx.fillRect(rx + g.x * sx - 3, ry + g.y * sy - 2, 6, 4);
      ctx.strokeRect(rx + g.x * sx - 3, ry + g.y * sy - 2, 6, 4);
    }

    // Rival & Player dots (bright white ring highlights local player)
    const [p1, p2] = game.fighters;
    for (const f of [p2, p1]) {
      if (f.respawnTimer > 0) continue;
      const isMe = f.id === game.localPlayer;
      ctx.fillStyle = f.id === 'p1' ? '#b23b2a' : '#354f70';
      ctx.beginPath();
      ctx.arc(rx + f.x * sx, ry + f.y * sy, isMe ? 3.3 : 2.7, 0, Math.PI * 2);
      ctx.fill();
      if (isMe) {
        ctx.strokeStyle = '#fff5dc';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
    }

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
