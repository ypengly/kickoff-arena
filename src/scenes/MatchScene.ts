import Phaser from 'phaser';
import { BALL, DIFFICULTY, GAME, PHYSICS_STEP, PITCH, PLAYER } from '../config/gameConfig';
import { TEAMS } from '../data/teams';
import { Ball } from '../entities/Ball';
import { Team } from '../entities/Team';
import { Player } from '../entities/Player';
import { canKick, pass, shoot, tackle } from '../systems/Actions';
import { AudioManager } from '../systems/AudioManager';
import { stepBall } from '../systems/BallPhysics';
import { detectGoal } from '../systems/GoalSystem';
import { InputSystem, type InputState } from '../systems/InputSystem';
import { MatchManager, type MatchEvent } from '../systems/MatchManager';
import { placeForKickoff } from '../systems/MatchRules';
import { stepWorld, type SimEvent } from '../systems/Simulation';
import type { World } from '../systems/World';
import { MatchHUD } from '../ui/MatchHUD';
import { PauseMenu } from '../ui/PauseMenu';
import { FONT } from '../ui/widgets';
import { recordMatch, loadSettings, type Settings } from '../utils/storage';
import type { ResultsData } from './ResultsScene';

interface Particle { x: number; y: number; vx: number; vy: number; life: number; color: number }

export class MatchScene extends Phaser.Scene {
  private world!: World;
  private manager!: MatchManager;
  private controls!: InputSystem;
  private audio!: AudioManager;
  private hud!: MatchHUD;
  private pauseMenu!: PauseMenu;
  private settings!: Settings;
  private gfx!: Phaser.GameObjects.Graphics;
  private numbers: Phaser.GameObjects.Text[] = [];
  private acc = 0;
  private trail: { x: number; y: number }[] = [];
  private particles: Particle[] = [];
  private finished = false;
  private playTime = 0;
  private hintFaded = false;
  private onHidden = () => { if (this.manager?.state === 'Playing') this.togglePause(); };

  constructor() { super('Match'); }

  create() {
    this.settings = loadSettings();
    this.acc = 0; this.trail = []; this.particles = []; this.finished = false; this.playTime = 0; this.hintFaded = false;

    const teams: [Team, Team] = [new Team(0, TEAMS[this.settings.home]), new Team(1, TEAMS[this.settings.away])];
    this.world = {
      ball: new Ball(), teams, players: [...teams[0].players, ...teams[1].players],
      rng: Math.random, difficulty: DIFFICULTY[this.settings.difficulty], human: null,
    };
    this.world.human = teams[0].players[5];
    this.manager = new MatchManager(this.settings.duration);

    this.cameras.main.setBackgroundColor(0x0c2a1a);
    this.drawPitch();
    this.gfx = this.add.graphics().setDepth(10);
    this.numbers = this.world.players.map((p) =>
      this.add.text(0, 0, String(p.number), { fontFamily: FONT, fontSize: '11px', color: '#ffffff', fontStyle: 'bold', stroke: '#000000', strokeThickness: 2 })
        .setOrigin(0.5).setDepth(15));

    this.controls = new InputSystem(this);
    this.audio = new AudioManager(() => this.settings.sfx, () => this.settings.ambience);
    this.pauseMenu = new PauseMenu(this, {
      resume: () => this.togglePause(),
      restart: () => this.scene.restart(),
      menu: () => this.scene.start('Menu'),
    });
    this.hud = new MatchHUD(this, [teams[0].def, teams[1].def], () => this.togglePause());

    const unlock = () => this.audio.unlock();
    this.input.once('pointerdown', unlock);
    this.input.keyboard?.once('keydown', unlock);
    this.game.events.on(Phaser.Core.Events.HIDDEN, this.onHidden);
    this.events.once('shutdown', this.cleanup, this);

    placeForKickoff(this.world, 0);
    this.manager.start();
  }

  private cleanup() {
    this.controls.destroy();
    this.audio.stop();
    this.game.events.off(Phaser.Core.Events.HIDDEN, this.onHidden);
  }

  private togglePause() {
    if (this.finished) return;
    const m = this.manager;
    if (m.isPaused) { m.resume(); this.pauseMenu.hide(); this.audio.play('ui'); }
    else if (m.state !== 'FullTime' && m.state !== 'PreMatch') { m.pause(); if (m.isPaused) this.pauseMenu.show(); }
  }

