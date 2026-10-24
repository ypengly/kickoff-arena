# Kickoff Arena

A 2D top-down 5-a-side football game for the browser. TypeScript + Vite + Phaser 3 (Canvas), with unit tests in Vitest. No external assets: graphics are drawn in code and sound is synthesised with WebAudio.

## Status (read this first)

This is **Phases 1-3 of the build plan, keyboard only**. Be aware of what has and has not been verified:

| Area | State |
|---|---|
| Game logic (ball physics, goals, match state machine, AI, keeper, storage) | Type-checked and unit-tested: 34 tests passing, run with a small stand-in for Vitest because the authoring environment had no internet. Please run `npm test` yourself. |
| Headless AI-vs-AI simulation (12 three-minute matches) | Goals, saves, passes and tackles occur; ball never got stuck. |
| Phaser layer (scenes, rendering, HUD, input, audio) | Written but **never run in a browser** and not type-checked against real Phaser types. Expect small fixes on first launch. |
| `npm install`, `npm run build`, `npm run dev` | **Not run.** |

## Quick start

1. Install Node.js 18+ from https://nodejs.org (LTS).
2. Open a terminal in this folder (`kickoff-arena/`).
3. `npm install`
4. `npm run dev`, then open the printed local URL (usually http://localhost:5173).
5. `npm run test` runs the unit tests.
6. `npm run build` type-checks and creates `dist/`; `npm run preview` serves it.
7. Deploy: upload the contents of `dist/` to any static host (Netlify, Vercel, GitHub Pages, Cloudflare Pages). The build uses relative paths (`base: './'`).

## Controls

| Key | Action |
|---|---|
| WASD / Arrows | Move |
| Shift | Sprint (uses stamina) |
| Space | Shoot: hold to charge, release to kick. Moving = shoot where you face; standing still = aim at goal |
| J | Pass to a teammate in your movement direction |
| K | Through pass into space |
| L | Tackle, or poke away a loose ball |
| Q | Switch to the teammate nearest the ball |
| Esc | Pause |

You also take control automatically of a teammate who receives the ball.

## Project layout

```
src/
  config/gameConfig.ts     pitch, ball, player constants and the 4 difficulty profiles (no Phaser import)
  data/                    teams (8 fictional) and the 5-a-side formation
  entities/                Player, Ball, Team, Goal geometry (plain classes, no Phaser)
  systems/                 BallPhysics, GoalSystem, MatchManager, MatchRules, CollisionSystem,
                           Actions (shoot/pass/tackle), TeamAI (outfield + keeper), Simulation,
                           InputSystem, AudioManager
  scenes/                  Boot, Menu, Match, Results
  ui/                      MatchHUD, PauseMenu, widgets
  utils/                   math, storage (validated LocalStorage)
tests/                     ballPhysics, goalSystem, matchManager, playerMovement, teamAI, storage
```

Everything gameplay-critical lives in Phaser-free modules and runs on a fixed 120 Hz step, so it is deterministic and testable in Node. Phaser only draws and reads the keyboard.

## How the main systems work

- **Ball**: kicks set velocity (impulses); exponential friction; restitution against touchlines; posts are circles; the goal mouth is the only way past the goal line; the net soaks up energy. A goal counts only when the whole ball is over the line inside the opening, and `MatchManager.scoreGoal` ignores any call outside the Playing state, so a goal can never count twice.
- **Possession**: slow balls within the control radius are picked up and dribbled slightly ahead of the player; fast balls are deflected (keepers parry or catch). The previous kicker cannot re-collect for a moment, and tackles can fail and briefly stun the tackler.
- **AI**: per-player state machine (SupportAttack, MoveToBall, PressBall, MarkOpponent, InterceptPass, ReceivePass, CarryBall, ReturnToFormation) re-evaluated every 0.14-0.45 s depending on difficulty. Formation slides with the ball; only a limited number of players may press. Difficulty changes reaction time, pass and shot error, tackle rate and success, pressing numbers, keeper reaction and reach, and (World Class) lane-cutting marking. Nobody gets a speed boost; Beginner is slightly slower.
- **Keeper**: predicts where a shot will cross its line, moves there after a reaction delay, catches slow shots and parries fast ones, then distributes the ball.

## Known limitations / not implemented

- No touch controls, gamepad support, or mouse aiming (Phase 4). Keyboard only, so it is not playable on phones yet.
- No separate team-select scene: teams, difficulty, length and sound are picked on the main menu. Kit colours are fixed per team; no stadium themes; no 11-a-side mode.
- Arcade Physics is not used. Collisions are custom (simpler to test and keep stable).
- No throw-ins, corners, fouls or offside: touchlines act as walls. Single period, no half-time.
- Keeper has no dive animation, only an extended reach.
- Audio is simple synthesised effects plus a noise-based crowd bed; no stadium announcer.
- The sprint trail, goal confetti, camera flash and shake are the only effects; "Reduced" effects turns them off.
- No mini-map, event log, or key rebinding UI.
- Balance has only been checked with headless AI-vs-AI runs, not by human play.
