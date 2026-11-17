// Chef d'orchestre : entrées du joueur, menus, enchaînement des actions, passage des jours.
import * as THREE from "three";
import { Sfx } from "./audio";
import { Character } from "./character";
import { Clock, ease, lerp } from "./kit";
import {
  DAYS_PER_CYCLE, Outcome, State, TIER_NAMES, UNITS, actionById, actionsAt, applyAction, blocked, clearSave, cycleOf, endDay,
  labelOf, load, newState, phaseName, phaseOf, save,
} from "./sim";
import { Interactable, World, makeMug } from "./world";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const SHEEP_LINES = ["T'as fait ce que t'as pu.", "Demain existe encore.", "Pas besoin que toutes les journées soient extraordinaires.", "Respire un coup, c'est déjà ça."];
const SATURATION = [0.8, 0.9, 1, 1.05, 1.12];
const BED = { x: -2.62, y: 0.56, z: -1.28 };

export class Game {
  clock = new Clock();
  sfx = new Sfx();
  world = new World(this.clock);
  ch = new Character(this.clock);
  state: State = newState();
  busy = true;
  private renderer: THREE.WebGLRenderer;
  private ray = new THREE.Raycaster();
  private menuItem: Interactable | null = null;
  private pills: HTMLElement[] = [];
  private shownUnits = UNITS;
  private mug = makeMug();
  private last = 0;
  private bgKey = "";

  constructor(private canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.ch.root.scale.setScalar(0.9);
    this.world.scene.add(this.ch.root);
    this.ch.root.traverse((o) => { o.userData.item = "me"; });
    this.ch.onStep = () => this.sfx.step();
    this.world.onLamp = () => this.sfx.click();
    this.mug.visible = false;
    this.ch.hand.add(this.mug);

    const box = $("units");
    for (let i = 0; i < UNITS; i++) { const p = document.createElement("i"); box.appendChild(p); this.pills.push(p); }

    window.addEventListener("resize", () => this.resize());
    this.resize();
    canvas.addEventListener("pointermove", (e) => this.onMove(e));
    canvas.addEventListener("pointerdown", (e) => this.onDown(e));
    this.setupTitle();
    requestAnimationFrame((t) => this.frame(t));
  }

  // ───────────────────────── écran titre ─────────────────────────

  private setupTitle(): void {
    const saved = load();
    const go = $("go"), fresh = $("fresh");
    if (saved && saved.started) {
      go.textContent = "Continuer · jour " + (saved.day + 1);
      fresh.hidden = false;
    }
    const start = (s: State, isNew: boolean) => {
      this.sfx.init();
      this.sfx.open();
      this.state = s;
      s.started = true;
      $("title").classList.add("gone");
      $("hud").classList.add("on");
      void this.begin(isNew);
    };
    go.addEventListener("click", () => start(saved && saved.started ? saved : newState(), !(saved && saved.started)));
    fresh.addEventListener("click", () => { clearSave(); start(newState(), true); });
    // En attendant, il dort.
    this.placeInBed();
  }

  private placeInBed(): void {
    this.ch.root.position.set(BED.x, BED.y, BED.z);
    this.ch.root.rotation.y = 0;
    this.ch.face(0);
    this.ch.setClip("sleep");
    this.world.bedPuffWant = 1;
  }

  private async begin(isNew: boolean): Promise<void> {
    const s = this.state;
    this.syncAll(true);
    this.world.phase = this.world.phaseTarget = phaseOf(s);
    if (isNew || s.units === UNITS) {
      this.sfx.morning();
      await this.wakeUp();
    } else {
      this.world.bedPuffWant = 0;
      this.ch.root.position.set(0.1, 0, 0.4);
      this.ch.face(0.6);
      this.ch.setClip("idle");
    }
    this.busy = false;
    this.ch.busy = false;
    if (s.units <= 0) void this.nightfall();
  }

  // ───────────────────────── affichage ─────────────────────────

