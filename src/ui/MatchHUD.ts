import Phaser from 'phaser';
import { GAME } from '../config/gameConfig';
import type { TeamDef } from '../data/teams';
import type { MatchManager } from '../systems/MatchManager';
import type { Player } from '../entities/Player';
import { FONT } from './widgets';

const hex = (n: number) => `#${n.toString(16).padStart(6, '0')}`;

export class MatchHUD {
  private homeName: Phaser.GameObjects.Text;
  private awayName: Phaser.GameObjects.Text;
  private score: Phaser.GameObjects.Text;
  private clock: Phaser.GameObjects.Text;
  private poss: Phaser.GameObjects.Text;
  private who: Phaser.GameObjects.Text;
  private staminaFill: Phaser.GameObjects.Rectangle;
  private powerBg: Phaser.GameObjects.Rectangle;
  private powerFill: Phaser.GameObjects.Rectangle;
  private bannerText: Phaser.GameObjects.Text;
  private notice: Phaser.GameObjects.Text;
  private hint: Phaser.GameObjects.Text;
  private cache = new Map<Phaser.GameObjects.Text, string>();

  constructor(private scene: Phaser.Scene, teams: [TeamDef, TeamDef], onPause: () => void) {
    const d = 100;
    const T = (x: number, y: number, s: string, size: number, ox = 0.5, oy = 0.5, color = '#ffffff') =>
      scene.add.text(x, y, s, { fontFamily: FONT, fontSize: `${size}px`, color, fontStyle: 'bold' }).setOrigin(ox, oy).setDepth(d);

    scene.add.rectangle(GAME.width / 2, 21, GAME.width, 42, 0x000000, 0.55).setDepth(d - 1);
    scene.add.rectangle(408, 21, 10, 26, teams[0].primary).setStrokeStyle(2, teams[0].secondary).setDepth(d);
    scene.add.rectangle(592, 21, 10, 26, teams[1].primary).setStrokeStyle(2, teams[1].secondary).setDepth(d);
    this.homeName = T(396, 21, teams[0].name.toUpperCase(), 18, 1);
    this.awayName = T(604, 21, teams[1].name.toUpperCase(), 18, 0);
    this.score = T(500, 21, '0 - 0', 26);
    this.clock = T(60, 21, '00:00', 20, 0);
    const pause = T(940, 21, 'PAUSE', 16, 1).setInteractive({ useHandCursor: true });
    pause.on('pointerup', onPause);

    scene.add.rectangle(GAME.width / 2, 577, GAME.width, 46, 0x000000, 0.45).setDepth(d - 1);
    T(60, 563, 'STAMINA', 11, 0, 0.5, '#cfe8d8');
    this.who = T(150, 563, '', 11, 0, 0.5, '#ffd23f');
    scene.add.rectangle(60, 578, 160, 10, 0x1b1b1b).setOrigin(0, 0.5).setDepth(d);
    this.staminaFill = scene.add.rectangle(60, 578, 160, 10, 0x3ddc84).setOrigin(0, 0.5).setDepth(d + 1);
    this.powerBg = scene.add.rectangle(400, 563, 200, 10, 0x1b1b1b).setOrigin(0, 0.5).setDepth(d).setVisible(false);
    this.powerFill = scene.add.rectangle(400, 563, 0, 10, 0xff7a1a).setOrigin(0, 0.5).setDepth(d + 1).setVisible(false);
    this.poss = T(940, 563, '', 13, 1);
    this.hint = T(500, 586, 'WASD move  |  Shift sprint  |  Space shoot (hold to charge)  |  J pass  |  K through  |  L tackle  |  Q switch  |  Esc pause', 11, 0.5, 0.5, '#9fc9b0');

    this.bannerText = scene.add.text(GAME.width / 2, 300, '', {
      fontFamily: FONT, fontSize: '72px', color: '#ffffff', fontStyle: 'bold', stroke: '#000000', strokeThickness: 8,
    }).setOrigin(0.5).setDepth(150).setAlpha(0);
    this.notice = T(500, 78, '', 18).setDepth(120).setAlpha(0);
  }

  private set(t: Phaser.GameObjects.Text, s: string) {
    if (this.cache.get(t) !== s) { this.cache.set(t, s); t.setText(s); }
  }

  update(m: MatchManager, human: Player | null, shootHeld: boolean, charge: number) {
    this.set(this.score, `${m.score[0]} - ${m.score[1]}`);
    this.set(this.clock, m.clock);
    const [a, b] = m.possessionPct();
    this.set(this.poss, `POSSESSION ${a}% - ${b}%`);
    if (human) {
      this.set(this.who, `#${human.number}`);
      this.staminaFill.width = 160 * (human.stamina / 100);
      this.staminaFill.setFillStyle(human.exhausted ? 0xe03a3a : human.stamina < 30 ? 0xf2b705 : 0x3ddc84);
    }
    this.powerBg.setVisible(shootHeld);
    this.powerFill.setVisible(shootHeld);
    this.powerFill.width = 200 * charge;
    if (m.state === 'Kickoff' && m.countdown > 0) {
      this.bannerText.setText(String(Math.ceil(m.countdown))).setAlpha(0.9);
    } else if (this.bannerText.text.length === 1 && /\d/.test(this.bannerText.text)) {
      this.bannerText.setAlpha(0);
    }
  }

  banner(text: string, color = 0xffffff, ms = 1500) {
    this.scene.tweens.killTweensOf(this.bannerText);
    this.bannerText.setText(text).setColor(hex(color)).setAlpha(1).setScale(0.6);
    this.scene.tweens.add({ targets: this.bannerText, scale: 1, duration: 220, ease: 'Back.Out' });
    this.scene.tweens.add({ targets: this.bannerText, alpha: 0, delay: ms, duration: 350 });
  }

  notify(text: string) {
    this.scene.tweens.killTweensOf(this.notice);
    this.notice.setText(text).setAlpha(1);
    this.scene.tweens.add({ targets: this.notice, alpha: 0, delay: 1200, duration: 400 });
  }

  fadeHint() { this.scene.tweens.add({ targets: this.hint, alpha: 0.25, duration: 800 }); }
}
