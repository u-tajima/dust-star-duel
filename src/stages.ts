import type { StageDef } from './types';

// Large DS-style horizontally wrapping world; camera zooms into VIEW_W x VIEW_H around player
export const WORLD_W = 1680;
export const WORLD_H = 780;
export const VIEW_W = 560;
export const VIEW_H = 315;

export const WIN_STARS = 5;
export const COINS_FOR_POWERUP = 6;

export const STAGES: StageDef[] = [
  {
    id: 'canyon',
    name: 'CANYON',
    platforms: [
      // Main canyon ground (continuous wrapping base with raised ridges)
      { x: 0, y: 720, w: 1680, h: 60, style: 'mesa' },
      // Lower wooden decks
      { x: 90, y: 615, w: 220, h: 18, oneWay: true, style: 'wood' },
      { x: 460, y: 590, w: 240, h: 18, oneWay: true, style: 'wood' },
      { x: 860, y: 615, w: 230, h: 18, oneWay: true, style: 'wood' },
      { x: 1260, y: 590, w: 240, h: 18, oneWay: true, style: 'wood' },
      // Mid canyon mesas
      { x: 240, y: 485, w: 210, h: 20, oneWay: true, style: 'mesa' },
      { x: 670, y: 465, w: 250, h: 20, oneWay: true, style: 'mesa' },
      { x: 1090, y: 485, w: 210, h: 20, oneWay: true, style: 'mesa' },
      { x: 1480, y: 470, w: 180, h: 20, oneWay: true, style: 'mesa' },
      // Upper bridges & cliff ledges
      { x: 40, y: 355, w: 220, h: 16, oneWay: true, style: 'bridge' },
      { x: 440, y: 340, w: 200, h: 16, oneWay: true, style: 'bridge' },
      { x: 850, y: 355, w: 230, h: 16, oneWay: true, style: 'bridge' },
      { x: 1250, y: 340, w: 210, h: 16, oneWay: true, style: 'bridge' },
      // High lookout peaks
      { x: 250, y: 225, w: 190, h: 18, oneWay: true, style: 'mesa' },
      { x: 740, y: 210, w: 200, h: 18, oneWay: true, style: 'mesa' },
      { x: 1180, y: 225, w: 190, h: 18, oneWay: true, style: 'mesa' },
    ],
    springs: [
      { x: 34, y: 694, w: 32, h: 26, power: 760 },
      { x: 410, y: 694, w: 32, h: 26, power: 760 },
      { x: 820, y: 694, w: 32, h: 26, power: 760 },
      { x: 1210, y: 694, w: 32, h: 26, power: 760 },
      { x: 775, y: 439, w: 32, h: 26, power: 680 },
    ],
    starSpawns: [
      { x: 345, y: 185 },
      { x: 840, y: 170 },
      { x: 1275, y: 185 },
      { x: 150, y: 315 },
      { x: 540, y: 300 },
      { x: 965, y: 315 },
      { x: 1355, y: 300 },
      { x: 345, y: 445 },
      { x: 1195, y: 445 },
      { x: 580, y: 550 },
      { x: 1380, y: 550 },
    ],
    coinSpawns: [
      { x: 200, y: 585 },
      { x: 580, y: 560 },
      { x: 975, y: 585 },
      { x: 1380, y: 560 },
      { x: 345, y: 455 },
      { x: 795, y: 435 },
      { x: 1195, y: 455 },
      { x: 150, y: 325 },
      { x: 540, y: 310 },
      { x: 965, y: 325 },
      { x: 1355, y: 310 },
      { x: 840, y: 180 },
    ],
    p1Spawn: { x: 220, y: 660 },
    p2Spawn: { x: 1060, y: 660 },
  },
  {
    id: 'saloon',
    name: 'SALOON',
    platforms: [
      // Ground floor with saloon boardwalks
      { x: 0, y: 720, w: 720, h: 60, style: 'wood' },
      { x: 840, y: 720, w: 720, h: 60, style: 'wood' },
      // Central & wrap moving lifts
      {
        x: 730,
        y: 570,
        w: 100,
        h: 18,
        oneWay: true,
        style: 'bridge',
        moveAxis: 'y',
        moveRange: 130,
        moveSpeed: 1.35,
      },
      {
        x: 1570,
        y: 570,
        w: 100,
        h: 18,
        oneWay: true,
        style: 'bridge',
        moveAxis: 'y',
        moveRange: 130,
        moveSpeed: 1.35,
      },
      // First-floor saloon decks
      { x: 80, y: 590, w: 240, h: 18, oneWay: true, style: 'wood' },
      { x: 420, y: 590, w: 240, h: 18, oneWay: true, style: 'wood' },
      { x: 920, y: 590, w: 240, h: 18, oneWay: true, style: 'wood' },
      { x: 1260, y: 590, w: 240, h: 18, oneWay: true, style: 'wood' },
      // Second-floor balconies
      { x: 220, y: 460, w: 260, h: 18, oneWay: true, style: 'wood' },
      { x: 640, y: 440, w: 280, h: 18, oneWay: true, style: 'wood' },
      { x: 1060, y: 460, w: 260, h: 18, oneWay: true, style: 'wood' },
      { x: 1460, y: 440, w: 200, h: 18, oneWay: true, style: 'wood' },
      // Third-floor rafters
      { x: 70, y: 330, w: 210, h: 16, oneWay: true, style: 'bridge' },
      { x: 460, y: 320, w: 210, h: 16, oneWay: true, style: 'bridge' },
      { x: 910, y: 330, w: 210, h: 16, oneWay: true, style: 'bridge' },
      { x: 1300, y: 320, w: 210, h: 16, oneWay: true, style: 'bridge' },
      // Rooftop beams
      { x: 280, y: 210, w: 220, h: 16, oneWay: true, style: 'wood' },
      { x: 1120, y: 210, w: 220, h: 16, oneWay: true, style: 'wood' },
    ],
    springs: [
      { x: 350, y: 694, w: 32, h: 26, power: 770 },
      { x: 1190, y: 694, w: 32, h: 26, power: 770 },
      { x: 764, y: 414, w: 32, h: 26, power: 680 },
    ],
    starSpawns: [
      { x: 390, y: 170 },
      { x: 1230, y: 170 },
      { x: 175, y: 290 },
      { x: 565, y: 280 },
      { x: 1015, y: 290 },
      { x: 1405, y: 280 },
      { x: 350, y: 420 },
      { x: 1190, y: 420 },
      { x: 200, y: 550 },
      { x: 1040, y: 550 },
    ],
    coinSpawns: [
      { x: 200, y: 560 },
      { x: 540, y: 560 },
      { x: 1040, y: 560 },
      { x: 1380, y: 560 },
      { x: 350, y: 430 },
      { x: 780, y: 410 },
      { x: 1190, y: 430 },
      { x: 175, y: 300 },
      { x: 1015, y: 300 },
      { x: 390, y: 180 },
      { x: 1230, y: 180 },
    ],
    p1Spawn: { x: 180, y: 660 },
    p2Spawn: { x: 1020, y: 660 },
  },
  {
    id: 'bridge',
    name: 'BRIDGE',
    platforms: [
      // Split canyon piers (falling off wraps to top sky like Mario Bros!)
      { x: 40, y: 720, w: 420, h: 60, style: 'mesa' },
      { x: 580, y: 720, w: 460, h: 60, style: 'mesa' },
      { x: 1160, y: 720, w: 440, h: 60, style: 'mesa' },
      // Horizontal moving minecarts
      {
        x: 340,
        y: 590,
        w: 140,
        h: 18,
        oneWay: true,
        style: 'bridge',
        moveAxis: 'x',
        moveRange: 140,
        moveSpeed: 1.15,
      },
      {
        x: 1140,
        y: 590,
        w: 140,
        h: 18,
        oneWay: true,
        style: 'bridge',
        moveAxis: 'x',
        moveRange: 140,
        moveSpeed: 1.15,
      },
      // Main railway trestle
      { x: 0, y: 465, w: 360, h: 18, oneWay: true, style: 'bridge' },
      { x: 480, y: 465, w: 360, h: 18, oneWay: true, style: 'bridge' },
      { x: 960, y: 465, w: 360, h: 18, oneWay: true, style: 'bridge' },
      { x: 1420, y: 465, w: 260, h: 18, oneWay: true, style: 'bridge' },
      // Upper canyon trusses
      { x: 200, y: 335, w: 240, h: 18, oneWay: true, style: 'wood' },
      { x: 680, y: 335, w: 260, h: 18, oneWay: true, style: 'wood' },
      { x: 1180, y: 335, w: 240, h: 18, oneWay: true, style: 'wood' },
      // High sky-bridge
      { x: 440, y: 210, w: 240, h: 16, oneWay: true, style: 'bridge' },
      { x: 980, y: 210, w: 240, h: 16, oneWay: true, style: 'bridge' },
    ],
    springs: [
      { x: 240, y: 694, w: 32, h: 26, power: 770 },
      { x: 790, y: 694, w: 32, h: 26, power: 770 },
      { x: 1360, y: 694, w: 32, h: 26, power: 770 },
      { x: 640, y: 439, w: 32, h: 26, power: 690 },
      { x: 1120, y: 439, w: 32, h: 26, power: 690 },
    ],
    starSpawns: [
      { x: 560, y: 170 },
      { x: 1100, y: 170 },
      { x: 320, y: 295 },
      { x: 810, y: 295 },
      { x: 1300, y: 295 },
      { x: 180, y: 425 },
      { x: 660, y: 425 },
      { x: 1140, y: 425 },
      { x: 240, y: 660 },
      { x: 810, y: 660 },
    ],
    coinSpawns: [
      { x: 180, y: 435 },
      { x: 660, y: 435 },
      { x: 1140, y: 435 },
      { x: 1520, y: 435 },
      { x: 320, y: 305 },
      { x: 810, y: 305 },
      { x: 1300, y: 305 },
      { x: 560, y: 180 },
      { x: 1100, y: 180 },
      { x: 810, y: 685 },
    ],
    p1Spawn: { x: 160, y: 660 },
    p2Spawn: { x: 1280, y: 660 },
  },
];
