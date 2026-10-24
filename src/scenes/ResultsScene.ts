import Phaser from 'phaser';
import { GAME } from '../config/gameConfig';
import { TEAMS } from '../data/teams';
import type { MatchStats } from '../systems/MatchManager';
import { FONT, makeButton } from '../ui/widgets';

export interface ResultsData { score: [number, number]; stats: MatchStats; home: number; away: number }

export class ResultsScene extends Phaser.Scene {
  private data_!: ResultsData;
  constructor() { super('Results'); }

  init(data: ResultsData) { this.data_ = data; }

  create() {
    const { score, stats, home, away } = this.data_;
    const cx = GAME.width / 2;
    this.cameras.main.setBackgroundColor(0x0c2a1a);
    const T = (x: number, y: number, s: string, size: number, color = '#ffffff', ox = 0.5) =>
      this.add.text(x, y, s, { fontFamily: FONT, fontSize: `${size}px`, color, fontStyle: 'bold' }).setOrigin(ox, 0.5);

    T(cx, 60, 'FULL TIME', 48);
    const verdict = score[0] > score[1] ? 'YOU WIN!' : score[0] < score[1] ? 'YOU LOSE' : 'DRAW';
    T(cx, 105, verdict, 24, score[0] > score[1] ? '#ffd23f' : '#cfe8d8');
    T(cx - 40, 170, TEAMS[home].name.toUpperCase(), 24, '#ffffff', 1);
    T(cx + 40, 170, TEAMS[away].name.toUpperCase(), 24, '#ffffff', 0);
    T(cx, 170, `${score[0]} - ${score[1]}`, 44);
    this.add.rectangle(cx - 330, 170, 14, 40, TEAMS[home].primary).setStrokeStyle(3, TEAMS[home].secondary);
    this.add.rectangle(cx + 330, 170, 14, 40, TEAMS[away].primary).setStrokeStyle(3, TEAMS[away].secondary);

    const total = stats.possession[0] + stats.possession[1];
    const ph = total > 0 ? Math.round((stats.possession[0] / total) * 100) : 50;
    const rows: [string, number | string, number | string][] = [
      ['Shots', stats.shots[0], stats.shots[1]],
      ['Passes', stats.passes[0], stats.passes[1]],
      ['Tackles won', stats.tackles[0], stats.tackles[1]],
      ['Saves', stats.saves[0], stats.saves[1]],
      ['Possession', `${ph}%`, `${100 - ph}%`],
    ];
    rows.forEach(([label, a, b], i) => {
      const y = 245 + i * 42;
      this.add.rectangle(cx, y, 560, 34, 0x000000, 0.3);
      T(cx - 250, y, String(a), 22, '#ffffff', 0);
      T(cx, y, label, 18, '#cfe8d8');
      T(cx + 250, y, String(b), 22, '#ffffff', 1);
    });

    makeButton(this, cx - 150, 520, 'Rematch', () => this.scene.start('Match'), 240, 50, 0xff7a1a, 22);
    makeButton(this, cx + 150, 520, 'Main Menu', () => this.scene.start('Menu'), 240, 50, 0x3a3f4b, 22);
  }
}
