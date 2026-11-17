// Petits outils partagés : matériaux mats, formes arrondies, horloge de jeu (attentes et tweens).
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

export const PAL = {
  mustard: 0xf1c76d, cream: 0xffe8d6, rose: 0xe7b4b1, caramel: 0xc78e5a, sky: 0xa7c8e6, sage: 0xa8b89a,
  white: 0xfff8f0, wood: 0xdcae80, woodDark: 0xa9744a, ink: 0x4a3f3a,
};

export function mat(color: number, opts: THREE.MeshStandardMaterialParameters = {}): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.95, metalness: 0, ...opts });
}

type Shadow = { cast?: boolean; receive?: boolean };
function finish(m: THREE.Mesh, x: number, y: number, z: number, sh: Shadow): THREE.Mesh {
  m.position.set(x, y, z);
  m.castShadow = sh.cast ?? true;
  m.receiveShadow = sh.receive ?? true;
  return m;
}

/** Boîte aux arêtes arrondies, posée par son centre. */
export function rbox(w: number, h: number, d: number, r: number, material: THREE.Material, x = 0, y = 0, z = 0, sh: Shadow = {}): THREE.Mesh {
  const rr = Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001);
  return finish(new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, rr), material), x, y, z, sh);
}
export function ball(r: number, material: THREE.Material, x = 0, y = 0, z = 0, sh: Shadow = {}): THREE.Mesh {
  return finish(new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), material), x, y, z, sh);
}
export function cyl(rt: number, rb: number, h: number, material: THREE.Material, x = 0, y = 0, z = 0, sh: Shadow = {}): THREE.Mesh {
  return finish(new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, 24), material), x, y, z, sh);
}
export function capsule(r: number, len: number, material: THREE.Material, x = 0, y = 0, z = 0, sh: Shadow = {}): THREE.Mesh {
  return finish(new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 6, 14), material), x, y, z, sh);
}
export function group(x = 0, y = 0, z = 0, ...children: THREE.Object3D[]): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  children.forEach((c) => g.add(c));
  return g;
}

export const ease = {
  inOut: (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  out: (t: number) => 1 - Math.pow(1 - t, 3),
  back: (t: number) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
};
export const damp = (cur: number, target: number, lambda: number, dt: number) => cur + (target - cur) * (1 - Math.exp(-lambda * dt));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export function dampAngle(cur: number, target: number, lambda: number, dt: number): number {
  let d = (target - cur) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return cur + d * (1 - Math.exp(-lambda * dt));
}

interface Job { t: number; dur: number; fn: (k: number) => void; done: () => void }

/** Horloge de jeu : tout ce qui attend ou s'anime passe par elle (accélérable pour les tests). */
export class Clock {
  time = 0;
  speed = 1;
  private jobs: Job[] = [];
  update(dtReal: number): number {
    const dt = dtReal * this.speed;
    this.time += dt;
    for (let i = this.jobs.length - 1; i >= 0; i--) {
      const j = this.jobs[i];
      j.t += dt;
      const k = j.dur <= 0 ? 1 : Math.min(1, j.t / j.dur);
      j.fn(k);
      if (k >= 1) { this.jobs.splice(i, 1); j.done(); }
    }
    return dt;
  }
  wait(sec: number): Promise<void> {
    return new Promise((done) => this.jobs.push({ t: 0, dur: sec, fn: () => {}, done }));
  }
  tween(sec: number, fn: (k: number) => void, e: (t: number) => number = ease.inOut): Promise<void> {
    return new Promise((done) => this.jobs.push({ t: 0, dur: sec, fn: (k) => fn(e(k)), done }));
  }
}

/** Fait apparaître ou disparaître un objet en douceur (jamais d'apparition brutale). */
export function pop(clock: Clock, o: THREE.Object3D, on: boolean): void {
  const want = on ? 1 : 0;
  if (o.userData.want === want) return;
  o.userData.want = want;
  const from = o.visible ? o.scale.x : 0;
  if (on) o.visible = true;
  void clock.tween(on ? 0.5 : 0.3, (k) => {
    if (o.userData.want !== want) return;
    o.scale.setScalar(Math.max(0.001, lerp(from, want, k)));
    if (k >= 1 && !on) o.visible = false;
  }, on ? ease.back : ease.inOut);
}
