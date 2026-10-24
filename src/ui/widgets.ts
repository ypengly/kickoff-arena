import Phaser from 'phaser';

export interface Button extends Phaser.GameObjects.Container {
  setLabel(text: string): void;
}

export const FONT = 'Arial, Helvetica, sans-serif';

export function makeButton(
  scene: Phaser.Scene, x: number, y: number, label: string, onClick: () => void,
  w = 280, h = 44, fill = 0x14a85a, fontSize = 20,
): Button {
  const hover = Phaser.Display.Color.ValueToColor(fill).lighten(18).color;
  const bg = scene.add.rectangle(0, 0, w, h, fill).setStrokeStyle(2, 0xffffff, 0.7);
  const txt = scene.add.text(0, 0, label, { fontFamily: FONT, fontSize: `${fontSize}px`, color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
  const c = scene.add.container(x, y, [bg, txt]) as Button;
  bg.setInteractive({ useHandCursor: true });
  bg.on('pointerover', () => bg.setFillStyle(hover));
  bg.on('pointerout', () => { bg.setFillStyle(fill); c.setScale(1); });
  bg.on('pointerdown', () => c.setScale(0.96));
  bg.on('pointerup', () => { c.setScale(1); onClick(); });
  c.setLabel = (t: string) => { txt.setText(t); };
  return c;
}
