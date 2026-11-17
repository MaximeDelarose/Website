// Le personnage : une figurine arrondie entièrement animée par code.
// Il ne parle pas : son état passe par sa couleur, sa posture, son rythme et ses petits gestes.
import * as THREE from "three";
import { Clock, ball, capsule, damp, dampAngle, group, lerp, mat } from "./kit";
import { TIER_COLORS, Tier } from "./sim";

export interface Pose {
  y: number; lean: number; twist: number; hx: number; hy: number; hz: number;
  aLx: number; aLz: number; aRx: number; aRz: number; lL: number; lR: number;
  sit: number; lie: number; sq: number;
}
const ZERO: Pose = { y: 0, lean: 0, twist: 0, hx: 0, hy: 0, hz: 0, aLx: 0, aLz: 0.12, aRx: 0, aRz: 0.12, lL: 0, lR: 0, sit: 0, lie: 0, sq: 0 };
type ClipFn = (t: number, k: Feel) => Partial<Pose>;

/** Ce que l'état mental change dans la façon de bouger. */
interface Feel { tier: Tier; lean: number; head: number; speed: number; amp: number; breath: number; bounce: number }
const FEEL: Feel[] = [
  { tier: 0, lean: 0.2, head: 0.26, speed: 0.95, amp: 0.5, breath: 1.1, bounce: 0.3 },
  { tier: 1, lean: 0.1, head: 0.12, speed: 1.25, amp: 0.75, breath: 1.35, bounce: 0.6 },
  { tier: 2, lean: 0.0, head: 0.0, speed: 1.55, amp: 1, breath: 1.6, bounce: 1 },
  { tier: 3, lean: -0.02, head: -0.02, speed: 1.6, amp: 1, breath: 1.3, bounce: 1.05 },
  { tier: 4, lean: -0.05, head: -0.08, speed: 1.9, amp: 1.25, breath: 1.7, bounce: 1.5 },
];

const s = Math.sin;
const pulse = (t: number, period: number, width: number) => { const x = (t % period) / width; return x < 1 ? s(x * Math.PI) : 0; };
const SIT = { sit: 1, lL: 1.45, lR: 1.45, y: -0.14 };

