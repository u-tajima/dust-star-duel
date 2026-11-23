import { sound } from './audio';
import { COINS_FOR_POWERUP, STAGES, VIEW_H, VIEW_W, WIN_STARS, WORLD_H, WORLD_W } from './stages';
import type {
  Bullet,
  CoinItem,
  Fighter,
  GameMode,
  InputState,
  Particle,
  Platform,
  PowerUpType,
  SpringBarrel,
  StarItem,
} from './types';

const GRAVITY = 1480;
const MAX_FALL = 760;
const MOVE_SPEED = 275;
const GROUND_ACCEL = 2500;
const AIR_ACCEL = 1850;
const FRICTION = 2200;
const JUMP_VEL = 575;
const SPURS_JUMP_VEL = 680;
const BULLET_SPEED = 560;

export function wrapX(x: number): number {
  let r = x % WORLD_W;
  if (r < 0) r += WORLD_W;
  return r;
}

export function wrapDeltaX(from: number, to: number): number {
  let d = to - from;
  if (d > WORLD_W / 2) d -= WORLD_W;
  if (d < -WORLD_W / 2) d += WORLD_W;
  return d;
}

export class GameEngine {
  public mode: GameMode = 'title';
  public stageIndex = 0;
  public time = 0;
  public hitstop = 0;
  public shakeTimer = 0;
  public shakePower = 0;
  public winner: 'p1' | 'p2' | null = null;

  // Player-centered scrolling camera (DS Mario vs Luigi style)
  public camX = 0;
  public camY = 0;

  public platforms: Platform[] = [];
  public springs: SpringBarrel[] = [];
  public fighters: [Fighter, Fighter];
  public bullets: Bullet[] = [];
  public stars: StarItem[] = [];
  public coins: CoinItem[] = [];
  public particles: Particle[] = [];

  private starRespawnTimer = 0;
  private coinRespawnTimer = 0;
  private lastStarSpawnIdx = -1;
  private aiDecisionTimer = 0;
  private aiJumpHold = 0;

  constructor() {
    this.fighters = [this.createFighter('p1', 200, 600), this.createFighter('p2', 900, 600)];
    this.loadStage(0);
  }

  private createFighter(id: 'p1' | 'p2', x: number, y: number): Fighter {
    return {
      id,
      x,
      y,
      vx: 0,
      vy: 0,
      w: 24,
      h: 36,
      facing: id === 'p1' ? 1 : -1,
      onGround: false,
      coyoteTimer: 0,
      jumpBufferTimer: 0,
      shootCooldown: 0,
      invulnTimer: 0,
      stunTimer: 0,
      stars: 0,
      coins: 0,
      powerUp: 'none',
      powerTimer: 0,
      animTime: 0,
      squashX: 1,
      squashY: 1,
      muzzleTimer: 0,
      shootPoseTimer: 0,
    };
  }

  public loadStage(index: number): void {
    this.stageIndex = index % STAGES.length;
    const def = STAGES[this.stageIndex];

    this.platforms = def.platforms.map((p) => ({
      ...p,
      baseX: p.x,
      baseY: p.y,
    }));
    this.springs = def.springs.map((s) => ({
      ...s,
      bounceTimer: 0,
    }));

    this.fighters = [
      this.createFighter('p1', def.p1Spawn.x, def.p1Spawn.y),
      this.createFighter('p2', def.p2Spawn.x, def.p2Spawn.y),
    ];

    this.bullets = [];
    this.stars = [];
    this.particles = [];
    this.coins = def.coinSpawns.map((c, idx) => ({
      x: c.x,
      y: c.y,
      phase: idx * 0.7,
      collected: false,
    }));

    this.time = 0;
    this.hitstop = 0;
    this.shakeTimer = 0;
    this.winner = null;
    this.starRespawnTimer = 0.5;
    this.coinRespawnTimer = 0;
    this.lastStarSpawnIdx = -1;

    // Snap camera to P1
    this.camX = wrapX(this.fighters[0].x - VIEW_W * 0.5);
    this.camY = Math.max(0, Math.min(WORLD_H - VIEW_H, this.fighters[0].y - VIEW_H * 0.58));
  }