  update(_time: number, delta: number) {
    const dt = Math.min(delta / 1000, 0.1); // tab-switch spikes never explode the simulation
    this.controls.update(dt);
    const s = this.controls.state;
    if (s.pause) this.togglePause();

    const m = this.manager;
    if (m.state !== 'Paused' && m.state !== 'FullTime') {
      for (const e of m.update(dt)) this.onMatchEvent(e);
      if (m.state === 'Playing') {
        this.applyHumanActions(s);
        this.acc += dt;
        this.playTime += dt;
        const move = { x: s.moveX, y: s.moveY, sprint: s.sprint };
        while (this.acc >= PHYSICS_STEP && m.state === 'Playing') {
          this.acc -= PHYSICS_STEP;
          stepWorld(this.world, move, PHYSICS_STEP, (e) => this.onSim(e));
          const owner = this.world.ball.owner;
          if (owner) m.addPossession(owner.team, PHYSICS_STEP);
          const g = detectGoal(this.world.ball);
          if (g !== null && m.scoreGoal(g)) this.onGoal(g);
        }
        if (!this.hintFaded && this.playTime > 15) { this.hintFaded = true; this.hud.fadeHint(); }
      } else if (m.state === 'GoalCelebration') {
        this.acc += dt;
        while (this.acc >= PHYSICS_STEP) { this.acc -= PHYSICS_STEP; stepBall(this.world.ball, PHYSICS_STEP); }
      }
    }
    this.render(dt);
    this.hud.update(m, this.world.human, s.shootHeld, s.charge);
  }

  private onMatchEvent(e: MatchEvent) {
    switch (e.type) {
      case 'whistleStart': this.audio.play('whistle'); this.hud.banner('GO!', 0xffd23f, 500); break;
      case 'resetAfterGoal':
        placeForKickoff(this.world, e.kickingTeam);
        this.world.human = this.world.teams[0].players[5];
        this.acc = 0;
        break;
      case 'fulltime': this.finishMatch(); break;
      default: break;
    }
  }

  private onGoal(team: 0 | 1) {
    const def = this.world.teams[team].def;
    this.hud.banner('GOAL!', def.primary, 2000);
    this.hud.notify(`${def.name} score!`);
    this.audio.play('goal');
    if (!this.settings.reduceFx) {
      this.cameras.main.flash(220, 255, 255, 255);
      this.cameras.main.shake(250, 0.006);
      const b = this.world.ball;
      for (let i = 0; i < 70; i++) {
        const a = Math.random() * Math.PI * 2, sp = 80 + Math.random() * 260;
        this.particles.push({ x: b.x, y: b.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 80, life: 1.2 + Math.random() * 0.8, color: Math.random() < 0.5 ? def.primary : def.secondary });
      }
    }
  }

  private finishMatch() {
    if (this.finished) return;
    this.finished = true;
    const m = this.manager;
    recordMatch({ home: this.world.teams[0].def.name, away: this.world.teams[1].def.name, gf: m.score[0], ga: m.score[1], date: Date.now() });
    this.audio.play('whistle');
    this.hud.banner('FULL TIME', 0xffffff, 1400);
    const data: ResultsData = { score: [m.score[0], m.score[1]], stats: m.stats, home: this.settings.home, away: this.settings.away };
    this.time.delayedCall(1700, () => this.scene.start('Results', data));
  }

  private onSim(e: SimEvent) {
    const m = this.manager, w = this.world;
    switch (e.type) {
      case 'shot': m.stats.shots[e.team]++; this.audio.play('kick'); break;
      case 'pass': m.stats.passes[e.team]++; this.audio.play('pass'); break;
      case 'tackle': m.stats.tackles[e.team]++; this.audio.play('tackle'); break;
      case 'save': m.stats.saves[e.team]++; this.audio.play('save'); this.hud.notify('Save!'); break;
      case 'pickup':
        // Hand control to a teammate who just received the ball.
        if (e.team === 0 && !e.player.isKeeper && e.player !== w.human) w.human = e.player;
        break;
      default: break;
    }
  }

