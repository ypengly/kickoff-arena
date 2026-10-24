import { PITCH, type DifficultyParams } from '../config/gameConfig';
import type { Ball } from '../entities/Ball';
import type { Player } from '../entities/Player';
import type { Team } from '../entities/Team';
import type { Rng } from '../utils/math';

export interface World {
  ball: Ball;
  teams: [Team, Team];
  players: Player[];
  rng: Rng;
  difficulty: DifficultyParams;
  /** Player currently controlled by the human (skipped by the AI), or null. */
  human: Player | null;
}

export const opponents = (w: World, team: number) => w.teams[team === 0 ? 1 : 0].players;
export const mates = (w: World, team: number) => w.teams[team].players;
export const attackGoalX = (team: number) => (team === 0 ? PITCH.right : PITCH.left);
export const ownGoalX = (team: number) => (team === 0 ? PITCH.left : PITCH.right);