const CLIPS: Record<string, ClipFn> = {
  idle: (t, k) => ({ sq: s(t * k.breath) * 0.016, aLx: s(t * 0.7) * 0.04, aRx: -s(t * 0.7) * 0.04 }),
  walk: (t, k) => {
    const f = t * (5.2 + k.speed * 1.6);
    return { lL: s(f) * 0.7 * k.amp, lR: -s(f) * 0.7 * k.amp, aLx: -s(f) * 0.5 * k.amp, aRx: s(f) * 0.5 * k.amp, y: Math.abs(s(f)) * 0.045 * k.bounce, lean: 0.06 };
  },
  sitIdle: (t, k) => ({ ...SIT, sq: s(t * k.breath) * 0.014 }),
  type: (t) => ({ ...SIT, lean: 0.12, hx: 0.14 + s(t * 0.5) * 0.03, aLx: 1.15 + s(t * 15) * 0.07, aRx: 1.15 + s(t * 15 + 2) * 0.07, aLz: -0.1, aRz: -0.1 }),
  draw: (t) => ({ ...SIT, lean: 0.2, hx: 0.25, hz: 0.14 + s(t * 0.6) * 0.05, aLx: 0.95, aLz: -0.15, aRx: 1.15 + s(t * 3.1) * 0.12, aRz: -0.05 + s(t * 2.3) * 0.18 }),
  game: (t) => ({ ...SIT, lean: -0.06, hx: s(t * 2.2) * 0.04, hz: s(t * 1.1) * 0.06, aLx: 0.9 + s(t * 11) * 0.05, aRx: 0.9 + s(t * 13) * 0.05, aLz: -0.2, aRz: -0.2 }),
  read: (t) => ({ ...SIT, lean: -0.05, hx: 0.3, hy: s(t * 0.4) * 0.05, aLx: 0.95, aLz: -0.25, aRx: 0.95 + pulse(t, 3.4, 0.6) * 0.35, aRz: -0.25 }),
  rest: (t, k) => ({ ...SIT, lean: -0.2, hx: -0.12, hz: s(t * 0.3) * 0.05, sq: s(t * k.breath * 0.8) * 0.02, aLz: 0.25, aRz: 0.25 }),
  reach: (t) => ({ aRx: 1.35 + s(t * 2) * 0.05, lean: 0.1, hx: 0.05 }),
  hesitate: (t) => ({ hy: s(t * 1.6) * 0.3, hz: s(t * 0.8) * 0.08, aRx: 0.5, twist: s(t * 1.6) * 0.05 }),
  stir: (t) => ({ aRx: 1.05 + s(t * 5) * 0.1, aRz: -0.1 + Math.cos(t * 5) * 0.14, aLx: 0.55, hx: 0.22, lean: 0.08 }),
  scrub: (t) => ({ aRx: 1.0 + s(t * 9) * 0.14, aLx: 1.0 - s(t * 9) * 0.14, aLz: -0.15, aRz: -0.15, hx: 0.28, lean: 0.16 }),
  hold: () => ({ aRx: 0.9, aRz: -0.1 }),
  drink: (t) => { const p = pulse(t, 2.6, 1.3); return { aRx: 0.9 + p * 1.0, aRz: -0.1 - p * 0.25, hx: -0.06 - p * 0.14, hy: s(t * 0.3) * 0.12 }; },
  look: (t, k) => ({ hx: -0.1, hy: s(t * 0.35) * 0.18, sq: s(t * k.breath) * 0.016, aLx: -0.15, aRx: -0.15, twist: s(t * 0.2) * 0.04 }),
  water: (t) => ({ aRx: 1.1, aRz: 0.2 + s(t * 1.8) * 0.12, lean: 0.2, hx: 0.25, hz: s(t * 0.9) * 0.06 }),
  tidy: (t) => { const p = pulse(t, 1.7, 1.1); return { lean: 0.15 + p * 0.8, hx: 0.1 + p * 0.2, aLx: 0.5 + p * 0.5, aRx: 0.5 + p * 0.5, y: -p * 0.08 }; },
  stretch: (t) => { const p = Math.min(1, s(Math.min(t / 2.2, 1) * Math.PI) * 1.4); return { aLz: 0.12 + p * 2.6, aRz: 0.12 + p * 2.6, lean: -p * 0.14, hx: -p * 0.2, y: p * 0.04, sq: p * 0.04 }; },
  yawn: (t) => { const p = s(Math.min(t / 2, 1) * Math.PI); return { aRx: p * 2.1, aRz: -p * 0.3, hx: -p * 0.25, sq: p * 0.03 }; },
  sigh: (t) => { const p = s(Math.min(t / 1.8, 1) * Math.PI); return { sq: -p * 0.05, lean: p * 0.12, hx: p * 0.2, aLz: 0.12 + p * 0.1, aRz: 0.12 + p * 0.1 }; },
  hop: (t) => { const p = Math.abs(s(Math.min(t / 0.9, 1) * Math.PI * 2)); return { y: p * 0.16, aLz: 0.12 + p * 0.7, aRz: 0.12 + p * 0.7, hx: -0.08, sq: p * 0.03 }; },
  nod: (t) => ({ hx: s(Math.min(t / 0.9, 1) * Math.PI * 2) * 0.16 }),
  lookAround: (t) => ({ hy: s(Math.min(t / 3, 1) * Math.PI * 2) * 0.55, twist: s(Math.min(t / 3, 1) * Math.PI * 2) * 0.1 }),
  tapFoot: (t, k) => ({ lR: Math.max(0, s(t * 9)) * 0.22, sq: s(t * k.breath) * 0.016, hy: 0.15 }),
  shift: (t) => ({ hz: s(Math.min(t / 2.5, 1) * Math.PI) * 0.12, twist: s(Math.min(t / 2.5, 1) * Math.PI) * 0.08, aRx: s(Math.min(t / 2.5, 1) * Math.PI) * 0.3 }),
  lookDown: (t) => ({ hx: s(Math.min(t / 3.5, 1) * Math.PI) * 0.3, lean: s(Math.min(t / 3.5, 1) * Math.PI) * 0.06 }),
  sway: (t) => ({ hz: s(t * 2.4) * 0.1, twist: s(t * 2.4) * 0.1, aLx: s(t * 2.4) * 0.2, aRx: -s(t * 2.4) * 0.2, y: Math.abs(s(t * 2.4)) * 0.03 }),
  phone: (t) => ({ aRx: 1.25, aRz: -0.28, hx: 0.3, hz: s(t * 0.5) * 0.04, aLx: 0.3 + pulse(t, 2.1, 0.5) * 0.5, aLz: -0.2 }),
  call: (t) => ({ aRx: 2.25, aRz: -0.35, hz: -0.14, hy: s(t * 0.6) * 0.2, aLx: pulse(t, 2.7, 1.2) * 0.6, twist: s(t * 0.5) * 0.06 }),
  wave: (t) => ({ aRz: 2.3 + s(t * 9) * 0.3, hz: -0.08, y: Math.abs(s(t * 4.5)) * 0.02 }),
  talk: (t) => ({ aRx: 0.5 + pulse(t, 1.6, 0.9) * 0.5, aLx: 0.3 + pulse(t + 0.8, 1.9, 0.9) * 0.5, aRz: 0.3, aLz: 0.3, hx: s(t * 2.6) * 0.05, hz: s(t * 1.3) * 0.06 }),
  floorSit: (t, k) => ({ sit: 1, lL: 1.5, lR: 1.5, y: -0.4, lean: -0.08, sq: s(t * k.breath * 0.8) * 0.018, aLz: 0.3, aRz: 0.3 }),
  floorTalk: (t) => ({ sit: 1, lL: 1.5, lR: 1.5, y: -0.4, aRx: 0.5 + pulse(t, 1.7, 0.9) * 0.5, aRz: 0.3, aLz: 0.3, hx: s(t * 2.4) * 0.05, hz: s(t * 1.2) * 0.07 }),
  sitTalk: (t) => ({ ...SIT, aRx: 0.55 + pulse(t + 0.9, 1.8, 0.9) * 0.5, aLx: 0.5, aRz: 0.2, aLz: 0.1, hx: s(t * 2.2) * 0.06, hz: s(t * 1.1) * 0.07 }),
  sitDrink: (t) => { const p = pulse(t, 2.6, 1.3); return { ...SIT, aRx: 0.95 + p * 0.95, aRz: -0.1 - p * 0.25, hx: -p * 0.16 }; },
  sitNod: (t) => ({ ...SIT, hx: 0.05 + Math.max(0, s(t * 3)) * 0.14, aLx: 0.6, aRx: 0.6, aLz: -0.2, aRz: -0.2 }),
  sitLaugh: (t) => ({ ...SIT, y: -0.14 + Math.abs(s(t * 7)) * 0.03, hx: -0.12, sq: s(t * 14) * 0.02, aLz: 0.3, aRz: 0.3 }),
  carry: () => ({ aRx: 0.85, aLx: 0.85, aRz: -0.25, aLz: -0.25, lean: -0.05 }),
  sleep: (t) => ({ lie: 1, sq: s(t * 0.9) * 0.03, aLz: 0.05, aRz: 0.05 }),
  wake: (t) => ({ lie: 1, hy: s(t * 1.2) * 0.2, aRx: pulse(t, 9, 1.6) * 1.6 }),
};

