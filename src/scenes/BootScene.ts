import Phaser from 'phaser';
import { loadSettings } from '../utils/storage';

/** Validates saved settings (resets bad data) and hands over to the menu. */
export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }
  create() {
    this.registry.set('settings', loadSettings());
    this.scene.start('Menu');
  }
}
