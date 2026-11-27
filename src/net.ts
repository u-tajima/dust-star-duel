import Peer, { type DataConnection } from 'peerjs';
import type { InputState, MatchRules } from './types';

const ROOM_PREFIX = 'gold-rush-duel-v1-';
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export type NetRole = 'offline' | 'host' | 'guest';

export interface NetSnapshot {
  mode: 'title' | 'playing' | 'result';
  stageIndex: number;
  rules: MatchRules;
  time: number;
  winner: 'p1' | 'p2' | null;
  winReason: 'gold' | 'ko';
  shakeTimer: number;
  shakePower: number;
  fighters: unknown[];
  projectiles: unknown[];
  explosions: unknown[];
  golds: unknown[];
  coins: { collected: boolean }[];
  tnts: { alive: boolean }[];
  crates: { alive: boolean }[];
  springs: { bounceTimer: number }[];
  platforms: { x: number; y: number; crumbleState?: 'intact' | 'shaking' | 'broken' }[];
  doors: { swingTimer: number }[];
  trains: { x: number; wheelPhase: number }[];
}

export type NetPacket =
  | { type: 'input'; input: InputState }
  | { type: 'state'; snap: NetSnapshot }
  | { type: 'start'; stageIndex: number; rules: MatchRules }
  | { type: 'rematch' };

export interface NetCallbacks {
  onStatus: (status: string, connected: boolean) => void;
  onPacket: (pkt: NetPacket) => void;
  onDisconnect: () => void;
}

export function generateRoomCode(): string {
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

export class NetManager {
  public role: NetRole = 'offline';
  public roomCode = '';
  public connected = false;

  private peer: Peer | null = null;
  private conn: DataConnection | null = null;
  private cb: NetCallbacks;

  constructor(cb: NetCallbacks) {
    this.cb = cb;
  }

  public disconnect(): void {
    this.connected = false;
    this.role = 'offline';
    this.roomCode = '';
    if (this.conn) {
      try {
        this.conn.close();
      } catch {
        // ignore
      }
      this.conn = null;
    }
    if (this.peer) {
      try {
        this.peer.destroy();
      } catch {
        // ignore
      }
      this.peer = null;
    }
  }

  public createRoom(): string {
    this.disconnect();
    const code = generateRoomCode();
    this.role = 'host';
    this.roomCode = code;
    this.cb.onStatus('WAITING', false);

    const peer = new Peer(`${ROOM_PREFIX}${code}`, { debug: 0 });
    this.peer = peer;

    peer.on('open', () => {
      this.cb.onStatus(`CODE: ${code}`, false);
    });

    peer.on('connection', (conn) => {
      if (this.conn) {
        conn.close();
        return;
      }
      this.bindConnection(conn);
    });

    peer.on('error', () => {
      this.cb.onStatus('ERROR', false);
    });

    return code;
  }

  public joinRoom(rawCode: string): void {
    const code = rawCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
    if (code.length < 4) {
      this.cb.onStatus('4 CHARS', false);
      return;
    }

    this.disconnect();
    this.role = 'guest';
    this.roomCode = code;
    this.cb.onStatus('JOINING...', false);

    const peer = new Peer({ debug: 0 });
    this.peer = peer;

    peer.on('open', () => {
      const conn = peer.connect(`${ROOM_PREFIX}${code}`, { reliable: false });
      this.bindConnection(conn);
    });

    peer.on('error', () => {
      this.cb.onStatus('NOT FOUND', false);
    });
  }

  private bindConnection(conn: DataConnection): void {
    this.conn = conn;
    conn.on('open', () => {
      this.connected = true;
      this.cb.onStatus('READY', true);
    });
    conn.on('data', (data) => {
      if (data && typeof data === 'object' && 'type' in data) {
        this.cb.onPacket(data as NetPacket);
      }
    });
    conn.on('close', () => {
      this.connected = false;
      this.conn = null;
      this.cb.onStatus('CLOSED', false);
      this.cb.onDisconnect();
    });
    conn.on('error', () => {
      this.connected = false;
      this.cb.onStatus('ERROR', false);
    });
  }

  public send(pkt: NetPacket): void {
    if (this.conn && this.connected) {
      try {
        this.conn.send(pkt);
      } catch {
        // ignore transient drop
      }
    }
  }
}