// Petits gestes spontanés quand il ne fait rien, selon son état.
const IDLE_EXTRAS: string[][] = [
  ["sigh", "lookDown", "lookDown"],
  ["sigh", "lookDown", "yawn", "shift"],
  ["lookAround", "shift", "tapFoot", "yawn"],
  ["lookAround", "stretch", "shift", "tapFoot"],
  ["lookAround", "stretch", "sway", "hop", "sway"],
];
const EXTRA_DUR: Record<string, number> = { sigh: 1.8, lookDown: 3.5, yawn: 2, shift: 2.5, lookAround: 3, tapFoot: 2.4, stretch: 2.2, sway: 2.6, hop: 0.9 };

export class Character {
  root = group();
  hand = group(); // main droite : on y accroche tasse, arrosoir…
  mood = 46;
  tier: Tier = 2;
  private tilt = group();
  private rig = group();
  private torso: THREE.Mesh; private head: THREE.Group;
  private armL: THREE.Group; private armR: THREE.Group; private legL: THREE.Group; private legR: THREE.Group;
  private bodyMat = mat(0xffffff); private headMat = mat(0xffffff); private hairMat = mat(0xffffff);
  private pose: Pose = { ...ZERO };
  private clip = "idle"; private clipT = 0;
  private extra: string | null = null; private extraT = 0; private nextExtra = 4;
  private heading = 0;
  private color = new THREE.Color(TIER_COLORS[2]);
  private fixedHair: number | null = null;
  private carrying: string | null = null;
  private blink = 3; private eyes: THREE.Mesh[] = [];
  busy = false; // vrai pendant une action scénarisée (pas de gestes spontanés)
  onStep: (() => void) | null = null;
  private stepPhase = 0;

