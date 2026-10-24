// Pure constants (no Phaser import) so systems can be unit tested in Node.
export const GAME = { width: 1000, height: 600 } as const;

export const PITCH = {
  left: 60, right: 940, top: 50, bottom: 550,
  cx: 500, cy: 300,
  goalHalf: 72,   // half of the goal opening height
  goalDepth: 32,  // net depth behind the goal line
  postRadius: 4,
  penDepth: 130, penHalf: 130, areaDepth: 52, areaHalf: 92,
} as const;

export const BALL = {
  radius: 8, maxSpeed: 950, friction: 1.25, restitution: 0.72,
  controlRadius: 22, kickReach: 28, dribbleLead: 2,
} as const;

export const PLAYER = {
  radius: 13, speed: 165, sprintSpeed: 235, accel: 1500, brake: 1900,
  turnRate: 14, drain: 28, regen: 14, exhaustRecover: 20,
} as const;

export const PHYSICS_STEP = 1 / 120;

export type DifficultyId = 'beginner' | 'amateur' | 'professional' | 'worldclass';

export interface DifficultyParams {
  label: string;
  decisionInterval: number; // seconds between AI decisions
  passError: number;        // radians, std-ish error on AI passes
  shotErrorMul: number;     // multiplier on shot inaccuracy
  tackleRate: number;       // tackle attempts per second when in range
  tackleChance: number;     // success probability per attempt
  pressers: number;         // players allowed to press the carrier
  speedScale: number;       // never above 1: no speed cheats
  keeperReaction: number;   // seconds between keeper re-targets
  keeperReach: number;      // extra save reach in px
  shootEagerness: number;
  passEagerness: number;
  laneCover: boolean;       // mark by cutting passing lanes instead of goal-side
}

export const DIFFICULTY: Record<DifficultyId, DifficultyParams> = {
  beginner:     { label: 'Beginner',     decisionInterval: 0.45, passError: 0.22, shotErrorMul: 1.8, tackleRate: 0.8, tackleChance: 0.25, pressers: 1, speedScale: 0.92, keeperReaction: 0.45, keeperReach: 0, shootEagerness: 0.45, passEagerness: 0.5,  laneCover: false },
  amateur:      { label: 'Amateur',      decisionInterval: 0.3,  passError: 0.12, shotErrorMul: 1.3, tackleRate: 1.4, tackleChance: 0.35, pressers: 1, speedScale: 0.97, keeperReaction: 0.3,  keeperReach: 2, shootEagerness: 0.6,  passEagerness: 0.6,  laneCover: false },
  professional: { label: 'Professional', decisionInterval: 0.2,  passError: 0.07, shotErrorMul: 1.0, tackleRate: 2.0, tackleChance: 0.45, pressers: 2, speedScale: 1,    keeperReaction: 0.18, keeperReach: 4, shootEagerness: 0.75, passEagerness: 0.75, laneCover: false },
  worldclass:   { label: 'World Class',  decisionInterval: 0.14, passError: 0.04, shotErrorMul: 0.8, tackleRate: 2.5, tackleChance: 0.5,  pressers: 2, speedScale: 1,    keeperReaction: 0.1,  keeperReach: 6, shootEagerness: 0.85, passEagerness: 0.85, laneCover: true },
};
export const DIFFICULTY_ORDER: DifficultyId[] = ['beginner', 'amateur', 'professional', 'worldclass'];
export const DURATIONS = [120, 180, 300] as const;