  public startMatch(stageIdx = this.stageIndex): void {
    this.loadStage(stageIdx);
    this.mode = 'playing';
    this.spawnMainStar();
  }

  private spawnMainStar(): void {
    const def = STAGES[this.stageIndex];
    let idx = Math.floor(Math.random() * def.starSpawns.length);
    if (idx === this.lastStarSpawnIdx && def.starSpawns.length > 1) {
      idx = (idx + 1) % def.starSpawns.length;
    }
    this.lastStarSpawnIdx = idx;
    const pt = def.starSpawns[idx];
    this.stars.push({
      x: pt.x,
      y: pt.y,
      vx: 0,
      vy: 0,
      radius: 15,
      dropped: false,
      pickupDelay: 0,
      bobPhase: 0,
      life: 999,
    });
    this.burstParticles(pt.x, pt.y, 12, 'star', '#e6a82e');
  }

  public update(dt: number, p1Input: InputState): void {
    const clampedDt = Math.min(dt, 0.04);

    if (this.mode !== 'playing') {
      // Gentle attract camera pan on title
      this.time += clampedDt;
      if (this.mode === 'title') {
        this.camX = wrapX(this.camX + clampedDt * 24);
        this.camY = WORLD_H - VIEW_H - 90;
      }
      this.updateParticles(clampedDt);
      return;
    }

    if (this.hitstop > 0) {
      this.hitstop = Math.max(0, this.hitstop - clampedDt);
      this.shakeTimer = Math.max(0, this.shakeTimer - clampedDt);
      return;
    }

    this.time += clampedDt;
    this.shakeTimer = Math.max(0, this.shakeTimer - clampedDt);

    // 1. Update moving platforms
    for (const p of this.platforms) {
      if (p.moveAxis === 'x' && p.moveRange && p.moveSpeed) {
        p.x = wrapX(p.baseX + Math.sin(this.time * p.moveSpeed) * p.moveRange);
      } else if (p.moveAxis === 'y' && p.moveRange && p.moveSpeed) {
        p.y = p.baseY + Math.sin(this.time * p.moveSpeed) * p.moveRange;
      }
    }

    for (const s of this.springs) {
      if (s.bounceTimer > 0) s.bounceTimer = Math.max(0, s.bounceTimer - clampedDt);
    }

    // 2. Compute AI input for P2
    const p2Input = this.computeAI(clampedDt);

    // 3. Update fighters
    this.updateFighter(this.fighters[0], p1Input, clampedDt);
    this.updateFighter(this.fighters[1], p2Input, clampedDt);

    // 4. Fighter vs Fighter stomp & bump
    this.resolveFighterDuel();

    // 5. Update bullets
    this.updateBullets(clampedDt);

    // 6. Update stars & coins
    this.updateStars(clampedDt);
    this.updateCoins(clampedDt);

    // 7. Update particles
    this.updateParticles(clampedDt);

    // 8. Smoothly follow Player 1 with slight look-ahead
    const p1 = this.fighters[0];
    const targetCamX = wrapX(p1.x + p1.facing * 42 - VIEW_W * 0.5);
    const camDx = wrapDeltaX(this.camX, targetCamX);
    this.camX = wrapX(this.camX + camDx * Math.min(1, clampedDt * 8.5));

    const targetCamY = Math.max(0, Math.min(WORLD_H - VIEW_H, p1.y - VIEW_H * 0.56));
    this.camY += (targetCamY - this.camY) * Math.min(1, clampedDt * 7.5);
  }

