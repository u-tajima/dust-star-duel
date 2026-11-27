import type { StageDef } from './types';

// Large DS-style horizontally wrapping world; camera zooms into VIEW_W x VIEW_H around player
export const WORLD_W = 1680;
export const WORLD_H = 780;
export const VIEW_W = 560;
export const VIEW_H = 315;

export const COINS_FOR_GEAR = 6;
export const MAX_HP = 3;

// Jump physics guarantee: JUMP_VEL=605, GRAVITY=1480 => max jump height ~123px.
// Every climbable tier step below is strictly 90-95px so players can climb freely
// from multiple spots on every floor; springs & warp doors act as exciting speed shortcuts!

export const STAGES: StageDef[] = [
  // =========================================================================
  // 1. WASTELAND (荒野) — Multi-route frontier canyon
  //    Tiers: 720 -> 628 -> 536 -> 442 -> 348 (every step 92-94px!)
  // =========================================================================
  {
    id: 'wasteland',
    name: 'WASTELAND',
    category: 'normal',
    bgSrc: './assets/western-bg.jpg',
    platforms: [
      // Ground with 2 jumpable 96px chasms (falling = KO, easy to leap over)
      { x: 0, y: 720, w: 540, h: 60, style: 'mesa' },
      { x: 636, y: 720, w: 484, h: 60, style: 'mesa' },
      { x: 1216, y: 720, w: 464, h: 60, style: 'mesa' },

      // Jumpable waist-high sandstone cover boulders (h=54px: blocks bullets, easy to hop over!)
      { x: 250, y: 666, w: 54, h: 54, solid: true, style: 'mesa' },
      { x: 860, y: 666, w: 54, h: 54, solid: true, style: 'mesa' },
      { x: 1410, y: 666, w: 54, h: 54, solid: true, style: 'mesa' },

      // Tier 1 (y=628, 92px above ground — 4 wide entry points + moving minecart)
      { x: 50, y: 628, w: 220, h: 18, oneWay: true, style: 'wood' },
      {
        x: 530,
        y: 628,
        w: 120,
        h: 18,
        oneWay: true,
        style: 'bridge',
        moveAxis: 'x',
        moveRange: 100,
        moveSpeed: 1.2,
      },
      { x: 750, y: 628, w: 240, h: 18, oneWay: true, style: 'wood' },
      { x: 1320, y: 628, w: 240, h: 18, oneWay: true, style: 'wood' },

      // Tier 2 (y=536, 92px above Tier 1 + vertical mine elevator)
      { x: 220, y: 536, w: 250, h: 20, oneWay: true, style: 'mesa' },
      { x: 600, y: 536, w: 240, h: 20, oneWay: true, style: 'mesa' },
      {
        x: 1120,
        y: 520,
        w: 110,
        h: 18,
        oneWay: true,
        style: 'bridge',
        moveAxis: 'y',
        moveRange: 95,
        moveSpeed: 1.3,
      },
      { x: 1270, y: 536, w: 240, h: 20, oneWay: true, style: 'mesa' },

      // Tier 3 (y=442, 94px above Tier 2 — railway X-truss bridges)
      { x: 30, y: 442, w: 240, h: 16, oneWay: true, style: 'bridge' },
      { x: 420, y: 442, w: 250, h: 16, oneWay: true, style: 'bridge' },
      { x: 820, y: 442, w: 250, h: 16, oneWay: true, style: 'bridge' },
      { x: 1240, y: 442, w: 250, h: 16, oneWay: true, style: 'bridge' },

      // Tier 4 (y=348, 94px above Tier 3 — canyon summits)
      { x: 240, y: 348, w: 210, h: 18, oneWay: true, style: 'mesa' },
      { x: 720, y: 348, w: 230, h: 18, oneWay: true, style: 'mesa' },
      { x: 1180, y: 348, w: 210, h: 18, oneWay: true, style: 'mesa' },
    ],
    springs: [
      { x: 355, y: 694, w: 32, h: 26, power: 780 },
      { x: 1030, y: 694, w: 32, h: 26, power: 780 },
      { x: 1585, y: 694, w: 32, h: 26, power: 780 },
      { x: 705, y: 510, w: 32, h: 26, power: 700 },
    ],
    doors: [],
    tnts: [
      { x: 420, y: 720 },
      { x: 940, y: 628 },
      { x: 835, y: 348 },
    ],
    crates: [
      { x: 345, y: 536 },
      { x: 1390, y: 536 },
    ],
    goldSpawns: [
      { x: 345, y: 308 },
      { x: 835, y: 308 },
      { x: 1285, y: 308 },
      { x: 150, y: 402 },
      { x: 545, y: 402 },
      { x: 945, y: 402 },
      { x: 1365, y: 402 },
      { x: 345, y: 496 },
      { x: 720, y: 496 },
      { x: 1390, y: 496 },
    ],
    coinSpawns: [
      { x: 160, y: 598 },
      { x: 870, y: 598 },
      { x: 1440, y: 598 },
      { x: 345, y: 506 },
      { x: 720, y: 506 },
      { x: 1390, y: 506 },
      { x: 545, y: 412 },
      { x: 945, y: 412 },
      { x: 345, y: 318 },
      { x: 835, y: 318 },
    ],
    p1Spawn: { x: 140, y: 660 },
    p2Spawn: { x: 980, y: 660 },
  },

  // =========================================================================
  // 2. SALOON (酒場) — Open 4-story saloon with Flanking Warp Doors & Chandeliers
  //    Tiers: 720 -> 628 -> 536 -> 442 -> 348 (every step 92-94px!)
  // =========================================================================
  {
    id: 'saloon',
    name: 'SALOON',
    category: 'normal',
    bgSrc: './assets/saloon-bg.jpg',
    platforms: [
      // Continuous polished 1F floorboards (zero pits)
      { x: 0, y: 720, w: 1680, h: 60, style: 'wood' },

      // Jumpable bar counters & oak cover blocks (h=54px: bullet cover, zero trapping!)
      { x: 380, y: 666, w: 48, h: 54, solid: true, style: 'wood' },
      { x: 816, y: 666, w: 48, h: 54, solid: true, style: 'wood' },
      { x: 1250, y: 666, w: 48, h: 54, solid: true, style: 'wood' },

      // Tier 1 (y=628, 92px up — 4 broad climbable saloon mezzanines)
      { x: 40, y: 628, w: 280, h: 18, oneWay: true, style: 'wood' },
      { x: 460, y: 628, w: 260, h: 18, oneWay: true, style: 'wood' },
      { x: 960, y: 628, w: 260, h: 18, oneWay: true, style: 'wood' },
      { x: 1360, y: 628, w: 280, h: 18, oneWay: true, style: 'wood' },

      // Tier 2 (y=536, 92px up — 3F galleries + tactical chest-high cover blocks)
      { x: 180, y: 536, w: 270, h: 18, oneWay: true, style: 'wood' },
      { x: 640, y: 536, w: 400, h: 18, oneWay: true, style: 'wood' },
      { x: 1230, y: 536, w: 270, h: 18, oneWay: true, style: 'wood' },
      { x: 822, y: 484, w: 36, h: 52, solid: true, style: 'wood' },

      // Tier 3 (y=442, 94px up — 4F rafters + lower swaying chandelier)
      { x: 20, y: 442, w: 300, h: 16, oneWay: true, style: 'bridge' },
      { x: 420, y: 442, w: 220, h: 16, oneWay: true, style: 'wood' },
      {
        x: 755,
        y: 442,
        w: 170,
        h: 16,
        oneWay: true,
        style: 'chandelier',
        moveAxis: 'x',
        moveRange: 70,
        moveSpeed: 1.45,
      },
      { x: 1040, y: 442, w: 220, h: 16, oneWay: true, style: 'wood' },
      { x: 1360, y: 442, w: 300, h: 16, oneWay: true, style: 'bridge' },

      // Tier 4 (y=348, 94px up — top swaying chandelier & flanking VIP lofts)
      { x: 240, y: 348, w: 240, h: 16, oneWay: true, style: 'bridge' },
      {
        x: 765,
        y: 348,
        w: 150,
        h: 16,
        oneWay: true,
        style: 'chandelier',
        moveAxis: 'x',
        moveRange: 90,
        moveSpeed: -1.3,
      },
      { x: 1200, y: 348, w: 240, h: 16, oneWay: true, style: 'bridge' },
    ],
    springs: [
      { x: 735, y: 694, w: 32, h: 26, power: 770 },
      { x: 915, y: 694, w: 32, h: 26, power: 770 },
      { x: 475, y: 602, w: 32, h: 26, power: 690 },
      { x: 1175, y: 602, w: 32, h: 26, power: 690 },
    ],
    // 2 pairs of open-exit Swinging Saloon Warp Doors (zero dead ends!)
    doors: [
      { id: 'sa1', pairId: 'sa2', x: 72, y: 662, w: 36, h: 58, color: '#b23b2a' },
      { id: 'sa2', pairId: 'sa1', x: 1480, y: 384, w: 36, h: 58, color: '#b23b2a' },
      { id: 'sb1', pairId: 'sb2', x: 1570, y: 662, w: 36, h: 58, color: '#354f70' },
      { id: 'sb2', pairId: 'sb1', x: 155, y: 384, w: 36, h: 58, color: '#354f70' },
    ],
    tnts: [
      { x: 590, y: 628 },
      { x: 1090, y: 628 },
      { x: 740, y: 536 },
    ],
    crates: [
      { x: 315, y: 536 },
      { x: 1365, y: 536 },
    ],
    goldSpawns: [
      { x: 840, y: 308 },
      { x: 360, y: 308 },
      { x: 1320, y: 308 },
      { x: 530, y: 402 },
      { x: 1150, y: 402 },
      { x: 840, y: 402 },
      { x: 315, y: 496 },
      { x: 1365, y: 496 },
      { x: 590, y: 588 },
      { x: 1090, y: 588 },
    ],
    coinSpawns: [
      { x: 220, y: 690 },
      { x: 1460, y: 690 },
      { x: 590, y: 598 },
      { x: 1090, y: 598 },
      { x: 315, y: 506 },
      { x: 1365, y: 506 },
      { x: 530, y: 412 },
      { x: 1150, y: 412 },
      { x: 360, y: 318 },
      { x: 1320, y: 318 },
    ],
    p1Spawn: { x: 200, y: 660 },
    p2Spawn: { x: 1440, y: 660 },
  },

  // =========================================================================
  // 3. TOWN (市街) — Open Frontier Main Street, Rooftop Parkour & Steam Train
  //    Tiers: 720 -> 628 -> 536 -> 442 -> 348 (climbable EVERYWHERE, ZERO dead ends!)
  // =========================================================================
  {
    id: 'town',
    name: 'TOWN',
    category: 'normal',
    bgSrc: './assets/town-bg.jpg',
    platforms: [
      // Open continuous Main Street roadbed (zero trapping holes; train runs freely!)
      { x: 0, y: 720, w: 1680, h: 60, style: 'mesa' },

      // Tier 1 (y=628, 92px up — 6 easy storefront porches & crumbling awnings across town!)
      { x: 40, y: 628, w: 220, h: 18, oneWay: true, style: 'wood' },
      { x: 320, y: 628, w: 130, h: 16, oneWay: true, style: 'awning', crumble: true },
      { x: 520, y: 628, w: 230, h: 18, oneWay: true, style: 'wood' },
      { x: 830, y: 628, w: 130, h: 16, oneWay: true, style: 'awning', crumble: true },
      { x: 1040, y: 628, w: 230, h: 18, oneWay: true, style: 'wood' },
      { x: 1350, y: 628, w: 130, h: 16, oneWay: true, style: 'awning', crumble: true },

      // Tier 2 (y=536, 92px up — 3 Iconic Rooftops: Sheriff's Office, Bank, Clocktower!)
      { x: 110, y: 536, w: 300, h: 20, oneWay: true, style: 'brick' },
      { x: 640, y: 536, w: 340, h: 20, oneWay: true, style: 'brick' },
      { x: 1180, y: 536, w: 320, h: 20, oneWay: true, style: 'brick' },

      // Jumpable rooftop brick parapet cover blocks (h=52px: bullet cover, never traps!)
      { x: 240, y: 484, w: 40, h: 52, solid: true, style: 'brick' },
      { x: 790, y: 484, w: 44, h: 52, solid: true, style: 'brick' },
      { x: 1320, y: 484, w: 40, h: 52, solid: true, style: 'brick' },

      // Tier 3 (y=442, 94px up — Upper awnings & telegraph wire bridges linking roofs!)
      { x: 0, y: 442, w: 180, h: 16, oneWay: true, style: 'bridge' },
      { x: 360, y: 442, w: 240, h: 16, oneWay: true, style: 'bridge' },
      { x: 700, y: 442, w: 220, h: 18, oneWay: true, style: 'brick' },
      { x: 1000, y: 442, w: 140, h: 16, oneWay: true, style: 'awning', crumble: true },
      { x: 1240, y: 442, w: 260, h: 16, oneWay: true, style: 'bridge' },

      // Tier 4 (y=348, 94px up — Clocktower Belfry & Bank Spire)
      { x: 200, y: 348, w: 210, h: 16, oneWay: true, style: 'wood' },
      { x: 710, y: 348, w: 220, h: 18, oneWay: true, style: 'wood' },
      { x: 1260, y: 348, w: 220, h: 18, oneWay: true, style: 'wood' },
    ],
    // Roaring Steam Train rolling along Main Street (ride roof at y=656 or dodge cowcatcher!)
    trains: [
      {
        x: 160,
        y: 656,
        w: 220,
        h: 64,
        speed: 140,
      },
    ],
    springs: [
      { x: 465, y: 694, w: 32, h: 26, power: 770 },
      { x: 985, y: 694, w: 32, h: 26, power: 770 },
      { x: 1545, y: 694, w: 32, h: 26, power: 770 },
      { x: 655, y: 510, w: 32, h: 26, power: 690 },
    ],
    // Open-exit Alleyway <-> Clocktower Belfry Warp Doors (clear exits left, right, & down!)
    doors: [
      { id: 'ta1', pairId: 'ta2', x: 130, y: 570, w: 36, h: 58, color: '#c48a28' },
      { id: 'ta2', pairId: 'ta1', x: 1350, y: 290, w: 36, h: 58, color: '#c48a28' },
    ],
    tnts: [
      { x: 350, y: 536 },
      { x: 920, y: 536 },
      { x: 1430, y: 536 },
    ],
    crates: [
      { x: 810, y: 442 },
      { x: 1370, y: 442 },
    ],
    goldSpawns: [
      { x: 305, y: 308 },
      { x: 820, y: 308 },
      { x: 1370, y: 308 },
      { x: 480, y: 402 },
      { x: 810, y: 402 },
      { x: 1370, y: 402 },
      { x: 190, y: 496 },
      { x: 730, y: 496 },
      { x: 1260, y: 496 },
      { x: 635, y: 588 },
    ],
    coinSpawns: [
      { x: 150, y: 598 },
      { x: 635, y: 598 },
      { x: 1155, y: 598 },
      { x: 190, y: 506 },
      { x: 910, y: 506 },
      { x: 1260, y: 506 },
      { x: 480, y: 412 },
      { x: 1070, y: 412 },
      { x: 820, y: 318 },
      { x: 1370, y: 318 },
    ],
    p1Spawn: { x: 180, y: 480 },
    p2Spawn: { x: 1320, y: 480 },
  },

  // =========================================================================
  // 4. SPECIAL: TRAIN (暴走列車ジャンクション) — 3 Multi-Tier Steam Trains!
  //    3 full steam trains roaring in opposite directions across 3 railway
  //    trestle levels (1F right, 2F left, 3F right) + desert gale!
  // =========================================================================
  {
    id: 'train',
    name: 'TRAIN',
    category: 'special',
    bgSrc: './assets/train-bg.jpg',
    windBase: -42,
    platforms: [
      // Track 1 (1F Railway Bed, y=720) — continuous rail bed for Train #1
      { x: 0, y: 720, w: 1680, h: 60, style: 'mesa' },

      // Track 2 (2F Trestle Railway, y=628, 92px up) — spans for Train #2 (going LEFT!)
      { x: 0, y: 628, w: 460, h: 16, oneWay: true, style: 'bridge' },
      { x: 540, y: 628, w: 500, h: 16, oneWay: true, style: 'bridge' },
      { x: 1120, y: 628, w: 560, h: 16, oneWay: true, style: 'bridge' },

      // Track 3 (3F High Iron Trestle, y=536, 92px up) — spans for Train #3 (going RIGHT!)
      { x: 60, y: 536, w: 420, h: 16, oneWay: true, style: 'bridge' },
      { x: 580, y: 536, w: 460, h: 16, oneWay: true, style: 'bridge' },
      { x: 1140, y: 536, w: 480, h: 16, oneWay: true, style: 'bridge' },

      // Tier 4 (y=442, 94px up — signal station catwalks & crumbling planks above tracks)
      { x: 180, y: 442, w: 220, h: 18, oneWay: true, style: 'wood' },
      { x: 520, y: 442, w: 130, h: 16, oneWay: true, style: 'awning', crumble: true },
      { x: 740, y: 442, w: 240, h: 18, oneWay: true, style: 'wood' },
      { x: 1090, y: 442, w: 130, h: 16, oneWay: true, style: 'awning', crumble: true },
      { x: 1310, y: 442, w: 220, h: 18, oneWay: true, style: 'wood' },

      // Tier 5 (y=348, 94px up — top water-tower & signal lookout decks)
      { x: 350, y: 348, w: 210, h: 16, oneWay: true, style: 'wood' },
      { x: 1120, y: 348, w: 210, h: 16, oneWay: true, style: 'wood' },
    ],
    // 3 roaring Steam Trains on 3 stacked railway levels!
    trains: [
      { x: 100, y: 656, w: 220, h: 64, speed: 175 },
      { x: 960, y: 564, w: 220, h: 64, speed: -160 },
      { x: 520, y: 472, w: 220, h: 64, speed: 185 },
    ],
    springs: [
      { x: 30, y: 694, w: 32, h: 26, power: 770 },
      { x: 820, y: 694, w: 32, h: 26, power: 770 },
      { x: 1590, y: 694, w: 32, h: 26, power: 770 },
    ],
    doors: [],
    tnts: [
      { x: 290, y: 442 },
      { x: 860, y: 442 },
      { x: 1420, y: 442 },
    ],
    crates: [
      { x: 455, y: 348 },
      { x: 1225, y: 348 },
    ],
    goldSpawns: [
      { x: 455, y: 308 },
      { x: 1225, y: 308 },
      { x: 290, y: 402 },
      { x: 860, y: 402 },
      { x: 1420, y: 402 },
      { x: 270, y: 496 },
      { x: 810, y: 496 },
      { x: 1380, y: 496 },
      { x: 585, y: 588 },
      { x: 1155, y: 588 },
    ],
    coinSpawns: [
      { x: 230, y: 598 },
      { x: 790, y: 598 },
      { x: 1350, y: 598 },
      { x: 270, y: 506 },
      { x: 810, y: 506 },
      { x: 1380, y: 506 },
      { x: 585, y: 412 },
      { x: 1155, y: 412 },
      { x: 455, y: 318 },
      { x: 1225, y: 318 },
    ],
    p1Spawn: { x: 260, y: 390 },
    p2Spawn: { x: 1400, y: 390 },
  },

  // =========================================================================
  // 5. SPECIAL: MINE (暗闇の廃坑) — Cavern Lantern Spotlight + Ore Conveyors!
  //    Darkness veil lit around player, gold, blasts & flashes; conveyor belts
  //    push fighters & gold; paired mine-shaft warp doors
  // =========================================================================
  {
    id: 'mine',
    name: 'MINE',
    category: 'special',
    bgSrc: './assets/mine-bg.jpg',
    darkness: true,
    platforms: [
      // Continuous bedrock floor
      { x: 0, y: 720, w: 1680, h: 60, style: 'mesa' },

      // Jumpable ore-cart rock cover pillars (h=54px)
      { x: 420, y: 666, w: 50, h: 54, solid: true, style: 'mesa' },
      { x: 1200, y: 666, w: 50, h: 54, solid: true, style: 'mesa' },

      // Tier 1 (y=628, 92px up — fast ore conveyor belts pushing opposite ways!)
      { x: 60, y: 628, w: 300, h: 18, oneWay: true, style: 'bridge', conveyorSpeed: 105 },
      { x: 520, y: 628, w: 320, h: 18, oneWay: true, style: 'bridge', conveyorSpeed: -105 },
      { x: 980, y: 628, w: 300, h: 18, oneWay: true, style: 'bridge', conveyorSpeed: 105 },
      { x: 1360, y: 628, w: 260, h: 18, oneWay: true, style: 'bridge', conveyorSpeed: -105 },

      // Tier 2 (y=536, 92px up — timber mine galleries)
      { x: 200, y: 536, w: 280, h: 18, oneWay: true, style: 'wood' },
      { x: 680, y: 536, w: 320, h: 18, oneWay: true, style: 'wood' },
      { x: 1180, y: 536, w: 280, h: 18, oneWay: true, style: 'wood' },

      // Tier 3 (y=442, 94px up — upper ore conveyor runs!)
      { x: 40, y: 442, w: 280, h: 16, oneWay: true, style: 'bridge', conveyorSpeed: -115 },
      { x: 460, y: 442, w: 280, h: 16, oneWay: true, style: 'bridge', conveyorSpeed: 115 },
      { x: 920, y: 442, w: 280, h: 16, oneWay: true, style: 'bridge', conveyorSpeed: -115 },
      { x: 1340, y: 442, w: 280, h: 16, oneWay: true, style: 'bridge', conveyorSpeed: 115 },

      // Tier 4 (y=348, 94px up — deep gold vein chambers)
      { x: 260, y: 348, w: 240, h: 18, oneWay: true, style: 'mesa' },
      { x: 720, y: 348, w: 240, h: 18, oneWay: true, style: 'mesa' },
      { x: 1180, y: 348, w: 240, h: 18, oneWay: true, style: 'mesa' },
    ],
    springs: [
      { x: 20, y: 694, w: 32, h: 26, power: 770 },
      { x: 840, y: 694, w: 32, h: 26, power: 770 },
      { x: 1620, y: 694, w: 32, h: 26, power: 770 },
    ],
    doors: [
      { id: 'ma1', pairId: 'ma2', x: 160, y: 662, w: 36, h: 58, color: '#e8aa2a' },
      { id: 'ma2', pairId: 'ma1', x: 1280, y: 290, w: 36, h: 58, color: '#e8aa2a' },
      { id: 'mb1', pairId: 'mb2', x: 1480, y: 662, w: 36, h: 58, color: '#4c88b5' },
      { id: 'mb2', pairId: 'mb1', x: 360, y: 290, w: 36, h: 58, color: '#4c88b5' },
    ],
    tnts: [
      { x: 680, y: 628 },
      { x: 840, y: 536 },
      { x: 1120, y: 628 },
    ],
    crates: [
      { x: 340, y: 536 },
      { x: 1320, y: 536 },
    ],
    goldSpawns: [
      { x: 380, y: 308 },
      { x: 840, y: 308 },
      { x: 1300, y: 308 },
      { x: 180, y: 402 },
      { x: 600, y: 402 },
      { x: 1060, y: 402 },
      { x: 1480, y: 402 },
      { x: 340, y: 496 },
      { x: 840, y: 496 },
      { x: 1320, y: 496 },
    ],
    coinSpawns: [
      { x: 210, y: 598 },
      { x: 680, y: 598 },
      { x: 1130, y: 598 },
      { x: 1490, y: 598 },
      { x: 340, y: 506 },
      { x: 840, y: 506 },
      { x: 1320, y: 506 },
      { x: 600, y: 412 },
      { x: 1060, y: 412 },
      { x: 840, y: 318 },
    ],
    p1Spawn: { x: 260, y: 660 },
    p2Spawn: { x: 1380, y: 660 },
  },

  // =========================================================================
  // 6. SPECIAL: STORM (低重力・砂嵐メサ) — Low Gravity (0.62x) + Shifting Gusts!
  //    Soaring aerial gunfights, shifting wind every ~6s, crumbling sky bridges
  // =========================================================================
  {
    id: 'storm',
    name: 'STORM',
    category: 'special',
    bgSrc: './assets/storm-bg.jpg',
    gravityScale: 0.62,
    gustWind: true,
    platforms: [
      // Island canyon bases with wide aerial chasms (easy to cross in Low-G!)
      { x: 0, y: 720, w: 360, h: 60, style: 'mesa' },
      { x: 460, y: 720, w: 340, h: 60, style: 'mesa' },
      { x: 900, y: 720, w: 340, h: 60, style: 'mesa' },
      { x: 1340, y: 720, w: 340, h: 60, style: 'mesa' },

      // Tier 1 (y=628, 92px up — floating sandstone mesas & crumbling bridges)
      { x: 140, y: 628, w: 210, h: 18, oneWay: true, style: 'mesa' },
      { x: 380, y: 628, w: 120, h: 16, oneWay: true, style: 'awning', crumble: true },
      { x: 620, y: 628, w: 220, h: 18, oneWay: true, style: 'mesa' },
      { x: 1060, y: 628, w: 220, h: 18, oneWay: true, style: 'mesa' },
      { x: 1300, y: 628, w: 120, h: 16, oneWay: true, style: 'awning', crumble: true },

      // Tier 2 (y=536, 92px up — floating rock islands + moving wind-raft)
      { x: 40, y: 536, w: 200, h: 18, oneWay: true, style: 'mesa' },
      { x: 420, y: 536, w: 220, h: 18, oneWay: true, style: 'bridge' },
      {
        x: 810,
        y: 536,
        w: 160,
        h: 18,
        oneWay: true,
        style: 'wood',
        moveAxis: 'x',
        moveRange: 110,
        moveSpeed: 1.15,
      },
      { x: 1220, y: 536, w: 220, h: 18, oneWay: true, style: 'bridge' },

      // Tier 3 (y=442, 94px up — high storm spires)
      { x: 220, y: 442, w: 210, h: 18, oneWay: true, style: 'mesa' },
      { x: 640, y: 442, w: 210, h: 18, oneWay: true, style: 'mesa' },
      { x: 1060, y: 442, w: 210, h: 18, oneWay: true, style: 'mesa' },
      { x: 1440, y: 442, w: 200, h: 18, oneWay: true, style: 'mesa' },

      // Tier 4 (y=348, 94px up — sky-high mesas & crumbling center span)
      { x: 380, y: 348, w: 200, h: 16, oneWay: true, style: 'bridge' },
      { x: 780, y: 348, w: 130, h: 16, oneWay: true, style: 'awning', crumble: true },
      { x: 1100, y: 348, w: 200, h: 16, oneWay: true, style: 'bridge' },
    ],
    springs: [
      { x: 60, y: 694, w: 32, h: 26, power: 680 },
      { x: 610, y: 694, w: 32, h: 26, power: 680 },
      { x: 1050, y: 694, w: 32, h: 26, power: 680 },
      { x: 1490, y: 694, w: 32, h: 26, power: 680 },
    ],
    doors: [],
    tnts: [
      { x: 240, y: 628 },
      { x: 730, y: 628 },
      { x: 1170, y: 628 },
    ],
    crates: [
      { x: 325, y: 442 },
      { x: 1165, y: 442 },
    ],
    goldSpawns: [
      { x: 480, y: 308 },
      { x: 845, y: 308 },
      { x: 1200, y: 308 },
      { x: 325, y: 402 },
      { x: 745, y: 402 },
      { x: 1165, y: 402 },
      { x: 1540, y: 402 },
      { x: 530, y: 496 },
      { x: 1330, y: 496 },
      { x: 730, y: 588 },
    ],
    coinSpawns: [
      { x: 240, y: 598 },
      { x: 730, y: 598 },
      { x: 1170, y: 598 },
      { x: 140, y: 506 },
      { x: 530, y: 506 },
      { x: 1330, y: 506 },
      { x: 325, y: 412 },
      { x: 745, y: 412 },
      { x: 480, y: 318 },
      { x: 1200, y: 318 },
    ],
    p1Spawn: { x: 160, y: 660 },
    p2Spawn: { x: 1060, y: 660 },
  },
];