  private applyHumanActions(s: InputState) {
    const w = this.world, h = w.human!, m = this.manager;
    if (s.switchPlayer) this.switchPlayer();
    const moving = s.moveX !== 0 || s.moveY !== 0;
    const moveAim = moving ? { x: s.moveX, y: s.moveY } : null;

    if (s.shootReleased && canKick(w, h)) {
      if (shoot(w, h, moving ? { x: h.fx, y: h.fy } : null, s.charge, 1)) { m.stats.shots[0]++; this.audio.play('kick'); }
    } else if ((s.pass || s.through) && canKick(w, h) && h.kickCooldown <= 0) {
      const r = pass(w, h, moveAim, s.through, 0.05);
      if (r) m.stats.passes[0]++;
      this.audio.play('pass');
    }
    if (s.tackle && w.ball.owner !== h) {
      const res = tackle(w, h, 0.6);
      if (res === 'won') { m.stats.tackles[0]++; this.audio.play('tackle'); }
      else if (res !== 'none') this.audio.play('tackle');
    }
  }

  private switchPlayer() {
    const w = this.world, cur = w.human;
    let best: Player | null = null, bd = Infinity;
    for (const p of w.teams[0].outfield) {
      if (p === cur) continue;
      const d = Math.hypot(p.x - w.ball.x, p.y - w.ball.y);
      if (d < bd) { bd = d; best = p; }
    }
    if (best) { w.human = best; this.hud.notify(`Player #${best.number}`); }
  }

  // ---------- rendering ----------

  private drawPitch() {
    const g = this.add.graphics().setDepth(0);
    g.fillStyle(0x0c2a1a); g.fillRect(0, 0, GAME.width, GAME.height);
    const stripes = 11, sw = (PITCH.right - PITCH.left) / stripes;
    for (let i = 0; i < stripes; i++) {
      g.fillStyle(i % 2 ? 0x1f8f4a : 0x23a055);
      g.fillRect(PITCH.left + i * sw, PITCH.top, sw, PITCH.bottom - PITCH.top);
    }
    // subtle surface details (fixed pseudo-random patches)
    let seed = 11; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    g.fillStyle(0x000000, 0.04);
    for (let i = 0; i < 40; i++) g.fillCircle(PITCH.left + rnd() * (PITCH.right - PITCH.left), PITCH.top + rnd() * (PITCH.bottom - PITCH.top), 8 + rnd() * 18);

    g.lineStyle(3, 0xffffff, 0.9);
    g.strokeRect(PITCH.left, PITCH.top, PITCH.right - PITCH.left, PITCH.bottom - PITCH.top);
    g.lineBetween(PITCH.cx, PITCH.top, PITCH.cx, PITCH.bottom);
    g.strokeCircle(PITCH.cx, PITCH.cy, 60);
    g.fillStyle(0xffffff, 0.9); g.fillCircle(PITCH.cx, PITCH.cy, 4);

    for (const side of [-1, 1]) {
      const lineX = side < 0 ? PITCH.left : PITCH.right;
      const inward = -side;
      const rx = (depth: number) => (inward > 0 ? lineX : lineX - depth);
      g.strokeRect(rx(PITCH.penDepth), PITCH.cy - PITCH.penHalf, PITCH.penDepth, PITCH.penHalf * 2);
      g.strokeRect(rx(PITCH.areaDepth), PITCH.cy - PITCH.areaHalf, PITCH.areaDepth, PITCH.areaHalf * 2);
      const spotX = lineX + inward * 92;
      g.fillCircle(spotX, PITCH.cy, 3.5);
      g.beginPath();
      const a0 = inward > 0 ? -0.93 : Math.PI - 0.93, a1 = inward > 0 ? 0.93 : Math.PI + 0.93;
      g.arc(spotX, PITCH.cy, 60, a0, a1);
      g.strokePath();
      // goal: net, hatching and posts
      const nx = side < 0 ? lineX - PITCH.goalDepth : lineX;
      g.fillStyle(0xffffff, 0.14);
      g.fillRect(nx, PITCH.cy - PITCH.goalHalf, PITCH.goalDepth, PITCH.goalHalf * 2);
      g.lineStyle(1, 0xffffff, 0.35);
      for (let y = PITCH.cy - PITCH.goalHalf; y <= PITCH.cy + PITCH.goalHalf; y += 8) g.lineBetween(nx, y, nx + PITCH.goalDepth, y);
      for (let x = nx; x <= nx + PITCH.goalDepth; x += 8) g.lineBetween(x, PITCH.cy - PITCH.goalHalf, x, PITCH.cy + PITCH.goalHalf);
      g.lineStyle(3, 0xffffff, 0.9);
      g.strokeRect(nx, PITCH.cy - PITCH.goalHalf, PITCH.goalDepth, PITCH.goalHalf * 2);
      g.fillStyle(0xffffff);
      g.fillCircle(lineX, PITCH.cy - PITCH.goalHalf, PITCH.postRadius + 1);
      g.fillCircle(lineX, PITCH.cy + PITCH.goalHalf, PITCH.postRadius + 1);
    }
    g.lineStyle(3, 0xffffff, 0.9);
    const corners: [number, number, number][] = [
      [PITCH.left, PITCH.top, 0], [PITCH.right, PITCH.top, Math.PI / 2],
      [PITCH.right, PITCH.bottom, Math.PI], [PITCH.left, PITCH.bottom, -Math.PI / 2],
    ];
    for (const [x, y, a] of corners) { g.beginPath(); g.arc(x, y, 14, a, a + Math.PI / 2); g.strokePath(); }
  }

