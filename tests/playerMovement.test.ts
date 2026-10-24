import { describe, expect, it } from 'vitest';
import { PITCH, PLAYER } from '../src/config/gameConfig';
import { Player } from '../src/entities/Player';

const mk = (x = 300, y = 300) => { const p = new Player(0, 9, 5, 'FWD'); p.x = x; p.y = y; return p; };
const run = (p: Player, dx: number, dy: number, sprint: boolean, seconds: number) => {
  for (let t = 0; t < seconds - 1e-9; t += 1 / 120) p.update(dx, dy, sprint, 1 / 120);
};

describe('player movement', () => {
  it('normalises diagonal movement', () => {
    const h = mk(), d = mk();
    run(h, 1, 0, false, 1); run(d, 1, 1, false, 1);
    expect(d.speed).toBeCloseTo(h.speed, 3);
    expect(h.speed).toBeCloseTo(PLAYER.speed, 3);
  });
  it('accelerates instead of snapping to speed', () => {
    const p = mk();
    p.update(1, 0, false, 1 / 120);
    expect(p.speed).toBeLessThan(PLAYER.speed);
    expect(p.speed).toBeGreaterThan(0);
  });
  it('sprints faster and drains stamina', () => {
    const p = mk(100);
    run(p, 1, 0, true, 1);
    expect(p.speed).toBeCloseTo(PLAYER.sprintSpeed, 3);
    expect(p.stamina).toBeLessThan(100);
  });
  it('stops sprinting when exhausted', () => {
    const p = mk(100); p.stamina = 1;
    run(p, 1, 0, true, 0.5);
    expect(p.exhausted).toBe(true);
    expect(p.sprinting).toBe(false);
    expect(p.speed).toBeLessThanOrEqual(PLAYER.speed + 1e-6);
  });
  it('recovers stamina at rest', () => {
    const p = mk(); p.stamina = 10;
    run(p, 0, 0, false, 2);
    expect(p.stamina).toBeGreaterThan(30);
  });
  it('stays inside the pitch', () => {
    const p = mk(PITCH.left + 20, 300);
    run(p, -1, 0, true, 2);
    expect(p.x).toBeGreaterThanOrEqual(PITCH.left + PLAYER.radius);
  });
});