  private syncAll(instant = false): void {
    const s = this.state;
    this.world.sync(s);
    this.ch.mood = s.mood;
    this.ch.tier = s.tier;
    this.canvas.style.filter = "saturate(" + SATURATION[s.tier] + ")";
    $("day").textContent = "Jour " + (s.day + 1);
    $("when").textContent = "Cycle " + (cycleOf(s) + 1) + " · " + phaseName(phaseOf(s));
    $("money").textContent = String(s.money);
    if (instant) this.shownUnits = s.units;
    this.drawPills();
  }

  private drawPills(): void {
    const s = this.state;
    this.pills.forEach((p, i) => {
      const used = i < UNITS - this.shownUnits;
      p.className = used ? "used" : i >= UNITS - s.heavy ? "heavy" : "";
    });
    $("units").title = s.heavy > 0 ? "Les dernières heures pèsent un peu : gardons-les pour des gestes doux." : "";
  }

  /** Les unités s'égrènent pendant l'action, pas d'un coup à la fin. */
  private async spend(cost: number, dur: number): Promise<void> {
    for (let i = 0; i < cost; i++) {
      await this.clock.wait(dur / (cost + 0.5));
      this.shownUnits--;
      this.drawPills();
      this.sfx.unit();
    }
  }

  private resize(): void {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.world.resize(w, h);
  }

  private frame(ms: number): void {
    const dtReal = Math.min(0.1, (ms - this.last) / 1000 || 0);
    this.last = ms;
    const dt = this.clock.update(dtReal);
    this.ch.update(dt);
    this.world.update(dt);
    const key = this.world.bg.join();
    if (key !== this.bgKey) { this.bgKey = key; document.body.style.background = `linear-gradient(160deg, ${this.world.bg[0]}, ${this.world.bg[1]})`; }
    if (this.menuItem) this.placeBubble($("menu"), this.menuItem.anchor);
    this.renderer.render(this.world.scene, this.world.camera);
    requestAnimationFrame((t) => this.frame(t));
  }

  private placeBubble(el: HTMLElement, at: THREE.Vector3): void {
    const v = at.clone().project(this.world.camera);
    const x = (v.x * 0.5 + 0.5) * window.innerWidth, y = (-v.y * 0.5 + 0.5) * window.innerHeight;
    const half = el.offsetWidth / 2 + 10;
    el.style.left = Math.max(half, Math.min(window.innerWidth - half, x)) + "px";
    el.style.top = Math.max(el.offsetHeight + 64, y) + "px";
  }

  // ───────────────────────── entrées ─────────────────────────

  private pick(e: PointerEvent): string | null {
    const r = this.canvas.getBoundingClientRect();
    const p = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    this.ray.setFromCamera(p, this.world.camera);
    const hit = this.ray.intersectObjects(this.world.scene.children, true).find((h) => h.object.visible && !(h.object as THREE.Points).isPoints && (h.object as THREE.Mesh).isMesh);
    return hit ? (hit.object.userData.item as string) ?? null : null;
  }

  private onMove(e: PointerEvent): void {
    if (this.busy) { this.world.hover(null); this.canvas.style.cursor = ""; return; }
    const id = this.pick(e);
    const it = this.world.items.find((i) => i.id === id) ?? null;
    this.world.hover(it);
    this.canvas.style.cursor = it || id === "me" ? "pointer" : "";
  }

  private onDown(e: PointerEvent): void {
    this.closeBubbles();
    if (this.busy) return;
    const id = this.pick(e);
    if (id === "me") return this.peekMood();
    const it = this.world.items.find((i) => i.id === id);
    if (!it) return;
    if (it.id === "sheep") return void this.sheep(it);
    this.openMenu(it);
  }

  private closeBubbles(): void {
    $("menu").classList.remove("open");
    $("say").classList.remove("open");
    this.menuItem = null;
  }

