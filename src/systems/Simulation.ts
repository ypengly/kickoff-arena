import { stepBall } from './BallPhysics';
import { separatePlayers, updatePossession } from './CollisionSystem';
import { updateAI, type AIEvent } from './TeamAI';
import type { Player } from '../entities/Player';
import type { World } from './World';

export interface MoveInput { x: number; y: number; sprint: boolean }
export type SimEvent =
  | AIEvent
  | { type: 'pickup' | 'save' | 'deflect'; team: number; player: Player };

/** One fixed physics step: players, AI, collisions, possession, ball. Goal checks happen in the caller. */
export function stepWorld(w: World, humanMove: MoveInput | null, dt: number, emit?: (e: SimEvent) => void): void {
  if (w.human && humanMove) w.human.update(humanMove.x, humanMove.y, humanMove.sprint, dt, 1);
  updateAI(w, dt, emit);
  separatePlayers(w.players);
  for (const e of updatePossession(w, dt)) emit?.({ type: e.type, team: e.player.team, player: e.player });
  stepBall(w.ball, dt);
}
