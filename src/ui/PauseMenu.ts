import Phaser from 'phaser';
import { GAME } from '../config/gameConfig';
import { FONT, makeButton } from './widgets';

export interface PauseHandlers { resume: () => void; restart: () => void; menu: () => void }

export class PauseMenu {
  private root: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene, h: PauseHandlers) {
    const dim = scene.add.rectangle(GAME.width / 2, GAME.height / 2, GAME.width, GAME.height, 0x000000, 0.6).setInteractive();
    const title = scene.add.text(GAME.width / 2, 170, 'PAUSED', { fontFamily: FONT, fontSize: '56px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
    const resume = makeButton(scene, GAME.width / 2, 260, 'Resume', h.resume);
    const restart = makeButton(scene, GAME.width / 2, 320, 'Restart Match', h.restart, 280, 44, 0x2f6df0);
    const menu = makeButton(scene, GAME.width / 2, 380, 'Main Menu', h.menu, 280, 44, 0xb23a3a);
    this.root = scene.add.container(0, 0, [dim, title, resume, restart, menu]).setDepth(200).setVisible(false);
  }

  get visible() { return this.root.visible; }
  show() { this.root.setVisible(true); }
  hide() { this.root.setVisible(false); }
  destroy() { this.root.destroy(); }
}