  private openMenu(it: Interactable): void {
    const s = this.state, menu = $("menu");
    menu.innerHTML = "";
    actionsAt(s, it.id).forEach((a, i) => {
      const b = document.createElement("button");
      const why = blocked(s, a);
      const dots = a.cost > 0 ? "<span class='cost'>" + "<i></i>".repeat(a.cost) + "</span>" : "<span class='cost free'>petit geste</span>";
      b.innerHTML = "<span>" + labelOf(a, s) + "</span>" + dots + (why ? "<em>" + (why === "heavy" ? "pas l'élan pour ça, là" : "plus assez de temps aujourd'hui") + "</em>" : "");
      b.style.transitionDelay = i * 45 + "ms";
      if (why) b.classList.add("no");
      b.addEventListener("click", (ev) => { ev.stopPropagation(); if (!why) void this.run(a.id); else this.sfx.low(); });
      b.addEventListener("pointerenter", () => this.sfx.tick());
      menu.appendChild(b);
    });
    this.menuItem = it;
    this.placeBubble(menu, it.anchor);
    void menu.offsetWidth;
    menu.classList.add("open");
    this.sfx.open();
  }

  private say(text: string, at: THREE.Vector3, swatch?: string): void {
    const el = $("say");
    el.innerHTML = (swatch ? "<b style='background:" + swatch + "'></b>" : "") + "<span>" + text + "</span>";
    this.placeBubble(el, at);
    void el.offsetWidth;
    el.classList.add("open");
    const stamp = (el.dataset.n = String(Math.random()));
    void this.clock.wait(4.2).then(() => { if (el.dataset.n === stamp) el.classList.remove("open"); });
  }

  /** L'état mental se consulte en touchant le personnage : une couleur, un mot, rien de plus. */
  private peekMood(): void {
    const s = this.state, p = this.ch.root.position;
    const col = "#" + ["6e6a9e", "8fa6c7", "e7e2d8", "a9c3a1", "f1c65e"][s.tier];
    this.say(TIER_NAMES[s.tier], new THREE.Vector3(p.x, 1.9, p.z), col);
    this.sfx.tick();
  }

  private async sheep(it: Interactable): Promise<void> {
    const s = this.state, o = it.obj;
    this.sfx.baa();
    void this.clock.tween(0.6, (k) => { o.rotation.z = Math.sin(k * Math.PI * 3) * 0.16 * (1 - k); o.scale.setScalar(1 + Math.sin(k * Math.PI) * 0.12); }, (t) => t);
    // Il parle rarement : c'est ce qui donne du poids à ses mots.
    if (s.day - s.sheepDay >= 2) {
      s.sheepDay = s.day;
      this.say(SHEEP_LINES[(s.day * 7 + s.log.length) % SHEEP_LINES.length], it.anchor);
      save(s);
    }
  }

  // ───────────────────────── actions ─────────────────────────

  private async goto(id: string): Promise<Interactable> {
    const it = this.world.items.find((i) => i.id === id)!;
    await this.ch.walkTo(it.spot.x, it.spot.z);
    this.ch.face(it.face);
    await this.clock.wait(0.25);
    return it;
  }

  private async sit(y: number): Promise<void> {
    const r = this.ch.root.position, y0 = r.y;
    this.ch.setClip("sitIdle");
    await this.clock.tween(0.5, (k) => { r.y = lerp(y0, y, k); });
  }
  private async stand(): Promise<void> {
    const r = this.ch.root.position, y0 = r.y;
    this.ch.setClip("idle");
    await this.clock.tween(0.45, (k) => { r.y = lerp(y0, 0, k); });
  }

  async run(id: string): Promise<void> {
    if (this.busy) return;
    const s = this.state, a = actionById(id);
    if (blocked(s, a)) return;
    this.busy = true; this.ch.busy = true;
    this.closeBubbles();
    this.world.hover(null);
    if (id === "sleep") return this.sleep();

    // Tout en bas, il lui faut un instant avant de s'y mettre.
    if (s.tier === 0 && a.cost > 0) await this.ch.play("lookDown", 1.6);
    this.world.phaseTarget = (UNITS - s.units + a.cost) / UNITS;
    await this.SCRIPT[id]();
    const out = applyAction(s, id);
    this.shownUnits = s.units;
    this.syncAll();
    save(s);
    await this.react(out);
    this.ch.setClip("idle");
    this.busy = false; this.ch.busy = false;
    if (out.dayOver) await this.nightfall();
  }

