import { PITCH } from '../config/gameConfig';
import { FORMATION_5, attackDir, slotWorldPos } from '../data/formations';
import type { World } from './World';

/** Put both teams in formation and the ball on the centre spot. */
export function placeForKickoff(w: World, kickingTeam: number): void {
  w.ball.reset(PITCH.cx, PITCH.cy);
  w.ball.lastToucher = null;
  w.ball.lastTouchTeam = -1;
  for (const p of w.players) {
    const s = slotWorldPos(FORMATION_5[p.slot], p.team, PITCH.cx);
    p.x = s.x; p.y = s.y; p.vx = 0; p.vy = 0;
    p.stun = 0; p.sprinting = false; p.kickCooldown = 0; p.tackleCooldown = 0;
    p.holdTimer = 0; p.state = 'HoldPosition';
    p.setFacing(attackDir(p.team), 0);
    // Keep each side in its own half; the kicking team's forward stands at the ball.
    const dir = attackDir(p.team);
    if (dir > 0) p.x = Math.min(p.x, PITCH.cx - 30); else p.x = Math.max(p.x, PITCH.cx + 30);
    if (p.team === kickingTeam && p.role === 'FWD') { p.x = PITCH.cx - dir * 18; p.y = PITCH.cy; }
  }
}
