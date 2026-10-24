import Phaser from 'phaser';
import { clamp } from '../utils/math';

export interface InputState {
  moveX: number; moveY: number;
  sprint: boolean;
  shootHeld: boolean; shootReleased: boolean; charge: number; // charge 0..1
  pass: boolean; through: boolean; tackle: boolean; switchPlayer: boolean; pause: boolean;
}

const CHARGE_TIME = 0.9;
const KEYS = 'W,A,S,D,UP,DOWN,LEFT,RIGHT,SHIFT,SPACE,J,K,L,Q,ESC';
const CAPTURE = 'UP,DOWN,LEFT,RIGHT,SPACE';

/** Keyboard input with edge detection. Touch and gamepad are not implemented yet (see README). */
export class InputSystem {
  state: InputState = {
    moveX: 0, moveY: 0, sprint: false, shootHeld: false, shootReleased: false, charge: 0,
    pass: false, through: false, tackle: false, switchPlayer: false, pause: false,
  };
  private keys: Record<string, Phaser.Input.Keyboard.Key>;
  private kb: Phaser.Input.Keyboard.KeyboardPlugin;
  private shootTime = 0;

  constructor(scene: Phaser.Scene) {
    this.kb = scene.input.keyboard!;
    this.kb.addCapture(CAPTURE); // stop the page scrolling on arrows / space
    this.keys = this.kb.addKeys(KEYS) as Record<string, Phaser.Input.Keyboard.Key>;
  }

  update(dt: number) {
    const k = this.keys, s = this.state, K = Phaser.Input.Keyboard;
    s.moveX = (k.D.isDown || k.RIGHT.isDown ? 1 : 0) - (k.A.isDown || k.LEFT.isDown ? 1 : 0);
    s.moveY = (k.S.isDown || k.DOWN.isDown ? 1 : 0) - (k.W.isDown || k.UP.isDown ? 1 : 0);
    s.sprint = k.SHIFT.isDown;
    s.pass = K.JustDown(k.J);
    s.through = K.JustDown(k.K);
    s.tackle = K.JustDown(k.L);
    s.switchPlayer = K.JustDown(k.Q);
    s.pause = K.JustDown(k.ESC);

    s.shootReleased = false;
    if (k.SPACE.isDown) {
      this.shootTime += dt;
      s.shootHeld = true;
      s.charge = clamp(this.shootTime / CHARGE_TIME, 0, 1);
    } else {
      if (s.shootHeld) { s.shootReleased = true; s.charge = clamp(this.shootTime / CHARGE_TIME, 0, 1); }
      else s.charge = 0;
      s.shootHeld = false;
      this.shootTime = 0;
    }
  }

  destroy() {
    this.kb.removeCapture(CAPTURE);
    for (const key of Object.keys(this.keys)) this.kb.removeKey(this.keys[key], true);
  }
}
