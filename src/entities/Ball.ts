import type { Player } from './Player';

export type KickKind = 'pass' | 'through' | 'shot' | 'clear' | 'tackle' | 'deflect';

export class Ball {
  x = 0; y = 0; vx = 0; vy = 0;
  rot = 0;
  owner: Player | null = null;
  lastToucher: Player | null = null;
  lastTouchTeam = -1;
  noPickup: Player | null = null;
  noPickupTimer = 0;
  lastKick: KickKind | null = null;
  intendedReceiver: Player | null = null;
  intendedTimer = 0;

  get speed() { return Math.hypot(this.vx, this.vy); }

  reset(x: number, y: number) {
    this.x = x; this.y = y; this.vx = 0; this.vy = 0;
    this.owner = null; this.noPickup = null; this.noPickupTimer = 0;
    this.intendedReceiver = null; this.intendedTimer = 0; this.lastKick = null;
  }
}
