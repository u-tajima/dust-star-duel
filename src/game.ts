import { sound } from './audio';
import { COINS_FOR_GEAR, MAX_HP, STAGES, VIEW_H, VIEW_W, WORLD_H, WORLD_W } from './stages';
import type {
  CoinItem,
  Explosion,
  Fighter,
  GameMode,
  GoldItem,
  InputState,
  MatchRules,
  Particle,
  Platform,
  Projectile,
  SpringBarrel,
  SteamTrain,
  TntBarrel,
  WarpDoor,
  WeaponCrate,
} from './types';

const GRAVITY = 1480;
const MAX_FALL = 760;
const MOVE_SPEED = 275;
const GROUND_ACCEL = 2500;
const AIR_ACCEL = 1850;
const FRICTION = 2200;
const JUMP_VEL = 575;
const BULLET_SPEED = 560;
const SNIPER_SPEED = 900;

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
  public rules: MatchRules = { targetGold: 5, maxLives: 3 };
  public time = 0;
  public hitstop = 0;
  public shakeTimer = 0;
  public shakePower = 0;
  public winner: 'p1' | 'p2' | null = null;
  public winReason: 'gold' | 'ko' = 'gold';
  public localPlayer: 'p1' | 'p2' = 'p1';

  // Local-player-centered scrolling camera (DS Mario vs Luigi style)
  public camX = 0;
  public camY = 0;

  public platforms: Platform[] = [];
  public springs: SpringBarrel[] = [];
  public doors: WarpDoor[] = [];
  public train: SteamTrain | null = null;
  public tnts: TntBarrel[] = [];
  public crates: WeaponCrate[] = [];
  public fighters: [Fighter, Fighter];
  public projectiles: Projectile[] = [];
  public explosions: Explosion[] = [];
  public golds: GoldItem[] = [];
  public coins: CoinItem[] = [];
  public particles: Particle[] = [];

  private goldRespawnTimer = 0;
  private coinRespawnTimer = 0;
  private lastGoldSpawnIdx = -1;
  private aiDecisionTimer = 0;
  private aiJumpHold = 0;
  private aiStuckTimer = 0;
  private aiLastX = 0;
  private aiLastY = 0;
  private aiEscapeTimer = 0;
  private aiEscapeDir: 1 | -1 = 1;

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
      respawnTimer: 0,
      warpCooldown: 0,
      hp: MAX_HP,
      maxHp: MAX_HP,
      lives: this.rules.maxLives === 0 ? -1 : this.rules.maxLives,
      gold: 0,
      coins: 0,
      weapon: 'revolver',
      weaponTimer: 0,
      armorHits: 0,
      armorTimer: 0,
      animTime: 0,
      squashX: 1,
      squashY: 1,
      muzzleTimer: 0,
      shootPoseTimer: 0,
    };
  }

  public getWantedId(): 'p1' | 'p2' | null {
    const [p1, p2] = this.fighters;
    if (p1.gold >= 2 && p1.gold > p2.gold) return 'p1';
    if (p2.gold >= 2 && p2.gold > p1.gold) return 'p2';
    return null;
  }

  public loadStage(index: number): void {
    this.stageIndex = index % STAGES.length;
    const def = STAGES[this.stageIndex];

    this.platforms = def.platforms.map((p) => ({
      ...p,
      baseX: p.x,
      baseY: p.y,
      crumbleState: p.crumble ? 'intact' : undefined,
      crumbleTimer: 0,
    }));
    this.springs = def.springs.map((s) => ({
      ...s,
      bounceTimer: 0,
    }));
    this.doors = def.doors.map((d) => ({
      ...d,
      swingTimer: 0,
    }));
    this.train = def.train ? { ...def.train, wheelPhase: 0 } : null;
    this.tnts = def.tnts.map((pt) => ({
      x: pt.x - 16,
      y: pt.y - 34,
      w: 32,
      h: 34,
      alive: true,
      respawnTimer: 0,
      hitFlash: 0,
    }));
    this.crates = def.crates.map((pt, i) => ({
      x: pt.x - 16,
      y: pt.y - 32,
      w: 32,
      h: 32,
      alive: true,
      respawnTimer: 0,
      bobPhase: i * 1.4,
    }));

    this.fighters = [
      this.createFighter('p1', def.p1Spawn.x, def.p1Spawn.y),
      this.createFighter('p2', def.p2Spawn.x, def.p2Spawn.y),
    ];

    this.projectiles = [];
    this.explosions = [];
    this.golds = [];
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
    this.winReason = 'gold';
    this.goldRespawnTimer = 0.5;
    this.coinRespawnTimer = 0;
    this.lastGoldSpawnIdx = -1;

    const focus = this.localPlayer === 'p1' ? this.fighters[0] : this.fighters[1];
    this.camX = wrapX(focus.x - VIEW_W * 0.5);
    this.camY = Math.max(0, Math.min(WORLD_H - VIEW_H, focus.y - VIEW_H * 0.58));
  }

  public startMatch(stageIdx = this.stageIndex, rules: MatchRules = this.rules): void {
    this.rules = { ...rules };
    this.loadStage(stageIdx);
    this.mode = 'playing';
    this.spawnMainGold();
  }

  public exportSnapshot() {
    return {
      mode: this.mode,
      stageIndex: this.stageIndex,
      rules: this.rules,
      time: this.time,
      winner: this.winner,
      winReason: this.winReason,
      shakeTimer: this.shakeTimer,
      shakePower: this.shakePower,
      fighters: this.fighters.map((f) => ({ ...f })),
      projectiles: this.projectiles.map((p) => ({ ...p })),
      explosions: this.explosions.map((e) => ({ ...e })),
      golds: this.golds.map((g) => ({ ...g })),
      coins: this.coins.map((c) => ({ collected: c.collected })),
      tnts: this.tnts.map((t) => ({ alive: t.alive })),
      crates: this.crates.map((c) => ({ alive: c.alive })),
      springs: this.springs.map((s) => ({ bounceTimer: s.bounceTimer })),
      platforms: this.platforms.map((p) => ({ x: p.x, y: p.y, crumbleState: p.crumbleState })),
      doors: this.doors.map((d) => ({ swingTimer: d.swingTimer })),
      train: this.train ? { x: this.train.x, wheelPhase: this.train.wheelPhase } : null,
    };
  }

  public applySnapshot(snap: ReturnType<GameEngine['exportSnapshot']>, dt: number): void {
    if (this.stageIndex !== snap.stageIndex) {
      this.loadStage(snap.stageIndex);
    }
    this.mode = snap.mode;
    this.rules = snap.rules;
    this.time = snap.time;
    this.winner = snap.winner;
    this.winReason = snap.winReason;
    this.shakeTimer = snap.shakeTimer;
    this.shakePower = snap.shakePower;

    this.fighters = snap.fighters as [Fighter, Fighter];
    this.projectiles = snap.projectiles as Projectile[];
    this.explosions = snap.explosions as Explosion[];
    this.golds = snap.golds as GoldItem[];

    snap.coins.forEach((c, i) => {
      if (this.coins[i]) this.coins[i].collected = c.collected;
    });
    snap.tnts.forEach((t, i) => {
      if (this.tnts[i]) this.tnts[i].alive = t.alive;
    });
    snap.crates.forEach((c, i) => {
      if (this.crates[i]) this.crates[i].alive = c.alive;
    });
    snap.springs.forEach((s, i) => {
      if (this.springs[i]) this.springs[i].bounceTimer = s.bounceTimer;
    });
    snap.platforms.forEach((p, i) => {
      if (this.platforms[i]) {
        this.platforms[i].x = p.x;
        this.platforms[i].y = p.y;
        this.platforms[i].crumbleState = p.crumbleState;
      }
    });
    snap.doors?.forEach((d, i) => {
      if (this.doors[i]) this.doors[i].swingTimer = d.swingTimer;
    });
    if (this.train && snap.train) {
      this.train.x = snap.train.x;
      this.train.wheelPhase = snap.train.wheelPhase;
    }

    this.updateCamera(Math.min(dt, 0.04));
  }

  public updateCamera(dt: number): void {
    const focus = this.localPlayer === 'p1' ? this.fighters[0] : this.fighters[1];
    const targetCamX = wrapX(focus.x + focus.facing * 42 - VIEW_W * 0.5);
    const camDx = wrapDeltaX(this.camX, targetCamX);
    this.camX = wrapX(this.camX + camDx * Math.min(1, dt * 8.5));

    const targetCamY = Math.max(0, Math.min(WORLD_H - VIEW_H, focus.y - VIEW_H * 0.56));
    this.camY += (targetCamY - this.camY) * Math.min(1, dt * 7.5);
  }

  private spawnMainGold(): void {
    const def = STAGES[this.stageIndex];
    let idx = Math.floor(Math.random() * def.goldSpawns.length);
    if (idx === this.lastGoldSpawnIdx && def.goldSpawns.length > 1) {
      idx = (idx + 1) % def.goldSpawns.length;
    }
    this.lastGoldSpawnIdx = idx;
    const pt = def.goldSpawns[idx];
    this.golds.push({
      x: pt.x,
      y: pt.y,
      vx: 0,
      vy: 0,
      radius: 16,
      dropped: false,
      pickupDelay: 0,
      bobPhase: 0,
      life: 999,
    });
    this.burstParticles(pt.x, pt.y, 12, 'gold', '#e6a82e');
  }

  public update(dt: number, p1Input: InputState, remoteP2Input?: InputState): void {
    const clampedDt = Math.min(dt, 0.04);

    if (this.mode !== 'playing') {
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

    // 1. Update moving platforms, crumbling awnings, doors, steam train & props
    for (const p of this.platforms) {
      if (p.moveAxis === 'x' && p.moveRange && p.moveSpeed) {
        p.x = wrapX(p.baseX + Math.sin(this.time * p.moveSpeed) * p.moveRange);
      } else if (p.moveAxis === 'y' && p.moveRange && p.moveSpeed) {
        p.y = p.baseY + Math.sin(this.time * p.moveSpeed) * p.moveRange;
      }
      if (p.crumble && p.crumbleState === 'shaking') {
        p.crumbleTimer = (p.crumbleTimer ?? 0) - clampedDt;
        if (p.crumbleTimer <= 0) {
          p.crumbleState = 'broken';
          p.crumbleTimer = 4.2;
          sound.playCrumble();
          this.burstParticles(wrapX(p.x + p.w * 0.5), p.y + 8, 10, 'dust', '#9c7140');
        }
      } else if (p.crumble && p.crumbleState === 'broken') {
        p.crumbleTimer = (p.crumbleTimer ?? 0) - clampedDt;
        if (p.crumbleTimer <= 0) {
          p.crumbleState = 'intact';
          this.burstParticles(wrapX(p.x + p.w * 0.5), p.y + 8, 5, 'dust', '#d4b885');
        }
      }
    }

    for (const d of this.doors) {
      if (d.swingTimer > 0) d.swingTimer = Math.max(0, d.swingTimer - clampedDt);
    }

    if (this.train) {
      this.train.x = wrapX(this.train.x + this.train.speed * clampedDt);
      this.train.wheelPhase += clampedDt * 12;
      if (Math.random() < 0.25) {
        this.particles.push({
          x: wrapX(this.train.x + this.train.w - 30),
          y: this.train.y - 12,
          vx: -25 + (Math.random() - 0.5) * 20,
          vy: -55 - Math.random() * 35,
          size: 5 + Math.random() * 4,
          life: 0.55,
          maxLife: 0.55,
          kind: 'smoke',
          color: '#e5d8bf',
        });
      }
    }

    for (const s of this.springs) {
      if (s.bounceTimer > 0) s.bounceTimer = Math.max(0, s.bounceTimer - clampedDt);
    }

    for (const t of this.tnts) {
      if (t.hitFlash > 0) t.hitFlash = Math.max(0, t.hitFlash - clampedDt);
      if (!t.alive) {
        t.respawnTimer -= clampedDt;
        if (t.respawnTimer <= 0) {
          t.alive = true;
          this.burstParticles(t.x + t.w * 0.5, t.y + t.h * 0.5, 6, 'smoke', '#b89f74');
        }
      }
    }

    for (const c of this.crates) {
      c.bobPhase += clampedDt * 3;
      if (!c.alive) {
        c.respawnTimer -= clampedDt;
        if (c.respawnTimer <= 0) {
          c.alive = true;
          this.burstParticles(c.x + c.w * 0.5, c.y + c.h * 0.5, 6, 'gold', '#e8aa2a');
        }
      }
    }

    // 2. Use remote P2 input in Online Host mode, otherwise CPU AI
    const p2Input = remoteP2Input ?? this.computeAI(clampedDt);

    // 3. Update fighters
    this.updateFighter(this.fighters[0], p1Input, clampedDt);
    this.updateFighter(this.fighters[1], p2Input, clampedDt);

    // 4. Fighter vs Fighter stomp & bump
    this.resolveFighterDuel();

    // 5. Update projectiles & explosions
    this.updateProjectiles(clampedDt);
    this.updateExplosions(clampedDt);

    // 6. Update golds, crates, & coins
    this.updateGolds(clampedDt);
    this.updateCrates();
    this.updateCoins(clampedDt);

    // 7. Update particles
    this.updateParticles(clampedDt);

    // 8. Smoothly follow local player
    this.updateCamera(clampedDt);
  }

  private updateFighter(f: Fighter, input: InputState, dt: number): void {
    f.animTime += dt;

    // Handle KO respawn countdown
    if (f.respawnTimer > 0) {
      f.respawnTimer = Math.max(0, f.respawnTimer - dt);
      if (f.respawnTimer === 0) {
        const def = STAGES[this.stageIndex];
        const sp = f.id === 'p1' ? def.p1Spawn : def.p2Spawn;
        f.x = sp.x;
        f.y = sp.y - 36;
        f.vx = 0;
        f.vy = 0;
        f.hp = f.maxHp;
        f.invulnTimer = 1.8;
        f.stunTimer = 0;
        this.burstParticles(f.x, f.y, 10, 'dust', '#d4b885');
      }
      return;
    }

    f.squashX += (1 - f.squashX) * Math.min(1, dt * 14);
    f.squashY += (1 - f.squashY) * Math.min(1, dt * 14);

    if (f.shootCooldown > 0) f.shootCooldown = Math.max(0, f.shootCooldown - dt);
    if (f.invulnTimer > 0) f.invulnTimer = Math.max(0, f.invulnTimer - dt);
    if (f.stunTimer > 0) f.stunTimer = Math.max(0, f.stunTimer - dt);
    if (f.muzzleTimer > 0) f.muzzleTimer = Math.max(0, f.muzzleTimer - dt);
    if (f.shootPoseTimer > 0) f.shootPoseTimer = Math.max(0, f.shootPoseTimer - dt);
    if (f.warpCooldown > 0) f.warpCooldown = Math.max(0, f.warpCooldown - dt);

    if (f.weaponTimer > 0) {
      f.weaponTimer = Math.max(0, f.weaponTimer - dt);
      if (f.weaponTimer === 0) f.weapon = 'revolver';
    }
    if (f.armorTimer > 0) {
      f.armorTimer = Math.max(0, f.armorTimer - dt);
      if (f.armorTimer === 0) f.armorHits = 0;
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

      if (f.jumpBufferTimer > 0 && f.coyoteTimer > 0) {
        f.vy = -JUMP_VEL;
        f.onGround = false;
        f.coyoteTimer = 0;
        f.jumpBufferTimer = 0;
        f.squashX = 0.8;
        f.squashY = 1.24;
        if (f.id === 'p1') sound.playJump();
        this.burstParticles(f.x, f.y + f.h * 0.5, 5, 'dust', '#b89f74');
      }

      if (!input.jump && f.vy < -220) {
        f.vy *= 0.86;
      }

      if (input.shoot && f.shootCooldown <= 0) {
        this.fireWeapon(f);
      }
    } else {
      f.vx *= Math.pow(0.25, dt);
    }

    f.vy = Math.min(MAX_FALL, f.vy + GRAVITY * dt);
    const prevBottom = f.y + f.h * 0.5;
    const prevTop = f.y - f.h * 0.5;

    // Horizontal integrate + solid wall blocking
    f.x = wrapX(f.x + f.vx * dt);
    for (const p of this.platforms) {
      if (!p.solid) continue;
      if (f.y + f.h * 0.45 > p.y && f.y - f.h * 0.45 < p.y + p.h) {
        if (this.overlapsPlatformX(f.x, f.w * 0.85, p)) {
          const pCenter = wrapX(p.x + p.w * 0.5);
          const side = wrapDeltaX(pCenter, f.x) >= 0 ? 1 : -1;
          f.x = wrapX(side > 0 ? p.x + p.w + f.w * 0.44 : p.x - f.w * 0.44);
          f.vx = 0;
        }
      }
    }

    // Vertical integrate
    f.y += f.vy * dt;

    if (f.y - f.h * 0.5 < 16) {
      f.y = 16 + f.h * 0.5;
      if (f.vy < 0) f.vy = 0;
    }

    // Solid ceiling bonk
    if (f.vy < 0) {
      for (const p of this.platforms) {
        if (!p.solid) continue;
        if (this.overlapsPlatformX(f.x, f.w * 0.78, p)) {
          if (prevTop >= p.y + p.h - 10 && f.y - f.h * 0.5 <= p.y + p.h) {
            f.y = p.y + p.h + f.h * 0.5;
            f.vy = 0;
            break;
          }
        }
      }
    }

    const wasOnGround = f.onGround;
    f.onGround = false;
    const newBottom = f.y + f.h * 0.5;

    if (f.vy >= 0) {
      for (const p of this.platforms) {
        if (p.crumble && p.crumbleState === 'broken') continue;
        if (this.overlapsPlatformX(f.x, f.w * 0.8, p)) {
          if (prevBottom <= p.y + 12 && newBottom >= p.y) {
            f.y = p.y - f.h * 0.5;
            f.vy = 0;
            f.onGround = true;
            if (p.crumble && p.crumbleState === 'intact') {
              p.crumbleState = 'shaking';
              p.crumbleTimer = 0.62;
            }
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

    // Steam Train interaction: rideable roof + hazardous locomotive front!
    if (this.train) {
      const tr = this.train;
      const trCenter = wrapX(tr.x + tr.w * 0.5);
      const dx = wrapDeltaX(trCenter, f.x);
      if (Math.abs(dx) < tr.w * 0.5 + f.w * 0.4) {
        // Ride on train roof
        if (f.vy >= 0 && prevBottom <= tr.y + 14 && newBottom >= tr.y) {
          f.y = tr.y - f.h * 0.5;
          f.vy = 0;
          f.onGround = true;
          f.x = wrapX(f.x + tr.speed * dt);
        } else if (f.y + f.h * 0.45 > tr.y + 8 && f.y - f.h * 0.45 < tr.y + tr.h) {
          // Struck by locomotive body/cowcatcher!
          if (f.invulnTimer <= 0) {
            this.damageFighter(f, 1, 1, 380);
            f.vy = -340;
          }
        }
      }
    }

    // Swinging Warp Doors (Mario vs Luigi pipe-style quick flank!)
    if (f.warpCooldown <= 0 && this.doors.length > 0) {
      for (const d of this.doors) {
        const dcx = d.x + d.w * 0.5;
        const dcy = d.y + d.h * 0.5;
        if (Math.abs(wrapDeltaX(f.x, dcx)) < 16 && Math.abs(f.y - dcy) < 26) {
          const dest = this.doors.find((o) => o.id === d.pairId);
          if (dest) {
            d.swingTimer = 0.45;
            dest.swingTimer = 0.45;
            this.burstParticles(f.x, f.y, 8, 'dust', '#d8c094');
            f.x = wrapX(dest.x + dest.w * 0.5);
            f.y = dest.y + dest.h - f.h * 0.5 - 2;
            f.warpCooldown = 1.45;
            sound.playWarp();
            this.burstParticles(f.x, f.y, 10, 'gold', d.color);
            break;
          }
        }
      }
    }

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

  private grantRandomGear(f: Fighter): void {
    const roll = Math.random();
    if (roll < 0.28) {
      f.weapon = 'shotgun';
      f.weaponTimer = 12;
    } else if (roll < 0.56) {
      f.weapon = 'dynamite';
      f.weaponTimer = 12;
    } else if (roll < 0.80) {
      f.weapon = 'sniper';
      f.weaponTimer = 12;
    } else {
      f.armorHits = 2;
      f.armorTimer = 12;
    }
    sound.playPowerUp();
    this.burstParticles(f.x, f.y, 14, 'gold', '#e8aa2a');
  }

  private fireWeapon(f: Fighter): void {
    const muzzleX = wrapX(f.x + f.facing * 24);
    const muzzleY = f.y - 4;
    f.muzzleTimer = 0.08;
    f.shootPoseTimer = 0.24;

    if (f.weapon === 'shotgun') {
      f.shootCooldown = 0.42;
      for (const a of [-0.19, 0, 0.19]) {
        this.projectiles.push({
          kind: 'bullet',
          owner: f.id,
          x: muzzleX,
          y: muzzleY,
          vx: Math.cos(a) * (BULLET_SPEED * 0.92) * f.facing,
          vy: Math.sin(a) * (BULLET_SPEED * 0.92),
          life: 0.42,
          radius: 4.5,
          damage: 1,
          knockback: 340,
          spin: 0,
        });
      }
      f.vx -= f.facing * 65;
      sound.playShoot('shotgun');
    } else if (f.weapon === 'dynamite') {
      f.shootCooldown = 0.58;
      this.projectiles.push({
        kind: 'dynamite',
        owner: f.id,
        x: muzzleX,
        y: muzzleY - 4,
        vx: f.facing * 295 + f.vx * 0.35,
        vy: -345,
        life: 0.95,
        radius: 7,
        damage: 2,
        knockback: 420,
        spin: 0,
      });
      sound.playShoot('dynamite');
    } else if (f.weapon === 'sniper') {
      f.shootCooldown = 0.58;
      this.projectiles.push({
        kind: 'sniper',
        owner: f.id,
        x: muzzleX,
        y: muzzleY,
        vx: f.facing * SNIPER_SPEED,
        vy: 0,
        life: 1.05,
        radius: 5,
        damage: 2,
        knockback: 380,
        spin: 0,
      });
      f.vx -= f.facing * 45;
      sound.playShoot('sniper');
    } else {
      f.shootCooldown = 0.28;
      this.projectiles.push({
        kind: 'bullet',
        owner: f.id,
        x: muzzleX,
        y: muzzleY,
        vx: f.facing * BULLET_SPEED,
        vy: 0,
        life: 0.72,
        radius: 4.5,
        damage: 1,
        knockback: 250,
        spin: 0,
      });
      f.vx -= f.facing * 24;
      if (f.id === 'p1') sound.playShoot('revolver');
    }

    this.burstParticles(muzzleX, muzzleY, 4, 'smoke', '#594836');
  }

  private resolveFighterDuel(): void {
    const [p1, p2] = this.fighters;
    if (p1.respawnTimer > 0 || p2.respawnTimer > 0) return;

    const dx = wrapDeltaX(p1.x, p2.x);
    const dy = p2.y - p1.y;
    const overlapX = Math.abs(dx) < (p1.w + p2.w) * 0.52;
    const overlapY = Math.abs(dy) < (p1.h + p2.h) * 0.52;
    if (!overlapX || !overlapY) return;

    if (p1.vy > 80 && dy > 12 && p2.invulnTimer <= 0) {
      p1.vy = -470;
      p1.squashX = 1.2;
      p1.squashY = 0.82;
      this.damageFighter(p2, 2, Math.sign(dx) || 1, 320);
      return;
    }
    if (p2.vy > 80 && dy < -12 && p1.invulnTimer <= 0) {
      p2.vy = -470;
      p2.squashX = 1.2;
      p2.squashY = 0.82;
      this.damageFighter(p1, 2, -Math.sign(dx) || -1, 320);
      return;
    }

    const push = dx >= 0 ? -1 : 1;
    p1.vx += push * 75;
    p2.vx -= push * 75;
  }

  private damageFighter(victim: Fighter, damage: number, knockDir: number, knockback: number): void {
    if (victim.respawnTimer > 0 || victim.invulnTimer > 0) return;

    // Sheriff Armor absorbs hit cleanly!
    if (victim.armorHits > 0) {
      victim.armorHits -= 1;
      if (victim.armorHits === 0) victim.armorTimer = 0;
      victim.invulnTimer = 0.65;
      victim.vx = knockDir * (knockback * 0.45);
      victim.vy = -160;
      sound.playCoin();
      this.burstParticles(victim.x, victim.y, 10, 'gold', '#f2c14e');
      return;
    }

    victim.hp = Math.max(0, victim.hp - damage);
    victim.invulnTimer = 0.75;
    victim.stunTimer = 0.28;
    victim.vx = knockDir * knockback;
    victim.vy = -270;
    victim.squashX = 1.35;
    victim.squashY = 0.68;

    this.hitstop = 0.045;
    this.shakeTimer = 0.22;
    this.shakePower = 6;
    sound.playHit();
    this.burstParticles(victim.x, victim.y, 12, 'spark', '#3c2b1e');

    if (victim.hp <= 0) {
      this.koFighter(victim, knockDir);
    }
  }

  private koFighter(victim: Fighter, knockDir: number): void {
    const isWanted = this.getWantedId() === victim.id;
    const dropCount = Math.min(victim.gold, isWanted ? 2 : 1);

    // Even with infinite lives, KO forces a gold drop + respawn delay!
    for (let i = 0; i < dropCount; i++) {
      victim.gold -= 1;
      const spreadDir = i === 0 ? -knockDir : knockDir;
      this.golds.push({
        x: victim.x,
        y: victim.y - 16,
        vx: spreadDir * (135 + Math.random() * 85),
        vy: -380 - i * 45,
        radius: 15,
        dropped: true,
        pickupDelay: 0.5,
        bobPhase: 0,
        life: 16,
      });
    }

    victim.weapon = 'revolver';
    victim.weaponTimer = 0;
    victim.respawnTimer = 1.15;
    sound.playKO();
    this.shakeTimer = 0.3;
    this.shakePower = 8;
    this.burstParticles(victim.x, victim.y, 20, 'gold', '#e6a82e');
    this.burstParticles(victim.x, victim.y, 14, 'smoke', '#4c3a2a');

    // Finite lives decrement & KO win check
    if (victim.lives > 0) {
      victim.lives -= 1;
      if (victim.lives <= 0) {
        this.mode = 'result';
        this.winner = victim.id === 'p1' ? 'p2' : 'p1';
        this.winReason = 'ko';
        sound.playWin(this.winner === 'p1');
      }
    }
  }

  private triggerExplosion(x: number, y: number, radius: number, damage: number): void {
    this.explosions.push({ x, y, radius, life: 0.34, maxLife: 0.34 });
    sound.playExplosion();
    this.shakeTimer = 0.32;
    this.shakePower = 9;
    this.burstParticles(x, y, 22, 'fire', '#e86825');
    this.burstParticles(x, y, 14, 'smoke', '#3e2d1e');

    // Damage both fighters inside blast radius
    for (const f of this.fighters) {
      if (f.respawnTimer > 0) continue;
      const dx = wrapDeltaX(x, f.x);
      const dy = f.y - y;
      if (Math.hypot(dx, dy) <= radius + 16) {
        this.damageFighter(f, damage, Math.sign(dx) || 1, 410);
      }
    }

    // Chain-detonate nearby TNT barrels
    for (const t of this.tnts) {
      if (!t.alive) continue;
      const tx = t.x + t.w * 0.5;
      const ty = t.y + t.h * 0.5;
      const d = Math.hypot(wrapDeltaX(x, tx), ty - y);
      if (d <= radius + 20) {
        t.alive = false;
        t.respawnTimer = 9;
        this.triggerExplosion(tx, ty, 88, 2);
      }
    }
  }

  private updateProjectiles(dt: number): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const b = this.projectiles[i];
      b.life -= dt;
      if (b.kind === 'dynamite') {
        b.vy = Math.min(MAX_FALL * 0.85, b.vy + GRAVITY * 0.85 * dt);
        b.spin += dt * 11 * Math.sign(b.vx || 1);
      }

      b.x = wrapX(b.x + b.vx * dt);
      b.y += b.vy * dt;

      // Solid cover wall interaction: normal bullets clang/stop, dynamite bounces, sniper pierces!
      if (b.kind !== 'sniper') {
        let hitWall = false;
        for (const p of this.platforms) {
          if (!p.solid) continue;
          if (b.y + b.radius >= p.y && b.y - b.radius <= p.y + p.h && this.overlapsPlatformX(b.x, b.radius * 2, p)) {
            if (b.kind === 'dynamite') {
              b.vx = -b.vx * 0.65;
            } else {
              hitWall = true;
              this.burstParticles(b.x, b.y, 4, 'spark', '#e5c17b');
            }
            break;
          }
        }
        if (hitWall) {
          this.projectiles.splice(i, 1);
          continue;
        }
      }

      // Dynamite floor bounce
      if (b.kind === 'dynamite' && b.vy > 0) {
        for (const p of this.platforms) {
          if (this.overlapsPlatformX(b.x, b.radius * 1.4, p)) {
            if (b.y + b.radius >= p.y && b.y + b.radius <= p.y + 20) {
              b.y = p.y - b.radius;
              b.vy = -b.vy * 0.48;
              b.vx *= 0.72;
              break;
            }
          }
        }
      }

      if (b.life <= 0 || b.y < -20 || b.y > WORLD_H + 40) {
        if (b.kind === 'dynamite') {
          this.triggerExplosion(b.x, b.y, 78, b.damage);
        }
        this.projectiles.splice(i, 1);
        continue;
      }

      // Check TNT barrel hits
      let hitTnt = false;
      for (const t of this.tnts) {
        if (!t.alive) continue;
        const tx = t.x + t.w * 0.5;
        const ty = t.y + t.h * 0.5;
        if (Math.abs(wrapDeltaX(b.x, tx)) < t.w * 0.55 + b.radius && Math.abs(b.y - ty) < t.h * 0.55 + b.radius) {
          t.alive = false;
          t.respawnTimer = 9;
          this.triggerExplosion(tx, ty, 88, 2);
          hitTnt = true;
          break;
        }
      }
      if (hitTnt) {
        this.projectiles.splice(i, 1);
        continue;
      }

      // Hit opponent
      const target = b.owner === 'p1' ? this.fighters[1] : this.fighters[0];
      if (target.respawnTimer <= 0 && target.invulnTimer <= 0) {
        const dx = Math.abs(wrapDeltaX(b.x, target.x));
        const dy = Math.abs(b.y - target.y);
        if (dx < target.w * 0.55 + b.radius && dy < target.h * 0.52 + b.radius) {
          if (b.kind === 'dynamite') {
            this.triggerExplosion(b.x, b.y, 78, b.damage);
          } else {
            this.damageFighter(target, b.damage, Math.sign(b.vx) || 1, b.knockback);
          }
          if (b.kind !== 'sniper') {
            this.projectiles.splice(i, 1);
          }
          continue;
        }
      }
    }
  }

  private updateExplosions(dt: number): void {
    for (let i = this.explosions.length - 1; i >= 0; i--) {
      this.explosions[i].life -= dt;
      if (this.explosions[i].life <= 0) {
        this.explosions.splice(i, 1);
      }
    }
  }

  private updateCrates(): void {
    for (const c of this.crates) {
      if (!c.alive) continue;
      const cx = c.x + c.w * 0.5;
      const cy = c.y + c.h * 0.5;
      for (const f of this.fighters) {
        if (f.respawnTimer > 0) continue;
        if (Math.abs(wrapDeltaX(f.x, cx)) < 26 && Math.abs(f.y - cy) < 28) {
          c.alive = false;
          c.respawnTimer = 11;
          this.grantRandomGear(f);
          break;
        }
      }
    }
  }

  private updateGolds(dt: number): void {
    let hasMainGold = false;

    for (let i = this.golds.length - 1; i >= 0; i--) {
      const g = this.golds[i];
      g.bobPhase += dt * 4.5;
      if (g.pickupDelay > 0) g.pickupDelay = Math.max(0, g.pickupDelay - dt);

      if (g.dropped) {
        g.life -= dt;
        g.vy = Math.min(MAX_FALL * 0.75, g.vy + GRAVITY * 0.75 * dt);
        g.x = wrapX(g.x + g.vx * dt);
        g.y += g.vy * dt;
        g.vx *= Math.pow(0.45, dt);

        for (const p of this.platforms) {
          if (this.overlapsPlatformX(g.x, g.radius * 1.4, p)) {
            if (g.vy > 0 && g.y + g.radius >= p.y && g.y + g.radius <= p.y + 22) {
              g.y = p.y - g.radius;
              g.vy = Math.abs(g.vy) > 90 ? -g.vy * 0.55 : 0;
              break;
            }
          }
        }
        if (g.y > WORLD_H + 20) {
          g.y = 40;
          g.vy = 80;
        }
        if (g.life <= 0) {
          this.golds.splice(i, 1);
          continue;
        }
      } else {
        hasMainGold = true;
      }

      if (g.pickupDelay <= 0) {
        for (const f of this.fighters) {
          if (f.respawnTimer > 0) continue;
          const dx = Math.abs(wrapDeltaX(f.x, g.x));
          const dy = Math.abs(f.y - g.y);
          if (dx < f.w * 0.65 + g.radius && dy < f.h * 0.6 + g.radius) {
            f.gold += 1;
            sound.playStar();
            this.burstParticles(g.x, g.y, 18, 'gold', '#f0b636');
            this.shakeTimer = 0.14;
            this.shakePower = 4;
            const wasMain = !g.dropped;
            this.golds.splice(i, 1);

            if (f.gold >= this.rules.targetGold) {
              this.mode = 'result';
              this.winner = f.id;
              this.winReason = 'gold';
              sound.playWin(f.id === 'p1');
              return;
            }
            if (wasMain) {
              this.goldRespawnTimer = 1.0;
            }
            break;
          }
        }
      }
    }

    if (!hasMainGold) {
      this.goldRespawnTimer -= dt;
      if (this.goldRespawnTimer <= 0) {
        this.spawnMainGold();
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
        if (f.respawnTimer > 0) continue;
        const dx = Math.abs(wrapDeltaX(f.x, c.x));
        const dy = Math.abs(f.y - c.y);
        if (dx < 24 && dy < 28) {
          c.collected = true;
          f.coins += 1;
          if (f.id === 'p1') sound.playCoin();
          this.burstParticles(c.x, c.y, 6, 'spark', '#d99a26');

          if (f.coins >= COINS_FOR_GEAR) {
            f.coins = 0;
            this.grantRandomGear(f);
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

    if (ai.respawnTimer > 0) return out;

    this.aiDecisionTimer -= dt;
    if (this.aiJumpHold > 0) {
      this.aiJumpHold -= dt;
      out.jump = true;
    }

    // Dodge away from nearby lit dynamite
    const dangerDyn = this.projectiles.find(
      (pr) => pr.kind === 'dynamite' && Math.hypot(wrapDeltaX(ai.x, pr.x), pr.y - ai.y) < 95
    );
    if (dangerDyn) {
      const away = wrapDeltaX(dangerDyn.x, ai.x);
      out.left = away < 0;
      out.right = away >= 0;
      if (ai.onGround) {
        out.jump = true;
        out.jumpPressed = true;
      }
      return out;
    }

    // Detect stuck / jumping in place under a high target or against a solid wall
    const movedDist = Math.abs(wrapDeltaX(this.aiLastX, ai.x)) + Math.abs(ai.y - this.aiLastY);
    if (movedDist < 22) {
      this.aiStuckTimer += dt;
    } else {
      this.aiStuckTimer = Math.max(0, this.aiStuckTimer - dt * 2);
      this.aiLastX = ai.x;
      this.aiLastY = ai.y;
    }

    if (this.aiStuckTimer > 0.75) {
      this.aiStuckTimer = 0;
      this.aiEscapeTimer = 0.85;
      this.aiEscapeDir = Math.random() < 0.5 ? 1 : -1;
    }

    if (this.aiEscapeTimer > 0) {
      this.aiEscapeTimer -= dt;
      out.left = this.aiEscapeDir < 0;
      out.right = this.aiEscapeDir > 0;
      if (ai.onGround && Math.random() < 0.25) {
        out.jump = true;
        out.jumpPressed = true;
        this.aiJumpHold = 0.3;
      }
      return out;
    }

    // Priority: dropped gold > nearby weapon crate (if unarmed) > main gold > player
    let goalX = p1.x;
    let goalY = p1.y;

    const dropped = this.golds.find((g) => g.dropped && g.pickupDelay <= 0.15);
    const mainGold = this.golds.find((g) => !g.dropped);
    const nearbyCrate =
      ai.weapon === 'revolver'
        ? this.crates.find(
            (c) => c.alive && Math.abs(wrapDeltaX(ai.x, c.x + c.w * 0.5)) < 220 && Math.abs(c.y - ai.y) < 120
          )
        : undefined;

    if (dropped) {
      goalX = dropped.x;
      goalY = dropped.y;
    } else if (nearbyCrate) {
      goalX = nearbyCrate.x + nearbyCrate.w * 0.5;
      goalY = nearbyCrate.y;
    } else if (mainGold) {
      goalX = mainGold.x;
      goalY = mainGold.y;
    }

    // Multi-tier climbing waypoint: if goal is higher than a single jump (~110px),
    // head for the best reachable stepping-stone (spring barrel, warp door, or intermediate ledge)
    // instead of standing directly underneath the goal jumping forever!
    let navX = goalX;
    let navY = goalY;

    if (goalY < ai.y - 105) {
      let bestScore = Infinity;

      // Option A: Spring barrels on roughly the current floor
      for (const s of this.springs) {
        if (Math.abs(s.y - ai.y) < 85) {
          const d = Math.abs(wrapDeltaX(ai.x, s.x + s.w * 0.5));
          const score = d * 0.85;
          if (score < bestScore) {
            bestScore = score;
            navX = s.x + s.w * 0.5;
            navY = s.y;
          }
        }
      }

      // Option B: Warp doors whose paired exit is significantly closer to goalY
      if (ai.warpCooldown <= 0) {
        for (const d of this.doors) {
          if (Math.abs(d.y + d.h - (ai.y + ai.h * 0.5)) < 70) {
            const dest = this.doors.find((o) => o.id === d.pairId);
            if (dest && Math.abs(dest.y - goalY) < Math.abs(ai.y - goalY) - 100) {
              const dist = Math.abs(wrapDeltaX(ai.x, d.x + d.w * 0.5));
              const score = dist * 0.75;
              if (score < bestScore) {
                bestScore = score;
                navX = d.x + d.w * 0.5;
                navY = d.y + d.h * 0.5;
              }
            }
          }
        }
      }

      // Option C: Reachable intermediate platform (35..155px above current feet)
      const aiFeet = ai.y + ai.h * 0.5;
      for (const p of this.platforms) {
        if (p.solid || (p.crumble && p.crumbleState === 'broken')) continue;
        const climbH = aiFeet - p.y;
        if (climbH >= 30 && climbH <= 160) {
          const pCenter = wrapX(p.x + p.w * 0.5);
          const distFromAi = Math.abs(wrapDeltaX(ai.x, pCenter));
          const distToGoal = Math.abs(wrapDeltaX(pCenter, goalX));
          // Prefer ledges close to AI that also lead toward the goal
          const score = distFromAi + distToGoal * 0.35;
          if (score < bestScore) {
            bestScore = score;
            // Aim slightly inside the platform edge closest to AI
            const edgeOffset = Math.min(p.w * 0.3, 45);
            const towardAi = wrapDeltaX(pCenter, ai.x) >= 0 ? edgeOffset : -edgeOffset;
            navX = wrapX(pCenter + towardAi);
            navY = p.y - 20;
          }
        }
      }
    }

    const dx = wrapDeltaX(ai.x, navX);
    const dy = navY - ai.y;

    if (dx > 14) out.right = true;
    else if (dx < -14) out.left = true;

    // Jump when approaching a higher ledge, facing a solid wall, or dodging
    if (ai.onGround) {
      const solidAhead = this.platforms.some(
        (p) =>
          p.solid &&
          ai.y + ai.h * 0.4 > p.y &&
          ai.y - ai.h * 0.4 < p.y + p.h &&
          Math.abs(wrapDeltaX(wrapX(ai.x + ai.facing * 26), wrapX(p.x + p.w * 0.5))) < p.w * 0.5 + 16
      );
      const wantsUp = dy < -32 && Math.abs(dx) < 150;
      const randomHop = this.aiDecisionTimer <= 0 && Math.random() < 0.16;
      if (solidAhead || wantsUp || randomHop) {
        out.jump = true;
        out.jumpPressed = true;
        this.aiJumpHold = 0.3;
        this.aiDecisionTimer = 0.45;
      }
    }

    // Shoot if rival is aligned (or if rival is near an active TNT barrel!)
    if (p1.respawnTimer <= 0 && p1.invulnTimer <= 0) {
      const rivalDx = wrapDeltaX(ai.x, p1.x);
      const rivalDy = Math.abs(p1.y - ai.y);
      const maxRange = ai.weapon === 'sniper' ? 520 : ai.weapon === 'dynamite' ? 260 : 320;
      if (Math.abs(rivalDx) < maxRange && rivalDy < (ai.weapon === 'dynamite' ? 110 : 48)) {
        if ((rivalDx > 0 && ai.facing === 1) || (rivalDx < 0 && ai.facing === -1)) {
          if (Math.random() < 0.13) out.shoot = true;
        } else if (Math.abs(rivalDx) < 190) {
          out.left = rivalDx < 0;
          out.right = rivalDx > 0;
        }
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
      const spd = 45 + Math.random() * 155;
      this.particles.push({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 45,
        size: kind === 'gold' || kind === 'fire' ? 5 + Math.random() * 4 : 3 + Math.random() * 4,
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
