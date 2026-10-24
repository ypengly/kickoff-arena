import { describe, expect, it } from 'vitest';
import { BALL, PITCH } from '../src/config/gameConfig';
import { detectGoal } from '../src/systems/GoalSystem';

describe('goal detection', () => {
  it('awards the home team for the right goal', () => {
    expect(detectGoal({ x: PITCH.right + BALL.radius + 1, y: PITCH.cy })).toBe(0);
  });
  it('awards the away team for the left goal', () => {
    expect(detectGoal({ x: PITCH.left - BALL.radius - 1, y: PITCH.cy })).toBe(1);
  });
  it('requires the whole ball to cross the line', () => {
    expect(detectGoal({ x: PITCH.right + 2, y: PITCH.cy })).toBeNull();
    expect(detectGoal({ x: PITCH.right, y: PITCH.cy })).toBeNull();
  });
  it('ignores balls outside the opening', () => {
    expect(detectGoal({ x: PITCH.right + 20, y: PITCH.cy + PITCH.goalHalf + 5 })).toBeNull();
  });
  it('returns null in open play', () => {
    expect(detectGoal({ x: PITCH.cx, y: PITCH.cy })).toBeNull();
  });
});
