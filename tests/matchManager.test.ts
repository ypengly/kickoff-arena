import { describe, expect, it } from 'vitest';
import { MatchManager, formatClock } from '../src/systems/MatchManager';

const started = (duration = 120) => {
  const m = new MatchManager(duration, 3, 2.5);
  m.start();
  m.update(3.1); // finish countdown
  return m;
};

describe('match manager', () => {
  it('counts down the kickoff before play starts', () => {
    const m = new MatchManager(120); m.start();
    expect(m.state).toBe('Kickoff');
    m.update(1); expect(m.state).toBe('Kickoff');
    m.update(2.1); expect(m.state).toBe('Playing');
  });
  it('runs the match timer only while playing', () => {
    const m = started();
    m.update(10);
    expect(m.timeLeft).toBeCloseTo(110, 5);
  });
  it('pause freezes the timer and resume restores the state', () => {
    const m = started();
    m.pause(); m.update(30);
    expect(m.state).toBe('Paused');
    expect(m.timeLeft).toBeCloseTo(120, 5);
    m.resume();
    expect(m.state).toBe('Playing');
  });
  it('counts each goal exactly once', () => {
    const m = started();
    expect(m.scoreGoal(0)).toBe(true);
    expect(m.scoreGoal(0)).toBe(false);
    expect(m.score[0]).toBe(1);
  });
  it('resets for kickoff after the celebration, conceding team kicks off', () => {
    const m = started();
    m.scoreGoal(0);
    const ev = m.update(2.6);
    expect(m.state).toBe('Kickoff');
    expect(ev.some((e) => e.type === 'resetAfterGoal' && e.kickingTeam === 1)).toBe(true);
  });
  it('ends at full time and stops advancing', () => {
    const m = started(5);
    const ev = m.update(6);
    expect(m.state).toBe('FullTime');
    expect(ev.some((e) => e.type === 'fulltime')).toBe(true);
    m.update(10);
    expect(m.timeLeft).toBe(0);
    expect(m.scoreGoal(1)).toBe(false);
  });
  it('formats the clock', () => {
    expect(formatClock(125)).toBe('02:05');
    expect(formatClock(0)).toBe('00:00');
  });
});
