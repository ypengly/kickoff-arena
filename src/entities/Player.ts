import { PITCH, PLAYER } from '../config/gameConfig';
import type { Role } from '../data/formations';
import { approach, clamp, lerp, normalize } from '../utils/math';

export type AIState =
  | 'HoldPosition' | 'SupportAttack' | 'MoveToBall' | 'ReceivePass' | 'CarryBall'
  | 'PressBall' | 'MarkOpponent' | 'InterceptPass' | 'DefendGoal' | 'ReturnToFormation';

export class Player {
  x = 0; y = 0; vx = 0; vy = 0;
  fx: number; fy = 0;           // facing direction
  stamina = 100;
  exhausted = false;
  sprinting = false;
  kickCooldown = 0;
  tackleCooldown = 0;
  stun = 0;
  tackleFx = 0;                 // visual effect timer
  state: AIState = 'HoldPosition';
  decisionTimer = 0;
  target = { x: 0, y: 0 };
  holdTimer = 0;

  constructor(
    public readonly team: number,
    public readonly number: number,
    public readonly slot: number,
    public readonly role: Role,
  ) {
    this.fx = team === 0 ? 1 : -1;
  }

  get speed() { return Math.hypot(this.vx, this.vy); }
  get isKeeper() { return this.role === 'GK'; }

  /** Advance one physics step. `dir` need not be normalised. */
  update(dirX: number, dirY: number, sprint: boolean, dt: number, speedScale = 1) {
    this.kickCooldown = Math.max(0, this.kickCooldown - dt);
    this.tackleCooldown = Math.max(0, this.tackleCooldown - dt);
    this.tackleFx = Math.max(0, this.tackleFx - dt);
    if (this.stun > 0) { this.stun -= dt; dirX = 0; dirY = 0; sprint = false; }

    const n = normalize(dirX, dirY);
    const moving = n.x !== 0 || n.y !== 0;

    if (this.stamina <= 0) this.exhausted = true;
    else if (this.exhausted && this.stamina >= PLAYER.exhaustRecover) this.exhausted = false;
    this.sprinting = sprint && moving && !this.exhausted;

    const max = (this.sprinting ? PLAYER.sprintSpeed : PLAYER.speed) * speedScale;
    const a = (moving ? PLAYER.accel : PLAYER.brake) * dt;
    this.vx = approach(this.vx, n.x * max, a);
    this.vy = approach(this.vy, n.y * max, a);
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Pitch boundary: players stay on the grass and out of the nets.
    const r = PLAYER.radius;
    if (this.x < PITCH.left + r) { this.x = PITCH.left + r; this.vx = Math.max(0, this.vx); }
    if (this.x > PITCH.right - r) { this.x = PITCH.right - r; this.vx = Math.min(0, this.vx); }
    if (this.y < PITCH.top + r) { this.y = PITCH.top + r; this.vy = Math.max(0, this.vy); }
    if (this.y > PITCH.bottom - r) { this.y = PITCH.bottom - r; this.vy = Math.min(0, this.vy); }

    // Smooth turning toward the direction of travel.
    const sp = this.speed;
    if (sp > 25) {
      const t = Math.min(1, PLAYER.turnRate * dt);
      const f = normalize(lerp(this.fx, this.vx / sp, t), lerp(this.fy, this.vy / sp, t));
      if (f.x !== 0 || f.y !== 0) { this.fx = f.x; this.fy = f.y; }
    }

    this.stamina = clamp(this.stamina + (this.sprinting ? -PLAYER.drain : PLAYER.regen) * dt, 0, 100);
  }

  setFacing(x: number, y: number) {
    const f = normalize(x, y);
    if (f.x !== 0 || f.y !== 0) { this.fx = f.x; this.fy = f.y; }
  }
}
