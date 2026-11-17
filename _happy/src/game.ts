// Chef d'orchestre : entrées du joueur, menus, enchaînement des actions, passage des jours.
import * as THREE from "three";
import { Sfx } from "./audio";
import { Character } from "./character";
import { Clock, ease, lerp, pop } from "./kit";
import { FEEL_COLOR, PEOPLE, SocialOutcome, call, reply } from "./people";
import { Phone } from "./phone";
import { Seat, buildOuting, umbrella } from "./places";
import {
  ActionDef, DAYS_PER_CYCLE, DECOR, Feel, Outcome, RENT, State, TIER_NAMES, Tier, UNITS, actionById, actionsAt, applyAction, blocked, buy, clearSave,
  cycleOf, endDay, labelOf, load, neighborHere, newState, openMail, phaseName, phaseOf, save,
} from "./sim";
import { Interactable, PLACES, World, makeMug } from "./world";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const SHEEP_LINES = ["T'as fait ce que t'as pu.", "Demain existe encore.", "Pas besoin que toutes les journées soient extraordinaires.", "Respire un coup, c'est déjà ça."];
const SATURATION = [0.8, 0.9, 1, 1.05, 1.12];
const BED = { x: -2.62, y: 0.56, z: -1.28 };
const WHY: Record<string, string> = { heavy: "pas l'élan pour ça, là", units: "plus assez de temps aujourd'hui", power: "pas de courant pour l'instant", money: "pas ce mois-ci" };
const NEED = { drink: "🥤", talk: "💬", sit: "🤍" };
const FEEL_TIER: Record<Feel, Tier> = { joy: 4, ok: 3, tired: 1, down: 0 };
const MAIL: Record<string, string> = {
  lou: "Je pense fort à toi. Il y a de la soupe quand tu veux.\n— Mamie Lou",
  noe: "Trop de confiture cette année. Un pot pour toi !\n— Noé, 2e gauche",
  market: "Vide-grenier du quartier, aujourd'hui et ces deux prochains jours. Venez flâner !",
  bill: "Petit rappel : le loyer (" + RENT + ") tombe demain.",
};
const NOTES = [
  "À la personne qui a rattrapé mon courrier sous la pluie : merci.",
  "Le figuier du 3e a fait une feuille. On y croit.",
  "Si tu lis ça en remontant les courses : courage pour les escaliers.",
  "J'ai raté mon gâteau. Je l'ai mangé quand même. Il était bon.",
  "Quelqu'un joue du piano le dimanche. Ne t'arrête pas.",
  "On a le droit d'être fatigué sans raison.",
  "Merci à qui arrose la plante du hall.",
  "Aujourd'hui j'ai juste ouvert la fenêtre. C'était déjà bien.",
  "Le chat du rez-de-chaussée s'appelle Brioche. Voilà, vous savez.",
  "Bonne journée à toi qui lis. Même si elle est moyenne.",
];
const EVENT_TEXT: Record<string, string> = {
  rent: "Le loyer est passé.", tight: "Le loyer est passé. Ce mois-ci, c'est serré.", power: "L'orage a coupé le courant.",
  parcel: "Un colis attend dans le hall.", inspired: "Une idée de dessin trotte dans la tête.",
};

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
  private brolly = umbrella();
  private last = 0;
  private bgKey = "";
  private phone: Phone;
  private visitor: Character | null = null;
  private noe = new Character(this.clock, { hair: PEOPLE.noe.hair });
  private extras: Character[] = [];
  private toasts: string[] = [];
  private toasting = false;
  private eveningSaid = -1;

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
    this.world.onThunder = () => { if (this.world.place !== "out") this.sfx.thunder(); };
    this.mug.visible = false;
    this.ch.hand.add(this.mug);
    this.brolly.visible = false;
    this.brolly.position.set(-0.28, 0.5, 0.12);
    this.ch.root.add(this.brolly);

    // Noé, le voisin, traîne parfois dans le hall.
    const O = PLACES.hall.origin[0];
    this.noe.root.scale.setScalar(PEOPLE.noe.scale);
    this.noe.root.position.set(O + 0.3, 0, 0.7);
    this.noe.face(0.7);
    this.noe.root.visible = false;
    this.world.scene.add(this.noe.root);
    const it = this.world.register("neighbor", this.noe.root, [O + 0.3, 2.0, 0.7], [O - 0.45, 0.15], 0.95);
    it.place = "hall";

    const box = $("units");
    for (let i = 0; i < UNITS; i++) { const p = document.createElement("i"); box.appendChild(p); this.pills.push(p); }
    this.phone = new Phone({
      state: () => this.state, canAct: () => !this.busy,
      onOpen: () => { this.closeBubbles(); this.ch.busy = true; this.ch.setClip("phone"); this.sfx.open(); },
      onClose: () => { if (!this.busy) { this.ch.setClip("idle"); this.ch.busy = false; } },
      onReply: (id, i) => void this.social(1, () => reply(this.state, id, i)),
      onCall: (who) => void this.social(2, () => call(this.state, who)),
      onBuy: (id) => { if (buy(this.state, id)) { this.sfx.warm(); this.syncAll(); save(this.state); this.toast("Commande passée : elle arrivera demain dans le hall."); } },
      tick: () => this.sfx.tick(),
    });

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
    this.placeInBed(); // en attendant, il dort
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
      if (s.visit?.arrived) this.spawnVisitor(true);
    }
    this.free();
    if (s.units <= 0) void this.nightfall();
  }

  private free(): void { this.busy = false; this.ch.busy = false; this.phone.refresh(); }
  private lock(): void { this.busy = true; this.ch.busy = true; this.closeBubbles(); this.phone.close(); this.world.hover(null); }

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
    this.phone.refresh();
    const wet = s.weather === "rain" ? 0.7 : s.weather === "storm" ? 1 : 0;
    this.sfx.rain(this.world.place === "out" ? wet * 1.3 : wet);
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

  private toast(text: string): void {
    this.toasts.push(text);
    if (this.toasting) return;
    this.toasting = true;
    const el = $("toast");
    const next = async (): Promise<void> => {
      const t = this.toasts.shift();
      if (!t) { this.toasting = false; return; }
      el.textContent = t;
      el.classList.add("on");
      await this.clock.wait(3.4);
      el.classList.remove("on");
      await this.clock.wait(0.6);
      return next();
    };
    void next();
  }

  /** Une petite carte de papier à lire (courrier, mots du hall). On la touche pour la refermer. */
  private paper(text: string, kind: "letter" | "note" = "letter"): Promise<void> {
    const el = $("paper"), card = $("paper-card");
    card.textContent = text;
    card.className = kind;
    el.classList.add("on");
    this.sfx.paper();
    return new Promise((done) => {
      const close = () => { el.removeEventListener("click", close); el.classList.remove("on"); void this.clock.wait(0.45).then(done); };
      el.addEventListener("click", close);
      if (this.clock.speed > 3) void this.clock.wait(2).then(close); // tests accélérés
    });
  }

  /** Fondu clair le temps de changer de lieu. */
  private async blink(mid: () => void): Promise<void> {
    const el = $("blink");
    el.classList.add("on");
    await this.clock.wait(0.55);
    mid();
    await this.clock.wait(0.25);
    el.classList.remove("on");
    await this.clock.wait(0.4);
  }

  /** Petit pictogramme qui s'envole au-dessus de quelqu'un. */
  private chirp(who: Character, text: string): void {
    const el = document.createElement("div");
    el.className = "chirp";
    el.textContent = text;
    document.body.appendChild(el);
    const p = who.root.position;
    this.placeBubble(el, new THREE.Vector3(p.x, 1.75 * who.root.scale.y, p.z), false);
    setTimeout(() => el.remove(), 1700);
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
    this.visitor?.update(dt);
    if (this.noe.root.visible) this.noe.update(dt);
    this.extras.forEach((e) => e.update(dt));
    this.world.update(dt);
    const key = this.world.bg.join();
    if (key !== this.bgKey) { this.bgKey = key; document.body.style.background = `linear-gradient(160deg, ${this.world.bg[0]}, ${this.world.bg[1]})`; }
    if (this.menuItem) this.placeBubble($("menu"), this.menuItem.anchor);
    const need = $("need");
    if (this.visitor && this.state.visit?.arrived && !this.busy) {
      const p = this.visitor.root.position;
      need.textContent = NEED[this.state.visit.need];
      this.placeBubble(need, new THREE.Vector3(p.x, 1.55, p.z), false);
      need.classList.add("open");
    } else need.classList.remove("open");
    this.renderer.render(this.world.scene, this.world.camera);
    requestAnimationFrame((t) => this.frame(t));
  }

  private placeBubble(el: HTMLElement, at: THREE.Vector3, clampTop = true): void {
    const v = at.clone().project(this.world.camera);
    const x = (v.x * 0.5 + 0.5) * window.innerWidth, y = (-v.y * 0.5 + 0.5) * window.innerHeight;
    const half = el.offsetWidth / 2 + 10;
    el.style.left = Math.max(half, Math.min(window.innerWidth - half, x)) + "px";
    el.style.top = (clampTop ? Math.max(el.offsetHeight + 64, y) : y) + "px";
  }

  // ───────────────────────── entrées ─────────────────────────

  private pick(e: PointerEvent): string | null {
    const r = this.canvas.getBoundingClientRect();
    const p = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    this.ray.setFromCamera(p, this.world.camera);
    const shown = (o: THREE.Object3D | null): boolean => { for (; o; o = o.parent) if (!o.visible) return false; return true; };
    const hit = this.ray.intersectObjects(this.world.scene.children, true).find((h) => (h.object as THREE.Mesh).isMesh && shown(h.object));
    return hit ? (hit.object.userData.item as string) ?? null : null;
  }

  private itemFor(id: string | null): Interactable | null {
    if (id === "armchair" && this.visitor) id = "visitor";
    return this.world.items.find((i) => i.id === id && i.place === this.world.place) ?? null;
  }

  private onMove(e: PointerEvent): void {
    if (this.busy || this.phone.isOpen) { this.world.hover(null); this.canvas.style.cursor = ""; return; }
    const id = this.pick(e);
    const it = this.itemFor(id);
    this.world.hover(it);
    this.canvas.style.cursor = it || id === "me" ? "pointer" : "";
  }

  private onDown(e: PointerEvent): void {
    this.closeBubbles();
    if (this.phone.isOpen) return this.phone.close();
    if (this.busy) return;
    const id = this.pick(e);
    if (id === "me") return this.peekMood();
    const it = this.itemFor(id);
    if (!it) return;
    if (it.id === "sheep") return void this.sheep(it);
    if (it.id === "door" && this.visitor) return this.say(PEOPLE[this.state.visit!.who].name + " est encore là.", it.anchor);
    this.openMenu(it);
  }

  private closeBubbles(): void {
    $("menu").classList.remove("open");
    $("say").classList.remove("open");
    this.menuItem = null;
  }

  private openMenu(it: Interactable, grp?: string): void {
    const s = this.state, menu = $("menu");
    const all = actionsAt(s, it.id);
    const list = all.filter((a) => (grp ? a.group === grp : !a.group));
    menu.innerHTML = "";
    const add = (html: string, i: number, off: boolean, fn: () => void) => {
      const b = document.createElement("button");
      b.innerHTML = html;
      b.style.transitionDelay = i * 45 + "ms";
      if (off) b.classList.add("no");
      b.addEventListener("click", (ev) => { ev.stopPropagation(); fn(); });
      b.addEventListener("pointerenter", () => this.sfx.tick());
      menu.appendChild(b);
    };
    list.forEach((a, i) => {
      const why = blocked(s, a);
      const price = (a.money ?? 0) < 0 ? "<span class='price'>" + -a.money! + "</span>" : "";
      const dots = a.cost > 0 ? "<span class='cost'>" + price + "<i></i>".repeat(a.cost) + "</span>" : "<span class='cost free'>petit geste</span>";
      add("<span>" + labelOf(a, s) + "</span>" + dots + (why ? "<em>" + WHY[why] + "</em>" : ""), i, !!why, () => { if (!why) void this.run(a.id); else this.sfx.low(); });
    });
    if (!grp && all.some((a) => a.group === "out")) add("<span>Sortir…</span><span class='cost free'>›</span>", list.length, false, () => { this.sfx.tick(); this.openMenu(it, "out"); });
    if (!menu.children.length) return this.say(it.id === "mailbox" ? "Rien aujourd'hui." : "Rien à faire ici pour l'instant.", it.anchor);
    this.menuItem = it;
    this.placeBubble(menu, it.anchor);
    void menu.offsetWidth;
    menu.classList.add("open");
    this.sfx.open();
  }

  private say(text: string, at: THREE.Vector3, swatch?: string): void {
    const el = $("say");
    el.innerHTML = (swatch ? "<b style='background:" + swatch + "'></b>" : "") + "<span></span>";
    el.querySelector("span")!.textContent = text;
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
    const it = this.world.item(id);
    await this.ch.walkTo(it.spot.x, it.spot.z);
    this.ch.face(it.face);
    await this.clock.wait(0.25);
    return it;
  }

  private async sit(y: number, who = this.ch, clip = "sitIdle"): Promise<void> {
    const r = who.root.position, y0 = r.y;
    who.setClip(clip);
    await this.clock.tween(0.5, (k) => { r.y = lerp(y0, y, k); });
  }
  private async stand(who = this.ch): Promise<void> {
    const r = who.root.position, y0 = r.y;
    who.setClip("idle");
    await this.clock.tween(0.45, (k) => { r.y = lerp(y0, 0, k); });
  }

  async run(id: string): Promise<void> {
    if (this.busy) return;
    const s = this.state, a = actionById(id);
    if (blocked(s, a)) return;
    this.lock();
    if (id === "sleep") return this.sleep();
    if (id === "hall" || id === "up") { await this.travel(id === "hall" ? "hall" : "apt"); return this.free(); }

    // Tout en bas, il lui faut un instant avant de s'y mettre.
    if (s.tier === 0 && a.cost > 0) await this.ch.play("lookDown", 1.6);
    this.world.phaseTarget = (UNITS - s.units + a.cost) / UNITS;
    const mail = id === "mail" ? openMail(s) : [];
    if (a.outing) await this.outing(a); else await this.SCRIPT[id]();
    const out = applyAction(s, id);
    for (const m of mail) await this.paper(MAIL[m]);
    if (id === "parcel") { const got = s.decor[s.decor.length - 1]; this.toast("Dans le colis : " + (DECOR.find((d) => d.id === got)?.name ?? "un petit cactus") + "."); }
    await this.after(out);
  }

  /** Après chaque moment : le décor se met à jour, il réagit, et la journée suit son cours. */
  private async after(out: { dMood: number; tierChanged: boolean; dayOver: boolean }): Promise<void> {
    const s = this.state;
    this.shownUnits = s.units;
    this.syncAll();
    save(s);
    await this.react(out);
    this.ch.setClip("idle");
    if (s.visit && this.world.place === "apt") {
      if (!s.visit.arrived && s.units >= 1) await this.arrive();
      else if (s.visit.arrived && (s.visit.done >= 2 || out.dayOver)) await this.leave();
    }
    if (s.noisy && phaseOf(s) >= 0.6 && this.eveningSaid !== s.day) { this.eveningSaid = s.day; this.toast("♪ Le voisin du dessus a de l'énergie, ce soir."); }
    if (out.dayOver) {
      if (this.world.place !== "apt") await this.travel("apt");
      return this.nightfall();
    }
    this.free();
  }

  /** Le joueur ressent l'effet avant de le lire : un geste, un son, une couleur qui glisse. */
  private async react(o: { dMood: number; tierChanged: boolean }): Promise<void> {
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
      const w = this.world.item("window");
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
    music: async () => {
      await this.goto("record");
      await this.ch.play("reach", 0.8);
      this.world.spinWant = 1; this.sfx.click(); this.sfx.tune();
      void this.spend(1, 3.4);
      this.ch.face(0.8);
      await this.ch.play("sway", 3.8);
      this.world.spinWant = 0;
    },

    // ── le hall ──
    mail: async () => { await this.goto("mailbox"); await this.ch.play("reach", 1.0); },
    parcel: async () => {
      await this.goto("mailbox");
      await this.ch.play("tidy", 1.5);
      this.world.sparkle(this.ch.root.position);
      this.ch.setClip("carry");
      await this.clock.wait(0.6);
    },
    trash: async () => {
      void this.spend(1, 3);
      this.ch.setClip("carry");
      await this.goto("bins");
      await this.ch.play("reach", 1.0);
      this.sfx.click();
    },
    notes: async () => {
      await this.goto("wall");
      await this.ch.play("look", 1.4);
      await this.paper(NOTES[this.state.wallNote % NOTES.length], "note");
    },
    hello: async () => {
      const n = this.noe.root.position, p = this.ch.root.position;
      this.ch.face(Math.atan2(n.x - p.x, n.z - p.z));
      this.noe.face(Math.atan2(p.x - n.x, p.z - n.z));
      void this.noe.play("wave", 1.3).then(() => this.noe.setClip("idle"));
      await this.ch.play("wave", 1.3);
      this.chirp(this.noe, "👋");
    },
    chat: async () => {
      await this.goto("neighbor");
      const n = this.noe.root.position, p = this.ch.root.position;
      this.noe.face(Math.atan2(p.x - n.x, p.z - n.z));
      void this.spend(1, 4.2);
      await this.chatter(this.noe, "talk", "talk", 4.6);
      this.noe.face(0.7);
    },

    // ── quand quelqu'un est là ──
    vDrink: async () => {
      const v = this.visitor!;
      await this.goto("counter");
      void this.spend(1, 5.5);
      await this.ch.play("reach", 1.1);
      this.mug.visible = true;
      this.ch.setClip("hold");
      await this.ch.walkTo(0.75, 1.85);
      this.ch.face(Math.atan2(1.75 - 0.75, 1.45 - 1.85));
      await this.ch.play("reach", 0.7);
      this.mug.visible = false;
      this.chirp(v, "🙂");
      void v.play("sitDrink", 2.8).then(() => v.setClip("sitIdle"));
      await this.ch.play("nod", 2.8);
    },
    vTalk: async () => {
      await this.floorSeat();
      void this.spend(1, 4.6);
      await this.chatter(this.visitor!, "floorTalk", "sitTalk", 5);
      await this.stand();
    },
    vSit: async () => {
      // Parfois le mieux est juste d'être là.
      await this.floorSeat();
      void this.spend(1, 5);
      this.visitor!.setClip("rest");
      await this.ch.play("floorSit", 5.4);
      this.visitor!.setClip("sitIdle");
      await this.stand();
    },
  };

  private async floorSeat(): Promise<void> {
    await this.ch.walkTo(0.6, 1.9);
    this.ch.face(Math.atan2(1.75 - 0.6, 1.45 - 1.9));
    this.ch.setClip("floorSit");
    await this.clock.wait(0.6);
  }

  /** Deux personnes qui discutent : gestes alternés et petits pictogrammes, pas de mots. */
  private async chatter(other: Character, mine: string, theirs: string, sec: number): Promise<void> {
    const signs = ["💬", "🙂", "♪", "…", "☀️", "😄"];
    const restMe = mine.startsWith("floor") ? "floorSit" : "idle", restThem = theirs.startsWith("sit") ? "sitIdle" : "idle";
    const turns = Math.max(2, Math.round(sec / 1.25));
    for (let i = 0; i < turns; i++) {
      const me = i % 2 === 0;
      this.ch.setClip(me ? mine : restMe);
      other.setClip(me ? restThem : theirs);
      this.chirp(me ? this.ch : other, signs[(i * 3 + this.state.day) % signs.length]);
      await this.clock.wait(sec / turns);
    }
    this.ch.setClip(restMe); other.setClip(restThem);
  }

  // ───────────────────────── téléphone ─────────────────────────

  private async social(cost: number, act: () => SocialOutcome | null): Promise<void> {
    if (this.busy || this.world.place === "out") return;
    const s = this.state;
    if (s.units < cost) return;
    this.lock();
    this.world.phaseTarget = (UNITS - s.units + cost) / UNITS;
    void this.spend(cost, cost === 2 ? 4.6 : 2.2);
    if (cost === 2) {
      this.sfx.bip();
      this.ch.setClip("call");
      for (const c of ["💬", "🙂", "…", "😄"]) { await this.clock.wait(1.2); this.chirp(this.ch, c); }
      await this.clock.wait(0.6);
    } else await this.ch.play("phone", 2.6);
    const out = act();
    if (!out) return this.free();
    this.chirp(this.ch, out.echo === "good" ? "❤️" : out.echo === "mid" ? "🙂" : "…");
    if (out.visit) this.toast(PEOPLE[s.visit!.who].name + " passe tout à l'heure.");
    await this.after(out);
  }

  // ───────────────────────── visites ─────────────────────────

  private spawnVisitor(seated: boolean): Character {
    const v = this.state.visit!, who = PEOPLE[v.who], p = this.state.people[v.who];
    const c = new Character(this.clock, { hair: who.hair, bun: v.who === "lou" });
    c.tint = FEEL_COLOR[p.feel];
    c.tier = FEEL_TIER[p.feel]; // sa façon de bouger dit comment il ou elle va
    c.root.scale.setScalar(who.scale);
    this.world.scene.add(c.root);
    this.visitor = c;
    const it = this.world.register("visitor", c.root, [1.75, 1.9, 1.45], [1.0, 1.05], 1.0);
    it.place = "apt";
    if (seated) { c.root.position.set(1.7, 0.1, 1.4); c.face(-Math.PI * 0.58); c.setClip("sitIdle"); }
    return c;
  }

  private async arrive(): Promise<void> {
    const s = this.state, door = this.world.item("door");
    this.sfx.knock();
    this.ch.face(Math.atan2(door.spot.x - this.ch.root.position.x, door.spot.z - this.ch.root.position.z));
    await this.ch.play("lookAround", 0.9);
    const v = this.spawnVisitor(false);
    v.root.position.set(3.0, 0, -2.45);
    v.root.scale.setScalar(0.001);
    void this.clock.tween(0.5, (k) => v.root.scale.setScalar(Math.max(0.001, PEOPLE[s.visit!.who].scale * k)), ease.back);
    v.face(Math.atan2(this.ch.root.position.x - 3.0, this.ch.root.position.z + 2.45));
    void v.play("wave", 1.3);
    await this.ch.play("wave", 1.3);
    this.ch.setClip("idle");
    await v.walkTo(1.7, 1.4);
    v.face(-Math.PI * 0.58);
    await this.sit(0.1, v);
    s.visit!.arrived = true;
    save(s);
  }

  private async leave(): Promise<void> {
    const v = this.visitor, s = this.state;
    if (!v) return;
    const happy = (s.visit?.done ?? 0) > 0;
    s.visit = null;
    await this.stand(v);
    v.face(Math.atan2(this.ch.root.position.x - v.root.position.x, this.ch.root.position.z - v.root.position.z));
    this.ch.face(Math.atan2(v.root.position.x - this.ch.root.position.x, v.root.position.z - this.ch.root.position.z));
    if (happy) { this.chirp(v, "🤍"); this.sfx.warm(); }
    void this.ch.play("wave", 1.2).then(() => this.ch.setClip("idle"));
    await v.play("wave", 1.2);
    await v.walkTo(3.0, -2.4);
    await this.clock.tween(0.3, (k) => v.root.scale.setScalar(Math.max(0.001, v.root.scale.x * (1 - k))));
    this.world.scene.remove(v.root);
    this.world.unregister("visitor");
    this.visitor = null;
    save(s);
  }

  // ───────────────────────── hall et sorties ─────────────────────────

  private async travel(to: "apt" | "hall"): Promise<void> {
    const O = PLACES.hall.origin[0];
    await this.goto(to === "hall" ? "door" : "stairs");
    this.sfx.click();
    await this.blink(() => {
      this.world.setPlace(to);
      if (to === "hall") {
        this.ch.root.position.set(O + 1.1, 0, -0.7); this.ch.face(-1.2);
        this.noe.root.visible = neighborHere(this.state);
        this.noe.tint = FEEL_COLOR[this.state.people.noe.feel];
        this.noe.tier = FEEL_TIER[this.state.people.noe.feel];
      } else { this.ch.root.position.set(3.0, 0, -2.2); this.ch.face(0); }
      this.ch.setClip("idle");
    });
  }

  private async place(c: Character, seat: Seat, clip: string): Promise<void> {
    const ox = PLACES.out.origin[0];
    await c.walkTo(ox + seat.x, seat.z);
    c.face(seat.face);
    await this.sit(seat.y, c, clip);
  }

  /** Une sortie : quelques secondes d'un moment vécu, comme un souvenir qu'on regarde. */
  private async outing(a: ActionDef): Promise<void> {
    const s = this.state, id = a.outing!, ox = PLACES.out.origin[0];
    const stage = buildOuting(id);
    const wet = s.weather === "rain" || s.weather === "storm";
    let pal: Character | null = null;
    await this.goto("door");
    this.sfx.click();
    await this.blink(() => {
      this.world.setPlace("out");
      stage.props.forEach((p) => this.world.outing.add(p));
      document.body.classList.add("memory");
      this.ch.root.position.set(ox + stage.start[0], 0, stage.start[1]);
      this.ch.setClip("idle");
      this.brolly.visible = wet && (id === "park" || id === "walk" || id === "market");
      const who = a.social ?? (id === "rdv" ? "listener" : null);
      if (who) {
        const look = PEOPLE[who] ?? { hair: 0x9c8f88, scale: 0.92 };
        pal = new Character(this.clock, { hair: look.hair, bun: who === "lou" || who === "listener" });
        const feel = s.people[who]?.feel ?? "ok";
        pal.tint = who === "listener" ? 0xa8b89a : FEEL_COLOR[feel];
        pal.tier = who === "listener" ? 3 : FEEL_TIER[feel];
        pal.root.scale.setScalar(look.scale);
        const o = stage.other!, st = stage.otherStart;
        if (st && id !== "lou") { pal.root.position.set(ox + st[0], 0, st[1]); }
        else { pal.root.position.set(ox + o.x, o.y, o.z); pal.face(o.face); pal.setClip(id === "rdv" ? "sitNod" : "sitIdle"); }
        this.world.scene.add(pal.root);
        this.extras.push(pal);
      }
      this.syncAll();
      const outdoors = id === "park" || id === "walk" || id === "market";
      this.world.snapWeather(outdoors ? s.weather : "sun"); // dedans, il fait toujours bon
    });
    const P = pal as Character | null;
    void this.spend(a.cost, 6);
    const steam = () => { if (stage.steam) this.world.puff(ox + stage.steam[0], stage.steam[1], stage.steam[2]); };

    if (id === "park") {
      if (this.brolly.visible) {
        await this.ch.walkTo(ox - 0.3, 1.3);
        this.ch.face(Math.PI);
        await this.ch.play("look", 2.6);
        await this.ch.walkTo(ox + 2.6, 1.3);
      } else {
        await this.place(this.ch, stage.hero, "sitIdle");
        await this.ch.play("rest", 2.4);
        await this.ch.play("sitIdle", 2.2);
      }
    } else if (id === "walk") {
      const both = (x: number) => Promise.all([this.ch.walkTo(ox + x, 1.15), P!.walkTo(ox + x + 0.1, 1.75)]);
      await both(-0.4);
      this.ch.face(0.2); P!.face(Math.PI - 0.2);
      await this.chatter(P!, "talk", "talk", 3);
      await both(2.5);
    } else if (id === "market") {
      await this.ch.walkTo(ox + stage.walkTo![0], stage.walkTo![1]);
      this.ch.face(Math.PI);
      await this.ch.play("hesitate", 1.6);
      await this.ch.walkTo(ox + stage.hero.x, stage.hero.z);
      this.ch.face(Math.PI);
      await this.ch.play("reach", 1.1);
      this.world.sparkle(this.ch.root.position);
      await this.ch.play("nod", 1.0);
    } else if (id === "rdv") {
      await this.place(this.ch, stage.hero, "sitIdle");
      await this.ch.play("sitTalk", 2.4);
      this.chirp(this.ch, "…");
      await this.ch.play("rest", 1.8);
      P!.setClip("sitTalk"); await this.clock.wait(1.4); P!.setClip("sitNod");
      await this.ch.play("sitTalk", 1.6);
      await this.ch.play("rest", 1.4);
    } else {
      // café, restaurant, chez Sam, chez Mamie Lou : on s'attable.
      if (P && id !== "lou") void this.place(P, stage.other!, "sitIdle");
      if (id === "lou") { void P!.play("wave", 1.2).then(() => P!.setClip("sitIdle")); }
      await this.place(this.ch, stage.hero, "sitIdle");
      steam();
      await this.ch.play("sitDrink", 2.4);
      steam();
      if (P) {
        this.ch.setClip("sitTalk"); P.setClip("sitLaugh"); this.chirp(P, "😄");
        await this.clock.wait(1.6);
        this.ch.setClip("sitLaugh"); P.setClip("sitTalk");
        await this.clock.wait(1.4);
        P.setClip("sitDrink");
      }
      await this.ch.play("sitDrink", 1.8);
    }

    await this.blink(() => {
      document.body.classList.remove("memory");
      this.world.outing.clear();
      if (P) { this.world.scene.remove(P.root); this.extras = this.extras.filter((e) => e !== P); }
      this.brolly.visible = false;
      this.world.setPlace("apt");
      this.world.snapWeather(s.weather);
      this.ch.root.position.set(3.0, 0, -2.2);
      this.ch.face(0.3);
      this.ch.setClip("idle");
    });
  }

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
    this.lock();
    await this.clock.wait(0.5);
    await this.ch.play("yawn", 2.1);
    await this.sleep();
  }

  private async sleep(): Promise<void> {
    const s = this.state, veil = $("veil");
    if (this.visitor) await this.leave();
    if (this.world.place !== "apt") await this.travel("apt");
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
    this.free();
  }

  /** Le réveil dit déjà comment il va : on s'étire, ou on traîne un peu. */
  private async wakeUp(): Promise<void> {
    const s = this.state, t = s.tier;
    this.placeInBed();
    await this.clock.wait(t === 0 ? 2.6 : t === 1 ? 1.8 : 1.0);
    await this.ch.play("wake", t <= 1 ? 2 : 1.1);
    await this.getUp();
    s.apt.bedMade = false;
    this.world.sync(s);
    const ev = s.events;
    if (ev.includes("fresh")) { this.world.sparkle(this.ch.root.position); await this.ch.play("stretch", 2.2); await this.ch.play("hop", 0.9); }
    else if (ev.includes("slump")) { await this.ch.play("yawn", 2); await this.ch.play("sigh", 1.8); }
    else await this.ch.play(t >= 2 ? "stretch" : "sigh", t >= 2 ? 2.2 : 1.8);
    if (ev.includes("silence")) { await this.ch.play("phone", 1.6); await this.ch.play("sigh", 1.8); }
    for (const e of ev) if (EVENT_TEXT[e]) this.toast(EVENT_TEXT[e]);
    if (s.inbox.some((m) => m.day === s.day && !m.read)) { this.sfx.bip(); this.phone.nudge(); }
    this.ch.setClip("idle");
  }
}
