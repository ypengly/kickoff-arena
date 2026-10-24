import { DIFFICULTY_ORDER, DURATIONS, type DifficultyId } from '../config/gameConfig';
import { TEAMS } from '../data/teams';

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface Settings {
  difficulty: DifficultyId;
  duration: number;   // seconds of real time
  home: number;       // team index
  away: number;
  sfx: number;        // 0..1
  ambience: number;   // 0..1
  reduceFx: boolean;
}

export interface MatchRecord { home: string; away: string; gf: number; ga: number; date: number }
export interface Stats { played: number; wins: number; draws: number; losses: number; gf: number; ga: number; recent: MatchRecord[] }

export const DEFAULT_SETTINGS: Settings = { difficulty: 'amateur', duration: 180, home: 0, away: 1, sfx: 0.6, ambience: 0.3, reduceFx: false };
export const EMPTY_STATS: Stats = { played: 0, wins: 0, draws: 0, losses: 0, gf: 0, ga: 0, recent: [] };

const SETTINGS_KEY = 'kickoff-arena:settings:v1';
const STATS_KEY = 'kickoff-arena:stats:v1';

class MemoryStore implements KeyValueStore {
  private m = new Map<string, string>();
  getItem(k: string) { return this.m.get(k) ?? null; }
  setItem(k: string, v: string) { this.m.set(k, v); }
  removeItem(k: string) { this.m.delete(k); }
}
const fallback = new MemoryStore();

export function getStore(): KeyValueStore {
  try {
    const ls = (globalThis as { localStorage?: KeyValueStore }).localStorage;
    if (ls) { ls.setItem('__ka_probe', '1'); ls.removeItem('__ka_probe'); return ls; }
  } catch { /* private mode or blocked storage */ }
  return fallback;
}

const num = (v: unknown, lo: number, hi: number, d: number) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d;
const teamIdx = (v: unknown, d: number) =>
  typeof v === 'number' && Number.isInteger(v) && v >= 0 && v < TEAMS.length ? v : d;

function readJson(store: KeyValueStore, key: string): Record<string, unknown> | null {
  try {
    const raw = store.getItem(key);
    if (!raw) return null;
    const v = JSON.parse(raw);
    return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
  } catch { return null; }
}

export function loadSettings(store: KeyValueStore = getStore()): Settings {
  const r = readJson(store, SETTINGS_KEY);
  if (!r) return { ...DEFAULT_SETTINGS };
  const d = DEFAULT_SETTINGS;
  const home = teamIdx(r.home, d.home);
  let away = teamIdx(r.away, d.away);
  if (away === home) away = (home + 1) % TEAMS.length;
  return {
    difficulty: DIFFICULTY_ORDER.includes(r.difficulty as DifficultyId) ? (r.difficulty as DifficultyId) : d.difficulty,
    duration: (DURATIONS as readonly number[]).includes(r.duration as number) ? (r.duration as number) : d.duration,
    home, away,
    sfx: num(r.sfx, 0, 1, d.sfx),
    ambience: num(r.ambience, 0, 1, d.ambience),
    reduceFx: typeof r.reduceFx === 'boolean' ? r.reduceFx : d.reduceFx,
  };
}

export function saveSettings(s: Settings, store: KeyValueStore = getStore()): void {
  try { store.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch { /* ignore quota errors */ }
}

export function loadStats(store: KeyValueStore = getStore()): Stats {
  const r = readJson(store, STATS_KEY);
  if (!r) return { ...EMPTY_STATS, recent: [] };
  const n = (v: unknown) => Math.floor(num(v, 0, 1e9, 0));
  const recent = Array.isArray(r.recent)
    ? (r.recent as unknown[]).filter((x): x is MatchRecord => {
        const o = x as Partial<MatchRecord> | null;
        return !!o && typeof o.home === 'string' && typeof o.away === 'string'
          && typeof o.gf === 'number' && typeof o.ga === 'number' && typeof o.date === 'number';
      }).slice(0, 10)
    : [];
  return { played: n(r.played), wins: n(r.wins), draws: n(r.draws), losses: n(r.losses), gf: n(r.gf), ga: n(r.ga), recent };
}

export function recordMatch(rec: MatchRecord, store: KeyValueStore = getStore()): Stats {
  const s = loadStats(store);
  s.played++; s.gf += rec.gf; s.ga += rec.ga;
  if (rec.gf > rec.ga) s.wins++; else if (rec.gf < rec.ga) s.losses++; else s.draws++;
  s.recent = [rec, ...s.recent].slice(0, 10);
  try { store.setItem(STATS_KEY, JSON.stringify(s)); } catch { /* ignore */ }
  return s;
}

export function resetStats(store: KeyValueStore = getStore()): void {
  try { store.removeItem(STATS_KEY); } catch { /* ignore */ }
}
