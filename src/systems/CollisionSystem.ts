import { BALL, PITCH, PLAYER } from '../config/gameConfig';
import type { Player } from '../entities/Player';
import { normalize } from '../utils/math';
import type { World } from './World';

/** Push overlapping players apart in a fixed order (deterministic). */
export function separatePlayers(players: Player[]): void {
  const min = PLAYER.radius * 2;
  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      const a = players[i], b = players[j];
      const dx = b.x - a.x, dy = b.y - a.y;
      const d = Math.hypot(dx, dy);
      if (d >= min) continue;
      const n = d < 1e-4 ? { x: 1, y: 0 } : { x: dx / d, y: dy / d };
      const push = (min - d) / 2;
      a.x -= n.x * push; a.y -= n.y * push;
      b.x += n.x * push; b.y += n.y * push;
    }
  }
  const r = PLAYER.radius;
  for (const p of players) {
    p.x = Math.min(PITCH.right - r, Math.max(PITCH.left + r, p.x));
    p.y = Math.min(PITCH.bottom - r, Math.max(PITCH.top + r, p.y));
  }
}

export type PossessionEvent =
  | { type: 'pickup'; player: Player }
  | { type: 'save'; player: Player }
  | { type: 'deflect'; player: Player };

/** Dribbling, pickups, keeper saves and deflections. */
export function updatePossession(w: World, dt: number): PossessionEvent[] {
  const ev: PossessionEvent[] = [];
  const b = w.ball;
  if (b.noPickupTimer > 0) {
    b.noPickupTimer -= dt;
    if (b.noPickupTimer <= 0) b.noPickup = null;
  }

  if (b.owner) {
    const o = b.owner;
    const lead = PLAYER.radius + BALL.radius + BALL.dribbleLead;
    b.x = o.x + o.fx * lead; b.y = o.y + o.fy * lead;
    b.vx = o.vx; b.vy = o.vy;
    b.rot += (o.speed * dt) / BALL.radius;
    return ev;
  }

  let best: Player | null = null;
  let bestD = Infinity;
  for (const p of w.players) {
    if (p === b.noPickup || p.stun > 0) continue;
    const reach = p.isKeeper ? BALL.controlRadius + 6 + w.difficulty.keeperReach : BALL.controlRadius;
    const d = Math.hypot(p.x - b.x, p.y - b.y);
    if (d < reach && d < bestD) { best = p; bestD = d; }
  }
  if (!best) return ev;

  const rel = Math.hypot(b.vx - best.vx, b.vy - best.vy);
  const limit = best.isKeeper ? 460 : 380;
  if (rel <= limit) {
    b.owner = best;
    b.lastToucher = best; b.lastTouchTeam = best.team;
    b.intendedReceiver = null;
    if (best.isKeeper && b.lastKick === 'shot' && b.lastTouchTeam !== -1) ev.push({ type: 'save', player: best });
    ev.push({ type: 'pickup', player: best });
  } else {
    // Too fast to control: keeper parries, outfield players deflect.
    const n = normalize(b.x - best.x, b.y - best.y);
    const sp = b.speed * (best.isKeeper ? 0.55 : 0.5);
    b.vx = n.x * sp; b.vy = n.y * sp;
    b.lastToucher = best; b.lastTouchTeam = best.team; b.lastKick = 'deflect';
    b.noPickup = best; b.noPickupTimer = 0.2;
    ev.push({ type: best.isKeeper ? 'save' : 'deflect', player: best });
  }
  return ev;
}
