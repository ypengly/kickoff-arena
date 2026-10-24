import { describe, expect, it } from 'vitest';
import { BALL, PITCH } from '../src/config/gameConfig';
import { stepWorld } from '../src/systems/Simulation';
import { detectGoal } from '../src/systems/GoalSystem';
import { updateAI } from '../src/systems/TeamAI';
import { makeWorld } from './helpers';

describe('team AI', () => {
  it('presses the carrier with the allowed number of players, others support', () => {
    const w = makeWorld('professional');
    const carrier = w.teams[0].players[5];
    carrier.x = 520; carrier.y = 300;
    w.ball.owner = carrier; w.ball.x = carrier.x; w.ball.y = carrier.y;
    updateAI(w, 1 / 120);
    const pressing = w.teams[1].outfield.filter((p) => p.state === 'PressBall');
    expect(pressing.length).toBe(w.difficulty.pressers);
    expect(w.teams[0].outfield.filter((p) => p !== carrier).every((p) => p.state === 'SupportAttack')).toBe(true);
  });
  it('sends one player per team to a loose ball', () => {
    const w = makeWorld('amateur');
    w.ball.x = 330; w.ball.y = 300;
    updateAI(w, 1 / 120);
    for (const t of w.teams) {
      const chasers = t.outfield.filter((p) => p.state === 'MoveToBall');
      expect(chasers.length).toBe(1);
    }
  });
  it('sends the intended receiver to a pass', () => {
    const w = makeWorld('amateur');
    const rcv = w.teams[0].players[3];
    w.ball.intendedReceiver = rcv; w.ball.intendedTimer = 1; w.ball.x = 400; w.ball.y = 200;
    updateAI(w, 1 / 120);
    expect(rcv.state).toBe('ReceivePass');
  });
  it('keeper reacts to a shot and prevents a goal', () => {
    const w = makeWorld('professional');
    w.ball.x = PITCH.right - 250; w.ball.y = PITCH.cy + 30; w.ball.vx = 550; w.ball.vy = 0;
    w.ball.lastTouchTeam = 0; w.ball.lastKick = 'shot';
    let goal = false, saved = false;
    for (let i = 0; i < 240; i++) {
      stepWorld(w, null, 1 / 120, (e) => { if (e.type === 'save') saved = true; });
      if (detectGoal(w.ball) !== null) goal = true;
    }
    expect(goal).toBe(false);
    expect(saved).toBe(true);
  });
  it('AI plays a full minute without errors or the ball leaving the pitch', () => {
    const w = makeWorld('worldclass');
    for (let i = 0; i < 120 * 60; i++) {
      stepWorld(w, null, 1 / 120);
      expect(Number.isFinite(w.ball.x) && Number.isFinite(w.ball.y)).toBe(true);
      expect(w.ball.x).toBeGreaterThan(PITCH.left - PITCH.goalDepth - BALL.radius - 1);
      expect(w.ball.x).toBeLessThan(PITCH.right + PITCH.goalDepth + BALL.radius + 1);
      if (detectGoal(w.ball) !== null) w.ball.reset(PITCH.cx, PITCH.cy);
    }
  });
});