  private updateFighter(f: Fighter, input: InputState, dt: number): void {
    f.animTime += dt;
    f.squashX += (1 - f.squashX) * Math.min(1, dt * 14);
    f.squashY += (1 - f.squashY) * Math.min(1, dt * 14);

    if (f.shootCooldown > 0) f.shootCooldown = Math.max(0, f.shootCooldown - dt);
    if (f.invulnTimer > 0) f.invulnTimer = Math.max(0, f.invulnTimer - dt);
    if (f.stunTimer > 0) f.stunTimer = Math.max(0, f.stunTimer - dt);
    if (f.muzzleTimer > 0) f.muzzleTimer = Math.max(0, f.muzzleTimer - dt);
    if (f.shootPoseTimer > 0) f.shootPoseTimer = Math.max(0, f.shootPoseTimer - dt);
    if (f.powerTimer > 0) {
      f.powerTimer = Math.max(0, f.powerTimer - dt);
      if (f.powerTimer === 0) f.powerUp = 'none';
    }

    if (f.onGround) {
      f.coyoteTimer = 0.13;
    } else {
      f.coyoteTimer = Math.max(0, f.coyoteTimer - dt);
    }

    if (input.jumpPressed) {
      f.jumpBufferTimer = 0.14;
    } else {
      f.jumpBufferTimer = Math.max(0, f.jumpBufferTimer - dt);
    }

    // Horizontal movement
    if (f.stunTimer <= 0) {
      const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
      if (dir !== 0) {
        f.facing = dir as 1 | -1;
        const accel = f.onGround ? GROUND_ACCEL : AIR_ACCEL;
        f.vx += dir * accel * dt;
        if (Math.abs(f.vx) > MOVE_SPEED) {
          f.vx = Math.sign(f.vx) * MOVE_SPEED;
        }
      } else {
        const decel = f.onGround ? FRICTION : FRICTION * 0.35;
        if (Math.abs(f.vx) <= decel * dt) {
          f.vx = 0;
        } else {
          f.vx -= Math.sign(f.vx) * decel * dt;
        }
      }

      // Jump with coyote + buffer
      if (f.jumpBufferTimer > 0 && f.coyoteTimer > 0) {
        const jumpPower = f.powerUp === 'spurs' ? SPURS_JUMP_VEL : JUMP_VEL;
        f.vy = -jumpPower;
        f.onGround = false;
        f.coyoteTimer = 0;
        f.jumpBufferTimer = 0;
        f.squashX = 0.8;
        f.squashY = 1.24;
        if (f.id === 'p1') sound.playJump();
        this.burstParticles(f.x, f.y + f.h * 0.5, 5, 'dust', '#b89f74');
      }

      // Variable jump cut
      if (!input.jump && f.vy < -220) {
        f.vy *= 0.86;
      }

      // Shoot revolver
      if (input.shoot && f.shootCooldown <= 0) {
        this.fireWeapon(f);
      }
    } else {
      f.vx *= Math.pow(0.25, dt);
    }

    // Gravity
    f.vy = Math.min(MAX_FALL, f.vy + GRAVITY * dt);

    const prevBottom = f.y + f.h * 0.5;

    // Integrate & wrap X
    f.x = wrapX(f.x + f.vx * dt);
    f.y += f.vy * dt;

    // Vertical ceiling clamp
    if (f.y - f.h * 0.5 < 16) {
      f.y = 16 + f.h * 0.5;
      if (f.vy < 0) f.vy = 0;
    }

    // Platform landing collisions
    const wasOnGround = f.onGround;
    f.onGround = false;
    const newBottom = f.y + f.h * 0.5;

    if (f.vy >= 0) {
      for (const p of this.platforms) {
        if (this.overlapsPlatformX(f.x, f.w * 0.8, p)) {
          if (prevBottom <= p.y + 12 && newBottom >= p.y) {
            f.y = p.y - f.h * 0.5;
            f.vy = 0;
            f.onGround = true;
            if (!wasOnGround) {
              f.squashX = 1.22;
              f.squashY = 0.8;
              this.burstParticles(f.x, p.y, 4, 'dust', '#bda478');
            }
            break;
          }
        }
      }
    }

    // Spring barrel collisions
    for (const s of this.springs) {
      const dx = Math.abs(wrapDeltaX(f.x, s.x + s.w * 0.5));
      if (dx < (f.w + s.w) * 0.45 && f.y + f.h * 0.5 >= s.y && f.y - f.h * 0.5 <= s.y + s.h) {
        f.vy = -s.power;
        f.onGround = false;
        f.squashX = 0.72;
        f.squashY = 1.32;
        s.bounceTimer = 0.25;
        if (f.id === 'p1') sound.playSpring();
        this.burstParticles(s.x + s.w * 0.5, s.y, 8, 'dust', '#d4b885');
      }
    }

    // Pit wrap (like classic Mario Bros / Mario vs Luigi: drop from sky)
    if (f.y - f.h * 0.5 > WORLD_H + 30) {
      f.y = 32;
      f.vy = 120;
    }
  }

