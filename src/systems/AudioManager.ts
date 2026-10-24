export type Sfx = 'kick' | 'pass' | 'tackle' | 'save' | 'goal' | 'whistle' | 'ui';

/** Tiny WebAudio synth: no audio files needed. Starts only after a user gesture. */
export class AudioManager {
  private ctx: AudioContext | null = null;
  private ambience: GainNode | null = null;

  constructor(private sfxVolume: () => number, private ambienceVolume: () => number) {}

  unlock() {
    if (!this.ctx) {
      const C = (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext });
      const Ctor = C.AudioContext ?? C.webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
    }
    void this.ctx.resume();
    this.startAmbience();
  }

  private tone(freq: number, dur: number, type: OscillatorType, vol: number, slideTo?: number, delay = 0) {
    const c = this.ctx; const v = this.sfxVolume();
    if (!c || v <= 0) return;
    const t0 = c.currentTime + delay;
    const o = c.createOscillator(); const g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(vol * v, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(c.destination);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }

  play(kind: Sfx) {
    switch (kind) {
      case 'kick': this.tone(180, 0.12, 'triangle', 0.5, 70); break;
      case 'pass': this.tone(260, 0.08, 'triangle', 0.35, 140); break;
      case 'tackle': this.tone(110, 0.15, 'sawtooth', 0.35, 50); break;
      case 'save': this.tone(320, 0.1, 'square', 0.25, 200); break;
      case 'ui': this.tone(520, 0.05, 'sine', 0.25); break;
      case 'whistle': this.tone(2200, 0.35, 'sine', 0.25); this.tone(2400, 0.35, 'sine', 0.2, undefined, 0.4); break;
      case 'goal': [392, 494, 587, 784].forEach((f, i) => this.tone(f, 0.25, 'triangle', 0.4, undefined, i * 0.12)); break;
    }
  }

  private startAmbience() {
    const c = this.ctx;
    if (!c || this.ambience) return;
    const buf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource(); src.buffer = buf; src.loop = true;
    const filter = c.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 500;
    this.ambience = c.createGain(); this.ambience.gain.value = this.ambienceVolume() * 0.12;
    src.connect(filter).connect(this.ambience).connect(c.destination);
    src.start();
  }

  stop() {
    this.ambience?.disconnect(); this.ambience = null;
    void this.ctx?.close(); this.ctx = null;
  }
}
