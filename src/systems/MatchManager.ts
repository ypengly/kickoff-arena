export type MatchState = 'PreMatch' | 'Kickoff' | 'Playing' | 'GoalCelebration' | 'FullTime' | 'Paused';
export type MatchEvent =
  | { type: 'whistleStart' }
  | { type: 'goal'; team: 0 | 1 }
  | { type: 'resetAfterGoal'; kickingTeam: 0 | 1 }
  | { type: 'fulltime' };

export interface MatchStats {
  shots: [number, number];
  passes: [number, number];
  tackles: [number, number];
  saves: [number, number];
  possession: [number, number]; // seconds
}

export class MatchManager {
  state: MatchState = 'PreMatch';
  private prev: MatchState = 'PreMatch';
  timeLeft: number;
  score: [number, number] = [0, 0];
  countdown = 0;
  celebrateLeft = 0;
  kickingTeam: 0 | 1 = 0;
  lastScorer: 0 | 1 | null = null;
  stats: MatchStats = { shots: [0, 0], passes: [0, 0], tackles: [0, 0], saves: [0, 0], possession: [0, 0] };

  constructor(
    public readonly duration: number,
    private readonly kickoffCountdown = 3,
    private readonly celebrationTime = 2.5,
  ) {
    this.timeLeft = duration;
  }

  start() {
    this.state = 'Kickoff';
    this.countdown = this.kickoffCountdown;
  }

  update(dt: number): MatchEvent[] {
    const ev: MatchEvent[] = [];
    switch (this.state) {
      case 'Kickoff':
        this.countdown -= dt;
        if (this.countdown <= 0) { this.countdown = 0; this.state = 'Playing'; ev.push({ type: 'whistleStart' }); }
        break;
      case 'Playing':
        this.timeLeft -= dt;
        if (this.timeLeft <= 0) { this.timeLeft = 0; this.state = 'FullTime'; ev.push({ type: 'fulltime' }); }
        break;
      case 'GoalCelebration':
        this.celebrateLeft -= dt;
        if (this.celebrateLeft <= 0) {
          if (this.timeLeft <= 0) { this.state = 'FullTime'; ev.push({ type: 'fulltime' }); }
          else {
            this.state = 'Kickoff';
            this.countdown = 2;
            ev.push({ type: 'resetAfterGoal', kickingTeam: this.kickingTeam });
          }
        }
        break;
      default: break; // PreMatch, Paused, FullTime: nothing advances
    }
    return ev;
  }

  /** Counts a goal only while Playing, so it can never be awarded twice. */
  scoreGoal(team: 0 | 1): boolean {
    if (this.state !== 'Playing') return false;
    this.score[team] += 1;
    this.lastScorer = team;
    this.kickingTeam = team === 0 ? 1 : 0;
    this.state = 'GoalCelebration';
    this.celebrateLeft = this.celebrationTime;
    return true;
  }

  pause() {
    if (this.state === 'Playing' || this.state === 'Kickoff' || this.state === 'GoalCelebration') {
      this.prev = this.state; this.state = 'Paused';
    }
  }
  resume() {
    if (this.state === 'Paused') this.state = this.prev;
  }

  addPossession(team: number, dt: number) { this.stats.possession[team] += dt; }

  possessionPct(): [number, number] {
    const [a, b] = this.stats.possession;
    const t = a + b;
    if (t <= 0) return [50, 50];
    const home = Math.round((a / t) * 100);
    return [home, 100 - home];
  }

  get isPaused(): boolean { return this.state === 'Paused'; }

  get clock(): string { return formatClock(this.timeLeft); }
}

export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}
