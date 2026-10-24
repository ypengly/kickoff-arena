import { BALL, PITCH } from '../config/gameConfig';

export interface BallPos { x: number; y: number }

/**
 * Returns the scoring team (0 = home, attacks right; 1 = away, attacks left)
 * only when the whole ball is across the line and inside the opening.
 */
export function detectGoal(ball: BallPos): 0 | 1 | null {
  if (Math.abs(ball.y - PITCH.cy) >= PITCH.goalHalf) return null;
  if (ball.x - BALL.radius > PITCH.right) return 0;
  if (ball.x + BALL.radius < PITCH.left) return 1;
  return null;
}
