import { DIFFICULTY, type DifficultyId } from '../src/config/gameConfig';
import { TEAMS } from '../src/data/teams';
import { Ball } from '../src/entities/Ball';
import { Team } from '../src/entities/Team';
import { placeForKickoff } from '../src/systems/MatchRules';
import type { World } from '../src/systems/World';
import { seededRng } from '../src/utils/math';

export function makeWorld(diff: DifficultyId = 'amateur', seed = 7): World {
  const teams: [Team, Team] = [new Team(0, TEAMS[0]), new Team(1, TEAMS[1])];
  const w: World = {
    ball: new Ball(), teams, players: [...teams[0].players, ...teams[1].players],
    rng: seededRng(seed), difficulty: DIFFICULTY[diff], human: null,
  };
  placeForKickoff(w, 0);
  return w;
}