  tint: number | null = null; // couleur imposée (pour les proches : leur propre état)

  constructor(private clock: Clock, look: { hair?: number; bun?: boolean } = {}) {
    this.fixedHair = look.hair ?? null;
    const limb = (x: number, y: number, r: number, len: number) => {
      const g = group(x, y, 0);
      g.add(capsule(r, len, this.bodyMat, 0, -len / 2 - r * 0.4, 0));
      return g;
    };
    this.torso = capsule(0.27, 0.3, this.bodyMat, 0, 0.72, 0);
    this.head = group(0, 1.22, 0, ball(0.31, this.headMat));
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.33, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.46), this.hairMat);
    hair.position.set(0, 0.02, -0.03); hair.rotation.x = -0.3; hair.castShadow = true;
    this.head.add(hair, ball(0.09, this.hairMat, 0.2, 0.2, -0.08), ball(0.07, this.hairMat, -0.12, 0.3, 0.05));
    if (look.bun) this.head.add(ball(0.13, this.hairMat, 0, 0.3, -0.16));
    const eyeMat = mat(0x3d3432, { roughness: 0.5 });
    for (const x of [-0.115, 0.115]) {
      const e = ball(0.038, eyeMat, x, -0.02, 0.285, { cast: false });
      this.eyes.push(e); this.head.add(e);
    }
    const blush = mat(0xe7a6a0, { transparent: true, opacity: 0.55 });
    for (const x of [-0.2, 0.2]) { const b = ball(0.05, blush, x, -0.09, 0.235, { cast: false }); b.scale.set(1, 0.6, 0.4); this.head.add(b); }
    this.armL = limb(0.31, 0.93, 0.078, 0.3);
    this.armR = limb(-0.31, 0.93, 0.078, 0.3);
    this.legL = limb(0.13, 0.5, 0.095, 0.26);
    this.legR = limb(-0.13, 0.5, 0.095, 0.26);
    this.hand.position.set(0, -0.44, 0.02);
    this.armR.add(this.hand);
    this.rig.add(this.torso, this.head, this.armL, this.armR, this.legL, this.legR);
    this.tilt.add(this.rig);
    this.root.add(this.tilt);
  }

  get feel(): Feel { return FEEL[this.tier]; }
  setClip(name: string): void { if (this.clip !== name) { this.clip = name; this.clipT = 0; } this.extra = null; }
  face(angle: number): void { this.heading = angle; }

  /** Joue un geste pendant une durée, puis rend la main. */
  async play(name: string, sec: number): Promise<void> { this.setClip(name); await this.clock.wait(sec); }

  /** Marche en ligne droite vers un point, au rythme de son état. */
  async walkTo(x: number, z: number): Promise<void> {
    const p = this.root.position;
    const dx = x - p.x, dz = z - p.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 0.05) return;
    this.heading = Math.atan2(dx, dz);
    this.carrying = this.clip === "carry" || this.clip === "hold" ? this.clip : null;
    this.setClip("walk");
    const sx = p.x, sz = p.z;
    const prev = this.clip;
    await this.clock.tween(dist / this.feel.speed, (k) => { p.x = lerp(sx, x, k); p.z = lerp(sz, z, k); }, (t) => t);
    this.setClip(prev === "carry" || prev === "hold" ? prev : "idle");
  }

  update(dt: number): void {
    const k = this.feel;
    this.clipT += dt;
    let target: Partial<Pose> = CLIPS[this.clip](this.clipT, k);
    if (this.clip === "walk" && this.carrying) { const c = CLIPS[this.carrying](this.clipT, k); target = { ...target, aRx: c.aRx, aRz: c.aRz, ...(this.carrying === "carry" ? { aLx: c.aLx, aLz: c.aLz } : {}) }; }

    // Gestes spontanés : uniquement au repos, debout ou assis, hors action.
    if (!this.busy && (this.clip === "idle")) {
      if (this.extra) {
        this.extraT += dt;
        target = { ...target, ...CLIPS[this.extra](this.extraT, k) };
        if (this.extraT > EXTRA_DUR[this.extra]) this.extra = null;
      } else if ((this.nextExtra -= dt) < 0) {
        const list = IDLE_EXTRAS[this.tier];
        this.extra = list[Math.floor(Math.random() * list.length)];
        this.extraT = 0;
        this.nextExtra = (this.tier === 0 ? 7 : 4) + Math.random() * 5;
      }
    } else this.extra = null;

    const P = this.pose;
    const lam = this.tier === 0 ? 5 : this.tier === 1 ? 7 : 10;
    for (const key of Object.keys(ZERO) as (keyof Pose)[]) {
      let goal = target[key] ?? ZERO[key];
      if (key === "lean" && !target.lie) goal += k.lean * (target.sit ? 0.6 : 1);
      if (key === "hx" && !target.lie) goal += k.head;
      P[key] = damp(P[key], goal, key === "lie" || key === "sit" ? 5 : lam, dt);
    }

    const r = this.root;
    r.rotation.y = dampAngle(r.rotation.y, this.heading, 9, dt);
    this.tilt.rotation.x = -P.lie * Math.PI / 2;
    this.rig.position.y = P.y;
    this.rig.scale.set(1 - P.sq * 0.6, 1 + P.sq, 1 - P.sq * 0.6);
    this.torso.rotation.x = P.lean; this.torso.rotation.y = P.twist;
    this.torso.position.z = Math.sin(P.lean) * 0.2;
    this.head.position.set(0, 1.22 - (1 - Math.cos(P.lean)) * 0.3, Math.sin(P.lean) * 0.5);
    this.head.rotation.set(P.hx, P.hy, P.hz);
    const sh = Math.sin(P.lean) * 0.42;
    this.armL.position.z = sh; this.armR.position.z = sh;
    this.armL.rotation.set(-P.aLx, 0, P.aLz);
    this.armR.rotation.set(-P.aRx, 0, -P.aRz);
    this.legL.rotation.x = -P.lL; this.legR.rotation.x = -P.lR;

    // Clignement des yeux.
    this.blink -= dt;
    const closed = this.blink < 0.12 || (this.clip === "sleep");
    for (const e of this.eyes) e.scale.y = damp(e.scale.y, closed ? 0.12 : 1, 30, dt);
    if (this.blink < 0) this.blink = 2 + Math.random() * 4;

    // Pas feutrés.
    if (this.clip === "walk") {
      const ph = Math.sin(this.clipT * (5.2 + k.speed * 1.6));
      if (ph * this.stepPhase < 0) this.onStep?.();
      this.stepPhase = ph;
    }

    // Couleur : glisse en continu entre les cinq teintes émotionnelles.
    const f = Math.max(0, Math.min(3.999, (this.mood - 10) / 20));
    const i = Math.floor(f);
    const want = this.tint !== null ? new THREE.Color(this.tint) : new THREE.Color(TIER_COLORS[i]).lerp(new THREE.Color(TIER_COLORS[i + 1]), f - i);
    this.color.lerp(want, 1 - Math.exp(-1.6 * dt));
    this.bodyMat.color.copy(this.color);
    this.headMat.color.copy(this.color).lerp(new THREE.Color(0xfff6ec), 0.42);
    if (this.fixedHair !== null) this.hairMat.color.setHex(this.fixedHair); else this.hairMat.color.copy(this.color).multiplyScalar(0.62);
  }
}
