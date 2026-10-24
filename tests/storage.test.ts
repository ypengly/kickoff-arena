import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, loadSettings, loadStats, recordMatch, resetStats, saveSettings, type KeyValueStore } from '../src/utils/storage';

const mem = (): KeyValueStore & { raw: Map<string, string> } => {
  const raw = new Map<string, string>();
  return { raw, getItem: (k) => raw.get(k) ?? null, setItem: (k, v) => { raw.set(k, v); }, removeItem: (k) => { raw.delete(k); } };
};

describe('storage', () => {
  it('returns defaults when nothing is saved', () => {
    expect(loadSettings(mem()).difficulty).toBe(DEFAULT_SETTINGS.difficulty);
  });
  it('round-trips settings', () => {
    const s = mem();
    saveSettings({ ...DEFAULT_SETTINGS, difficulty: 'worldclass', duration: 300, home: 3, away: 5 }, s);
    const r = loadSettings(s);
    expect(r.difficulty).toBe('worldclass'); expect(r.duration).toBe(300); expect(r.home).toBe(3);
  });
  it('survives corrupted and invalid data', () => {
    const s = mem();
    s.setItem('kickoff-arena:settings:v1', '{not json');
    expect(loadSettings(s).duration).toBe(DEFAULT_SETTINGS.duration);
    s.setItem('kickoff-arena:settings:v1', JSON.stringify({ difficulty: 'god', duration: 7, home: 99, away: 99, sfx: 5 }));
    const r = loadSettings(s);
    expect(r.difficulty).toBe(DEFAULT_SETTINGS.difficulty);
    expect(r.duration).toBe(DEFAULT_SETTINGS.duration);
    expect(r.sfx).toBe(1);
    expect(r.home === r.away).toBe(false);
  });
  it('records results and resets statistics', () => {
    const s = mem();
    recordMatch({ home: 'A', away: 'B', gf: 3, ga: 1, date: 1 }, s);
    recordMatch({ home: 'A', away: 'B', gf: 0, ga: 0, date: 2 }, s);
    const st = loadStats(s);
    expect(st.played).toBe(2); expect(st.wins).toBe(1); expect(st.draws).toBe(1); expect(st.gf).toBe(3);
    resetStats(s);
    expect(loadStats(s).played).toBe(0);
  });
});