  private overlapsPlatformX(cx: number, width: number, p: Platform): boolean {
    if (p.w >= WORLD_W) return true;
    const half = width * 0.5;
    for (let shift = -WORLD_W; shift <= WORLD_W; shift += WORLD_W) {
      const left = p.x + shift;
      const right = left + p.w;
      if (cx + half > left && cx - half < right) {
        return true;
      }
    }
    return false;
  }

  private fireWeapon(f: Fighter): void {
    const isRapid = f.powerUp === 'rapid';
    const isSpread = f.powerUp === 'spread';
    f.shootCooldown = isRapid ? 0.14 : 0.27;
    f.muzzleTimer = 0.08;
    f.shootPoseTimer = 0.22;

    const muzzleX = wrapX(f.x + f.facing * 24);
    const muzzleY = f.y - 4;

    const angles = isSpread ? [-0.18, 0, 0.18] : [0];
    for (const a of angles) {
      this.bullets.push({
        owner: f.id,
        x: muzzleX,
        y: muzzleY,
        vx: Math.cos(a) * BULLET_SPEED * f.facing,
        vy: Math.sin(a) * BULLET_SPEED,
        life: 0.78,
        radius: 4.5,
      });
    }

    // Slight recoil kick
    f.vx -= f.facing * 26;
    if (f.id === 'p1') sound.playShoot(isSpread);
    this.burstParticles(muzzleX, muzzleY, 4, 'smoke', '#594836');
  }

  private resolveFighterDuel(): void {
    const [p1, p2] = this.fighters;
    const dx = wrapDeltaX(p1.x, p2.x);
    const dy = p2.y - p1.y;
    const overlapX = Math.abs(dx) < (p1.w + p2.w) * 0.52;
    const overlapY = Math.abs(dy) < (p1.h + p2.h) * 0.52;

    if (!overlapX || !overlapY) return;

    // Check stomp: attacker falling and significantly above defender
    if (p1.vy > 80 && dy > 12 && p2.invulnTimer <= 0) {
      p1.vy = -460;
      p1.squashX = 1.2;
      p1.squashY = 0.82;
      this.hitFighter(p2, Math.sign(dx) || 1);
      return;
    }
    if (p2.vy > 80 && dy < -12 && p1.invulnTimer <= 0) {
      p2.vy = -460;
      p2.squashX = 1.2;
      p2.squashY = 0.82;
      this.hitFighter(p1, -Math.sign(dx) || -1);
      return;
    }

    // Gentle body separation
    const push = dx >= 0 ? -1 : 1;
    p1.vx += push * 75;
    p2.vx -= push * 75;
  }

