export interface Vec2 {
  x: number;
  y: number;
}

export interface Platform {
  x: number;
  y: number;
  w: number;
  h: number;
  oneWay?: boolean;
  /** Solid cover block: blocks horizontal movement, jumping from below, and bullets */
  solid?: boolean;
  style: 'mesa' | 'wood' | 'bridge' | 'chandelier' | 'awning' | 'brick';
  moveAxis?: 'x' | 'y';
  moveRange?: number;
  moveSpeed?: number;
  baseX: number;
  baseY: number;
  /** Crumbling awning state */
  crumble?: boolean;
  crumbleState?: 'intact' | 'shaking' | 'broken';
  crumbleTimer?: number;
}

export interface SpringBarrel {
  x: number;
  y: number;
  w: number;
  h: number;
  power: number;
  bounceTimer: number;
}

export interface WarpDoor {
  id: string;
  pairId: string;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  swingTimer: number;
}

export interface SteamTrain {
  x: number;
  y: number;
  w: number;
  h: number;
  speed: number;
  wheelPhase: number;
}

export interface TntBarrel {
  x: number;
  y: number;
  w: number;
  h: number;
  alive: boolean;
  respawnTimer: number;
  hitFlash: number;
}

export interface WeaponCrate {
  x: number;
  y: number;
  w: number;
  h: number;
  alive: boolean;
  respawnTimer: number;
  bobPhase: number;
}

export interface StageDef {
  id: 'wasteland' | 'saloon' | 'town';
  name: string;
  bgSrc: string;
  platforms: Omit<Platform, 'baseX' | 'baseY' | 'crumbleState' | 'crumbleTimer'>[];
  springs: Omit<SpringBarrel, 'bounceTimer'>[];
  doors: Omit<WarpDoor, 'swingTimer'>[];
  train?: Omit<SteamTrain, 'wheelPhase'>;
  tnts: Vec2[];
  crates: Vec2[];
  goldSpawns: Vec2[];
  coinSpawns: Vec2[];
  p1Spawn: Vec2;
  p2Spawn: Vec2;
}

export type WeaponType = 'revolver' | 'shotgun' | 'dynamite' | 'sniper';

export interface MatchRules {
  targetGold: number;
  maxLives: number; // 0 = infinite
}

export interface Fighter {
  id: 'p1' | 'p2';
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  facing: 1 | -1;
  onGround: boolean;
  coyoteTimer: number;
  jumpBufferTimer: number;
  shootCooldown: number;
  invulnTimer: number;
  stunTimer: number;
  respawnTimer: number;
  warpCooldown: number;
  doorReady: boolean;
  hp: number;
  maxHp: number;
  lives: number; // -1 when infinite
  gold: number;
  coins: number;
  weapon: WeaponType;
  weaponTimer: number;
  armorHits: number;
  armorTimer: number;
  animTime: number;
  squashX: number;
  squashY: number;
  muzzleTimer: number;
  shootPoseTimer: number;
}

export interface Projectile {
  kind: 'bullet' | 'sniper' | 'dynamite';
  owner: 'p1' | 'p2';
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  radius: number;
  damage: number;
  knockback: number;
  spin: number;
}

export interface Explosion {
  x: number;
  y: number;
  radius: number;
  life: number;
  maxLife: number;
}

export interface GoldItem {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  dropped: boolean;
  pickupDelay: number;
  bobPhase: number;
  life: number;
}

export interface CoinItem {
  x: number;
  y: number;
  phase: number;
  collected: boolean;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  kind: 'dust' | 'spark' | 'gold' | 'smoke' | 'fire';
  color: string;
}

export interface InputState {
  left: boolean;
  right: boolean;
  jump: boolean;
  jumpPressed: boolean;
  shoot: boolean;
}

export type GameMode = 'title' | 'playing' | 'result';
