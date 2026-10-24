import { PITCH } from '../config/gameConfig';
import { FORMATION_5, attackDir, slotWorldPos } from '../data/formations';
import type { Player } from '../entities/Player';
import { clamp, normalize, type Vec2 } from '../utils/math';
import { findReceiver, kickBall, nearestOpponentDist, pass, shoot, tackle } from './Actions';
import { attackGoalX, mates, opponents, ownGoalX, type World } from './World';

export type AIEvent = { type: 'shot' | 'pass' | 'tackle'; team: number };
type Emit = ((e: AIEvent) => void) | undefined;

/** Update every AI-controlled player (everyone except the human-controlled one). */
export function updateAI(w: World, dt: number, emit?: Emit): void {
  for (const p of w.players) {
    if (p === w.human) continue;
    if (p.isKeeper) keeperAI(w, p, dt, emit);
    else outfieldAI(w, p, dt, emit);
  }
}

const formationPos = (w: World, p: Player): Vec2 => slotWorldPos(FORMATION_5[p.slot], p.team, w.ball.x);
const clampPitch = (v: Vec2, m = 20): Vec2 => ({
  x: clamp(v.x, PITCH.left + m, PITCH.right - m),
  y: clamp(v.y, PITCH.top + m, PITCH.bottom - m),
});

/** Closest point on the ball's path (next 1.2 s) to the player; the ball itself if it is nearly still. */
export function interceptPoint(w: World, p: Player): Vec2 {
  const b = w.ball;
  const sp2 = b.vx * b.vx + b.vy * b.vy;
  if (sp2 < 400) return { x: b.x, y: b.y };
  const t = clamp(((p.x - b.x) * b.vx + (p.y - b.y) * b.vy) / sp2, 0, 1.2);
  return clampPitch({ x: b.x + b.vx * t, y: b.y + b.vy * t }, 14);
}

/** How many other AI outfield teammates are closer to (x, y) than p. */
function rankByDistance(w: World, p: Player, x: number, y: number): number {
  const d0 = Math.hypot(p.x - x, p.y - y);
  let rank = 0;
  for (const m of mates(w, p.team)) {
    if (m === p || m.isKeeper || m === w.human) continue;
    if (Math.hypot(m.x - x, m.y - y) < d0) rank++;
  }
  return rank;
}

function supportPos(w: World, p: Player, carrier: Player): Vec2 {
  const dir = attackDir(p.team);
  const fp = formationPos(w, p);
  const run = p.role === 'FWD' ? 70 : p.role === 'MID' ? 40 : 0;
  let tx = fp.x + run * dir;
  const ty = fp.y;
  if (p.role === 'FWD') tx = dir > 0 ? Math.max(tx, carrier.x + 60) : Math.min(tx, carrier.x - 60);
  const d = Math.hypot(tx - carrier.x, ty - carrier.y);
  if (d < 110) {
    const n = d < 1 ? { x: 0, y: ty >= PITCH.cy ? 1 : -1 } : { x: (tx - carrier.x) / d, y: (ty - carrier.y) / d };
    return clampPitch({ x: carrier.x + n.x * 110, y: carrier.y + n.y * 110 });
  }
  return clampPitch({ x: tx, y: ty });
}

function outfieldAI(w: World, p: Player, dt: number, emit: Emit) {
  const D = w.difficulty;
  p.decisionTimer -= dt;
  if (p.decisionTimer <= 0) {
    p.decisionTimer = D.decisionInterval * (0.8 + w.rng() * 0.4);
    decide(w, p, emit);
  }
  act(w, p, dt, emit);
}

function decide(w: World, p: Player, emit: Emit) {
  const D = w.difficulty, b = w.ball;
  const fp = formationPos(w, p);

  if (b.owner === p) { decideWithBall(w, p, emit); return; }

  const owner = b.owner;
  if (owner && owner.team === p.team) {
    p.state = 'SupportAttack';
    p.target = supportPos(w, p, owner);
    return;
  }
  if (owner) {
    const rank = rankByDistance(w, p, owner.x, owner.y);
    if (rank < D.pressers) {
      p.state = 'PressBall';
      p.target = { x: owner.x + owner.vx * 0.2, y: owner.y + owner.vy * 0.2 };
      return;
    }
    // Mark the nearest unmarked attacker.
    let mark: Player | null = null, md = Infinity;
    for (const o of opponents(w, p.team)) {
      if (o === owner || o.isKeeper) continue;
      const d = Math.hypot(o.x - p.x, o.y - p.y);
      if (d < md) { md = d; mark = o; }
    }
    if (mark && Math.hypot(fp.x - mark.x, fp.y - mark.y) < 240) {
      p.state = 'MarkOpponent';
      if (D.laneCover) {
        p.target = { x: (owner.x + mark.x) / 2, y: (owner.y + mark.y) / 2 };
      } else {
        const gx = ownGoalX(p.team);
        p.target = { x: mark.x + Math.sign(gx - mark.x) * 30, y: mark.y + (PITCH.cy - mark.y) * 0.15 };
      }
      p.target = clampPitch(p.target);
    } else {
      p.state = 'ReturnToFormation';
      p.target = fp;
    }
    return;
  }

  // Loose ball.
  const ip = interceptPoint(w, p);
  if (b.intendedReceiver === p) { p.state = 'ReceivePass'; p.target = ip; return; }
  if (b.intendedReceiver && b.intendedReceiver.team === p.team) {
    p.state = 'SupportAttack'; p.target = supportPos(w, p, b.intendedReceiver); return;
  }
  if (rankByDistance(w, p, ip.x, ip.y) < 1) {
    p.state = b.lastTouchTeam !== p.team && b.speed > 120 ? 'InterceptPass' : 'MoveToBall';
    p.target = ip;
    return;
  }
  p.state = 'ReturnToFormation';
  p.target = fp;
}

