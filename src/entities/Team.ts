import { FORMATION_5, attackDir } from '../data/formations';
import type { TeamDef } from '../data/teams';
import { Player } from './Player';

export class Team {
  readonly players: Player[];
  readonly attackDir: number;
  constructor(public readonly index: number, public readonly def: TeamDef) {
    this.attackDir = attackDir(index);
    this.players = FORMATION_5.map((s, i) => new Player(index, s.number, i, s.role));
  }
  get outfield() { return this.players.filter((p) => !p.isKeeper); }
  get keeper() { return this.players[0]; }
}
