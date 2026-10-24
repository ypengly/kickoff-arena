import { BALL, PITCH, PLAYER } from '../config/gameConfig';
import { attackDir } from '../data/formations';
import type { KickKind } from '../entities/Ball';
import type { Player } from '../entities/Player';
import { bell, clamp, distToSegment, normalize, rotate, type Vec2 } from '../utils/math';
import { attackGoalX, mates, opponents, ownGoalX, type World } from './World';

export function kickBall(w: World, p: Player, dx: number, dy: number, power: number, kind: KickKind) {
  const b = w.ball;
  const d = normalize(dx, dy);
  b.owner = null;
  b.vx = d.x * power; b.vy = d.y * power;
  b.lastToucher = p; b.lastTouchTeam = p.team;
  b.noPickup = p; b.noPickupTimer = kind === 'shot' ? 0.4 : 0.3;
  b.lastKick = kind;
  p.kickCooldown = 0.3;
}

export function nearestOpponentDist(w: World, p: Player): number {
  let best = Infinity;
  for (const o of opponents(w, p.team)) best = Math.min(best, Math.hypot(o.x - p.x, o.y - p.y));
  return best;
}

/** Smallest distance from any opponent to the segment a-b: how safe a passing lane is. */
export function laneClearance(w: World, team: number, a: Vec2, b: Vec2): number {
  let best = Infinity;
  for (const o of opponents(w, team)) best = Math.min(best, distToSegment(o, a, b));
  return best;
}

export function canKick(w: World, p: Player): boolean {
  return w.ball.owner === p || (!w.ball.owner && Math.hypot(w.ball.x - p.x, w.ball.y - p.y) < BALL.kickReach);
}

/** Shoot. aim = explicit direction, or null to aim at the opponent goal. charge in [0,1]. */
export function shoot(w: World, p: Player, aim: Vec2 | null, charge: number, errMul: number): boolean {
  if (!canKick(w, p) || p.kickCooldown > 0) return false;
  const gx = attackGoalX(p.team);
  let dir: Vec2;
  if (aim) dir = normalize(aim.x, aim.y);
  else dir = normalize(gx - p.x, PITCH.cy + (w.rng() - 0.5) * PITCH.goalHalf * 1.2 - p.y);
  const distGoal = Math.hypot(gx - p.x, PITCH.cy - p.y);
  const pressure = clamp((70 - nearestOpponentDist(w, p)) / 70, 0, 1);
  const err = (0.02 + (distGoal / 1400) * 0.14 + pressure * 0.08) * errMul;
  dir = rotate(dir, bell(w.rng) * err * 2);
  const c = clamp(charge, 0.3, 1);
  kickBall(w, p, dir.x, dir.y, 520 + 330 * c, 'shot');
  return true;
}

/** Choose the best receiver for a pass. */
export function findReceiver(w: World, p: Player, aim: Vec2, through: boolean): Player | null {
  const maxRange = through ? 520 : 400;
  const dirX = attackDir(p.team);
  let best: Player | null = null;
  let bestScore = -Infinity;
  for (const m of mates(w, p.team)) {
    if (m === p) continue;
    const dx = m.x - p.x, dy = m.y - p.y;
    const d = Math.hypot(dx, dy);
    if (d < 40 || d > maxRange) continue;
    const dot = (dx * aim.x + dy * aim.y) / d;
    if (dot < 0.25) continue;
    const lane = laneClearance(w, p.team, p, m);
    let score = dot * 120 - d * 0.12 + Math.min(lane, 60) * 0.6;
    score += (m.x - p.x) * dirX * (through ? 0.2 : 0.1);
    if (lane < 22) score -= (22 - lane) * 3;
    if (m.isKeeper) score -= 60;
    if (score > bestScore) { bestScore = score; best = m; }
  }
  return best;
}

/** Pass to a teammate (or clear in the aim direction if nobody is available). Returns the receiver. */
export function pass(w: World, p: Player, aim: Vec2 | null, through: boolean, passError: number): Player | null {
  if (!canKick(w, p) || p.kickCooldown > 0) return null;
  const a = aim && (aim.x || aim.y) ? normalize(aim.x, aim.y) : { x: attackDir(p.team), y: 0 };
  const rcv = findReceiver(w, p, a, through);
  if (!rcv) {
    const d = rotate(a, bell(w.rng) * passError);
    kickBall(w, p, d.x, d.y, 420, 'clear');
    return null;
  }
  const d0 = Math.hypot(rcv.x - p.x, rcv.y - p.y);
  let tx: number, ty: number;
  if (through) {
    tx = rcv.x + attackDir(p.team) * 110 + rcv.vx * 0.4;
    ty = rcv.y + rcv.vy * 0.4;
  } else {
    tx = rcv.x + rcv.vx * 0.3;
    ty = rcv.y + rcv.vy * 0.3;
  }
  tx = clamp(tx, PITCH.left + 25, PITCH.right - 25);
  ty = clamp(ty, PITCH.top + 25, PITCH.bottom - 25);
  const dist = Math.hypot(tx - p.x, ty - p.y) || d0;
  const power = clamp(dist * 1.5 + 140, 260, 640) + (through ? 80 : 0);
  const dir = rotate(normalize(tx - p.x, ty - p.y), bell(w.rng) * passError);
  kickBall(w, p, dir.x, dir.y, power, through ? 'through' : 'pass');
  w.ball.intendedReceiver = rcv;
  w.ball.intendedTimer = 1.6;
  return rcv;
}

export type TackleResult = 'won' | 'failed' | 'poke' | 'none';

export function tackle(w: World, p: Player, chance: number): TackleResult {
  if (p.tackleCooldown > 0 || p.stun > 0) return 'none';
  p.tackleCooldown = 0.7;
  p.tackleFx = 0.25;
  const b = w.ball;
  const o = b.owner;
  if (o && o.team !== p.team && Math.hypot(o.x - p.x, o.y - p.y) < PLAYER.radius * 2 + 8) {
    if (w.rng() < chance) {
      const push = normalize(o.x - p.x, o.y - p.y);
      b.owner = null;
      b.vx = push.x * 230 + (w.rng() - 0.5) * 80; b.vy = push.y * 230 + (w.rng() - 0.5) * 80;
      b.noPickup = o; b.noPickupTimer = 0.45;
      b.lastToucher = p; b.lastTouchTeam = p.team; b.lastKick = 'tackle';
      o.stun = 0.35; o.vx *= 0.3; o.vy *= 0.3;
      return 'won';
    }
    p.stun = 0.3; // failed challenge: brief recovery
    return 'failed';
  }
  if (!o && Math.hypot(b.x - p.x, b.y - p.y) < BALL.kickReach + 6) {
    b.vx += p.fx * 220; b.vy += p.fy * 220;
    b.lastToucher = p; b.lastTouchTeam = p.team; b.lastKick = 'deflect';
    b.noPickup = p; b.noPickupTimer = 0.15;
    return 'poke';
  }
  return 'none';
}

export { ownGoalX };