  /** Le joueur ressent l'effet avant de le lire : un geste, un son, une couleur qui glisse. */
  private async react(o: Outcome): Promise<void> {
    if (o.dMood >= 3.5) {
      this.sfx.warm(o.tierChanged);
      this.world.sparkle(this.ch.root.position);
      await this.ch.play(this.state.tier >= 3 ? "hop" : "nod", 0.95);
    } else if (o.dMood >= 1.5) {
      this.sfx.warm();
      await this.ch.play("nod", 0.9);
    } else if (o.dMood <= -3) {
      this.sfx.low();
      await this.ch.play("sigh", 1.8);
    } else await this.clock.wait(0.3);
  }

  private async deskSit(): Promise<void> { await this.goto("desk"); await this.sit(0.06); }

  private SCRIPT: Record<string, () => Promise<void>> = {
    work: async () => {
      await this.deskSit();
      this.world.screen(true); this.sfx.click();
      void this.spend(2, 5.4);
      await this.ch.play("type", 2.5);
      await this.ch.play(this.state.tier <= 1 ? "rest" : "sitIdle", 0.9);
      await this.ch.play("type", 2.2);
      this.world.screen(false);
      await this.stand();
    },
    draw: async () => {
      await this.deskSit();
      void this.spend(2, 5);
      await this.ch.play("draw", 5.2);
      await this.stand();
    },
    play: async () => {
      await this.deskSit();
      this.world.screen(true, 0xe7b4d8); this.sfx.click();
      void this.spend(1, 3.2);
      await this.ch.play("game", 3.4);
      this.world.screen(false);
      await this.stand();
    },
    cook: async () => {
      await this.goto("counter");
      void this.spend(2, 4.6);
      await this.ch.play("reach", 0.9);
      for (let i = 0; i < 3; i++) { this.world.puff(-3.1, 1.05, 1.85); await this.ch.play("stir", 1.2); }
      await this.ch.play("reach", 0.6);
    },
    tea: async () => {
      await this.goto("counter");
      void this.spend(1, 5.5);
      await this.ch.play("reach", 0.9);
      this.world.puff(-3.2, 1.2, 1.45);
      await this.ch.play("tapFoot", 1.3);
      this.world.puff(-3.2, 1.2, 1.45);
      this.mug.visible = true;
      this.ch.setClip("hold");
      await this.clock.wait(0.3);
      const w = this.world.items.find((i) => i.id === "window")!;
      await this.ch.walkTo(w.spot.x + 0.45, w.spot.z);
      this.ch.face(w.face);
      await this.ch.play("drink", 3.4);
      await this.ch.play("reach", 0.5);
      this.mug.visible = false;
    },
    dishes: async () => {
      await this.goto("counter");
      void this.spend(1, 3);
      await this.ch.play("scrub", 3.2);
    },
    eat: async () => {
      await this.goto("fridge");
      const d = this.world.fridgeDoor;
      void this.spend(1, 4.4);
      this.sfx.click();
      await this.clock.tween(0.5, (k) => { d.rotation.y = -1.5 * k; }, ease.out);
      await this.ch.play("hesitate", this.state.apt.meals > 0 ? 0.9 : 1.8);
      await this.ch.play("reach", 0.7);
      await this.clock.tween(0.4, (k) => { d.rotation.y = -1.5 * (1 - k); });
      this.sfx.click();
      await this.ch.play("drink", 2.4);
    },
    nap: async () => {
      await this.goto("bed");
      void this.spend(1, 4);
      await this.lieDown(0.74);
      await this.clock.wait(3.2);
      await this.getUp();
      await this.ch.play(this.state.tier >= 2 ? "stretch" : "yawn", 2.1);
    },
    makebed: async () => {
      await this.goto("bed");
      await this.ch.play("tidy", 1.6);
    },
    shower: async () => {
      await this.goto("bath");
      const d = this.world.bathDoor, r = this.ch.root.position;
      this.sfx.click();
      await this.clock.tween(0.5, (k) => { d.rotation.y = 1.35 * k; }, ease.out);
      await this.ch.walkTo(-4.3, -0.2);
      await this.clock.tween(0.4, (k) => { d.rotation.y = 1.35 * (1 - k); });
      void this.spend(1, 2.8);
      for (let i = 0; i < 4; i++) { this.world.puff(-3.35, 2.1, -0.2 + (i % 2) * 0.3); await this.clock.wait(0.75); }
      await this.clock.tween(0.5, (k) => { d.rotation.y = 1.35 * k; }, ease.out);
      this.world.puff(-3.3, 1.6, -0.2);
      await this.ch.walkTo(-2.6, r.z);
      await this.clock.tween(0.4, (k) => { d.rotation.y = 1.35 * (1 - k); });
      this.ch.face(Math.PI / 2);
      await this.ch.play("sway", 1.3);
    },
    read: async () => {
      await this.goto("armchair"); await this.sit(0.1);
      void this.spend(1, 3.8);
      await this.ch.play("read", 4.2);
      await this.stand();
    },
    rest: async () => {
      await this.goto("armchair"); await this.sit(0.1);
      void this.spend(1, 3.6);
      await this.ch.play("rest", 4);
      await this.stand();
    },
    window: async () => {
      await this.goto("window");
      void this.spend(1, 3.6);
      await this.ch.play("look", 4);
    },
    water: async () => {
      await this.goto("plant");
      void this.spend(1, 2.8);
      await this.ch.play("water", 3);
    },
    tidy: async () => {
      void this.spend(1, 4.5);
      for (const [x, z] of [[-1.2, -0.4], [0.7, 1.6]]) {
        await this.ch.walkTo(x, z);
        await this.ch.play("tidy", 1.4);
      }
      await this.goto("basket");
      await this.ch.play("reach", 0.7);
    },
  };

