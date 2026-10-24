import Phaser from 'phaser';
import { DIFFICULTY, DIFFICULTY_ORDER, DURATIONS, GAME } from '../config/gameConfig';
import { TEAMS } from '../data/teams';
import { FONT, makeButton, type Button } from '../ui/widgets';
import { loadSettings, loadStats, resetStats, saveSettings, type Settings } from '../utils/storage';

export class MenuScene extends Phaser.Scene {
  private s!: Settings;
  private bg!: Phaser.GameObjects.Graphics;
  private ball = { x: 200, y: 300, vx: 170, vy: 110, rot: 0 };
  private runners: { x: number; y: number; a: number; c: number }[] = [];
  private panel: Phaser.GameObjects.Container | null = null;
  private homeBtn!: Button; private awayBtn!: Button; private diffBtn!: Button;
  private durBtn!: Button; private sndBtn!: Button; private fxBtn!: Button;
  private homeChip!: Phaser.GameObjects.Rectangle; private awayChip!: Phaser.GameObjects.Rectangle;

  constructor() { super('Menu'); }

  create() {
    this.s = loadSettings();
    this.panel = null;
    this.bg = this.add.graphics().setDepth(0);
    this.runners = Array.from({ length: 8 }, (_, i) => ({
      x: 100 + i * 110, y: 120 + (i % 4) * 120, a: Math.random() * 6.28, c: i % 2 ? 0xe03a3a : 0x14a85a,
    }));

    this.add.text(GAME.width / 2, 62, 'KICKOFF ARENA', {
      fontFamily: FONT, fontSize: '64px', color: '#ffffff', fontStyle: 'bold', stroke: '#0a3d20', strokeThickness: 10,
    }).setOrigin(0.5).setDepth(5);
    this.add.text(GAME.width / 2, 108, '5-a-side arcade football', { fontFamily: FONT, fontSize: '18px', color: '#cfe8d8' }).setOrigin(0.5).setDepth(5);

    const cx = GAME.width / 2;
    makeButton(this, cx, 175, 'QUICK MATCH', () => this.scene.start('Match'), 320, 54, 0xff7a1a, 26).setDepth(5);
    this.homeChip = this.add.rectangle(cx - 180, 235, 16, 30, 0xffffff).setDepth(5);
    this.awayChip = this.add.rectangle(cx - 180, 285, 16, 30, 0xffffff).setDepth(5);
    this.homeBtn = makeButton(this, cx, 235, '', () => this.cycleTeam('home'), 320).setDepth(5);
    this.awayBtn = makeButton(this, cx, 285, '', () => this.cycleTeam('away'), 320, 44, 0x2f6df0).setDepth(5);
    this.diffBtn = makeButton(this, cx, 335, '', () => this.cycleDifficulty(), 320, 44, 0x8a3ffc).setDepth(5);
    this.durBtn = makeButton(this, cx, 385, '', () => this.cycleDuration(), 320, 44, 0x8a3ffc).setDepth(5);
    this.sndBtn = makeButton(this, cx, 435, '', () => this.toggleSound(), 320, 44, 0x3a3f4b).setDepth(5);
    this.fxBtn = makeButton(this, cx, 485, '', () => this.toggleFx(), 320, 44, 0x3a3f4b).setDepth(5);
    makeButton(this, cx - 130, 550, 'How to Play', () => this.showHelp(), 240, 40, 0x3a3f4b, 18).setDepth(5);
    makeButton(this, cx + 130, 550, 'Statistics', () => this.showStats(), 240, 40, 0x3a3f4b, 18).setDepth(5);
    this.refresh();
  }

  private persist() { saveSettings(this.s); this.refresh(); }

  private refresh() {
    const h = TEAMS[this.s.home], a = TEAMS[this.s.away];
    this.homeBtn.setLabel(`Your team: ${h.name}`);
    this.awayBtn.setLabel(`Opponent: ${a.name}`);
    this.homeChip.setFillStyle(h.primary).setStrokeStyle(3, h.secondary);
    this.awayChip.setFillStyle(a.primary).setStrokeStyle(3, a.secondary);
    this.diffBtn.setLabel(`Difficulty: ${DIFFICULTY[this.s.difficulty].label}`);
    this.durBtn.setLabel(`Match length: ${this.s.duration / 60} min`);
    this.sndBtn.setLabel(`Sound: ${this.s.sfx > 0 ? 'On' : 'Off'}`);
    this.fxBtn.setLabel(`Visual effects: ${this.s.reduceFx ? 'Reduced' : 'Full'}`);
  }

