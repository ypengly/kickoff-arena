import { describe, expect, it } from 'vitest';
import { BALL, PITCH } from '../src/config/gameConfig';
import { Ball } from '../src/entities/Ball';
import { stepBall } from '../src/systems/BallPhysics';

const run = (b: Ball, seconds: number, dt: number) => {
  for (let t = 0; t < seconds - 1e-9; t += dt) stepBall(b, dt);
};
const ballAt = (x: number, y: number, vx = 0, vy = 0) => { const b = new Ball(); b.x = x; b.y = y; b.vx = vx; b.vy = vy; return b; };

describe('ball physics', () => {
  it('friction slows the ball exponentially', () => {
    const b = ballAt(300, 300, 500, 0);
    run(b, 1, 1 / 120);
    expect(b.speed).toBeCloseTo(500 * Math.exp(-BALL.friction), 0);
  });
  it('is frame-rate independent for a fixed duration', () => {
    const a = ballAt(300, 300, 500, 0), c = ballAt(300, 300, 500, 0);
    run(a, 1, 1 / 120); run(c, 1, 1 / 60);
    expect(Math.abs(a.x - c.x)).toBeLessThan(3);
  });
  it('clamps to the maximum speed', () => {
    const b = ballAt(300, 300, 5000, 0);
    stepBall(b, 1 / 120);
    expect(b.speed).toBeLessThanOrEqual(BALL.maxSpeed + 1e-6);
  });
  it('rebounds off the touchline', () => {
    const b = ballAt(300, PITCH.top + BALL.radius + 1, 0, -400);
    run(b, 0.1, 1 / 120);
    expect(b.vy).toBeGreaterThan(0);
    expect(b.y).toBeGreaterThanOrEqual(PITCH.top + BALL.radius);
  });
  it('cannot cross the goal line outside the goal opening', () => {
    const b = ballAt(PITCH.right - 20, PITCH.top + 40, 900, 0);
    let maxX = -Infinity;
    for (let i = 0; i < 90; i++) { stepBall(b, 1 / 120); maxX = Math.max(maxX, b.x); }
    expect(maxX).toBeLessThanOrEqual(PITCH.right);
  });
  it('enters through the opening and stays inside the net', () => {
    const b = ballAt(PITCH.right - 30, PITCH.cy, 700, 0);
    run(b, 1, 1 / 120);
    expect(b.x).toBeGreaterThan(PITCH.right);
    expect(b.x).toBeLessThanOrEqual(PITCH.right + PITCH.goalDepth);
  });
  it('bounces off a goalpost', () => {
    const b = ballAt(PITCH.right - 30, PITCH.cy - PITCH.goalHalf, 700, 0);
    let sawReverse = false;
    for (let i = 0; i < 60; i++) { stepBall(b, 1 / 120); if (b.vx < 0) sawReverse = true; }
    expect(sawReverse).toBe(true);
  });
});