  // ───────────────────────── nuit et matin ─────────────────────────

  private async lieDown(y: number): Promise<void> {
    const r = this.ch.root.position, sx = r.x, sz = r.z;
    this.ch.face(0);
    this.ch.setClip("sleep");
    await this.clock.tween(this.state.tier >= 3 ? 0.7 : 1.1, (k) => { r.x = lerp(sx, BED.x, k); r.z = lerp(sz, BED.z, k); r.y = Math.sin(k * Math.PI) * 0.25 + y * k; }, ease.inOut);
  }

  private async getUp(): Promise<void> {
    const r = this.ch.root.position, sx = r.x, sy = r.y, sz = r.z;
    this.world.bedPuffWant = 0;
    this.ch.setClip("idle");
    this.ch.face(Math.PI / 2);
    await this.clock.tween(this.state.tier <= 1 ? 1.5 : 0.9, (k) => { r.x = lerp(sx, -1.45, k); r.z = lerp(sz, -1.5, k); r.y = sy * (1 - k); });
  }

  private async nightfall(): Promise<void> {
    this.busy = true; this.ch.busy = true;
    await this.clock.wait(0.5);
    await this.ch.play("yawn", 2.1);
    await this.sleep();
  }

  private async sleep(): Promise<void> {
    const s = this.state, veil = $("veil");
    await this.goto("bed");
    this.world.phaseTarget = 1;
    await this.lieDown(BED.y);
    this.world.bedPuffWant = 1;
    this.sfx.night();
    await this.clock.wait(1.6);
    veil.classList.add("on");
    await this.clock.wait(1.8);
    endDay(s);
    save(s);
    $("veil-day").textContent = "Jour " + (s.day + 1);
    $("veil-sub").textContent = s.day % DAYS_PER_CYCLE === 0 ? "Cycle " + (cycleOf(s) + 1) : "";
    veil.classList.add("text");
    this.world.phase = this.world.phaseTarget = 0;
    this.syncAll(true);
    await this.clock.wait(2.2);
    veil.classList.remove("on", "text");
    this.sfx.morning();
    await this.wakeUp();
    this.busy = false; this.ch.busy = false;
  }

  /** Le réveil dit déjà comment il va : on s'étire, ou on traîne un peu. */
  private async wakeUp(): Promise<void> {
    const t = this.state.tier;
    this.placeInBed();
    await this.clock.wait(t === 0 ? 2.6 : t === 1 ? 1.8 : 1.0);
    await this.ch.play("wake", t <= 1 ? 2 : 1.1);
    await this.getUp();
    this.state.apt.bedMade = false;
    this.world.sync(this.state);
    await this.ch.play(t >= 2 ? "stretch" : "sigh", t >= 2 ? 2.2 : 1.8);
    this.ch.setClip("idle");
  }
}
