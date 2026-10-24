import { PITCH } from '../config/gameConfig';

/** Geometry helpers for the two goals. Team 0 attacks the right goal. */
export const Goal = {
  /** x of the goal line a team is attacking. */
  attackLineX: (team: number) => (team === 0 ? PITCH.right : PITCH.left),
  /** x of the goal line a team defends. */
  ownLineX: (team: number) => (team === 0 ? PITCH.left : PITCH.right),
  topPostY: PITCH.cy - PITCH.goalHalf,
  bottomPostY: PITCH.cy + PITCH.goalHalf,
};
