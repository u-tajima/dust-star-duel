import { GameEngine, wrapDeltaX, wrapX } from './game';
import { STAGES, VIEW_H, VIEW_W, WORLD_H, WORLD_W } from './stages';
import type {
  Fighter,
  GoldItem,
  Platform,
  SpringBarrel,
  SteamTrain,
  TntBarrel,
  WarpDoor,
  WeaponCrate,
} from './types';

const INK = '#2b2016';
const PARCHMENT_BG = '#e8d7b7';
const SPRITE_CELL = 160;

export class SketchRenderer {
  private stageBgs: Record<string, { img: HTMLImageElement; ready: boolean }> = {};
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
  private tileBrickWall: HTMLImageElement;
  private tileBrickWallReady = false;
  private tileWoodWall: HTMLImageElement;
  private tileWoodWallReady = false;
  private tileRockWall: HTMLImageElement;
  private tileRockWallReady = false;
  private tileAwning: HTMLImageElement;
  private tileAwningReady = false;
  private propChandelier: HTMLImageElement;
  private propChandelierReady = false;
  private propDoor: HTMLImageElement;
  private propDoorReady = false;
  private propTrain: HTMLImageElement;
  private propTrainReady = false;
  private darkCanvas: HTMLCanvasElement;
  private darkCtx: CanvasRenderingContext2D;