  private hitFighter(victim: Fighter, knockDir: number): void {
    victim.invulnTimer = 1.35;
    victim.stunTimer = 0.32;
    victim.vx = knockDir * 290;
    victim.vy = -290;
    victim.squashX = 1.35;
    victim.squashY = 0.68;

    this.hitstop = 0.045;
    this.shakeTimer = 0.22;
    this.shakePower = 6;
    sound.playHit();
    this.burstParticles(victim.x, victim.y, 12, 'spark', '#3c2b1e');

    // Mario vs Luigi core mechanic: knock 1 Star loose!
    if (victim.stars > 0) {
      victim.stars -= 1;
      this.stars.push({
        x: victim.x,
        y: victim.y - 18,
        vx: -knockDir * (140 + Math.random() * 80),
        vy: -380,
        radius: 14,
        dropped: true,
        pickupDelay: 0.45,
        bobPhase: 0,
        life: 14,
      });
      this.burstParticles(victim.x, victim.y - 12, 10, 'star', '#e6a82e');
    }
  }

  private updateBullets(dt: number): void {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.life -= dt;
      b.x = wrapX(b.x + b.vx * dt);
      b.y += b.vy * dt;

      if (b.life <= 0 || b.y < 0 || b.y > WORLD_H) {
        this.bullets.splice(i, 1);
        continue;
      }

      // Hit opponent
      const target = b.owner === 'p1' ? this.fighters[1] : this.fighters[0];
      if (target.invulnTimer <= 0) {
        const dx = Math.abs(wrapDeltaX(b.x, target.x));
        const dy = Math.abs(b.y - target.y);
        if (dx < target.w * 0.55 + b.radius && dy < target.h * 0.52 + b.radius) {
          this.hitFighter(target, Math.sign(b.vx) || 1);
          this.bullets.splice(i, 1);
          continue;
        }
      }
    }
  }

  private updateStars(dt: number): void {
    let hasMainStar = false;

    for (let i = this.stars.length - 1; i >= 0; i--) {
      const st = this.stars[i];
      st.bobPhase += dt * 4.5;
      if (st.pickupDelay > 0) st.pickupDelay = Math.max(0, st.pickupDelay - dt);

      if (st.dropped) {
        st.life -= dt;
        st.vy = Math.min(MAX_FALL * 0.75, st.vy + GRAVITY * 0.75 * dt);
        st.x = wrapX(st.x + st.vx * dt);
        st.y += st.vy * dt;
        st.vx *= Math.pow(0.45, dt);

        // Bounce on platforms
        for (const p of this.platforms) {
          if (this.overlapsPlatformX(st.x, st.radius * 1.4, p)) {
            if (st.vy > 0 && st.y + st.radius >= p.y && st.y + st.radius <= p.y + 22) {
              st.y = p.y - st.radius;
              st.vy = Math.abs(st.vy) > 90 ? -st.vy * 0.58 : 0;
              break;
            }
          }
        }
        if (st.y > WORLD_H + 20) {
          st.y = 40;
          st.vy = 80;
        }
        if (st.life <= 0) {
          this.stars.splice(i, 1);
          continue;
        }
      } else {
        hasMainStar = true;
      }

      // Fighter collection
      if (st.pickupDelay <= 0) {
        for (const f of this.fighters) {
          const dx = Math.abs(wrapDeltaX(f.x, st.x));
          const dy = Math.abs(f.y - st.y);
          if (dx < f.w * 0.65 + st.radius && dy < f.h * 0.6 + st.radius) {
            f.stars += 1;
            sound.playStar();
            this.burstParticles(st.x, st.y, 18, 'star', '#f0b636');
            this.shakeTimer = 0.14;
            this.shakePower = 4;
            const wasMain = !st.dropped;
            this.stars.splice(i, 1);

            if (f.stars >= WIN_STARS) {
              this.mode = 'result';
              this.winner = f.id;
              sound.playWin(f.id === 'p1');
              return;
            }
            if (wasMain) {
              this.starRespawnTimer = 1.0;
            }
            break;
          }
        }
      }
    }

    if (!hasMainStar) {
      this.starRespawnTimer -= dt;
      if (this.starRespawnTimer <= 0) {
        this.spawnMainStar();
      }
    }
  }

  private updateCoins(dt: number): void {
    let remaining = 0;
    for (const c of this.coins) {
      if (c.collected) continue;
      remaining++;
      c.phase += dt * 4;

      for (const f of this.fighters) {
        const dx = Math.abs(wrapDeltaX(f.x, c.x));
        const dy = Math.abs(f.y - c.y);
        if (dx < 24 && dy < 28) {
          c.collected = true;
          f.coins += 1;
          if (f.id === 'p1') sound.playCoin();
          this.burstParticles(c.x, c.y, 6, 'spark', '#d99a26');

          if (f.coins >= COINS_FOR_POWERUP) {
            f.coins = 0;
            const pool: PowerUpType[] = ['spread', 'rapid', 'spurs'];
            f.powerUp = pool[Math.floor(Math.random() * pool.length)];
            f.powerTimer = 11;
            sound.playPowerUp();
            this.burstParticles(f.x, f.y, 14, 'star', '#d99a26');
          }
          break;
        }
      }
    }

    if (remaining <= 3) {
      this.coinRespawnTimer += dt;
      if (this.coinRespawnTimer >= 4.5) {
        this.coinRespawnTimer = 0;
        for (const c of this.coins) c.collected = false;
      }
    }
  }

  private computeAI(dt: number): InputState {
    const ai = this.fighters[1];
    const p1 = this.fighters[0];
    const out: InputState = {
      left: false,
      right: false,
      jump: false,
      jumpPressed: false,
      shoot: false,
    };

    this.aiDecisionTimer -= dt;
    if (this.aiJumpHold > 0) {
      this.aiJumpHold -= dt;
      out.jump = true;
    }

    // Choose target: dropped star > main star > closest coin
    let targetX = p1.x;
    let targetY = p1.y;

    const dropped = this.stars.find((s) => s.dropped && s.pickupDelay <= 0.15);
    const mainStar = this.stars.find((s) => !s.dropped);
    if (dropped) {
      targetX = dropped.x;
      targetY = dropped.y;
    } else if (mainStar) {
      targetX = mainStar.x;
      targetY = mainStar.y;
    }

    const dx = wrapDeltaX(ai.x, targetX);
    const dy = targetY - ai.y;

    if (dx > 16) out.right = true;
    else if (dx < -16) out.left = true;

    // Jump if target is higher or approaching gap/platform
    if (ai.onGround) {
      const wantsUp = dy < -45;
      const randomHop = this.aiDecisionTimer <= 0 && Math.random() < 0.25;
      if (wantsUp || randomHop) {
        out.jump = true;
        out.jumpPressed = true;
        this.aiJumpHold = 0.28;
        this.aiDecisionTimer = 0.42;
      }
    }

    // Shoot if rival is roughly aligned horizontally within range
    const rivalDx = wrapDeltaX(ai.x, p1.x);
    const rivalDy = Math.abs(p1.y - ai.y);
    if (Math.abs(rivalDx) < 310 && rivalDy < 44 && p1.invulnTimer <= 0) {
      if ((rivalDx > 0 && ai.facing === 1) || (rivalDx < 0 && ai.facing === -1)) {
        if (Math.random() < 0.12) out.shoot = true;
      } else if (Math.abs(rivalDx) < 180) {
        // Turn toward player to shoot
        out.left = rivalDx < 0;
        out.right = rivalDx > 0;
      }
    }

    return out;
  }

  private burstParticles(
    x: number,
    y: number,
    count: number,
    kind: Particle['kind'],
    color: string
  ): void {
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 45 + Math.random() * 145;
      this.particles.push({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 45,
        size: kind === 'star' ? 5 + Math.random() * 4 : 3 + Math.random() * 4,
        life: 0.28 + Math.random() * 0.28,
        maxLife: 0.56,
        kind,
        color,
      });
    }
  }

  private updateParticles(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.x = wrapX(p.x + p.vx * dt);
      p.y += p.vy * dt;
      p.vy += 260 * dt;
    }
  }
}
