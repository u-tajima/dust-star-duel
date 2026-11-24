import type { StageDef } from './types';

// Large DS-style horizontally wrapping world; camera zooms into VIEW_W x VIEW_H around player
export const WORLD_W = 1680;
export const WORLD_H = 780;
export const VIEW_W = 560;
export const VIEW_H = 315;

export const COINS_FOR_GEAR = 6;
export const MAX_HP = 3;

export const STAGES: StageDef[] = [
  // =========================================================================
  // 1. WASTELAND (荒野) — All classic frontier gimmicks unified!
  //    Chasm sky-drops, moving minecart, vertical lift, cover mesas, springs
  // =========================================================================
  {
    id: 'wasteland',
    name: 'WASTELAND',
    bgSrc: './assets/western-bg.jpg',
    platforms: [
      // Split canyon ground with 2 sky-drop chasms (Mario vs Luigi style!)
      { x: 0, y: 720, w: 540, h: 60, style: 'mesa' },
      { x: 660, y: 720, w: 460, h: 60, style: 'mesa' },
      { x: 1240, y: 720, w: 440, h: 60, style: 'mesa' },

      // Solid sandstone cover boulders on the ground (blocks bullets & movement)
      { x: 250, y: 664, w: 56, h: 56, solid: true, style: 'mesa' },
      { x: 860, y: 664, w: 64, h: 56, solid: true, style: 'mesa' },
      { x: 1410, y: 664, w: 56, h: 56, solid: true, style: 'mesa' },

      // Horizontal moving minecart over West chasm
      {
        x: 520,
        y: 615,
        w: 130,
        h: 18,
        oneWay: true,
        style: 'bridge',
        moveAxis: 'x',
        moveRange: 130,
        moveSpeed: 1.25,
      },
      // Vertical mine elevator over East chasm
      {
        x: 1130,
        y: 540,
        w: 100,
        h: 18,
        oneWay: true,
        style: 'bridge',
        moveAxis: 'y',
        moveRange: 140,
        moveSpeed: 1.35,
      },

      // Mid-tier wooden decks & canyon ledges
      { x: 60, y: 580, w: 230, h: 18, oneWay: true, style: 'wood' },
      { x: 750, y: 565, w: 260, h: 18, oneWay: true, style: 'wood' },
      { x: 1340, y: 580, w: 240, h: 18, oneWay: true, style: 'wood' },

      // Canyon cliff mesas + upper cover rock
      { x: 220, y: 455, w: 230, h: 20, oneWay: true, style: 'mesa' },
      { x: 620, y: 440, w: 240, h: 20, oneWay: true, style: 'mesa' },
      { x: 970, y: 440, w: 140, h: 20, oneWay: true, style: 'mesa' },
      { x: 1290, y: 455, w: 230, h: 20, oneWay: true, style: 'mesa' },

      // High railway X-truss trestle bridges
      { x: 20, y: 325, w: 240, h: 16, oneWay: true, style: 'bridge' },
      { x: 430, y: 315, w: 240, h: 16, oneWay: true, style: 'bridge' },
      { x: 860, y: 315, w: 250, h: 16, oneWay: true, style: 'bridge' },
      { x: 1290, y: 325, w: 240, h: 16, oneWay: true, style: 'bridge' },

      // Summit lookout rocks
      { x: 260, y: 205, w: 190, h: 18, oneWay: true, style: 'mesa' },
      { x: 740, y: 195, w: 200, h: 18, oneWay: true, style: 'mesa' },
      { x: 1200, y: 205, w: 190, h: 18, oneWay: true, style: 'mesa' },
    ],
    springs: [
      { x: 34, y: 694, w: 32, h: 26, power: 770 },
      { x: 460, y: 694, w: 32, h: 26, power: 770 },
      { x: 700, y: 694, w: 32, h: 26, power: 770 },
      { x: 1290, y: 694, w: 32, h: 26, power: 770 },
      { x: 730, y: 414, w: 32, h: 26, power: 690 },
    ],
    doors: [],
    tnts: [
      { x: 390, y: 720 },
      { x: 960, y: 565 },
      { x: 840, y: 195 },
    ],
    crates: [
      { x: 335, y: 455 },
      { x: 1405, y: 455 },
    ],
    goldSpawns: [
      { x: 355, y: 165 },
      { x: 840, y: 155 },
      { x: 1295, y: 165 },
      { x: 140, y: 285 },
      { x: 550, y: 275 },
      { x: 985, y: 275 },
      { x: 1410, y: 285 },
      { x: 335, y: 415 },
      { x: 1180, y: 440 },
      { x: 880, y: 525 },
    ],
    coinSpawns: [
      { x: 175, y: 550 },
      { x: 585, y: 575 },
      { x: 880, y: 535 },
      { x: 1460, y: 550 },
      { x: 335, y: 425 },
      { x: 740, y: 410 },
      { x: 1405, y: 425 },
      { x: 550, y: 285 },
      { x: 985, y: 285 },
      { x: 840, y: 165 },
    ],
    p1Spawn: { x: 140, y: 660 },
    p2Spawn: { x: 1020, y: 660 },
  },

  // =========================================================================
  // 2. SALOON (酒場) — Multi-room interior ambush!
  //    Solid room walls/bar counters, 2 pairs of Swinging Warp Doors,
  //    Swaying Chandeliers, tight multi-floor verticality
  // =========================================================================
  {
    id: 'saloon',
    name: 'SALOON',
    bgSrc: './assets/saloon-bg.jpg',
    platforms: [
      // Continuous polished saloon floorboards
      { x: 0, y: 720, w: 1680, h: 60, style: 'wood' },

      // Solid bar counters & interior pillar dividers (real bullet cover!)
      { x: 360, y: 664, w: 48, h: 56, solid: true, style: 'wood' },
      { x: 820, y: 610, w: 40, h: 110, solid: true, style: 'wood' },
      { x: 1260, y: 664, w: 48, h: 56, solid: true, style: 'wood' },

      // Mezzanine / 2nd-floor saloon galleries (leaving grand central atrium open)
      { x: 40, y: 575, w: 320, h: 18, oneWay: true, style: 'wood' },
      { x: 440, y: 555, w: 280, h: 18, oneWay: true, style: 'wood' },
      { x: 960, y: 555, w: 280, h: 18, oneWay: true, style: 'wood' },
      { x: 1320, y: 575, w: 320, h: 18, oneWay: true, style: 'wood' },

      // Solid 2nd-floor saloon room partitions (create CQC rooms & peek corners)
      { x: 180, y: 465, w: 34, h: 110, solid: true, style: 'wood' },
      { x: 1460, y: 465, w: 34, h: 110, solid: true, style: 'wood' },

      // 3rd-floor VIP balconies
      { x: 0, y: 430, w: 350, h: 18, oneWay: true, style: 'wood' },
      { x: 480, y: 410, w: 210, h: 18, oneWay: true, style: 'wood' },
      { x: 990, y: 410, w: 210, h: 18, oneWay: true, style: 'wood' },
      { x: 1330, y: 430, w: 350, h: 18, oneWay: true, style: 'wood' },

      // Swaying Chandeliers suspended over the open halls!
      {
        x: 750,
        y: 355,
        w: 160,
        h: 16,
        oneWay: true,
        style: 'chandelier',
        moveAxis: 'x',
        moveRange: 85,
        moveSpeed: 1.55,
      },
      {
        x: 760,
        y: 210,
        w: 150,
        h: 16,
        oneWay: true,
        style: 'chandelier',
        moveAxis: 'x',
        moveRange: 105,
        moveSpeed: -1.35,
      },

      // High rafters & backstage catwalks
      { x: 140, y: 270, w: 250, h: 16, oneWay: true, style: 'bridge' },
      { x: 450, y: 245, w: 180, h: 16, oneWay: true, style: 'bridge' },
      { x: 1050, y: 245, w: 180, h: 16, oneWay: true, style: 'bridge' },
      { x: 1290, y: 270, w: 250, h: 16, oneWay: true, style: 'bridge' },
    ],
    springs: [
      { x: 740, y: 694, w: 32, h: 26, power: 760 },
      { x: 910, y: 694, w: 32, h: 26, power: 760 },
      { x: 455, y: 529, w: 32, h: 26, power: 680 },
      { x: 1195, y: 529, w: 32, h: 26, power: 680 },
    ],
    // 2 pairs of Swinging Saloon Warp Doors!
    doors: [
      // Pair A (Crimson): Ground West Bar <-> Upper East VIP Rafters
      { id: 'sa1', pairId: 'sa2', x: 70, y: 662, w: 36, h: 58, color: '#b23b2a' },
      { id: 'sa2', pairId: 'sa1', x: 1400, y: 212, w: 36, h: 58, color: '#b23b2a' },
      // Pair B (Indigo): Ground East Bar <-> Upper West VIP Rafters
      { id: 'sb1', pairId: 'sb2', x: 1560, y: 662, w: 36, h: 58, color: '#354f70' },
      { id: 'sb2', pairId: 'sb1', x: 240, y: 212, w: 36, h: 58, color: '#354f70' },
    ],
    tnts: [
      { x: 580, y: 555 },
      { x: 1100, y: 555 },
      { x: 840, y: 720 },
    ],
    crates: [
      { x: 585, y: 410 },
      { x: 1095, y: 410 },
    ],
    goldSpawns: [
      { x: 835, y: 165 },
      { x: 830, y: 310 },
      { x: 265, y: 230 },
      { x: 1415, y: 230 },
      { x: 540, y: 205 },
      { x: 1140, y: 205 },
      { x: 110, y: 390 },
      { x: 1560, y: 390 },
      { x: 580, y: 515 },
      { x: 1100, y: 515 },
    ],
    coinSpawns: [
      { x: 260, y: 690 },
      { x: 1420, y: 690 },
      { x: 580, y: 525 },
      { x: 1100, y: 525 },
      { x: 585, y: 380 },
      { x: 1095, y: 380 },
      { x: 265, y: 240 },
      { x: 1415, y: 240 },
      { x: 830, y: 325 },
      { x: 835, y: 180 },
    ],
    p1Spawn: { x: 200, y: 660 },
    p2Spawn: { x: 1440, y: 660 },
  },

  // =========================================================================
  // 3. TOWN (市街) — Gunman Clive Frontier Main Street!
  //    Multi-building rooftops & alleys, Rolling Steam Train across Main St,
  //    Crumbling Storefront Awnings, Alleyway Warp Doors
  // =========================================================================
  {
    id: 'town',
    name: 'TOWN',
    bgSrc: './assets/town-bg.jpg',
    platforms: [
      // Dusty Main Street railway roadbed
      { x: 0, y: 720, w: 1680, h: 60, style: 'mesa' },

      // --- Building 1: SHERIFF'S OFFICE (West, walls grounded flush to y=720!) ---
      { x: 90, y: 522, w: 32, h: 198, solid: true, style: 'brick' },
      { x: 348, y: 522, w: 32, h: 198, solid: true, style: 'brick' },
      { x: 75, y: 502, w: 320, h: 20, oneWay: true, style: 'wood' },
      // Crumbling wooden awning extending over street!
      { x: 395, y: 545, w: 120, h: 16, oneWay: true, style: 'awning', crumble: true },

      // --- Building 2: FRONTIER BANK (Center, walls grounded flush to y=720!) ---
      { x: 640, y: 482, w: 34, h: 238, solid: true, style: 'brick' },
      { x: 958, y: 482, w: 34, h: 238, solid: true, style: 'brick' },
      { x: 625, y: 462, w: 385, h: 20, oneWay: true, style: 'brick' },
      // Bank interior mezzanine
      { x: 674, y: 585, w: 284, h: 16, oneWay: true, style: 'wood' },
      // Crumbling bank awnings on both flanks
      { x: 515, y: 495, w: 110, h: 16, oneWay: true, style: 'awning', crumble: true },
      { x: 1010, y: 495, w: 110, h: 16, oneWay: true, style: 'awning', crumble: true },

      // --- Building 3: CLOCKTOWER & GENERAL STORE (East, walls grounded flush to y=720!) ---
      { x: 1220, y: 522, w: 32, h: 198, solid: true, style: 'brick' },
      { x: 1498, y: 522, w: 32, h: 198, solid: true, style: 'brick' },
      { x: 1205, y: 502, w: 340, h: 20, oneWay: true, style: 'wood' },
      // Crumbling awning on far East
      { x: 1545, y: 545, w: 115, h: 16, oneWay: true, style: 'awning', crumble: true },

      // Upper rooftop parapet & telegraph wire walkways
      { x: 150, y: 360, w: 220, h: 16, oneWay: true, style: 'bridge' },
      { x: 690, y: 330, w: 260, h: 18, oneWay: true, style: 'brick' },
      { x: 1260, y: 360, w: 230, h: 16, oneWay: true, style: 'bridge' },

      // High Clocktower belfry & telegraph spans
      { x: 420, y: 245, w: 180, h: 16, oneWay: true, style: 'bridge' },
      { x: 1040, y: 245, w: 180, h: 16, oneWay: true, style: 'bridge' },
      { x: 1310, y: 215, w: 150, h: 18, oneWay: true, style: 'wood' },
    ],
    // Roaring Steam Train rolling along Main Street (ride roof or dodge cowcatcher!)
    train: {
      x: 120,
      y: 656,
      w: 220,
      h: 64,
      speed: 145,
    },
    springs: [
      { x: 455, y: 694, w: 32, h: 26, power: 760 },
      { x: 1110, y: 694, w: 32, h: 26, power: 760 },
      { x: 230, y: 476, w: 32, h: 26, power: 660 },
    ],
    // Alleyway & Bank-to-Clocktower Warp Doors
    doors: [
      { id: 'ta1', pairId: 'ta2', x: 795, y: 527, w: 36, h: 58, color: '#c48a28' },
      { id: 'ta2', pairId: 'ta1', x: 1365, y: 157, w: 36, h: 58, color: '#c48a28' },
    ],
    tnts: [
      { x: 235, y: 502 },
      { x: 820, y: 462 },
      { x: 1375, y: 502 },
    ],
    crates: [
      { x: 820, y: 330 },
      { x: 1375, y: 360 },
    ],
    goldSpawns: [
      { x: 1385, y: 175 },
      { x: 510, y: 205 },
      { x: 1130, y: 205 },
      { x: 820, y: 290 },
      { x: 260, y: 320 },
      { x: 1375, y: 320 },
      { x: 815, y: 545 },
      { x: 455, y: 505 },
      { x: 1065, y: 455 },
      { x: 560, y: 660 },
    ],
    coinSpawns: [
      { x: 235, y: 470 },
      { x: 455, y: 515 },
      { x: 820, y: 430 },
      { x: 1065, y: 465 },
      { x: 1375, y: 470 },
      { x: 260, y: 330 },
      { x: 820, y: 300 },
      { x: 510, y: 215 },
      { x: 1130, y: 215 },
      { x: 1385, y: 185 },
    ],
    p1Spawn: { x: 230, y: 450 },
    p2Spawn: { x: 1375, y: 450 },
  },
];