function decideWithBall(w: World, p: Player, emit: Emit) {
  const D = w.difficulty;
  const dir = attackDir(p.team);
  const gx = attackGoalX(p.team);
  const dGoal = Math.hypot(gx - p.x, PITCH.cy - p.y);
  const pressure = nearestOpponentDist(w, p);

  if (dGoal < 280 + D.shootEagerness * 60 && Math.abs(p.y - PITCH.cy) < 190 && w.rng() < D.shootEagerness) {
    if (shoot(w, p, null, 0.6 + w.rng() * 0.4, D.shotErrorMul)) {
      emit?.({ type: 'shot', team: p.team });
      p.state = 'HoldPosition';
      return;
    }
  }

  const aim = { x: dir, y: 0 };
  const rcv = findReceiver(w, p, aim, false);
  if (rcv && ((pressure < 60 && w.rng() < D.passEagerness) || w.rng() < 0.1)) {
    const forward = (rcv.x - p.x) * dir;
    const through = forward > 120 && w.rng() < 0.4;
    if (pass(w, p, aim, through, D.passError)) {
      emit?.({ type: 'pass', team: p.team });
      p.state = 'HoldPosition';
      return;
    }
  }
  const ownThird = Math.abs(p.x - ownGoalX(p.team)) < (PITCH.right - PITCH.left) / 3;
  if (!rcv && pressure < 45 && ownThird) {
    kickBall(w, p, dir, (w.rng() - 0.5) * 0.9, 460, 'clear');
    p.state = 'HoldPosition';
    return;
  }
  p.state = 'CarryBall';
}

function act(w: World, p: Player, dt: number, emit: Emit) {
  const D = w.difficulty, b = w.ball;
  let dx = 0, dy = 0, sprint = false;

  if (p.state === 'CarryBall' && b.owner === p) {
    const gx = attackGoalX(p.team);
    let v = normalize(gx - p.x, PITCH.cy - p.y);
    let near: Player | null = null, nd = 80;
    for (const o of opponents(w, p.team)) {
      const d = Math.hypot(o.x - p.x, o.y - p.y);
      if (d < nd) { nd = d; near = o; }
    }
    if (near) {
      const away = normalize(p.x - near.x, p.y - near.y);
      v = normalize(v.x + away.x * 1.2, v.y + away.y * 1.2);
    }
    dx = v.x; dy = v.y; sprint = p.stamina > 30;
  } else if (p.state !== 'HoldPosition') {
    const tx = p.target.x - p.x, ty = p.target.y - p.y;
    const d = Math.hypot(tx, ty);
    if (d > 8) {
      dx = tx / d; dy = ty / d;
      sprint = d > 120 && p.stamina > 25 && p.state !== 'SupportAttack';
    }
  }

  const o = b.owner;
  if (o && o.team !== p.team && p.state === 'PressBall' && p.tackleCooldown <= 0
      && Math.hypot(o.x - p.x, o.y - p.y) < 26 && w.rng() < dt * D.tackleRate) {
    if (tackle(w, p, D.tackleChance) === 'won') emit?.({ type: 'tackle', team: p.team });
  }

  p.update(dx, dy, sprint, dt, D.speedScale);
}

function keeperAI(w: World, p: Player, dt: number, emit: Emit) {
  const D = w.difficulty, b = w.ball;
  const goalX = ownGoalX(p.team);
  const inward = p.team === 0 ? 1 : -1;
  let dx = 0, dy = 0, sprint = false;

  if (b.owner === p) {
    p.holdTimer += dt;
    if (p.holdTimer > 0.8) {
      const aim = { x: inward, y: 0 };
      if (findReceiver(w, p, aim, false)) {
        pass(w, p, aim, false, D.passError);
        emit?.({ type: 'pass', team: p.team });
      } else {
        kickBall(w, p, inward, (w.rng() - 0.5) * 0.8, 480, 'clear');
      }
      p.holdTimer = 0;
    }
  } else {
    p.holdTimer = 0;
    p.decisionTimer -= dt;
    if (p.decisionTimer <= 0) {
      p.decisionTimer = D.keeperReaction;
      const baseX = goalX + inward * 30;
      const shotComing = !b.owner && b.vx * inward < -60;
      let tx = baseX;
      let ty = clamp(PITCH.cy + (b.y - PITCH.cy) * 0.45, PITCH.cy - PITCH.goalHalf + 10, PITCH.cy + PITCH.goalHalf - 10);
      if (shotComing) {
        const t = (baseX - b.x) / b.vx;
        if (t > 0 && t < 2) ty = clamp(b.y + b.vy * t, PITCH.cy - PITCH.goalHalf - 10, PITCH.cy + PITCH.goalHalf + 10);
      } else if (!b.owner && Math.abs(b.x - goalX) < 150 && b.speed < 120) {
        const kd = Math.hypot(b.x - p.x, b.y - p.y);
        const someoneCloser = w.players.some((q) => q !== p && Math.hypot(b.x - q.x, b.y - q.y) < kd);
        if (!someoneCloser) { tx = b.x; ty = b.y; }
      }
      p.target = { x: tx, y: ty };
    }
    const vx = p.target.x - p.x, vy = p.target.y - p.y;
    const d = Math.hypot(vx, vy);
    if (d > 4) { dx = vx / d; dy = vy / d; sprint = d > 40; }
  }

  p.update(dx, dy, sprint, dt, D.speedScale);
  const lo = goalX + inward * 14, hi = goalX + inward * 140;
  p.x = clamp(p.x, Math.min(lo, hi), Math.max(lo, hi));
}
