import { BALL, PITCH } from '../config/gameConfig';
import type { Ball } from '../entities/Ball';

const NET_DRAG = 4;

/** Advance a free ball by dt seconds (frame-rate independent when used with a fixed step). */
export function stepBall(ball: Ball, dt: number): void {
  if (ball.owner) return;
  // The net soaks up extra energy so a scored ball settles inside the goal.
  const inNet = ball.x > PITCH.right || ball.x < PITCH.left;
  const f = Math.exp(-(BALL.friction + (inNet ? NET_DRAG : 0)) * dt);
  ball.vx *= f; ball.vy *= f;
  let sp = ball.speed;
  if (sp < 4) { ball.vx = 0; ball.vy = 0; sp = 0; }
  if (sp > BALL.maxSpeed) { const k = BALL.maxSpeed / sp; ball.vx *= k; ball.vy *= k; sp = BALL.maxSpeed; }
  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;
  ball.rot += (sp * dt) / BALL.radius;
  if (ball.intendedTimer > 0) {
    ball.intendedTimer -= dt;
    if (ball.intendedTimer <= 0) ball.intendedReceiver = null;
  }
  resolveBounds(ball);
}

export function resolveBounds(ball: Ball): void {
  const r = BALL.radius, e = BALL.restitution;
  if (ball.y < PITCH.top + r) { ball.y = PITCH.top + r; if (ball.vy < 0) ball.vy = -ball.vy * e; }
  if (ball.y > PITCH.bottom - r) { ball.y = PITCH.bottom - r; if (ball.vy > 0) ball.vy = -ball.vy * e; }
  resolveEnd(ball, -1);
  resolveEnd(ball, 1);
}

/** Goal-line wall, posts and net for one end. side = -1 (left) or +1 (right). */
function resolveEnd(ball: Ball, side: 1 | -1): void {
  const r = BALL.radius, e = BALL.restitution;
  const lineX = side > 0 ? PITCH.right : PITCH.left;
  let u = side * (ball.x - lineX); // distance beyond the goal line (positive = inside net)
  let vu = side * ball.vx;
  const postR = PITCH.postRadius;
  if (u < -r - postR) return;

  for (const sy of [-1, 1]) {
    const py = PITCH.cy + sy * PITCH.goalHalf;
    const dy = ball.y - py;
    const d = Math.hypot(u, dy);
    const R = r + postR;
    if (d < R && d > 1e-4) {
      const nx = u / d, ny = dy / d;
      const vn = vu * nx + ball.vy * ny;
      u = nx * R; ball.y = py + ny * R;
      if (vn < 0) { vu -= (1 + e) * vn * nx; ball.vy -= (1 + e) * vn * ny; }
    }
  }

  const dyc = ball.y - PITCH.cy;
  const inMouth = Math.abs(dyc) < PITCH.goalHalf;
  if (!inMouth) {
    if (u > -r) { u = -r; if (vu > 0) vu = -vu * e; }
  } else if (u > 0) {
    const maxY = PITCH.goalHalf - r;
    if (Math.abs(dyc) > maxY) {
      ball.y = PITCH.cy + Math.sign(dyc) * maxY;
      if (Math.sign(dyc) * ball.vy > 0) ball.vy = -ball.vy * e;
    }
    if (u > PITCH.goalDepth - r) { u = PITCH.goalDepth - r; if (vu > 0) vu = -vu * 0.1; }
  }
  ball.x = lineX + side * u;
  ball.vx = side * vu;
}
