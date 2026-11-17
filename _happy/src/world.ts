// L'appartement-diorama : pièce, meubles, lumière du jour, et tout ce qui le rend habité.
import * as THREE from "three";
import { Clock, PAL, ball, capsule, cyl, damp, ease, group, lerp, mat, pop, rbox } from "./kit";
import { State } from "./sim";

export interface Interactable {
  id: string;
  obj: THREE.Object3D; // ce qui réagit au survol
  anchor: THREE.Vector3; // où s'ouvre le menu
  spot: THREE.Vector3; // où se place le personnage
  face: number; // vers où il regarde
}

interface Key { p: number; hemi: number; hemiC: number; sun: number; sunC: number; sky: number; patch: number; patchC: number; bg: [string, string] }
// Matin → journée → soir → nuit.
const KEYS: Key[] = [
  { p: 0.0, hemi: 1.75, hemiC: 0xfff0dc, sun: 1.5, sunC: 0xffdcae, sky: 0xc6e0f0, patch: 0.3, patchC: 0xffe2a8, bg: ["#fff1df", "#f6d9c2"] },
  { p: 0.4, hemi: 1.95, hemiC: 0xfffaf2, sun: 1.75, sunC: 0xfff3e0, sky: 0xa7c8e6, patch: 0.22, patchC: 0xfff2c8, bg: ["#fff4e6", "#f3dcc8"] },
  { p: 0.75, hemi: 1.5, hemiC: 0xffdcc6, sun: 1.35, sunC: 0xffb07a, sky: 0xf2b396, patch: 0.32, patchC: 0xffb070, bg: ["#fbe0cc", "#e9bfa8"] },
  { p: 1.0, hemi: 0.72, hemiC: 0x9aa6d2, sun: 0.4, sunC: 0x9fb2e6, sky: 0x2b3158, patch: 0.0, patchC: 0x8090c0, bg: ["#58597e", "#3d3f61"] },
];