  constructor() {
    this.darkCanvas = document.createElement('canvas');
    this.darkCanvas.width = VIEW_W;
    this.darkCanvas.height = VIEW_H;
    this.darkCtx = this.darkCanvas.getContext('2d')!;
    for (const st of STAGES) {
      const entry = { img: new Image(), ready: false };
      entry.img.onload = () => {
        entry.ready = true;
      };
      entry.img.src = st.bgSrc;
      this.stageBgs[st.id] = entry;
    }
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
    this.tileBrickWall = this.loadImg('./assets/tile-brick-wall.png', () => (this.tileBrickWallReady = true));
    this.tileWoodWall = this.loadImg('./assets/tile-wood-wall.png', () => (this.tileWoodWallReady = true));
    this.tileRockWall = this.loadImg('./assets/tile-rock-wall.png', () => (this.tileRockWallReady = true));
    this.tileAwning = this.loadImg('./assets/tile-awning.png', () => (this.tileAwningReady = true));
    this.propChandelier = this.loadImg('./assets/prop-chandelier.png', () => (this.propChandelierReady = true));
    this.propDoor = this.loadImg('./assets/prop-door.png', () => (this.propDoorReady = true));
    this.propTrain = this.loadImg('./assets/prop-train.png', () => (this.propTrainReady = true));
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

    // 3. Stage props: warp doors, steam trains, springs, TNT barrels, weapon crates
    for (const d of game.doors) this.drawDoor(ctx, game, d);
    for (const tr of game.trains) this.drawTrain(ctx, game, tr);
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

    // 8. Explosions & Flying Storm Debris
    for (const d of game.debris) {
      const sx = this.worldToScreenX(game, d.x);
      const sy = d.y - game.camY;
      if (sx < -32 || sx > VIEW_W + 32 || sy < -32 || sy > VIEW_H + 32) continue;
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(d.angle);
      if (d.kind === 'tumbleweed') {
        ctx.fillStyle = '#a87d44';
        ctx.strokeStyle = INK;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(0, 0, d.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Hand-drawn tangled twigs inside tumbleweed
        ctx.strokeStyle = '#47311a';
        ctx.lineWidth = 1.4;
        for (let k = 0; k < 5; k++) {
          const a = (k * Math.PI) / 2.5;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * -11, Math.sin(a) * -11);
          ctx.quadraticCurveTo(Math.cos(a + 1.2) * 8, Math.sin(a + 1.2) * 8, Math.cos(a) * 11, Math.sin(a) * 11);
          ctx.stroke();
        }
      } else if (d.kind === 'plank') {
        ctx.fillStyle = '#9e6b3a';
        ctx.strokeStyle = INK;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(-16, -4);
        ctx.lineTo(14, -5);
        ctx.lineTo(17, 1);
        ctx.lineTo(13, 5);
        ctx.lineTo(-15, 4);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // Nail dots
        ctx.fillStyle = INK;
        ctx.beginPath();
        ctx.arc(-10, 0, 1.4, 0, Math.PI * 2);
        ctx.arc(10, 0, 1.4, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Corrugated tin roof sheet
        ctx.fillStyle = '#9da4a8';
        ctx.strokeStyle = INK;
        ctx.lineWidth = 1.8;
        ctx.fillRect(-13, -9, 26, 18);
        ctx.strokeRect(-13, -9, 26, 18);
        ctx.strokeStyle = 'rgba(43, 32, 22, 0.45)';
        ctx.lineWidth = 1.2;
        for (let y = -5; y <= 5; y += 5) {
          ctx.beginPath();
          ctx.moveTo(-12, y);
          ctx.lineTo(12, y);
          ctx.stroke();
        }
      }
      ctx.restore();
    }

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

    // 10. Special stage environmental VFX (wind streaks & cavern lantern darkness)
    const stageDef = STAGES[game.stageIndex];
    const wind = game.getActiveWind();
    if (Math.abs(wind) > 10) {
      this.drawWindStreaks(ctx, game, wind);
    }
    if (stageDef.darkness && game.mode === 'playing') {
      this.drawCavernDarkness(ctx, game);
    }

    // 11. Paper vignette
    this.drawVignette(ctx);

    // 12. DS off-screen indicators & mini-radar
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

    const stageDef = STAGES[game.stageIndex];
    const bg = this.stageBgs[stageDef.id];
    if (bg && bg.ready) {
      const tileW = VIEW_W;
      const tileH = VIEW_H;
      const offsetX = -((game.camX * 0.25) % tileW);
      const offsetY = -((game.camY / Math.max(1, WORLD_H - VIEW_H)) * 28);

      ctx.save();
      ctx.globalAlpha = 0.72;
      for (let i = -1; i <= 1; i++) {
        ctx.drawImage(bg.img, offsetX + i * tileW, offsetY, tileW, tileH + 30);
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
    const visualH = p.style === 'bridge' ? Math.max(p.h + 14, 30) : p.h;

    if (sy + visualH < -24 || sy > VIEW_H + 24) return;

    for (let shift = -WORLD_W; shift <= WORLD_W; shift += WORLD_W) {
      const sx = p.x + shift - game.camX;
      if (sx + p.w < -24 || sx > VIEW_W + 24) continue;
      this.drawPlatformInstance(ctx, p, sx, sy, visualH, jx, jy);
    }
  }

  private drawTiledRect(
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    sx: number,
    sy: number,
    w: number,
    h: number,
    tileW: number,
    tileH: number
  ): void {
    ctx.save();
    ctx.beginPath();
    ctx.rect(sx, sy, w, h);
    ctx.clip();

    const cols = Math.ceil(w / tileW) + 1;
    const rows = Math.ceil(h / tileH) + 1;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        ctx.drawImage(img, sx + c * tileW, sy + r * tileH, tileW + 0.5, tileH + 0.5);
      }
    }
    ctx.restore();

    // Crisp Gunman Clive 2D ink outline flush with exact collision bounds
    ctx.save();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.strokeRect(sx, sy, w, h);
    ctx.strokeStyle = 'rgba(255, 245, 224, 0.35)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(sx + 1, sy + 1.5);
    ctx.lineTo(sx + w - 1, sy + 1.5);
    ctx.stroke();
    ctx.restore();
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
    // 1. Crumbling Storefront Awning (TOWN) — flat 2D seamless striped tile
    if (p.style === 'awning') {
      if (p.crumbleState === 'broken') {
        ctx.save();
        ctx.strokeStyle = 'rgba(43, 32, 22, 0.25)';
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(sx, sy, p.w, p.h);
        ctx.restore();
        return;
      }
      const shakeX = p.crumbleState === 'shaking' ? (Math.random() - 0.5) * 4.5 : 0;
      ctx.save();
      ctx.translate(shakeX, 0);
      if (this.tileAwningReady) {
        this.drawTiledRect(ctx, this.tileAwning, sx, sy, p.w, p.h + 4, 48, p.h + 4);
      } else {
        ctx.fillStyle = '#b24532';
        ctx.fillRect(sx, sy, p.w, p.h + 4);
        ctx.strokeStyle = INK;
        ctx.lineWidth = 2;
        ctx.strokeRect(sx, sy, p.w, p.h + 4);
      }
      ctx.restore();
      return;
    }

    // 2. Swaying Saloon Chandelier (SALOON)
    if (p.style === 'chandelier') {
      const cx = sx + p.w * 0.5;
      ctx.save();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.4;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(cx, -40);
      ctx.lineTo(cx, sy - 42);
      ctx.stroke();
      ctx.setLineDash([]);

      if (this.propChandelierReady) {
        ctx.drawImage(this.propChandelier, sx - 8, sy - 76, p.w + 16, 112);
      } else {
        ctx.fillStyle = '#c89638';
        ctx.strokeStyle = INK;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(sx, sy, p.w, 13, 4);
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
      return;
    }

    // 3. Solid cover pillars/walls — strictly flat 2D flush tiling (zero floating perspective!)
    if (p.solid) {
      const wallImg =
        p.style === 'brick'
          ? this.tileBrickWallReady
            ? this.tileBrickWall
            : null
          : p.style === 'mesa'
            ? this.tileRockWallReady
              ? this.tileRockWall
              : null
            : this.tileWoodWallReady
              ? this.tileWoodWall
              : null;

      if (wallImg) {
        const tw = p.style === 'mesa' ? 56 : Math.max(32, p.w);
        const th = p.style === 'mesa' ? 56 : 64;
        this.drawTiledRect(ctx, wallImg, sx, sy, p.w, p.h, tw, th);
        return;
      }

      ctx.save();
      ctx.fillStyle = p.style === 'brick' ? '#9f5e42' : p.style === 'mesa' ? '#bf905c' : '#8d6239';
      ctx.fillRect(sx, sy, p.w, p.h);
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.2;
      ctx.strokeRect(sx, sy, p.w, p.h);
      ctx.restore();
      return;
    }

    // 4. Railway X-truss bridge (transparent cutout beam)
    if (p.style === 'bridge' && this.tileBridgeReady) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(sx, sy, p.w, visualH);
      ctx.clip();
      const segW = 96;
      const count = Math.max(1, Math.ceil(p.w / segW));
      for (let i = 0; i < count; i++) {
        ctx.drawImage(this.tileBridge, sx + i * segW, sy, segW + 1, visualH);
      }
      // Animated conveyor chevrons when platform is an ore conveyor belt (MINE)
      if (p.conveyorSpeed) {
        const dir = Math.sign(p.conveyorSpeed);
        const shift = ((Date.now() * 0.06 * dir) % 24 + 24) % 24;
        ctx.strokeStyle = '#ffdf7e';
        ctx.lineWidth = 2;
        for (let x = sx + shift - 24; x < sx + p.w + 12; x += 24) {
          ctx.beginPath();
          ctx.moveTo(x - dir * 4, sy + 4);
          ctx.lineTo(x + dir * 3, sy + 8);
          ctx.lineTo(x - dir * 4, sy + 12);
          ctx.stroke();
        }
      }
      ctx.restore();
      return;
    }

    // 5. Flat 2D seamless horizontal tiles (mesa ground/ledges, wood decks, brick roofs)
    const img =
      p.style === 'mesa'
        ? this.tileMesaReady
          ? this.tileMesa
          : null
        : p.style === 'brick'
          ? this.tileBrickWallReady
            ? this.tileBrickWall
            : null
          : this.tileWoodReady
            ? this.tileWood
            : null;

    if (img) {
      const tileW = p.style === 'mesa' ? 96 : p.style === 'brick' ? 64 : 96;
      const tileH = p.style === 'mesa' ? Math.max(60, p.h) : Math.max(24, p.h);
      this.drawTiledRect(ctx, img, sx, sy, p.w, p.h, tileW, tileH);
      return;
    }

    ctx.save();
    ctx.fillStyle = '#a87948';
    ctx.fillRect(sx, sy, p.w, p.h);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.strokeRect(sx, sy, p.w, p.h);
    ctx.lineWidth = 1;
    ctx.strokeRect(sx + jx, sy + jy, p.w, p.h);
    ctx.restore();
  }

  private drawDoor(ctx: CanvasRenderingContext2D, game: GameEngine, d: WarpDoor): void {
    const sy = d.y - game.camY;
    if (sy + d.h < -24 || sy > VIEW_H + 24) return;
    const swing = d.swingTimer > 0 ? Math.sin((d.swingTimer / 0.45) * Math.PI) * 0.14 : 0;

    // Highlight door softly when local player is inside its generous release-to-warp zone
    const me = game.localPlayer === 'p1' ? game.fighters[0] : game.fighters[1];
    const inZone =
      me.respawnTimer <= 0 &&
      me.doorReady &&
      me.warpCooldown <= 0 &&
      Math.abs(wrapDeltaX(me.x, d.x + d.w * 0.5)) < 34 &&
      Math.abs(me.y - (d.y + d.h * 0.5)) < 40;

    for (let shift = -WORLD_W; shift <= WORLD_W; shift += WORLD_W) {
      const sx = d.x + shift - game.camX;
      if (sx + d.w < -24 || sx > VIEW_W + 24) continue;

      ctx.save();
      ctx.translate(sx + d.w * 0.5, sy + d.h);
      if (inZone) {
        ctx.save();
        ctx.strokeStyle = '#ffe285';
        ctx.lineWidth = 2.6;
        ctx.globalAlpha = 0.75 + Math.sin(game.time * 12) * 0.25;
        ctx.beginPath();
        ctx.roundRect(-d.w * 0.72, -d.h - 7, d.w * 1.44, d.h + 10, [14, 14, 2, 2]);
        ctx.stroke();
        ctx.restore();
      }
      ctx.scale(1 - swing, 1 + swing * 0.4);
      if (this.propDoorReady) {
        ctx.drawImage(this.propDoor, -d.w * 0.68, -d.h - 4, d.w * 1.36, d.h + 6);
      } else {
        ctx.fillStyle = '#332214';
        ctx.strokeStyle = INK;
        ctx.lineWidth = 2;
        ctx.fillRect(-d.w * 0.5, -d.h, d.w, d.h);
        ctx.strokeRect(-d.w * 0.5, -d.h, d.w, d.h);
      }
      // Subtle colored pair gem at top of arch so linked doors are unmistakable
      ctx.fillStyle = d.color;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(0, -d.h + 5, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }

  private drawTrain(ctx: CanvasRenderingContext2D, game: GameEngine, tr: SteamTrain): void {
    const sy = tr.y - game.camY;
    if (sy + tr.h < -40 || sy > VIEW_H + 40) return;

    for (let shift = -WORLD_W; shift <= WORLD_W; shift += WORLD_W) {
      const sx = tr.x + shift - game.camX;
      if (sx + tr.w < -48 || sx > VIEW_W + 48) continue;

      ctx.save();
      if (this.propTrainReady) {
        // Flip horizontally when speed >= 0 so locomotive faces its direction of travel!
        const bob = Math.sin(tr.wheelPhase * 2) * 1.2;
        ctx.translate(sx + tr.w * 0.5, sy + tr.h + bob);
        ctx.scale(tr.speed >= 0 ? -1 : 1, 1);
        ctx.drawImage(this.propTrain, -tr.w * 0.56, -tr.h - 26, tr.w * 1.12, tr.h + 28);
      } else {
        ctx.fillStyle = '#3d3834';
        ctx.strokeStyle = INK;
        ctx.lineWidth = 2.2;
        ctx.fillRect(sx, sy + 6, tr.w, tr.h - 14);
        ctx.strokeRect(sx, sy + 6, tr.w, tr.h - 14);
      }
      ctx.restore();
    }
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
    const rivalIsWanted = game.getWantedId() === rival.id;

    const targetGold = game.golds[0];
    if (targetGold) {
      this.drawEdgePointer(ctx, game, targetGold.x, targetGold.y, 'gold', '#f2b830');
    }

    // Only reveal off-screen rival direction when the rival is WANTED!
    if (
      rivalIsWanted &&
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

    // Moving steam trains on mini-radar
    ctx.fillStyle = '#4a3425';
    for (const tr of game.trains) {
      ctx.fillRect(rx + tr.x * sx, ry + tr.y * sy, Math.max(6, tr.w * sx), Math.max(2.5, tr.h * sy));
    }

    // Gold Bars on radar
    for (const g of game.golds) {
      ctx.fillStyle = '#f2be3d';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1;
      ctx.fillRect(rx + g.x * sx - 3, ry + g.y * sy - 2, 6, 4);
      ctx.strokeRect(rx + g.x * sx - 3, ry + g.y * sy - 2, 6, 4);
    }

    // Mini-radar dots: always show local player; only reveal rival when WANTED!
    const [p1, p2] = game.fighters;
    const wantedId = game.getWantedId();
    for (const f of [p2, p1]) {
      if (f.respawnTimer > 0) continue;
      const isMe = f.id === game.localPlayer;
      if (!isMe && wantedId !== f.id) continue;

      const fx = rx + f.x * sx;
      const fy = ry + f.y * sy;
      ctx.fillStyle = f.id === 'p1' ? '#b23b2a' : '#354f70';
      ctx.beginPath();
      ctx.arc(fx, fy, isMe ? 3.3 : 3.2, 0, Math.PI * 2);
      ctx.fill();
      if (isMe) {
        ctx.strokeStyle = '#fff5dc';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      } else {
        // Pulsing bounty ring for WANTED rival
        ctx.strokeStyle = '#f2be3d';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(fx, fy, 4.5 + Math.sin(game.time * 8) * 1.2, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  private drawWindStreaks(ctx: CanvasRenderingContext2D, game: GameEngine, wind: number): void {
    const dir = Math.sign(wind);
    const speed = Math.abs(wind) * 3.2;
    ctx.save();
    ctx.strokeStyle = 'rgba(248, 232, 198, 0.42)';
    ctx.lineWidth = 1.6;
    for (let i = 0; i < 16; i++) {
      const y = ((i * 53 + 17) % (VIEW_H - 24)) + 12;
      const len = 34 + (i % 4) * 18;
      const rawX = (i * 97 + game.time * speed * dir) % (VIEW_W + len * 2);
      const x = ((rawX + VIEW_W + len * 2) % (VIEW_W + len * 2)) - len;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + len * dir, y + (i % 2 === 0 ? 1.5 : -1.5));
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawCavernDarkness(ctx: CanvasRenderingContext2D, game: GameEngine): void {
    const dctx = this.darkCtx;
    dctx.globalCompositeOperation = 'source-over';
    dctx.fillStyle = 'rgba(18, 12, 7, 0.86)';
    dctx.fillRect(0, 0, VIEW_W, VIEW_H);

    // Punch warm lantern light holes using destination-out
    dctx.globalCompositeOperation = 'destination-out';
    const punch = (wx: number, wy: number, r: number) => {
      const sx = this.worldToScreenX(game, wx);
      const sy = wy - game.camY;
      if (sx < -r || sx > VIEW_W + r || sy < -r || sy > VIEW_H + r) return;
      const grad = dctx.createRadialGradient(sx, sy, r * 0.2, sx, sy, r);
      grad.addColorStop(0, 'rgba(0,0,0,1)');
      grad.addColorStop(0.65, 'rgba(0,0,0,0.75)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      dctx.fillStyle = grad;
      dctx.beginPath();
      dctx.arc(sx, sy, r, 0, Math.PI * 2);
      dctx.fill();
    };

    const me = game.localPlayer === 'p1' ? game.fighters[0] : game.fighters[1];
    if (me.respawnTimer <= 0) punch(me.x, me.y - 6, 138);

    // Muzzle flashes & WANTED rival reveal light in the dark!
    const wantedId = game.getWantedId();
    for (const f of game.fighters) {
      if (f.respawnTimer > 0) continue;
      if (f.muzzleTimer > 0) punch(f.x + f.facing * 22, f.y - 4, 100);
      if (f.id === wantedId && f.id !== game.localPlayer) punch(f.x, f.y, 72);
    }

    for (const g of game.golds) punch(g.x, g.y, 76);
    for (const ex of game.explosions) punch(ex.x, ex.y, ex.radius * 1.9);

    ctx.drawImage(this.darkCanvas, 0, 0);
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
