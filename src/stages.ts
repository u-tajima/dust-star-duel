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
    train: {
      x: 160,
      y: 656,
      w: 220,
      h: 64,
      speed: 140,
    },
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
];