function softTexture(draw: (g: CanvasRenderingContext2D, n: number) => void, n = 256): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = n;
  draw(c.getContext("2d")!, n);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class World {
  scene = new THREE.Scene();
  camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
  items: Interactable[] = [];
  phase = 0; // 0 matin … 1 nuit (valeur affichée, lissée)
  phaseTarget = 0;
  onLamp: (() => void) | null = null;
  bg: [string, string] = ["#fff1df", "#f6d9c2"];

  private hemi = new THREE.HemisphereLight(0xffffff, 0xe6c3a2, 1.7);
  private sun = new THREE.DirectionalLight(0xffffff, 1.5);
  private skyMat = new THREE.MeshBasicMaterial({ color: 0xa7c8e6 });
  private patch!: THREE.Mesh;
  private stars!: THREE.Points;
  private sunDisc!: THREE.Mesh;
  private lamps: { light: THREE.PointLight; bulb: THREE.MeshStandardMaterial; on: number }[] = [];
  private lampsOn = false;
  private curtains: THREE.Mesh[] = [];
  private leaves: THREE.Group[] = [];
  private plant = group();
  private dust!: THREE.Points;
  private screenMat = mat(0x3a3f4a, { roughness: 0.4, emissive: 0x9cc4f0, emissiveIntensity: 0 });
  private screenOn = 0; private screenWant = 0;
  private blanket!: THREE.Mesh; private pillow!: THREE.Mesh;
  private bedMess = 1; private bedMessWant = 1; private bedPuff = 0; bedPuffWant = 0;
  private mug!: THREE.Object3D; private dishes: THREE.Object3D[] = []; private book!: THREE.Object3D; private clothes: THREE.Object3D[] = [];
  private meals: THREE.Object3D[] = [];
  bathDoor = group(); fridgeDoor = group();
  private hovered: Interactable | null = null;
  private steam: { m: THREE.Mesh; t: number }[] = [];
  private sparks: { m: THREE.Mesh; t: number; vx: number; vz: number }[] = [];
  private sparkMat = new THREE.MeshBasicMaterial({ color: 0xffdf9a, transparent: true });
  private steamMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 });
  private camDir = new THREE.Vector3(1, 0.86, 1).normalize();

  constructor(private clock: Clock) {
    this.scene.add(this.hemi);
    this.sun.position.set(5, 11, 8);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const sc = this.sun.shadow.camera;
    sc.left = -8; sc.right = 8; sc.top = 8; sc.bottom = -8; sc.near = 1; sc.far = 40;
    this.sun.shadow.bias = -0.0006; this.sun.shadow.normalBias = 0.03; this.sun.shadow.radius = 5;
    this.scene.add(this.sun, this.sun.target);
    this.buildRoom();
    this.buildWindow();
    this.buildBed();
    this.buildDesk();
    this.buildKitchen();
    this.buildCorner();
    this.buildSmallThings();
    this.applyPhase(0);
  }

  // ───────────────────────── construction ─────────────────────────

  private add(...o: THREE.Object3D[]): void { o.forEach((x) => this.scene.add(x)); }

  private register(id: string, obj: THREE.Object3D, anchor: [number, number, number], spot: [number, number], face: number): void {
    obj.traverse((c) => { c.userData.item = id; });
    this.items.push({ id, obj, anchor: new THREE.Vector3(...anchor), spot: new THREE.Vector3(spot[0], 0, spot[1]), face });
  }

  private buildRoom(): void {
    const planks = softTexture((g, n) => {
      g.fillStyle = "#deb185"; g.fillRect(0, 0, n, n);
      for (let i = 0; i < 8; i++) {
        g.fillStyle = i % 2 ? "rgba(255,240,220,0.10)" : "rgba(150,95,55,0.06)";
        g.fillRect(0, (i * n) / 8, n, n / 8);
        g.fillStyle = "rgba(140,90,50,0.22)"; g.fillRect(0, (i * n) / 8, n, 1.5);
        g.fillRect(((i * 97) % n), (i * n) / 8, 1.5, n / 8);
      }
    });
    planks.wrapS = planks.wrapT = THREE.RepeatWrapping; planks.repeat.set(2.2, 2);
    const floor = rbox(7.3, 0.3, 6.3, 0.08, mat(0xffffff, { map: planks }), 0, -0.15, 0, { cast: false });
    const base = rbox(7.7, 0.5, 6.7, 0.22, mat(0xeccdb2), -0.05, -0.5, -0.05, { cast: false });
    const wallB = rbox(7.55, 3.4, 0.28, 0.1, mat(0xffecdc), -0.12, 1.55, -3.14, { cast: false });
    const wallL = rbox(0.28, 3.4, 6.3, 0.1, mat(0xf8d9c8), -3.64, 1.55, 0, { cast: false });
    const skirtB = rbox(7.0, 0.14, 0.05, 0.02, mat(PAL.white), 0, 0.07, -2.98, { cast: false });
    const skirtL = rbox(0.05, 0.14, 6.0, 0.02, mat(PAL.white), -3.48, 0.07, 0, { cast: false });
    const rug = cyl(1.45, 1.45, 0.04, mat(PAL.sage), 0.1, 0.02, 0.5, { cast: false });
    const rugIn = cyl(1.12, 1.12, 0.045, mat(0xb9c7ab), 0.1, 0.022, 0.5, { cast: false });
    this.add(base, floor, wallB, wallL, skirtB, skirtL, rug, rugIn);

    // Porte d'entrée (le hall arrivera plus tard) et porte de la salle de bain.
    const door = group(3.0, 0, -2.97, rbox(0.86, 2.0, 0.08, 0.05, mat(PAL.caramel), 0, 1.0, 0), ball(0.045, mat(PAL.mustard, { roughness: 0.5 }), -0.3, 1.0, 0.07), rbox(0.9, 0.03, 0.34, 0.01, mat(PAL.sage), 0, 0.016, 0.3, { cast: false }));
    this.add(door);
    const frame = rbox(0.1, 2.12, 1.0, 0.03, mat(PAL.white), -3.5, 1.04, -0.2, { cast: false });
    const dark = rbox(0.04, 2.0, 0.84, 0.01, new THREE.MeshBasicMaterial({ color: 0x8a6e62 }), -3.47, 1.0, -0.2, { cast: false });
    this.bathDoor.position.set(-3.44, 0, -0.62);
    this.bathDoor.add(rbox(0.07, 1.98, 0.84, 0.03, mat(PAL.sky), 0, 1.0, 0.42), ball(0.04, mat(PAL.white, { roughness: 0.5 }), 0.06, 1.0, 0.72));
    const bath = group(0, 0, 0, frame, dark, this.bathDoor);
    this.add(bath);
    this.register("bath", bath, [-3.3, 2.25, -0.2], [-2.85, -0.2], -Math.PI / 2);
  }

  private buildWindow(): void {
    const g = group(-0.3, 1.75, -2.98);
    const sky = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5), this.skyMat);
    sky.position.z = 0.012;
    // Toits lointains, soleil ou lune, nuages.
    const roofMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.28 });
    for (const [x, w, h] of [[-0.5, 0.4, 0.3], [-0.1, 0.3, 0.44], [0.3, 0.5, 0.24], [0.62, 0.22, 0.36]] as const) {
      const r = new THREE.Mesh(new THREE.PlaneGeometry(w, h), roofMat);
      r.position.set(x, -0.75 + h / 2, 0.014); g.add(r);
    }
    this.sunDisc = new THREE.Mesh(new THREE.CircleGeometry(0.11, 24), new THREE.MeshBasicMaterial({ color: 0xfff3c4 }));
    this.sunDisc.position.set(0.3, 0.3, 0.013);
    const starGeo = new THREE.BufferGeometry();
    const pts: number[] = [];
    for (let i = 0; i < 16; i++) pts.push(-0.68 + ((i * 0.37) % 1.36), -0.05 + ((i * 0.53) % 0.72), 0.015);
    starGeo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    this.stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xfff6d8, size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0 }));
    const fm = mat(PAL.white);
    g.add(sky, this.sunDisc, this.stars,
      rbox(1.7, 0.1, 0.1, 0.03, fm, 0, 0.8, 0.04), rbox(1.7, 0.1, 0.1, 0.03, fm, 0, -0.8, 0.04),
      rbox(0.1, 1.7, 0.1, 0.03, fm, -0.8, 0, 0.04), rbox(0.1, 1.7, 0.1, 0.03, fm, 0.8, 0, 0.04),
      rbox(0.05, 1.5, 0.05, 0.02, fm, 0, 0, 0.04), rbox(1.5, 0.05, 0.05, 0.02, fm, 0, 0.1, 0.04),
      rbox(1.9, 0.07, 0.3, 0.03, fm, 0, -0.88, 0.14));
    // Rideaux : ils respirent un peu, même sans vent.
    const rod = cyl(0.025, 0.025, 2.3, mat(PAL.caramel), 0, 1.0, 0.16); rod.rotation.z = Math.PI / 2;
    g.add(rod);
    for (const x of [-0.98, 0.98]) {
      const c = rbox(0.38, 2.0, 0.07, 0.035, mat(PAL.sky), 0, -1.0, 0);
      const h = group(x, 1.0, 0.16, c);
      this.curtains.push(h as unknown as THREE.Mesh); g.add(h);
    }
    this.add(g);
    this.register("window", g, [-0.3, 2.95, -2.9], [-0.3, -2.15], Math.PI);

    // Tache de lumière au sol et poussières dans le rayon.
    const tex = softTexture((c, n) => {
      // Quatre carreaux de lumière, adoucis.
      c.filter = "blur(" + n * 0.045 + "px)";
      c.fillStyle = "#fff";
      for (const [x, y] of [[0.14, 0.12], [0.53, 0.12], [0.14, 0.53], [0.53, 0.53]]) c.fillRect(x * n, y * n, n * 0.33, n * 0.35);
    });
    this.patch = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 2.7), new THREE.MeshBasicMaterial({ map: tex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.4 }));
    this.patch.rotation.x = -Math.PI / 2; this.patch.rotation.z = -0.35;
    this.patch.position.set(0.05, 0.05, -1.05);
    const dg = new THREE.BufferGeometry();
    const dp: number[] = [];
    for (let i = 0; i < 18; i++) dp.push(-0.9 + Math.random() * 1.6, 0.3 + Math.random() * 1.9, -2.6 + Math.random() * 1.7);
    dg.setAttribute("position", new THREE.Float32BufferAttribute(dp, 3));
    this.dust = new THREE.Points(dg, new THREE.PointsMaterial({ color: 0xfff4d6, size: 2.4, sizeAttenuation: false, transparent: true, opacity: 0.5, depthWrite: false }));
    this.add(this.patch, this.dust);
  }

  private buildBed(): void {
    const g = group(-2.62, 0, -1.78);
    const wood = mat(PAL.caramel);
    this.blanket = rbox(1.5, 0.26, 1.45, 0.12, mat(PAL.mustard), 0, 0.6, 0.36);
    this.pillow = rbox(0.86, 0.17, 0.46, 0.08, mat(PAL.white), 0, 0.59, -0.72);
    g.add(rbox(1.62, 0.3, 2.3, 0.08, wood, 0, 0.2, 0), rbox(1.62, 0.9, 0.14, 0.07, wood, 0, 0.5, -1.12),
      rbox(1.5, 0.22, 2.16, 0.1, mat(PAL.cream), 0, 0.42, 0.02), this.blanket, this.pillow);
    this.add(g);
    this.register("bed", g, [-2.62, 1.55, -1.7], [-1.45, -1.5], -Math.PI / 2);

    // Table de nuit et sa petite lampe.
    const ns = group(-1.42, 0, -2.66, rbox(0.5, 0.5, 0.46, 0.06, mat(PAL.rose), 0, 0.25, 0), rbox(0.3, 0.035, 0.02, 0.01, mat(PAL.white), 0, 0.3, 0.235));
    this.add(ns);

    // L'étagère du mouton, au-dessus du lit : douze places attendent à côté de lui.
    const shelf = rbox(0.26, 0.05, 2.2, 0.02, mat(PAL.caramel), -3.36, 1.72, -1.75);
    const wool = mat(0xfffaf2), dark = mat(0x6b5a55);
    const sheep = group(-3.34, 1.745, -2.6);
    sheep.add(ball(0.13, wool, 0, 0.15, 0), ball(0.09, wool, 0.02, 0.2, 0.09), ball(0.09, wool, -0.02, 0.21, -0.08), ball(0.08, wool, 0.05, 0.11, -0.07),
      ball(0.075, dark, 0.07, 0.19, 0.15), ball(0.03, dark, 0.03, 0.2, 0.21), ball(0.03, dark, 0.12, 0.23, 0.11), ball(0.05, wool, 0.07, 0.26, 0.13));
    for (const [x, z] of [[0.05, 0.06], [0.05, -0.06], [-0.05, 0.06], [-0.05, -0.06]]) sheep.add(capsule(0.022, 0.05, dark, x, 0.04, z));
    const eye = mat(0xffffff, { roughness: 0.4 });
    sheep.add(ball(0.013, eye, 0.125, 0.205, 0.165, { cast: false }), ball(0.013, eye, 0.09, 0.205, 0.2, { cast: false }));
    sheep.rotation.y = 0.5;
    this.add(shelf, sheep);
    this.register("sheep", sheep, [-3.3, 2.25, -2.6], [-1.45, -1.9], -Math.PI / 2);
  }

  private lamp(x: number, y: number, z: number, dist: number): THREE.MeshStandardMaterial {
    const light = new THREE.PointLight(0xffc98a, 0, dist, 1.6);
    light.position.set(x, y, z);
    const bulb = mat(0xfff0cf, { emissive: 0xffc070, emissiveIntensity: 0 });
    this.lamps.push({ light, bulb, on: 0 });
    this.add(light);
    return bulb;
  }

  private buildDesk(): void {
    const wood = mat(PAL.caramel);
    const g = group(1.75, 0, -2.55);
    g.add(rbox(1.5, 0.08, 0.74, 0.03, wood, 0, 0.8, 0));
    for (const [x, z] of [[-0.66, -0.3], [0.66, -0.3], [-0.66, 0.3], [0.66, 0.3]]) g.add(rbox(0.08, 0.78, 0.08, 0.03, wood, x, 0.39, z));
    // Ordinateur.
    const screen = rbox(0.62, 0.42, 0.03, 0.01, this.screenMat, 0, 0.27, 0.024, { cast: false });
    g.add(group(-0.05, 0.84, -0.14, rbox(0.7, 0.5, 0.05, 0.04, mat(PAL.white), 0, 0.27, 0), screen, rbox(0.1, 0.12, 0.06, 0.02, mat(PAL.white), 0, 0.02, -0.02), rbox(0.3, 0.03, 0.2, 0.01, mat(PAL.white), 0, -0.02, 0)),
      rbox(0.5, 0.03, 0.17, 0.012, mat(PAL.white), -0.05, 0.855, 0.16), rbox(0.09, 0.03, 0.12, 0.012, mat(PAL.rose), 0.36, 0.855, 0.17));
    // Lampe de bureau.
    const bulb = this.lamp(1.2, 1.4, -2.45, 5);
    const arm = cyl(0.018, 0.018, 0.42, mat(PAL.ink)); arm.position.set(-0.56, 1.05, -0.16); arm.rotation.z = -0.25;
    const shade = cyl(0.06, 0.13, 0.14, mat(PAL.mustard), -0.5, 1.26, -0.16); shade.rotation.z = -0.5;
    g.add(cyl(0.09, 0.1, 0.03, mat(PAL.ink), -0.6, 0.855, -0.16), arm, shade, ball(0.045, bulb, -0.47, 1.2, -0.16, { cast: false }));
    // Chaise.
    const chair = group(0, 0, 0.72, rbox(0.5, 0.08, 0.5, 0.035, mat(PAL.rose), 0, 0.44, 0), rbox(0.5, 0.5, 0.07, 0.035, mat(PAL.rose), 0, 0.76, 0.24));
    for (const [x, z] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]]) chair.add(cyl(0.025, 0.025, 0.42, mat(PAL.ink), x, 0.21, z));
    g.add(chair);
    this.add(g);
    this.register("desk", g, [1.75, 2.0, -2.5], [1.75, -1.86], Math.PI);
  }

  private buildKitchen(): void {
    const g = group(-3.14, 0, 1.45);
    const top = mat(PAL.caramel), body = mat(PAL.cream);
    g.add(rbox(0.68, 0.84, 1.36, 0.05, body, 0, 0.42, 0), rbox(0.74, 0.07, 1.42, 0.03, top, 0.02, 0.875, 0));
    for (const z of [-0.34, 0.34]) g.add(rbox(0.02, 0.5, 0.56, 0.01, mat(0xf3d6c0), 0.345, 0.45, z, { cast: false }), ball(0.025, mat(PAL.mustard), 0.37, 0.62, z, { cast: false }));
    // Évier, robinet, plaque, bouilloire.
    const tap = cyl(0.018, 0.018, 0.2, mat(0xd9dee2, { roughness: 0.4 }), -0.2, 1.0, -0.36);
    g.add(rbox(0.4, 0.03, 0.46, 0.012, mat(0xe9eef0, { roughness: 0.5 }), 0.02, 0.915, -0.36, { cast: false }), tap, rbox(0.14, 0.03, 0.03, 0.012, mat(0xd9dee2, { roughness: 0.4 }), -0.14, 1.09, -0.36),
      rbox(0.42, 0.025, 0.42, 0.01, mat(PAL.ink), 0.02, 0.915, 0.4, { cast: false }),
      group(-0.12, 0.92, 0.02, cyl(0.07, 0.085, 0.16, mat(PAL.mustard), 0, 0.08, 0), ball(0.022, mat(PAL.ink), 0, 0.18, 0), rbox(0.03, 0.1, 0.03, 0.012, mat(PAL.ink), 0.1, 0.09, 0)));
    // Vaisselle qui s'accumule près de l'évier.
    for (let i = 0; i < 4; i++) {
      const d = cyl(0.1 - i * 0.004, 0.07, 0.022, mat(i % 2 ? PAL.sky : PAL.white), 0.03 + (i % 2) * 0.02, 0.935 + i * 0.026, -0.36 + (i % 2) * 0.03);
      d.visible = false; d.scale.setScalar(0.001); this.dishes.push(d); g.add(d);
    }
    this.add(g);
    this.register("counter", g, [-3.1, 1.45, 1.45], [-2.42, 1.4], -Math.PI / 2);

    // Petit frigo.
    const f = group(-3.12, 0, 2.58);
    this.fridgeDoor.position.set(0.36, 0, 0.33);
    this.fridgeDoor.add(rbox(0.06, 1.2, 0.66, 0.03, mat(PAL.sky), 0, 0.66, -0.33), rbox(0.03, 0.34, 0.035, 0.012, mat(PAL.white), 0.04, 0.8, -0.58));
    f.add(rbox(0.66, 1.3, 0.68, 0.07, mat(PAL.sky), 0, 0.66, 0), rbox(0.02, 1.1, 0.56, 0.01, new THREE.MeshBasicMaterial({ color: 0xfff6dc }), 0.325, 0.66, 0, { cast: false }), this.fridgeDoor);
    for (let i = 0; i < 3; i++) {
      const m = rbox(0.16, 0.08, 0.14, 0.03, mat([PAL.rose, PAL.mustard, PAL.sage][i]), 0.26, 0.4 + i * 0.26, 0.05 - i * 0.05);
      m.visible = false; m.scale.setScalar(0.001); this.meals.push(m); f.add(m);
    }
    // Un petit pot posé sur le frigo.
    f.add(cyl(0.07, 0.06, 0.12, mat(PAL.rose), -0.05, 1.37, 0.1));
    this.add(f);
    this.register("fridge", f, [-3.1, 1.85, 2.58], [-2.36, 2.56], -Math.PI / 2);

    // Panier à linge : c'est par lui qu'on range.
    const basket = group(-3.12, 0, 0.5, cyl(0.2, 0.16, 0.36, mat(PAL.caramel), 0, 0.18, 0), cyl(0.21, 0.21, 0.03, mat(PAL.woodDark), 0, 0.37, 0), ball(0.12, mat(PAL.sky), 0.02, 0.37, 0.02));
    this.add(basket);
    this.register("basket", basket, [-3.1, 0.95, 0.5], [-2.5, 0.42], -Math.PI / 2);
  }

  private buildCorner(): void {
    // Fauteuil tourné vers la fenêtre, lampadaire, petite table.
    const rose = mat(PAL.rose);
    const chair = group(1.75, 0, 1.45);
    chair.rotation.y = -Math.PI * 0.58;
    chair.add(rbox(0.86, 0.3, 0.8, 0.12, rose, 0, 0.27, 0), rbox(0.86, 0.62, 0.22, 0.1, rose, 0, 0.62, -0.34),
      rbox(0.18, 0.4, 0.74, 0.08, rose, -0.4, 0.44, 0.02), rbox(0.18, 0.4, 0.74, 0.08, rose, 0.4, 0.44, 0.02), rbox(0.5, 0.12, 0.5, 0.05, mat(PAL.cream), 0, 0.44, 0.06));
    this.add(chair);
    this.register("armchair", chair, [1.75, 1.5, 1.45], [1.7, 1.4], -Math.PI * 0.58);

    const bulb = this.lamp(2.72, 1.5, 0.62, 5.5);
    this.add(group(2.72, 0, 0.62, cyl(0.17, 0.19, 0.04, mat(PAL.ink), 0, 0.02, 0), cyl(0.02, 0.02, 1.5, mat(PAL.ink), 0, 0.77, 0), cyl(0.15, 0.24, 0.3, mat(PAL.mustard), 0, 1.6, 0), ball(0.07, bulb, 0, 1.5, 0, { cast: false })));
    const table = group(2.55, 0, 2.2, cyl(0.26, 0.26, 0.04, mat(PAL.caramel), 0, 0.44, 0), cyl(0.03, 0.03, 0.44, mat(PAL.caramel), 0, 0.22, 0), cyl(0.14, 0.16, 0.03, mat(PAL.caramel), 0, 0.015, 0));
    table.add(rbox(0.26, 0.05, 0.2, 0.015, mat(PAL.sage), 0.02, 0.485, 0), rbox(0.24, 0.045, 0.18, 0.015, mat(PAL.mustard), 0, 0.532, 0.01));
    this.add(table);
    // Le livre en cours, laissé ouvert sur l'accoudoir.
    this.book = group(1.5, 0.66, 1.78, rbox(0.14, 0.02, 0.2, 0.008, mat(PAL.sky), -0.07, 0, 0), rbox(0.14, 0.02, 0.2, 0.008, mat(PAL.sky), 0.07, 0, 0), rbox(0.26, 0.012, 0.18, 0.005, mat(PAL.white), 0, 0.012, 0));
    this.book.rotation.y = 0.5; this.book.visible = false; this.book.scale.setScalar(0.001);
    this.add(this.book);
  }

  private buildSmallThings(): void {
    // La plante : elle pousse quand on s'en occupe, s'affaisse quand elle a soif.
    const leafMat = mat(PAL.sage);
    const p = group(-0.86, 0, -2.6, cyl(0.2, 0.15, 0.3, mat(PAL.rose), 0, 0.15, 0), cyl(0.18, 0.18, 0.02, mat(0x8a6a55), 0, 0.3, 0));
    for (let i = 0; i < 9; i++) {
      const a = i * 2.4, tall = 0.3 + (i % 3) * 0.14 + i * 0.03;
      const stem = cyl(0.012, 0.016, tall, leafMat, 0, tall / 2, 0, { receive: false });
      const leaf = ball(0.12, leafMat, 0, tall, 0.06, { receive: false }); leaf.scale.set(0.75, 0.32, 1.25);
      const h = group(0, 0.3, 0, stem, leaf);
      h.rotation.y = a; h.userData.tilt = 0.25 + (i % 4) * 0.12;
      this.leaves.push(h); this.plant.add(h);
    }
    p.add(this.plant);
    this.add(p);
    this.register("plant", p, [-0.86, 1.5, -2.5], [-0.86, -1.95], Math.PI);

    // La tasse oubliée sur le rebord de la fenêtre.
    this.mug = makeMug(); this.mug.position.set(0.25, 0.94, -2.78); this.mug.visible = false; this.mug.scale.setScalar(0.001);
    this.add(this.mug);

    // Vêtements qui traînent quand le rangement attend.
    const spots: [number, number, number][] = [[-1.5, -0.6, PAL.sky], [0.9, 1.9, PAL.rose], [-0.9, 2.2, PAL.mustard], [2.3, -1.2, PAL.sage]];
    for (const [x, z, c] of spots) {
      const m = mat(c);
      const cl = group(x, 0.04, z, rbox(0.34, 0.07, 0.26, 0.035, m), rbox(0.2, 0.06, 0.3, 0.03, m, 0.12, 0.03, 0.08));
      cl.rotation.y = x * 2.1; cl.visible = false; cl.scale.setScalar(0.001);
      this.clothes.push(cl); this.add(cl);
    }
  }

  // ───────────────────────── vie de l'appartement ─────────────────────────

  /** Met le décor en accord avec l'état du jeu (avec douceur). */
  sync(s: State): void {
    const a = s.apt;
    pop(this.clock, this.mug, a.mug);
    this.dishes.forEach((d, i) => pop(this.clock, d, i < a.dishes));
    this.meals.forEach((m, i) => pop(this.clock, m, i < a.meals));
    pop(this.clock, this.book, a.bookOut);
    const messy = s.tidy < 25 ? 4 : s.tidy < 40 ? 3 : s.tidy < 55 ? 2 : s.tidy < 68 ? 1 : 0;
    this.clothes.forEach((c, i) => pop(this.clock, c, i < messy));
    this.bedMessWant = a.bedMade ? 0 : 1;
    const g = Math.max(0, Math.min(1, a.plantGrowth / 12));
    this.plant.userData.grow = 0.62 + g * 0.75;
    this.plant.userData.count = 3 + Math.round(g * 6);
    this.plant.userData.thirst = a.plantWater < 30 ? 1 : a.plantWater < 55 ? 0.4 : 0;
  }

  screen(on: boolean, tint = 0x9cc4f0): void { this.screenWant = on ? 1 : 0; this.screenMat.emissive.setHex(tint); }

  hover(it: Interactable | null): void {
    if (this.hovered === it) return;
    this.hovered = it;
  }

  /** Petites étincelles chaudes (un moment qui a fait du bien). */
  sparkle(at: THREE.Vector3): void {
    for (let i = 0; i < 7; i++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), this.sparkMat.clone());
      m.position.set(at.x + (Math.random() - 0.5) * 0.5, 1.2 + Math.random() * 0.4, at.z + (Math.random() - 0.5) * 0.5);
      this.scene.add(m);
      this.sparks.push({ m, t: -i * 0.07, vx: (Math.random() - 0.5) * 0.3, vz: (Math.random() - 0.5) * 0.3 });
    }
  }

  /** Buée qui s'échappe de la salle de bain. */
  puff(x: number, y: number, z: number): void {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), this.steamMat.clone());
    m.position.set(x, y, z);
    this.scene.add(m);
    this.steam.push({ m, t: 0 });
  }

  private applyPhase(p: number): void {
    let i = 0;
    while (i < KEYS.length - 2 && p > KEYS[i + 1].p) i++;
    const a = KEYS[i], b = KEYS[i + 1];
    const k = Math.max(0, Math.min(1, (p - a.p) / (b.p - a.p)));
    const col = (x: number, y: number) => new THREE.Color(x).lerp(new THREE.Color(y), k);
    this.hemi.intensity = lerp(a.hemi, b.hemi, k);
    this.hemi.color.copy(col(a.hemiC, b.hemiC));
    this.hemi.groundColor.copy(col(a.hemiC, b.hemiC)).multiplyScalar(0.82);
    this.sun.intensity = lerp(a.sun, b.sun, k);
    this.sun.color.copy(col(a.sunC, b.sunC));
    this.sun.position.set(lerp(3, 7, p), lerp(11, 7.5, Math.min(1, p * 1.2)), lerp(9, 6, p));
    this.skyMat.color.copy(col(a.sky, b.sky));
    const pm = this.patch.material as THREE.MeshBasicMaterial;
    pm.opacity = lerp(a.patch, b.patch, k);
    pm.color.copy(col(a.patchC, b.patchC));
    this.patch.position.x = lerp(-0.5, 0.75, p);
    this.patch.rotation.z = lerp(0.3, -0.5, p);
    (this.stars.material as THREE.PointsMaterial).opacity = Math.max(0, (p - 0.82) / 0.18);
    (this.dust.material as THREE.PointsMaterial).opacity = pm.opacity;
    // Le soleil descend, la lune prend sa place.
    this.sunDisc.position.set(lerp(-0.45, 0.5, Math.min(1, p / 0.85)), 0.5 - Math.pow(p * 1.15 - 0.4, 2) * 1.4, 0.013);
    (this.sunDisc.material as THREE.MeshBasicMaterial).color.copy(col(a.sunC, b.sunC)).lerp(new THREE.Color(0xffffff), 0.5);
    if (p > 0.93) this.sunDisc.position.set(0.38, 0.42, 0.013);
    const mix = (x: string, y: string) => "#" + new THREE.Color(x).lerp(new THREE.Color(y), k).getHexString();
    this.bg = [mix(a.bg[0], b.bg[0]), mix(a.bg[1], b.bg[1])];
  }

  resize(w: number, h: number): void {
    const aspect = w / h;
    // On cadre toujours toute la maison, en paysage comme en portrait.
    const viewH = Math.max(7.7, 10.4 / aspect);
    const c = this.camera;
    c.top = viewH / 2; c.bottom = -viewH / 2; c.left = (-viewH * aspect) / 2; c.right = (viewH * aspect) / 2;
    const target = new THREE.Vector3(-0.15, 1.15, -0.1);
    c.position.copy(target).addScaledVector(this.camDir, 30);
    c.lookAt(target);
    c.updateProjectionMatrix();
  }

  update(dt: number): void {
    const t = this.clock.time;
    this.phase = damp(this.phase, this.phaseTarget, 1.1, dt);
    this.applyPhase(this.phase);

    // Lampes : elles s'allument d'elles-mêmes quand le soir tombe.
    const wantOn = this.phase > 0.7;
    if (wantOn !== this.lampsOn) { this.lampsOn = wantOn; this.onLamp?.(); }
    this.lamps.forEach((l, i) => {
      l.on = damp(l.on, wantOn ? 1 : 0, 4 - i, dt);
      l.light.intensity = l.on * 3.2;
      l.bulb.emissiveIntensity = l.on * 1.6;
    });

    this.screenOn = damp(this.screenOn, this.screenWant, 5, dt);
    this.screenMat.emissiveIntensity = this.screenOn * (0.85 + Math.sin(t * 7) * 0.04);

    // Rideaux, plante, poussières : la pièce respire.
    this.curtains.forEach((c, i) => { c.rotation.z = Math.sin(t * 0.7 + i * 2) * 0.022; c.rotation.x = Math.sin(t * 0.5 + i) * 0.035; c.scale.x = 1 + Math.sin(t * 0.6 + i * 1.3) * 0.04; });
    const grow = this.plant.userData.grow ?? 0.8, count = this.plant.userData.count ?? 4, thirst = this.plant.userData.thirst ?? 0;
    this.plant.scale.setScalar(damp(this.plant.scale.x, grow, 1.5, dt));
    this.leaves.forEach((l, i) => {
      const on = i < count ? 1 : 0.001;
      l.scale.setScalar(damp(l.scale.x, on, 2, dt));
      const droop = l.userData.tilt + thirst * 0.55;
      l.rotation.x = damp(l.rotation.x, droop + Math.sin(t * 0.9 + i * 1.7) * 0.035, 3, dt);
    });
    const dp = this.dust.geometry.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < dp.count; i++) {
      let y = dp.getY(i) - dt * 0.03;
      if (y < 0.2) y = 2.2;
      dp.setXYZ(i, dp.getX(i) + Math.sin(t * 0.4 + i) * dt * 0.02, y, dp.getZ(i));
    }
    dp.needsUpdate = true;

    // Lit : défait le matin, gonflé quand quelqu'un dort dessous.
    this.bedMess = damp(this.bedMess, this.bedMessWant, 4, dt);
    this.bedPuff = damp(this.bedPuff, this.bedPuffWant, 4, dt);
    const m = this.bedMess;
    this.blanket.rotation.y = m * 0.16; this.blanket.rotation.z = m * 0.05;
    this.blanket.position.set(m * 0.1, 0.6 + this.bedPuff * 0.07, 0.36 + m * 0.16);
    this.blanket.scale.set(1, 1 + this.bedPuff * 0.75 + Math.sin(t * 0.9) * 0.03 * this.bedPuff, 1 - m * 0.1);
    this.pillow.rotation.y = -m * 0.22; this.pillow.position.x = -m * 0.08;

    // Survol : l'objet se soulève à peine.
    for (const it of this.items) {
      const want = it === this.hovered ? 1 : 0;
      const h = (it.obj.userData.h = damp(it.obj.userData.h ?? 0, want, 12, dt));
      if (it.obj.userData.y0 === undefined) it.obj.userData.y0 = it.obj.position.y;
      it.obj.position.y = it.obj.userData.y0 + h * 0.05 + (want ? Math.sin(t * 5) * 0.006 : 0);
    }

    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i];
      s.t += dt;
      const k = Math.max(0, s.t) / 1.3;
      s.m.visible = s.t > 0;
      s.m.position.y += dt * 0.55; s.m.position.x += s.vx * dt; s.m.position.z += s.vz * dt;
      (s.m.material as THREE.MeshBasicMaterial).opacity = Math.sin(Math.min(1, k) * Math.PI) * 0.9;
      s.m.scale.setScalar(0.6 + ease.out(Math.min(1, k)) * 0.7);
      if (k >= 1) { this.scene.remove(s.m); this.sparks.splice(i, 1); }
    }
    for (let i = this.steam.length - 1; i >= 0; i--) {
      const s = this.steam[i];
      s.t += dt;
      const k = s.t / 2.2;
      s.m.position.y += dt * 0.3; s.m.position.x += dt * 0.12;
      s.m.scale.setScalar(1 + k * 1.8);
      (s.m.material as THREE.MeshBasicMaterial).opacity = (1 - k) * 0.4;
      if (k >= 1) { this.scene.remove(s.m); this.steam.splice(i, 1); }
    }
  }
}

export function makeMug(): THREE.Group {
  const m = mat(PAL.white);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.012, 8, 14), m);
  handle.position.set(0.06, 0.055, 0);
  return group(0, 0, 0, cyl(0.055, 0.048, 0.11, m, 0, 0.055, 0), cyl(0.045, 0.045, 0.005, mat(0xc98a5a), 0, 0.108, 0, { cast: false }), handle);
}