  private cycleTeam(which: 'home' | 'away') {
    const other = which === 'home' ? this.s.away : this.s.home;
    let i = (this.s[which] + 1) % TEAMS.length;
    if (i === other) i = (i + 1) % TEAMS.length; // never the same team on both sides
    this.s[which] = i;
    this.persist();
  }
  private cycleDifficulty() {
    this.s.difficulty = DIFFICULTY_ORDER[(DIFFICULTY_ORDER.indexOf(this.s.difficulty) + 1) % DIFFICULTY_ORDER.length];
    this.persist();
  }
  private cycleDuration() {
    const list = DURATIONS as readonly number[];
    this.s.duration = list[(list.indexOf(this.s.duration) + 1) % list.length];
    this.persist();
  }
  private toggleSound() {
    const on = this.s.sfx > 0;
    this.s.sfx = on ? 0 : 0.6; this.s.ambience = on ? 0 : 0.3;
    this.persist();
  }
  private toggleFx() { this.s.reduceFx = !this.s.reduceFx; this.persist(); }

  private openPanel(title: string, body: string, extra?: (c: Phaser.GameObjects.Container) => void) {
    this.panel?.destroy();
    const cx = GAME.width / 2;
    const dim = this.add.rectangle(cx, 300, GAME.width, GAME.height, 0x000000, 0.7).setInteractive();
    const card = this.add.rectangle(cx, 300, 640, 480, 0x0f3b24).setStrokeStyle(3, 0xffffff, 0.8);
    const t = this.add.text(cx, 90, title, { fontFamily: FONT, fontSize: '34px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
    const b = this.add.text(cx, 300, body, { fontFamily: FONT, fontSize: '18px', color: '#e6f4ea', lineSpacing: 6, align: 'left' }).setOrigin(0.5);
    const close = makeButton(this, cx, 500, 'Close', () => { this.panel?.destroy(); this.panel = null; }, 200, 40);
    const panel = this.add.container(0, 0, [dim, card, t, b, close]).setDepth(50);
    this.panel = panel;
    extra?.(panel);
  }

  private showHelp() {
    this.openPanel('HOW TO PLAY', [
      'WASD / Arrows   move',          'Shift           sprint (uses stamina)',
      'Space           shoot - hold to charge power, release to kick',
      'J               pass to a teammate',
      'K               through pass into space',
      'L               tackle / poke the ball away',
      'Q               switch to the player nearest the ball',
      'Esc             pause',
      '',
      'Keep moving to aim: shots go where you face.',
      'Stand still and shoot to aim at the goal.',
      'Goals: the whole ball must cross the line.',
    ].join('\n'));
  }

  private showStats() {
    const st = loadStats();
    const recent = st.recent.slice(0, 5).map((r) => `${r.home} ${r.gf}-${r.ga} ${r.away}`).join('\n') || 'No matches yet';
    let confirm = false;
    this.openPanel('STATISTICS', [
      `Played ${st.played}    Won ${st.wins}    Drawn ${st.draws}    Lost ${st.losses}`,
      `Goals scored ${st.gf}    Goals conceded ${st.ga}`, '', 'Recent results', recent,
    ].join('\n'), (c) => {
      const btn = makeButton(this, GAME.width / 2, 445, 'Reset statistics', () => {
        if (!confirm) { confirm = true; btn.setLabel('Click again to confirm'); return; }
        resetStats(); this.panel?.destroy(); this.panel = null; this.showStats();
      }, 280, 40, 0xb23a3a);
      c.add(btn);
    });
  }

  update(_t: number, delta: number) {
    const dt = Math.min(delta / 1000, 0.1);
    const b = this.ball;
    b.x += b.vx * dt; b.y += b.vy * dt; b.rot += dt * 6;
    if (b.x < 40 || b.x > GAME.width - 40) b.vx *= -1;
    if (b.y < 40 || b.y > GAME.height - 40) b.vy *= -1;
    for (const r of this.runners) { r.a += dt * 0.8; r.x += Math.cos(r.a) * 30 * dt; r.y += Math.sin(r.a) * 30 * dt; }
    const g = this.bg; g.clear();
    for (let i = 0; i < 10; i++) { g.fillStyle(i % 2 ? 0x1b7f43 : 0x1f8f4a); g.fillRect(i * 100, 0, 100, GAME.height); }
    g.lineStyle(3, 0xffffff, 0.35); g.strokeCircle(500, 300, 90); g.lineBetween(500, 0, 500, 600);
    for (const r of this.runners) { g.fillStyle(r.c, 0.85); g.fillCircle(r.x, r.y, 13); }
    g.fillStyle(0xffffff); g.fillCircle(b.x, b.y, 9); g.fillStyle(0x222222); g.fillCircle(b.x + Math.cos(b.rot) * 4, b.y + Math.sin(b.rot) * 4, 2.5);
    g.fillStyle(0x000000, 0.45); g.fillRect(0, 0, GAME.width, GAME.height);
  }
}