  private render(dt: number) {
    const g = this.gfx, w = this.world, b = w.ball;
    g.clear();

    // ball trail for powerful shots
    if (b.speed > 600) { this.trail.push({ x: b.x, y: b.y }); if (this.trail.length > 8) this.trail.shift(); }
    else if (this.trail.length) this.trail.shift();
    this.trail.forEach((t, i) => { g.fillStyle(0xffffff, (i / this.trail.length) * 0.3); g.fillCircle(t.x, t.y, BALL.radius * (0.4 + i / 14)); });

    w.players.forEach((p, i) => {
      const def = w.teams[p.team].def;
      const body = p.isKeeper ? def.keeper : def.primary;
      g.fillStyle(0x000000, 0.25); g.fillEllipse(p.x + 2, p.y + 7, 28, 12);
      if (p.sprinting && !this.settings.reduceFx) { g.fillStyle(0xffffff, 0.22); g.fillCircle(p.x - p.fx * 16, p.y - p.fy * 16, 4); g.fillCircle(p.x - p.fx * 24, p.y - p.fy * 24, 3); }
      if (p.tackleFx > 0) { g.lineStyle(3, 0xffffff, p.tackleFx * 3); g.strokeCircle(p.x, p.y, PLAYER.radius + (0.25 - p.tackleFx) * 70); }
      g.fillStyle(body); g.fillCircle(p.x, p.y, PLAYER.radius);
      g.lineStyle(2, def.secondary, 1); g.strokeCircle(p.x, p.y, PLAYER.radius);
      g.fillStyle(0xf2c9a0); g.fillCircle(p.x + p.fx * 8, p.y + p.fy * 8, 4.5); // head / facing indicator
      if (p === w.human) {
        g.lineStyle(3, 0xffd23f, 1); g.strokeCircle(p.x, p.y, PLAYER.radius + 5);
        g.fillStyle(0xffd23f); g.fillTriangle(p.x - 6, p.y - 33, p.x + 6, p.y - 33, p.x, p.y - 24);
        if (b.owner === p || canKick(w, p)) {
          const c = this.controls.state.charge;
          g.lineStyle(2, 0xffffff, 0.35 + c * 0.5);
          g.lineBetween(p.x + p.fx * 20, p.y + p.fy * 20, p.x + p.fx * (36 + c * 40), p.y + p.fy * (36 + c * 40));
        }
      }
      this.numbers[i].setPosition(p.x, p.y - 1);
    });

    // ball
    g.fillStyle(0x000000, 0.3); g.fillEllipse(b.x + 2, b.y + 5, 18, 8);
    g.fillStyle(0xffffff); g.fillCircle(b.x, b.y, BALL.radius);
    g.fillStyle(0x222222);
    g.fillCircle(b.x, b.y, 2.6);
    for (let k = 0; k < 5; k++) {
      const a = b.rot + (k * Math.PI * 2) / 5;
      g.fillCircle(b.x + Math.cos(a) * 5.3, b.y + Math.sin(a) * 5.3, 1.9);
    }
    g.lineStyle(1.5, 0x222222, 0.9); g.strokeCircle(b.x, b.y, BALL.radius);

    // particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt; p.vy += 260 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.life <= 0) { this.particles.splice(i, 1); continue; }
      g.fillStyle(p.color, Math.min(1, p.life)); g.fillRect(p.x, p.y, 5, 5);
    }
  }
}
