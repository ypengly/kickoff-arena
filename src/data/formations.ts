import { PITCH } from '../config/gameConfig';
import type { Vec2 } from '../utils/math';

export type Role = 'GK' | 'DEF' | 'MID' | 'FWD';
/** x: 0 = own goal line, 1 = opponent goal line. y: 0 = top touchline, 1 = bottom. */
export interface FormationSlot { role: Role; x: number; y: number; number: number }

// 5-a-side: goalkeeper + 2 defenders, 2 midfielders, 1 forward.
export const FORMATION_5: FormationSlot[] = [
  { role: 'GK',  x: 0.03, y: 0.5,  number: 1 },
  { role: 'DEF', x: 0.2,  y: 0.28, number: 4 },
  { role: 'DEF', x: 0.2,  y: 0.72, number: 5 },
  { role: 'MID', x: 0.45, y: 0.2,  number: 8 },
  { role: 'MID', x: 0.45, y: 0.8,  number: 10 },
  { role: 'FWD', x: 0.68, y: 0.5,  number: 9 },
];

export const attackDir = (team: number) => (team === 0 ? 1 : -1);

/** World position of a formation slot. The block slides toward the ball. */
export function slotWorldPos(slot: FormationSlot, team: number, ballX: number): Vec2 {
  const w = PITCH.right - PITCH.left;
  const progress = team === 0 ? (ballX - PITCH.left) / w : (PITCH.right - ballX) / w;
  const shift = slot.role === 'GK' ? 0 : (progress - 0.5) * 0.4;
  const nx = Math.max(0.04, Math.min(0.94, slot.x + shift));
  const x = team === 0 ? PITCH.left + nx * w : PITCH.right - nx * w;
  const y = PITCH.top + slot.y * (PITCH.bottom - PITCH.top);
  return { x, y };
}
