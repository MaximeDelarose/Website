// Application navigateur : Atelier (préparation du sac) et combat en direct.
// Le moteur ne sait rien du rendu : on lui envoie des placements, on lit son
// état et son journal d'événements.

import type { RunData } from "../content/runData";
import type { Encounter, Sandbox } from "../content/sandbox";
import type { Recipe } from "../content/recipes";
import { autoPlace } from "../game/autoplace";
import { applyFusion, findFusions, type FusionOption } from "../game/fusion";
import * as R from "../game/run";
import { Bag } from "../game/bag";
import { combatResult, createCombat, queueAction, stepCombat } from "../engine/combat";
import { key } from "../engine/geometry";
import { itemSpeed } from "../engine/ops";
import type { ClassDef, Combatant, CombatResult, CombatState, Content, ItemDef, ItemInstance, Vec } from "../engine/types";
import { describeItem, RARITY_FR } from "./describe";
import { arenaBackground, COLORS, crispSize, drawFighter, drawHpBar, drawItem, drawSlots, drawStatuses, outlinedText, RARITY_COLOR } from "./draw";
import { Fx } from "./fx";
import { computeLayout, inRect, type Layout, type Rect } from "./layout";
import { spriteCanvas } from "./sprites";

type Mode = "prep" | "combat";

type Hit =
  | { kind: "bag"; uid: string }
  | { kind: "stash"; uid: string }
  | { kind: "fight"; uid: string }
  | { kind: "enemy"; index: number }
  | { kind: "node"; id: string }
  | { kind: "fuse"; index: number }
  | { kind: "none" };

interface Fight {
  state: CombatState;
  seed: number;
  speed: number;
  paused: boolean;
  acc: number;
  endT: number;
  suddenShown: boolean;
  result: CombatResult | null;
}

interface Drag {
  uid: string;
  pointerId: number;
  /** Point saisi, en cases, depuis le coin haut-gauche de la forme. */
  gx: number;
  gy: number;
  rot: number;
  mirror: boolean;
  fromStash: boolean;
  x: number;
  y: number;
}

interface Press {
  pointerId: number;
  x0: number;
  y0: number;
  hit: Hit;
  long: boolean;
  timer: number;
  touch: boolean;
}

const SAVE_KEY = "bagbound-atelier-v1";
const RUN_KEY = "bagbound-run-v1";
const STATS_KEY = "bagbound-stats-v1";

const NODE_LOOK: Record<string, { icon: string; color: string; name: string }> = {
  combat: { icon: "⚔️", color: "#8a4a3a", name: "Combat" },
  elite: { icon: "💀", color: "#7a2a4a", name: "Élite" },
  boss: { icon: "👑", color: "#a0322a", name: "Boss" },
  shop: { icon: "💰", color: "#9a7a2a", name: "Boutique" },
  event: { icon: "❓", color: "#3a5a8a", name: "Événement" },
  chest: { icon: "🎁", color: "#6a4a8a", name: "Coffre" },
  campfire: { icon: "🔥", color: "#a0602a", name: "Feu de camp" },
};

const iconCache = new Map<string, string>();
function iconUrl(id: string): string {
  let u = iconCache.get(id);
  if (!u) {
    u = spriteCanvas(id).toDataURL();
    iconCache.set(id, u);
  }
  return u;
}
const LONG_MS = 430;
const TICK_S = 0.1;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, html?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

export class App {
  private canvas: HTMLCanvasElement;
  private g: CanvasRenderingContext2D;
  private barEl: HTMLDivElement;
  private tipEl: HTMLDivElement;
  private modalEl: HTMLDivElement;
  private pagerEl: HTMLDivElement;
  private dpr = 1;
  private L!: Layout;
  private cls: ClassDef;
  private bag: Bag;
  private encounter: Encounter;
  private mode: Mode = "prep";
  private preview!: CombatState;
  /** uid d'entrée du sac -> uid moteur dans l'aperçu. */
  private uidMap = new Map<string, string>();
  private fight: Fight | null = null;
  private fx = new Fx();
  private drag: Drag | null = null;
  private press: Press | null = null;
  private hover: { hit: Hit; since: number; x: number; y: number } | null = null;
  private stashRects = new Map<string, Rect>();
  private stashPage = 0;
  private stashPages = 1;
  private enemyRects = new Map<number, Rect>();
  private itemPos = new Map<string, { x: number; y: number }>();
  private time = 0;
  private last = 0;
  private tipFor = "";
  /** Dernier type de pointeur : l'appui long tactile déclenche aussi « contextmenu ». */
  private lastPointer = "mouse";
  /** Atelier (bac à sable) ou run. */
  private ctx: "sandbox" | "run" = "sandbox";
  private run: R.RunState | null = null;
  private selectedNode: string | null = null;
  private nodePos = new Map<string, { x: number; y: number; r: number }>();
  /** Fusions possibles dans le sac (hors combat) et position de leur pastille. */
  private fusions: FusionOption[] = [];
  private fuseBadges: { x: number; y: number; r: number }[] = [];
  /** Marge (en cases) autour du sac pour poser une extension. */
  private margin = 0;

  constructor(
    private stage: HTMLElement,
    private content: Content,
    private sandbox: Sandbox,
    private runData: RunData,
    private recipes: Recipe[],
  ) {
    this.cls = content.classes[sandbox.class];
    this.encounter = sandbox.encounters[0];
    this.bag = this.defaultBag();
    this.load();

    stage.classList.add("bb-stage");
    this.canvas = el("canvas", "game-canvas bb-canvas");
    this.canvas.setAttribute("aria-label", "BAGBOUND : arène et sac");
    this.canvas.tabIndex = -1;
    this.g = this.canvas.getContext("2d")!;
    this.barEl = el("div", "bb-bar");
    this.pagerEl = el("div", "bb-pager");
    this.tipEl = el("div", "bb-tip");
    this.tipEl.hidden = true;
    this.modalEl = el("div", "bb-modal");
    this.modalEl.hidden = true;
    stage.prepend(this.canvas);
    stage.append(this.barEl, this.pagerEl, this.tipEl, this.modalEl);

    this.bindInput();
    this.bindFullscreen();
    new ResizeObserver(() => this.resize()).observe(stage);
    this.resize();
    this.refreshPreview();
    this.renderBar();
    requestAnimationFrame((t) => this.frame(t));
    this.showMenu();
  }

  // -------------------------------------------------------------------------
  // Sac, sauvegarde, aperçu
  // -------------------------------------------------------------------------

  private defaultBag(): Bag {
    const bag = new Bag(this.content, this.cls.bagCells, this.cls.maxBag);
    for (const p of this.cls.startingBag) bag.add(p.item, p.pos, p.rot ?? 0, p.mirror === true);
    for (const id of this.sandbox.stash) bag.add(id);
    return bag;
  }

  private load(): void {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      const bag = Bag.fromJSON(this.content, this.cls.bagCells, data.bag, this.cls.maxBag);
      if (bag.entries.length) this.bag = bag;
      const enc = this.sandbox.encounters.find((e) => e.id === data.encounter);
      if (enc) this.encounter = enc;
    } catch {
      /* stockage indisponible : on garde le sac par défaut */
    }
  }

  private save(): void {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({ bag: this.bag.toJSON(), encounter: this.encounter.id }));
    } catch {
      /* rien */
    }
  }

  /** Combat « figé » : sert à afficher les ennemis et les bonus réels du sac. */
  private refreshPreview(): void {
    const placed = this.bag.placed();
    this.preview = createCombat(this.content, {
      seed: 1,
      player: { hp: this.run?.hp ?? this.cls.hp, maxHp: this.run?.maxHp, bag: this.bag.placements() },
      enemies: this.encounter.enemies.map((id) => ({ id })),
    });
    this.uidMap.clear();
    placed.forEach((e, i) => this.uidMap.set(e.uid, `0:${i}`));
    this.fusions = findFusions(this.bag, this.recipes);
  }

  private previewItem(uid: string): ItemInstance | undefined {
    const eu = this.uidMap.get(uid);
    return eu ? this.preview.combatants[0].items.find((i) => i.uid === eu) : undefined;
  }

  private bagChanged(): void {
    this.refreshPreview();
    if (this.ctx === "run" && this.run) {
      this.run.bag = this.bag.toJSON();
      this.saveRun();
    } else this.save();
  }

  // -------------------------------------------------------------------------
  // Mise en page
  // -------------------------------------------------------------------------

  private resize(): void {
    const r = this.stage.getBoundingClientRect();
    const W = Math.max(280, Math.round(r.width));
    const H = Math.max(360, Math.round(r.height));
    this.dpr = Math.min(3, window.devicePixelRatio || 1);
    this.canvas.width = Math.round(W * this.dpr);
    this.canvas.height = Math.round(H * this.dpr);
    this.canvas.style.width = `${W}px`;
    this.canvas.style.height = `${H}px`;
    const b = this.bag.bounds();
    // marge d'une case autour du sac quand une extension attend dans la réserve
    const dragExt = this.drag ? this.bag.isExtension(this.bag.get(this.drag.uid)!) : false;
    this.margin = this.mode === "prep" && (dragExt || this.bag.stashed().some((e) => this.bag.isExtension(e))) ? 1 : 0;
    this.L = computeLayout(W, H, b.w + 2 * this.margin, b.h + 2 * this.margin, this.mode === "prep");
    const bar = this.L.bar;
    Object.assign(this.barEl.style, { left: `${bar.x}px`, top: `${bar.y}px`, width: `${bar.w}px`, height: `${bar.h}px` });
    this.packStash();
  }

  private gridOrigin(): { ox: number; oy: number } {
    const b = this.bag.bounds();
    const m = this.margin;
    return { ox: this.L.gx - (b.minX - m) * this.L.cell, oy: this.L.gy - (b.minY - m) * this.L.cell };
  }

  private packStash(): void {
    this.stashRects.clear();
    const r = this.L.stash;
    if (!r) {
      this.pagerEl.hidden = true;
      return;
    }
    const c = this.L.stashCell;
    const gap = Math.max(4, Math.round(c * 0.25));
    const x0 = r.x + 8;
    const y0 = r.y + 26;
    const maxX = r.x + r.w - 8;
    const maxY = r.y + r.h - 6;
    let x = x0;
    let y = y0;
    let rowH = 0;
    let page = 0;
    const pages: number[] = [];
    for (const e of this.bag.stashed()) {
      if (this.drag?.uid === e.uid) continue;
      const shape = this.bag.shape(e);
      const w = (Math.max(...shape.map((s) => s[0])) + 1) * c;
      const h = (Math.max(...shape.map((s) => s[1])) + 1) * c;
      if (x + w > maxX && x > x0) {
        x = x0;
        y += rowH + gap;
        rowH = 0;
      }
      if (y + h > maxY && y > y0) {
        page++;
        x = x0;
        y = y0;
        rowH = 0;
      }
      pages.push(page);
      if (page === this.stashPage) this.stashRects.set(e.uid, { x, y, w, h });
      x += w + gap;
      rowH = Math.max(rowH, h);
    }
    this.stashPages = Math.max(1, page + 1);
    if (this.stashPage >= this.stashPages) {
      this.stashPage = this.stashPages - 1;
      this.packStash();
      return;
    }
    this.pagerEl.hidden = false;
    const pagerHtml =
      this.stashPages > 1
        ? `<button type="button" data-p="-1" aria-label="Page précédente">◀</button><span>${this.stashPage + 1}/${this.stashPages}</span><button type="button" data-p="1" aria-label="Page suivante">▶</button>`
        : "";
    this.pagerEl.innerHTML = `<button type="button" class="bb-auto" data-auto title="Poser automatiquement les objets de la réserve">Ranger</button>${pagerHtml}`;
    Object.assign(this.pagerEl.style, { left: `${r.x + 80}px`, top: `${r.y - 2}px`, width: `${r.w - 86}px` });
  }

  // -------------------------------------------------------------------------
  // Barre de commandes (DOM)
  // -------------------------------------------------------------------------

  private renderBar(): void {
    if (this.mode === "prep" && this.ctx === "run" && this.run) {
      const r = this.run;
      const zone = this.runData.zones[r.zone];
      const reopen =
        r.phase === "shop" ? `<button type="button" class="bb-btn bb-go" data-reopen>💰 Boutique</button>`
        : r.phase !== "map" && r.phase !== "combat" ? `<button type="button" class="bb-btn bb-go" data-reopen>↩ Reprendre</button>` : "";
      this.barEl.innerHTML = `
        <span class="bb-hud" title="Points de vie">❤ ${r.hp}/${r.maxHp}</span>
        <span class="bb-hud bb-gold" title="Or">● ${r.gold}</span>
        <span class="bb-floor" title="${esc(zone?.name ?? "")}">Étage ${r.floor + 1}/${zone?.floors.length ?? 1}</span>
        ${reopen}
        <button type="button" class="bb-btn" data-menu aria-label="Menu">☰</button>`;
      return;
    }
    if (this.mode === "prep") {
      const opts = this.sandbox.encounters
        .map((e) => `<option value="${esc(e.id)}"${e.id === this.encounter.id ? " selected" : ""}>${esc(e.name)}</option>`)
        .join("");
      this.barEl.innerHTML = `
        <label class="bb-enc"><span class="sr-only">Rencontre</span><select data-enc>${opts}</select></label>
        <button type="button" class="bb-btn" data-reset title="Revenir au sac de départ">↺</button>
        <button type="button" class="bb-btn bb-go" data-fight>⚔ Combattre</button>
        <button type="button" class="bb-btn" data-menu aria-label="Menu">☰</button>`;
    } else {
      const f = this.fight!;
      const sp = [1, 2, 4].map((s) => `<button type="button" class="bb-btn bb-speed${f.speed === s ? " is-on" : ""}" data-speed="${s}">x${s}</button>`).join("");
      this.barEl.innerHTML = `
        <button type="button" class="bb-btn" data-pause aria-label="${f.paused ? "Reprendre" : "Pause"}">${f.paused ? "▶" : "⏸"}</button>
        ${sp}
        <span class="bb-time" data-time>0,0 s</span>
        <button type="button" class="bb-btn" data-skip title="Aller à la fin">⏭</button>
        ${this.ctx === "sandbox" ? `<button type="button" class="bb-btn" data-quit title="Retour à l'atelier">✕</button>` : ""}`;
    }
  }

  private onBarClick(t: HTMLElement): void {
    if (t.closest("[data-menu]")) return this.showMenu();
    if (t.closest("[data-reopen]")) return this.showPhase();
    if (t.closest("[data-fight]")) return this.startFight();
    if (t.closest("[data-reset]")) {
      this.bag = this.defaultBag();
      this.stashPage = 0;
      this.packStash();
      this.bagChanged();
      return;
    }
    const f = this.fight;
    if (!f) return;
    const sp = t.closest<HTMLElement>("[data-speed]");
    if (sp) {
      f.speed = Number(sp.dataset.speed);
      this.renderBar();
    } else if (t.closest("[data-pause]")) {
      f.paused = !f.paused;
      this.renderBar();
    } else if (t.closest("[data-skip]")) {
      while (!f.state.outcome) stepCombat(f.state);
      f.state.events.length = 0;
      this.fx.clear();
    } else if (t.closest("[data-quit]")) {
      this.toPrep();
    }
  }

  // -------------------------------------------------------------------------
  // Combat
  // -------------------------------------------------------------------------

  private startFight(seed?: number): void {
    this.hideTip();
    this.closeModal();
    let setup;
    if (this.ctx === "run" && this.run) setup = R.combatSetup(this.run);
    else {
      const sd = seed ?? Math.floor(Math.random() * 4294967296) >>> 0;
      setup = { seed: sd, player: { hp: this.cls.hp, bag: this.bag.placements() }, enemies: this.encounter.enemies.map((id) => ({ id })) };
    }
    const s = setup.seed;
    const state = createCombat(this.content, setup, { record: true });
    const speed = this.fight?.speed ?? 1;
    this.fight = { state, seed: s, speed, paused: false, acc: 0, endT: 0, suddenShown: false, result: null };
    this.fx.clear();
    this.mode = "combat";
    this.resize();
    this.renderBar();
  }

  private toPrep(): void {
    this.fight = null;
    this.mode = "prep";
    this.fx.clear();
    this.closeModal();
    this.hideTip();
    this.resize();
    this.refreshPreview();
    this.renderBar();
  }

  private updateFight(dt: number): void {
    const f = this.fight;
    if (!f) return;
    if (!f.state.outcome && !f.paused) {
      f.acc += dt * f.speed;
      let n = 0;
      while (f.acc >= TICK_S && !f.state.outcome && n < 60) {
        stepCombat(f.state);
        f.acc -= TICK_S;
        n++;
      }
      this.consumeEvents(f);
      if (f.state.outcome) f.acc = 0;
    }
    const t = this.barEl.querySelector("[data-time]");
    if (t) t.textContent = `${(f.state.timeMs / 1000).toFixed(1).replace(".", ",")} s`;
    if (f.state.outcome && !f.result) {
      f.endT += dt;
      if (f.endT > 1.1) {
        f.result = combatResult(f.state);
        this.showResult(f);
      }
    }
  }

  private fighterAnchor(i: number): { x: number; y: number } {
    const r = this.enemyRects.get(i);
    if (i > 0 && r) return { x: r.x + r.w / 2, y: r.y + r.h * 0.3 };
    const p = this.fighterLayout(this.fight?.state ?? this.preview, 0);
    return { x: p.cx, y: p.ground - 10 * p.s };
  }

  private consumeEvents(f: Fight): void {
    const st = f.state;
    for (const e of st.events) {
      switch (e.type) {
        case "trigger": {
          this.fx.itemFlash.set(e.item, 0.25);
          const it = st.combatants[e.owner]?.items.find((i) => i.uid === e.item);
          if (it?.def.effects.some((x) => x.type === "damage")) this.fx.lunge.set(e.owner, 0.16);
          break;
        }
        case "damage": {
          const p = this.fighterAnchor(e.target);
          const color = e.kind === "poison" ? COLORS.poison : e.kind === "burn" ? COLORS.burn : e.kind === "suddenDeath" ? "#d68aff" : COLORS.damage;
          if (e.amount > 0) {
            this.fx.float(p.x, p.y, `-${e.amount}`, color, e.amount >= 8);
            this.fx.hit.set(e.target, 0.14);
          }
          if (e.absorbed > 0) this.fx.float(p.x + 14, p.y + 10, `-${e.absorbed}`, COLORS.shield);
          if (e.kind === "damage" && e.amount + e.absorbed > 0) this.fx.burst(p.x, p.y + 20, e.amount > 0 ? "#ffd2a0" : COLORS.shield, 5, 50);
          break;
        }
        case "heal": {
          const p = this.fighterAnchor(e.target);
          this.fx.float(p.x, p.y, `+${e.amount}`, COLORS.heal);
          break;
        }
        case "shield": {
          const p = this.fighterAnchor(e.target);
          this.fx.float(p.x, p.y + 8, `+${e.amount}`, COLORS.shield);
          break;
        }
        case "status": {
          const p = this.fighterAnchor(e.target);
          this.fx.burst(p.x, p.y + 20, e.status === "poison" ? COLORS.poison : COLORS.burn, 6, 40);
          break;
        }
        case "itemStatus": {
          const p = this.itemPos.get(e.item);
          if (p && e.status === "freeze") this.fx.burst(p.x, p.y, COLORS.freeze, 6, 40);
          break;
        }
        case "phase":
          this.fx.showBanner(e.name ?? "Nouvelle phase !", "#ff9ad0");
          break;
        case "death": {
          const p = this.fighterAnchor(e.target);
          this.fx.burst(p.x, p.y + 20, "#cfc4b0", 14, 90);
          break;
        }
        case "throw": {
          const from = this.itemPos.get(e.item) ?? this.fighterAnchor(0);
          const to = this.fighterAnchor(e.target);
          const it = st.combatants[e.owner]?.items.find((i) => i.uid === e.item) ?? st.retired.find((i) => i.uid === e.item);
          this.fx.projectiles.push({ sprite: it?.def.id ?? "empty_bottle", x0: from.x, y0: from.y, x1: to.x, y1: to.y + 16, t: 0, life: 0.35 });
          break;
        }
        case "actionRejected":
          this.fx.shake.set(e.item, 0.3);
          break;
        case "suddenDeath":
          this.fx.redPulse = 0.35;
          if (!f.suddenShown) {
            f.suddenShown = true;
            this.fx.showBanner("Mort subite !", "#ff7a6a");
          }
          break;
        default:
          break;
      }
    }
    st.events.length = 0;
  }

  private usePotion(uid: string, mode: "drink" | "throw"): void {
    const f = this.fight;
    if (!f || f.state.outcome) return;
    const it = f.state.combatants[0].items.find((i) => i.uid === uid);
    if (!it) return;
    if (!it.def.manual) {
      this.fx.shake.set(uid, 0.25);
      return;
    }
    queueAction(f.state, { type: mode, combatant: 0, item: uid });
  }

  // -------------------------------------------------------------------------
  // Fenêtres (résultat, inspection)
  // -------------------------------------------------------------------------

  private modalAt = 0;

  private showModal(html: string): void {
    this.modalEl.innerHTML = `<div class="bb-card panel">${html}</div>`;
    this.modalEl.hidden = false;
    this.modalAt = performance.now();
  }

  private closeModal(): void {
    this.modalEl.hidden = true;
    this.modalEl.innerHTML = "";
  }

  private showResult(f: Fight): void {
    const r = f.result!;
    const title = r.outcome === "win" ? "Victoire !" : r.outcome === "loss" ? "Défaite…" : "Égalité";
    const rows = new Map<string, { name: string; t: number; d: number; h: number; s: number; st: number }>();
    for (const s of r.itemStats) {
      if (s.owner !== 0) continue;
      const def = this.content.items[s.item];
      const k = def.id;
      const row = rows.get(k) ?? { name: def.name, t: 0, d: 0, h: 0, s: 0, st: 0 };
      row.t += s.stats.triggers;
      row.d += s.stats.damage;
      row.h += s.stats.heal;
      row.s += s.stats.shield;
      row.st += Object.values(s.stats.stacks).reduce((a, b) => a + b, 0);
      rows.set(k, row);
    }
    const sorted = [...rows.values()].sort((a, b) => b.d + b.h + b.s - (a.d + a.h + a.s));
    // colonnes vides masquées (le tableau tient sur un téléphone)
    const cols = (
      [
        ["t", "×", "Déclenchements"],
        ["d", "Dégâts", ""],
        ["h", "Soin", ""],
        ["s", "Bouclier", ""],
        ["st", "Statuts", "Poison et brûlure appliqués"],
      ] as const
    ).filter(([k]) => k === "t" || sorted.some((x) => x[k] > 0));
    const table = sorted.length
      ? `<div class="bb-scroll"><table class="bb-stats"><thead><tr><th>Objet</th>${cols.map(([, l, t]) => `<th${t ? ` title="${t}"` : ""}>${l}</th>`).join("")}</tr></thead><tbody>${sorted
          .map((x) => `<tr><td>${esc(x.name)}</td>${cols.map(([k]) => `<td>${x[k] || (k === "t" ? 0 : "")}</td>`).join("")}</tr>`)
          .join("")}</tbody></table></div>`
      : "<p>Ton sac était vide !</p>";
    if (this.ctx === "run") {
      const names = f.state.combatants.slice(1).map((c) => c.name).join(", ");
      this.showModal(`
      <h2 class="bb-title bb-${r.outcome}">${title}</h2>
      <p class="bb-sub">${esc(names)} · ${r.seconds.toFixed(1).replace(".", ",")} s · PV ${r.player.hp}/${r.player.maxHp}</p>
      ${table}
      <div class="bb-actions"><button type="button" class="btn btn-small" data-continue>Continuer</button></div>`);
      return;
    }
    this.showModal(`
      <h2 class="bb-title bb-${r.outcome}">${title}</h2>
      <p class="bb-sub">${esc(this.encounter.name)} · ${r.seconds.toFixed(1).replace(".", ",")} s · PV ${r.player.hp}/${r.player.maxHp}</p>
      ${table}
      <p class="bb-seed">Graine ${f.seed} : même graine + même sac = même combat.</p>
      <div class="bb-actions">
        <button type="button" class="btn btn-small" data-again>↻ Rejouer</button>
        <button type="button" class="btn btn-small" data-replay>⟲ Revoir</button>
        <button type="button" class="btn btn-small btn-ghost" data-prep>Atelier</button>
      </div>`);
  }

  private inspectEnemy(i: number): void {
    const st = this.fight?.state ?? this.preview;
    const c = st.combatants[i];
    if (!c) return;
    const rank = c.rank === "boss" ? " · boss" : c.rank === "elite" ? " · élite" : "";
    const phases = c.phases.length ? `<p class="bb-sub">${c.phases.length} phase(s) : change de sac sous ${c.phases.map((p) => `${Math.round(p.hpBelow * 100)} %`).join(", ")} de PV.</p>` : "";
    const items = c.items.filter((x) => !x.removed).map((x) => this.tipHtml(x.def, x.mods, x.charges)).join("");
    this.showModal(`
      <h2 class="bb-title">${esc(c.name)}</h2>
      <p class="bb-sub">${c.hp}/${c.maxHp} PV${rank}</p>${phases}
      <div class="bb-inspect">${items || "<p>Sac vide.</p>"}</div>
      <div class="bb-actions"><button type="button" class="btn btn-small" data-close>Fermer</button></div>`);
  }


  // -------------------------------------------------------------------------
  // Run : menu, phases, actions
  // -------------------------------------------------------------------------

  private loadSavedRun(): R.RunState | null {
    try {
      const r = R.parseRun(localStorage.getItem(RUN_KEY));
      return r && r.phase !== "dead" && r.phase !== "won" && this.content.classes[r.cls] ? r : null;
    } catch {
      return null;
    }
  }

  private saveRun(): void {
    if (!this.run) return;
    try {
      if (this.run.phase === "dead" || this.run.phase === "won") localStorage.removeItem(RUN_KEY);
      else localStorage.setItem(RUN_KEY, R.serializeRun(this.run));
    } catch {
      /* stockage indisponible */
    }
  }

  private stats(): { runs: number; wins: number; best: number } {
    try {
      const s = JSON.parse(localStorage.getItem(STATS_KEY) ?? "null");
      if (s && typeof s.runs === "number") return s;
    } catch {
      /* rien */
    }
    return { runs: 0, wins: 0, best: 0 };
  }

  private recordEnd(run: R.RunState): void {
    const s = this.stats();
    s.runs++;
    if (run.phase === "won") s.wins++;
    const depth = run.zone * 10 + run.floor + 1;
    s.best = Math.max(s.best, depth);
    try {
      localStorage.setItem(STATS_KEY, JSON.stringify(s));
    } catch {
      /* rien */
    }
  }

  private showMenu(): void {
    this.hideTip();
    const saved = this.ctx === "run" && this.run ? this.run : this.loadSavedRun();
    const st = this.stats();
    const inRun = this.ctx === "run" && this.run && this.mode === "prep";
    const cont = saved
      ? `<button type="button" class="btn" data-act="continue">▶ Continuer la partie <small>(étage ${saved.floor + 1}, ${saved.hp}/${saved.maxHp} PV)</small></button>`
      : "";
    const record = st.runs ? `<p class="bb-seed">${st.runs} partie(s) · ${st.wins} victoire(s)</p>` : "";
    this.showModal(`
      <h2 class="bb-title bb-logo">BAGBOUND</h2>
      <p class="bb-sub">Range ton sac. Le reste se joue tout seul.</p>
      <div class="bb-menu">
        ${inRun ? `<button type="button" class="btn" data-act="resume">Reprendre</button>` : cont}
        <button type="button" class="btn${saved ? " btn-ghost" : ""}" data-act="new">${saved ? "Nouvelle partie" : "▶ Nouvelle partie"}</button>
        <button type="button" class="btn btn-ghost" data-act="sandbox">Atelier (essais libres)</button>
        ${inRun ? `<button type="button" class="btn btn-ghost bb-danger" data-act="abandon">Abandonner la partie</button>` : ""}
      </div>
      ${record}`);
  }

  private startRun(run: R.RunState): void {
    this.ctx = "run";
    this.run = run;
    this.cls = this.content.classes[run.cls];
    this.bag = Bag.fromJSON(this.content, this.cls.bagCells, run.bag, this.cls.maxBag);
    this.stashPage = 0;
    this.selectedNode = null;
    this.fight = null;
    this.mode = "prep";
    this.fx.clear();
    this.saveRun();
    this.resize();
    this.refreshPreview();
    this.showPhase();
  }

  private toSandbox(): void {
    this.ctx = "sandbox";
    this.run = null;
    this.cls = this.content.classes[this.sandbox.class];
    this.bag = this.defaultBag();
    this.load();
    this.toPrep();
  }

  /** Recharge le sac depuis la run (après un butin, un achat, un événement…). */
  private syncBagFromRun(): void {
    if (!this.run) return;
    this.bag = Bag.fromJSON(this.content, this.cls.bagCells, this.run.bag, this.cls.maxBag);
    this.packStash();
    this.refreshPreview();
  }

  private commit(): void {
    this.syncBagFromRun();
    this.saveRun();
    if (this.run && (this.run.phase === "dead" || this.run.phase === "won")) this.recordEnd(this.run);
    this.showPhase();
  }

  /** Affiche l'écran qui correspond à la phase de la run. */
  private showPhase(): void {
    const run = this.run;
    if (!run) return;
    if (run.phase === "combat") {
      if (this.mode !== "combat") this.startFight();
      return;
    }
    if (this.mode !== "prep") {
      this.fight = null;
      this.mode = "prep";
      this.fx.clear();
      this.resize();
    }
    this.renderBar();
    const p = run.pending;
    switch (run.phase) {
      case "map":
        this.closeModal();
        break;
      case "reward": {
        const r = p as Extract<R.Pending, { kind: "reward" }>;
        this.showModal(`
          <h2 class="bb-title bb-win">${r.boss ? "Le boss est vaincu !" : "Butin"}</h2>
          <p class="bb-sub">+${r.gold} or · choisis un objet (il va dans ta réserve)</p>
          <div class="bb-cards">${r.choices.map((id) => this.itemCard(id, `<button type="button" class="btn btn-small" data-act="reward:${id}">Prendre</button>`)).join("")}</div>
          <div class="bb-actions"><button type="button" class="btn btn-small btn-ghost" data-act="reward:">Ne rien prendre</button></div>`);
        break;
      }
      case "chest": {
        const c = p as Extract<R.Pending, { kind: "chest" }>;
        this.showModal(`
          <h2 class="bb-title">Coffre</h2>
          <p class="bb-sub">+${c.gold} or · et un objet au choix</p>
          <div class="bb-cards">${c.choices.map((id) => this.itemCard(id, `<button type="button" class="btn btn-small" data-act="chest:${id}">Prendre</button>`)).join("")}</div>
          <div class="bb-actions"><button type="button" class="btn btn-small btn-ghost" data-act="chest:">Juste l'or</button></div>`);
        break;
      }
      case "campfire": {
        const rr = this.runData.rules.campfire;
        const heal = Math.min(run.maxHp - run.hp, Math.round(run.maxHp * rr.healPct));
        this.showModal(`
          <h2 class="bb-title">Feu de camp</h2>
          <p class="bb-sub">Les braises crépitent. ${run.hp}/${run.maxHp} PV.</p>
          <div class="bb-menu">
            <button type="button" class="btn" data-act="camp:rest">🔥 Se reposer <small>(+${heal} PV)</small></button>
            <button type="button" class="btn btn-ghost" data-act="camp:train">💪 S'entraîner <small>(+${rr.maxHp} PV max)</small></button>
          </div>`);
        break;
      }
      case "shop":
        this.showShop();
        break;
      case "event":
        this.showEvent();
        break;
      case "dead":
      case "won":
        this.showEnd(run);
        break;
    }
  }

  private itemCard(id: string, action: string, note = ""): string {
    const def = this.content.items[id];
    const info = describeItem(def);
    const col = RARITY_COLOR[def.rarity] ?? RARITY_COLOR.common;
    const lines = info.lines.filter((l) => l.kind !== "note" && l.kind !== "manual").map((l) => `<li>${esc(l.text)}</li>`).join("");
    return `<div class="bb-item" style="--rc:${col}">
      <img src="${iconUrl(id)}" alt="" width="48" height="48">
      <div class="bb-item-body"><p class="bb-tip-name">${esc(def.name)} <small>${esc(info.rarity)}</small></p>
      <div class="bb-tags">${def.tags.map((t) => `<span class="bb-tag">${esc(t)}</span>`).join("")}</div>
      <ul>${lines}</ul>${note}</div>
      <div class="bb-item-act">${action}</div></div>`;
  }

  private showShop(): void {
    const run = this.run!;
    const p = run.pending as Extract<R.Pending, { kind: "shop" }>;
    const rr = this.runData.rules.shop;
    const stock = p.stock
      .map((s, i) =>
        this.itemCard(
          s.item,
          s.sold
            ? `<span class="bb-sold">Vendu</span>`
            : `<button type="button" class="btn btn-small" data-act="buy:${i}"${run.gold < s.price ? " disabled" : ""}>● ${s.price}</button>`,
        ),
      )
      .join("");
    const sellable = run.bag.entries
      .map((e, i) => ({ e, i }))
      .sort((a, b) => (a.e.pos === null ? 0 : 1) - (b.e.pos === null ? 0 : 1));
    const sell = sellable
      .map(
        ({ e, i }) =>
          `<li><img src="${iconUrl(e.item)}" alt="" width="24" height="24"><span>${esc(this.content.items[e.item].name)}${e.pos ? " <small>(dans le sac)</small>" : ""}</span><button type="button" class="btn btn-small btn-ghost" data-act="sell:${i}">+${R.sellPrice(this.content, this.runData, e.item)}</button></li>`,
      )
      .join("");
    const reroll = R.rerollCost(run, this.runData);
    const fused = run.bag.entries
      .map((e, i) => ({ e, i }))
      .filter(({ e }) => e.fusedFrom?.length)
      .map(
        ({ e, i }) =>
          `<li><img src="${iconUrl(e.item)}" alt="" width="24" height="24"><span>${esc(this.content.items[e.item].name)} <small>→ ${e.fusedFrom!.map((x) => esc(this.content.items[x].name)).join(" + ")}</small></span><button type="button" class="btn btn-small btn-ghost" data-act="unfuse:${i}"${run.gold < rr.unfuseCost ? " disabled" : ""}>Défaire</button></li>`,
      )
      .join("");
    const bottles = R.emptyBottles(run, this.runData);
    this.showModal(`
      <h2 class="bb-title">Boutique</h2>
      <p class="bb-sub">Tu as <b>● ${run.gold}</b> or · ${run.hp}/${run.maxHp} PV. Les achats vont dans ta réserve.</p>
      <div class="bb-cards">${stock}</div>
      <div class="bb-actions bb-left">
        <button type="button" class="btn btn-small btn-ghost" data-act="reroll"${run.gold < reroll ? " disabled" : ""}>↻ Renouveler (● ${reroll})</button>
        <button type="button" class="btn btn-small btn-ghost" data-act="heal"${run.gold < rr.healCost || run.hp >= run.maxHp ? " disabled" : ""}>❤ +${rr.healAmount} PV (● ${rr.healCost})</button>
      </div>
      <details class="bb-sell"><summary>Vendre un objet</summary><ul>${sell || "<li>Rien à vendre.</li>"}</ul></details>
      ${fused ? `<details class="bb-sell"><summary>Défusionner (● ${rr.unfuseCost})</summary><ul>${fused}</ul></details>` : ""}
      ${bottles ? `<div class="bb-actions bb-left"><button type="button" class="btn btn-small btn-ghost" data-act="refill"${run.gold < bottles * this.runData.rules.refill.cost ? " disabled" : ""}>🧪 Remplir ${bottles} bouteille(s) vide(s) (● ${bottles * this.runData.rules.refill.cost})</button></div>` : ""}
      <div class="bb-actions">
        <button type="button" class="btn btn-small btn-ghost" data-close>Ranger mon sac</button>
        <button type="button" class="btn btn-small" data-act="leave">Partir →</button>
      </div>`);
  }

  private showEvent(): void {
    const run = this.run!;
    const ev = R.currentEvent(run, this.runData);
    const p = run.pending as Extract<R.Pending, { kind: "event" }>;
    if (!ev) return;
    const icon = ev.icon ? `<img class="bb-ev-icon" src="${iconUrl(ev.icon)}" alt="" width="64" height="64">` : "";
    if (p.result !== null) {
      const msgs = p.messages.length ? `<ul class="bb-msgs">${p.messages.map((m) => `<li>${esc(m)}</li>`).join("")}</ul>` : "";
      this.showModal(`
        ${icon}<h2 class="bb-title">${esc(ev.title)}</h2>
        <p>${esc(p.result)}</p>${msgs}
        <div class="bb-actions"><button type="button" class="btn btn-small" data-act="evclose">Continuer</button></div>`);
      return;
    }
    const choices = ev.choices
      .map((c, i) => {
        const ok = R.choiceAvailable(run, this.content, c);
        return `<button type="button" class="btn${i ? " btn-ghost" : ""}" data-act="ev:${i}"${ok ? "" : " disabled"}>${esc(c.label)}</button>`;
      })
      .join("");
    this.showModal(`
      ${icon}<h2 class="bb-title">${esc(ev.title)}</h2>
      <p>${esc(ev.text)}</p>
      <div class="bb-menu">${choices}</div>`);
  }

  private showEnd(run: R.RunState): void {
    const won = run.phase === "won";
    const zone = this.runData.zones[Math.min(run.zone, this.runData.zones.length - 1)];
    const where = won ? `${esc(zone.name)} traversée !` : `Tombé à ${esc(zone.name)}, étage ${run.floor + 1}.`;
    const by = !won && run.stats.killedBy ? `<p>Vaincu par : ${esc(run.stats.killedBy.join(", "))}</p>` : "";
    this.showModal(`
      <h2 class="bb-title bb-${won ? "win" : "loss"}">${won ? "Victoire !" : "Fin de la partie"}</h2>
      <p class="bb-sub">${where}</p>${by}
      <ul class="bb-msgs">
        <li>${run.stats.combats} combat(s), dont ${run.stats.elites} élite(s)</li>
        <li>${run.stats.kills} ennemi(s) vaincu(s)</li>
        <li>${run.stats.goldEarned} or gagné</li>
      </ul>
      <p class="bb-seed">Graine de la partie : ${run.seed}</p>
      <div class="bb-actions">
        <button type="button" class="btn btn-small btn-ghost" data-act="menu">Menu</button>
        <button type="button" class="btn btn-small" data-act="new">Nouvelle partie</button>
      </div>`);
  }

  private applyFightResult(): void {
    const f = this.fight;
    if (this.ctx !== "run" || !this.run || !f?.result) return this.closeModal();
    if (this.run.phase === "combat") R.finishCombat(this.run, this.content, this.runData, f.result);
    this.fight = null;
    this.commit();
  }

  private onAct(act: string): void {
    const [cmd, arg = ""] = act.split(":");
    const run = this.run;
    try {
      switch (cmd) {
        case "continue": {
          const saved = this.loadSavedRun();
          if (saved) this.startRun(saved);
          return;
        }
        case "new": {
          if (this.ctx === "run" && this.run && this.run.phase !== "dead" && this.run.phase !== "won" && !confirm("Abandonner la partie en cours ?")) return;
          const saved = this.ctx !== "run" ? this.loadSavedRun() : null;
          if (saved && !confirm("Une partie est en cours. En commencer une nouvelle ?")) return;
          const seed = Math.floor(Math.random() * 4294967296) >>> 0;
          this.startRun(R.newRun(this.content, this.runData, this.sandbox.class, seed));
          return;
        }
        case "sandbox":
          this.closeModal();
          this.toSandbox();
          return;
        case "menu":
          this.showMenu();
          return;
        case "resume":
          this.closeModal();
          this.showPhase();
          return;
        case "fuse": {
          const opt = this.fusions[Number(arg)];
          if (!opt) return;
          const r = applyFusion(this.bag, opt);
          this.closeModal();
          this.stashPage = 0;
          this.bagChanged();
          this.resize();
          const name = this.content.items[r.entry.item].name;
          this.fx.showBanner(r.placed ? `${name} !` : `${name} → réserve`, "#d9b4ff");
          if (r.entry.pos) {
            const { ox, oy } = this.gridOrigin();
            const cs = this.bag.cellsAt(r.entry, r.entry.pos);
            for (const [cx, cy] of cs) this.fx.burst(ox + (cx + 0.5) * this.L.cell, oy + (cy + 0.5) * this.L.cell, "#d9b4ff", 6, 70);
          }
          return;
        }
        case "abandon":
          if (!run || !confirm("Abandonner la partie ? Elle sera perdue.")) return;
          run.phase = "dead";
          run.stats.killedBy = ["l'abandon"];
          this.commit();
          return;
      }
      if (!run) return;
      switch (cmd) {
        case "reward":
          R.takeReward(run, this.runData, arg || null);
          break;
        case "chest":
          R.takeChest(run, this.runData, arg || null);
          break;
        case "camp":
          R.campfire(run, this.runData, arg === "train" ? "train" : "rest");
          break;
        case "buy":
          R.buy(run, Number(arg));
          break;
        case "sell":
          R.sell(run, this.content, this.runData, Number(arg));
          break;
        case "reroll":
          R.reroll(run, this.content, this.runData);
          break;
        case "heal":
          R.shopHeal(run, this.runData);
          break;
        case "unfuse":
          R.unfuseAt(run, this.runData, Number(arg));
          break;
        case "refill":
          R.refillBottles(run, this.runData);
          break;
        case "leave":
          R.leaveShop(run, this.runData);
          break;
        case "ev":
          R.chooseEvent(run, this.content, this.runData, Number(arg));
          break;
        case "evclose":
          R.closeEvent(run, this.runData);
          break;
        default:
          return;
      }
      this.commit();
    } catch (err) {
      if (err instanceof R.RunError) console.warn(err.message);
      else throw err;
    }
  }

  private tapNode(id: string): void {
    const run = this.run;
    if (!run) return;
    const can = R.reachable(run).some((n) => n.id === id);
    if (!can || run.phase !== "map") {
      this.selectedNode = id;
      return;
    }
    if (this.selectedNode !== id) {
      this.selectedNode = id;
      return;
    }
    this.selectedNode = null;
    R.enterNode(run, this.content, this.runData, id);
    this.commit();
  }

  private drawMap(run: R.RunState): void {
    const g = this.g;
    const A = this.L.arena;
    this.enemyRects.clear();
    g.drawImage(arenaBackground(A.w, A.h, false), A.x, A.y, Math.ceil(A.w / 3) * 3, Math.ceil(A.h / 3) * 3);
    g.fillStyle = "rgba(16, 12, 10, .55)";
    g.fillRect(A.x, A.y, A.w, A.h);
    const zw = Math.min(A.w, 640);
    const zx = Math.round((A.w - zw) / 2);
    const top = A.y + 40;
    const bottom = A.y + A.h - 40;
    const maxRow = Math.max(...run.map.map((n) => n.row));
    const step = (bottom - top) / Math.max(1, maxRow);
    const r = Math.max(11, Math.min(20, step * 0.38, zw / 18));
    this.nodePos.clear();
    for (const n of run.map) this.nodePos.set(n.id, { x: zx + 24 + n.x * (zw - 48), y: bottom - n.row * step, r });
    const reach = new Set(R.reachable(run).map((n) => n.id));
    const pulse = 0.5 + 0.5 * Math.sin(this.time * 5);
    // chemins
    for (const n of run.map) {
      const a = this.nodePos.get(n.id)!;
      for (const id of n.next) {
        const b = this.nodePos.get(id)!;
        const m = run.map.find((x) => x.id === id)!;
        const walked = n.done && (m.done || run.current === id);
        const open = run.current === n.id && reach.has(id);
        g.strokeStyle = walked ? "#ffd27a" : open ? "rgba(255,210,122,.75)" : "rgba(253,243,222,.25)";
        g.lineWidth = walked ? 4 : open ? 3 : 2;
        g.setLineDash(walked ? [] : [5, 5]);
        g.beginPath();
        g.moveTo(a.x, a.y);
        g.lineTo(b.x, b.y);
        g.stroke();
      }
    }
    g.setLineDash([]);
    // nœuds
    for (const n of run.map) {
      const p = this.nodePos.get(n.id)!;
      const look = NODE_LOOK[n.type];
      const isReach = reach.has(n.id);
      const rr = n.type === "boss" ? p.r * 1.35 : p.r;
      g.globalAlpha = n.done || isReach || n.id === run.current ? 1 : 0.6;
      if (isReach) {
        g.fillStyle = `rgba(255, 210, 122, ${0.25 + pulse * 0.35})`;
        g.beginPath();
        g.arc(p.x, p.y, rr + 5 + pulse * 2, 0, Math.PI * 2);
        g.fill();
      }
      g.fillStyle = COLORS.dark;
      g.beginPath();
      g.arc(p.x, p.y, rr + 2, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = n.done ? "#4a3a30" : look.color;
      g.beginPath();
      g.arc(p.x, p.y, rr, 0, Math.PI * 2);
      g.fill();
      g.font = `${Math.round(rr * 1.05)}px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText(look.icon, p.x, p.y + 1);
      if (n.id === run.current) {
        g.strokeStyle = COLORS.ink;
        g.lineWidth = 3;
        g.beginPath();
        g.arc(p.x, p.y, rr + 4, 0, Math.PI * 2);
        g.stroke();
      }
      if (n.id === this.selectedNode) {
        g.strokeStyle = "#ffffff";
        g.lineWidth = 3;
        g.setLineDash([4, 3]);
        g.beginPath();
        g.arc(p.x, p.y, rr + 7, 0, Math.PI * 2);
        g.stroke();
        g.setLineDash([]);
      }
      g.globalAlpha = 1;
    }
    const zone = this.runData.zones[run.zone];
    outlinedText(g, `${zone?.name ?? ""} · étage ${run.floor + 1}/${zone?.floors.length ?? 1}`, zx + 12, A.y + 14, "#ffd27a", 13, "left");
    // étiquette du nœud choisi
    const sel = this.selectedNode ? run.map.find((x) => x.id === this.selectedNode) : null;
    let label = run.phase === "map" ? "Touche un nœud lumineux pour choisir ta route" : "";
    if (sel) {
      const look = NODE_LOOK[sel.type];
      const who = sel.enemies?.length ? ` : ${sel.enemies.map((id) => this.content.enemies[id]?.name ?? id).join(", ")}` : "";
      label = `${look.name}${who}${reach.has(sel.id) ? " · touche encore pour y aller" : ""}`;
    }
    if (label) {
      g.font = "800 12px Nunito, system-ui, sans-serif";
      const w = Math.min(A.w - 16, g.measureText(label).width + 20);
      g.fillStyle = "rgba(20,12,16,.75)";
      g.fillRect(A.x + (A.w - w) / 2, A.y + A.h - 18, w, 17);
      outlinedText(g, label, A.x + A.w / 2, A.y + A.h - 9, COLORS.ink, 12);
    }
  }

  // -------------------------------------------------------------------------
  // Infobulles
  // -------------------------------------------------------------------------

  private tipHtml(def: ItemDef, mods?: ItemInstance["mods"], charges?: number | null, fusedFrom?: string[]): string {
    const info = describeItem(def, { mods, charges });
    if (fusedFrom?.length) info.lines.push({ kind: "note", text: `Fusion de : ${fusedFrom.map((x) => this.content.items[x]?.name ?? x).join(" + ")}` });
    const col = RARITY_COLOR[def.rarity] ?? RARITY_COLOR.common;
    const tags = info.tags.map((t) => `<span class="bb-tag">${esc(t)}</span>`).join("");
    const lines = info.lines.map((l) => `<li class="bb-l-${l.kind}">${esc(l.text)}</li>`).join("");
    return `<div class="bb-tipbox" style="--rc:${col}"><p class="bb-tip-name">${esc(info.name)} <small>${esc(RARITY_FR[def.rarity] ?? "")}</small></p><div class="bb-tags">${tags}</div><ul>${lines}</ul></div>`;
  }

  private showTipFor(hit: Hit, x: number, y: number): void {
    let def: ItemDef | undefined;
    let mods: ItemInstance["mods"] | undefined;
    let charges: number | null | undefined;
    let fusedFrom: string[] | undefined;
    let id = "";
    if (hit.kind === "bag" || hit.kind === "stash") {
      const e = this.bag.get(hit.uid);
      if (!e) return;
      def = this.content.items[e.item];
      const pi = hit.kind === "bag" ? this.previewItem(e.uid) : undefined;
      mods = pi?.mods;
      charges = e.charges;
      fusedFrom = e.fusedFrom;
      id = hit.uid;
    } else if (hit.kind === "fight") {
      const it = this.fight?.state.combatants[0].items.find((i) => i.uid === hit.uid);
      if (!it) return;
      def = it.def;
      mods = it.mods;
      charges = it.charges;
      id = hit.uid;
    }
    if (!def) return;
    if (this.tipFor !== id || this.tipEl.hidden) {
      this.tipEl.innerHTML = this.tipHtml(def, mods, charges, fusedFrom);
      this.tipFor = id;
    }
    this.tipEl.hidden = false;
    const tw = this.tipEl.offsetWidth;
    const th = this.tipEl.offsetHeight;
    let tx = x + 14;
    let ty = y - th - 14;
    if (tx + tw > this.L.W - 6) tx = x - tw - 14;
    if (tx < 6) tx = Math.max(6, Math.min(this.L.W - tw - 6, x - tw / 2));
    if (ty < 6) ty = Math.min(this.L.H - th - 6, y + 18);
    this.tipEl.style.left = `${Math.round(tx)}px`;
    this.tipEl.style.top = `${Math.round(ty)}px`;
  }

  private hideTip(): void {
    this.tipEl.hidden = true;
    this.tipFor = "";
  }

  // -------------------------------------------------------------------------
  // Entrées : toucher, souris, clavier
  // -------------------------------------------------------------------------

  private local(e: { clientX: number; clientY: number }): { x: number; y: number } {
    const r = this.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  private gridCellAt(x: number, y: number): Vec {
    const { ox, oy } = this.gridOrigin();
    return [Math.floor((x - ox) / this.L.cell), Math.floor((y - oy) / this.L.cell)];
  }

  private hitTest(x: number, y: number): Hit {
    if (this.mode === "prep") {
      for (let i = this.fuseBadges.length - 1; i >= 0; i--) {
        const b = this.fuseBadges[i];
        if (Math.hypot(x - b.x, y - b.y) <= b.r + 6) return { kind: "fuse", index: i };
      }
    }
    if (this.ctx === "run" && this.mode === "prep") {
      for (const [id, p] of this.nodePos) if (Math.hypot(x - p.x, y - p.y) <= p.r + 6) return { kind: "node", id };
    }
    for (const [i, r] of this.enemyRects) if (inRect(r, x, y)) return { kind: "enemy", index: i };
    const [cx, cy] = this.gridCellAt(x, y);
    if (this.mode === "combat" && this.fight) {
      const it = this.fight.state.combatants[0].items.find((i) => !i.removed && i.cells.some((c) => c[0] === cx && c[1] === cy));
      return it ? { kind: "fight", uid: it.uid } : { kind: "none" };
    }
    const occ = this.bag.occupancy(this.drag?.uid);
    const uid = occ.get(key(cx, cy));
    if (uid) return { kind: "bag", uid };
    for (const [u, r] of this.stashRects) {
      if (!inRect(r, x, y)) continue;
      const e = this.bag.get(u)!;
      const c = this.L.stashCell;
      const lx = Math.floor((x - r.x) / c);
      const ly = Math.floor((y - r.y) / c);
      if (this.bag.shape(e).some((s) => s[0] === lx && s[1] === ly)) return { kind: "stash", uid: u };
    }
    return { kind: "none" };
  }

  private bindInput(): void {
    const cv = this.canvas;
    cv.addEventListener("pointerdown", (ev) => this.onDown(ev));
    cv.addEventListener("pointermove", (ev) => this.onMove(ev));
    cv.addEventListener("pointerup", (ev) => this.onUp(ev));
    cv.addEventListener("pointercancel", (ev) => this.onCancel(ev));
    // pas de « clic » synthétique après un toucher : il tomberait sur la fenêtre qui vient de s'ouvrir
    cv.addEventListener("touchend", (ev) => { if (ev.cancelable) ev.preventDefault(); }, { passive: false });
    cv.addEventListener("pointerleave", (ev) => {
      // en tactile, pointerleave suit chaque relâchement : on ne ferme que pour la souris
      if (ev.pointerType === "mouse" && !this.press && !this.drag) {
        this.hover = null;
        this.hideTip();
      }
    });
    cv.addEventListener("contextmenu", (ev) => {
      ev.preventDefault();
      if (this.lastPointer !== "mouse") return;
      const p = this.local(ev);
      if (this.drag) return this.rotateDrag();
      const h = this.hitTest(p.x, p.y);
      if (h.kind === "bag" || h.kind === "stash") this.rotateEntry(h.uid);
      if (h.kind === "fight") this.usePotion(h.uid, "throw");
    });
    this.barEl.addEventListener("click", (ev) => this.onBarClick(ev.target as HTMLElement));
    this.barEl.addEventListener("change", (ev) => {
      const t = ev.target as HTMLSelectElement;
      if (!t.matches("[data-enc]")) return;
      const enc = this.sandbox.encounters.find((e) => e.id === t.value);
      if (enc) {
        this.encounter = enc;
        this.refreshPreview();
        this.save();
      }
    });
    this.pagerEl.addEventListener("click", (ev) => {
      if ((ev.target as HTMLElement).closest("[data-auto]")) {
        const n = autoPlace(this.bag);
        if (n) {
          this.packStash();
          this.bagChanged();
        }
        return;
      }
      const b = (ev.target as HTMLElement).closest<HTMLElement>("[data-p]");
      if (!b) return;
      this.stashPage = (this.stashPage + Number(b.dataset.p) + this.stashPages) % this.stashPages;
      this.packStash();
    });
    this.modalEl.addEventListener("click", (ev) => {
      const t = ev.target as HTMLElement;
      const act = t.closest<HTMLElement>("[data-act]");
      if (act && !(act as HTMLButtonElement).disabled) return this.onAct(act.dataset.act!);
      if (t.closest("[data-continue]")) return this.applyFightResult();
      if (t === this.modalEl && performance.now() - this.modalAt < 400) return;
      if (t === this.modalEl && this.ctx === "run" && this.run && this.run.phase !== "map") return;
      if (t.closest("[data-again]")) this.startFight();
      else if (t.closest("[data-replay]") && this.fight) this.startFight(this.fight.seed);
      else if (t.closest("[data-prep]")) this.toPrep();
      else if (t.closest("[data-close]") || t === this.modalEl) this.closeModal();
    });
    window.addEventListener("keydown", (ev) => this.onKey(ev));
  }

  private onDown(ev: PointerEvent): void {
    this.lastPointer = ev.pointerType;
    const p = this.local(ev);
    if (this.drag && ev.pointerId !== this.drag.pointerId) {
      this.rotateDrag(); // deuxième doigt pendant le glisser : rotation
      return;
    }
    if (this.press) return;
    if (ev.button === 2) return;
    this.canvas.setPointerCapture(ev.pointerId);
    const hit = this.hitTest(p.x, p.y);
    const touch = ev.pointerType !== "mouse";
    if (touch || hit.kind === "none") this.hideTip();
    const press: Press = { pointerId: ev.pointerId, x0: p.x, y0: p.y, hit, long: false, timer: 0, touch };
    press.timer = window.setTimeout(() => this.onLong(press), LONG_MS);
    this.press = press;
  }

  private onLong(pr: Press): void {
    if (this.press !== pr || this.drag) return;
    pr.long = true;
    const h = pr.hit;
    if (h.kind === "fight") {
      const it = this.fight?.state.combatants[0].items.find((i) => i.uid === h.uid);
      if (it?.def.manual) {
        this.usePotion(h.uid, "throw");
        return;
      }
    }
    if (h.kind === "enemy") return this.inspectEnemy(h.index);
    this.showTipFor(h, pr.x0, pr.y0);
  }

  private onMove(ev: PointerEvent): void {
    const p = this.local(ev);
    if (this.drag && ev.pointerId === this.drag.pointerId) {
      this.drag.x = p.x;
      this.drag.y = p.y;
      return;
    }
    const pr = this.press;
    if (pr && ev.pointerId === pr.pointerId) {
      const moved = Math.hypot(p.x - pr.x0, p.y - pr.y0) > 8;
      if (moved && !pr.long && this.mode === "prep" && (pr.hit.kind === "bag" || pr.hit.kind === "stash")) {
        clearTimeout(pr.timer);
        this.startDrag(pr.hit.uid, pr.hit.kind === "stash", ev.pointerId, pr.x0, pr.y0);
        this.press = null;
        this.drag!.x = p.x;
        this.drag!.y = p.y;
        this.hideTip();
      } else if (moved) {
        clearTimeout(pr.timer);
      }
      return;
    }
    if (ev.pointerType === "mouse") {
      const hit = this.hitTest(p.x, p.y);
      const same = this.hover && JSON.stringify(this.hover.hit) === JSON.stringify(hit);
      if (!same) this.hover = { hit, since: this.time, x: p.x, y: p.y };
      else {
        this.hover!.x = p.x;
        this.hover!.y = p.y;
      }
      if (hit.kind === "none" || hit.kind === "enemy") this.hideTip();
      this.canvas.style.cursor = hit.kind === "bag" || hit.kind === "stash" ? "grab" : hit.kind === "enemy" ? "zoom-in" : hit.kind === "fight" ? "pointer" : "default";
    }
  }

  private onUp(ev: PointerEvent): void {
    const p = this.local(ev);
    if (this.drag && ev.pointerId === this.drag.pointerId) {
      this.drop(p.x, p.y);
      return;
    }
    const pr = this.press;
    if (!pr || ev.pointerId !== pr.pointerId) return;
    clearTimeout(pr.timer);
    this.press = null;
    if (pr.long) {
      if (pr.touch) return; // l'infobulle reste jusqu'au prochain toucher
      this.hideTip();
      return;
    }
    if (Math.hypot(p.x - pr.x0, p.y - pr.y0) > 8) return;
    this.tap(pr.hit);
  }

  private onCancel(ev: PointerEvent): void {
    if (this.drag && ev.pointerId === this.drag.pointerId) {
      this.drag = null;
      this.packStash();
    }
    if (this.press && ev.pointerId === this.press.pointerId) {
      clearTimeout(this.press.timer);
      this.press = null;
    }
  }

  private tap(h: Hit): void {
    switch (h.kind) {
      case "bag":
      case "stash":
        this.rotateEntry(h.uid);
        break;
      case "fight":
        this.usePotion(h.uid, "drink");
        break;
      case "enemy":
        this.inspectEnemy(h.index);
        break;
      case "node":
        this.tapNode(h.id);
        break;
      case "fuse":
        this.showFusion(h.index);
        break;
      default:
        if (this.selectedNode) this.selectedNode = null;
        this.hideTip();
    }
  }

  private onKey(ev: KeyboardEvent): void {
    if (!this.stage.isConnected || (ev.target as HTMLElement)?.closest?.("input, select, textarea")) return;
    const k = ev.key.toLowerCase();
    if (k === "escape") {
      this.hideTip();
      this.closeModal();
      return;
    }
    if (this.mode === "prep") {
      if (k === "r" || k === "m") {
        const flip = k === "m";
        if (this.drag) {
          if (flip) this.drag.mirror = !this.drag.mirror;
          else this.rotateDrag();
        } else if (this.hover && (this.hover.hit.kind === "bag" || this.hover.hit.kind === "stash")) {
          if (flip) this.flipEntry(this.hover.hit.uid);
          else this.rotateEntry(this.hover.hit.uid);
        } else return;
        ev.preventDefault();
      } else if (k === "enter" && this.modalEl.hidden && this.ctx === "sandbox") {
        this.startFight();
        ev.preventDefault();
      }
      return;
    }
    const f = this.fight;
    if (!f) return;
    if (k === " ") {
      f.paused = !f.paused;
      this.renderBar();
      ev.preventDefault();
    } else if (k === "1" || k === "2" || k === "3") {
      f.speed = [1, 2, 4][Number(k) - 1];
      this.renderBar();
    }
  }

  // -------------------------------------------------------------------------
  // Glisser-déposer, rotation
  // -------------------------------------------------------------------------

  private startDrag(uid: string, fromStash: boolean, pointerId: number, x: number, y: number): void {
    const e = this.bag.get(uid)!;
    let gx: number;
    let gy: number;
    if (fromStash) {
      const r = this.stashRects.get(uid)!;
      gx = (x - r.x) / this.L.stashCell;
      gy = (y - r.y) / this.L.stashCell;
    } else {
      const { ox, oy } = this.gridOrigin();
      gx = (x - ox) / this.L.cell - e.pos![0];
      gy = (y - oy) / this.L.cell - e.pos![1];
    }
    this.drag = { uid, pointerId, gx, gy, rot: e.rot, mirror: e.mirror, fromStash, x, y };
    if (this.bag.isExtension(e) && this.margin === 0) this.resize();
    else this.packStash();
  }

  private rotateDrag(): void {
    const d = this.drag;
    if (!d) return;
    d.rot = (d.rot + 1) % 4;
    const e = this.bag.get(d.uid)!;
    const shape = this.bag.shape(e, d.rot, d.mirror);
    d.gx = (Math.max(...shape.map((s) => s[0])) + 1) / 2;
    d.gy = (Math.max(...shape.map((s) => s[1])) + 1) / 2;
  }

  private dragAnchor(): Vec | null {
    const d = this.drag;
    if (!d) return null;
    const { ox, oy } = this.gridOrigin();
    return [Math.round((d.x - ox) / this.L.cell - d.gx), Math.round((d.y - oy) / this.L.cell - d.gy)];
  }

  private drop(x: number, y: number): void {
    const d = this.drag!;
    const anchor = this.dragAnchor();
    this.drag = null;
    const inStash = inRect(this.L.stash, x, y);
    const e = this.bag.get(d.uid)!;
    if (inStash) {
      this.bag.stash(d.uid);
      e.rot = d.rot;
      e.mirror = d.mirror;
      // l'objet rangé passe en tête de réserve
      this.bag.entries = [e, ...this.bag.entries.filter((x) => x !== e)];
      this.stashPage = 0;
    } else if (anchor && this.bag.check(d.uid, anchor, d.rot, d.mirror).ok) {
      const ext = this.bag.isExtension(e);
      this.bag.move(d.uid, anchor, d.rot, d.mirror);
      if (ext) this.fx.showBanner("Le sac s'agrandit !", "#ffd27a");
    } else {
      this.fx.shake.set(d.uid, 0.3);
    }
    this.bagChanged();
    this.resize();
  }

  private rotateEntry(uid: string): void {
    if (!this.bag.rotate(uid)) this.fx.shake.set(uid, 0.3);
    else {
      this.packStash();
      this.bagChanged();
      if (!this.tipEl.hidden) this.hideTip();
    }
  }

  private flipEntry(uid: string): void {
    if (!this.bag.flip(uid)) this.fx.shake.set(uid, 0.3);
    else {
      this.packStash();
      this.bagChanged();
    }
  }

  // -------------------------------------------------------------------------
  // Plein écran (même logique que les autres jeux du site)
  // -------------------------------------------------------------------------

  private bindFullscreen(): void {
    const stage = this.stage;
    const isFull = () => !!document.fullscreenElement || stage.classList.contains("is-max");
    const sync = () => {
      stage.classList.toggle("is-full", isFull());
      document.documentElement.classList.toggle("es-max", stage.classList.contains("is-max"));
      setTimeout(() => this.resize(), 50);
    };
    const exit = () => {
      stage.classList.remove("is-max");
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      sync();
    };
    document.querySelector("[data-game-fullscreen]")?.addEventListener("click", () => {
      if (isFull()) return exit();
      const fallback = () => {
        stage.classList.add("is-max");
        sync();
      };
      if (stage.requestFullscreen) stage.requestFullscreen().then(sync).catch(fallback);
      else fallback();
    });
    stage.querySelector("[data-fs-exit]")?.addEventListener("click", exit);
    document.addEventListener("fullscreenchange", sync);
  }

  // -------------------------------------------------------------------------
  // Rendu
  // -------------------------------------------------------------------------

  private frame(t: number): void {
    const dt = this.last ? Math.min(0.25, (t - this.last) / 1000) : 0;
    this.last = t;
    this.time += dt;
    if (this.mode === "combat") this.updateFight(dt);
    this.fx.update(dt);
    if (this.hover && this.hover.hit.kind !== "none" && this.hover.hit.kind !== "enemy" && !this.drag && !this.press && this.time - this.hover.since > 0.25) {
      this.showTipFor(this.hover.hit, this.hover.x, this.hover.y);
    }
    this.draw();
    requestAnimationFrame((n) => this.frame(n));
  }

  private fighterLayout(st: CombatState, i: number): { cx: number; ground: number; s: number; slot: number } {
    // zone de combat centrée (l'arène peut être bien plus large sur PC)
    const full = this.L.arena;
    const zw = Math.min(full.w, Math.max(this.L.col.w, 820));
    const A = { x: Math.round((full.w - zw) / 2), y: full.y, w: zw, h: full.h };
    const n = st.combatants.length - 1;
    const ground = Math.round(A.y + A.h * 0.5);
    const base = Math.max(2, Math.min(6, Math.floor((A.h * 0.3) / 16)));
    if (i === 0) return { cx: A.x + A.w * 0.19, ground, s: base, slot: A.w * 0.3 };
    const xs = n === 1 ? [0.74] : n === 2 ? [0.6, 0.84] : [0.5, 0.69, 0.88];
    const slot = A.w * (n === 1 ? 0.36 : n === 2 ? 0.23 : 0.18);
    let s = Math.max(2, Math.min(base, Math.floor((slot * 0.85) / 16)));
    if (st.combatants[i].rank === "boss" && n === 1) s = Math.min(base + 1, Math.floor((A.h * 0.36) / 16));
    return { cx: A.x + A.w * xs[i - 1], ground, s, slot };
  }

  private draw(): void {
    const g = this.g;
    const L = this.L;
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    g.imageSmoothingEnabled = false;
    g.fillStyle = "#1c1410";
    g.fillRect(0, 0, L.W, L.H);
    const st = this.fight?.state ?? this.preview;
    this.drawArena(st);
    this.drawBagArea();
    if (this.mode === "prep") this.drawStash();
    this.drawDrag();
    this.drawFx();
  }

  private drawArena(st: CombatState): void {
    if (this.ctx === "run" && this.mode === "prep" && this.run) return this.drawMap(this.run);
    this.nodePos.clear();
    const g = this.g;
    const A = this.L.arena;
    const danger = this.mode === "combat" && st.timeMs > st.rules.suddenDeath.startMs;
    g.drawImage(arenaBackground(A.w, A.h, danger), A.x, A.y, Math.ceil(A.w / 3) * 3, Math.ceil(A.h / 3) * 3);
    if (this.fx.redPulse > 0) {
      g.fillStyle = `rgba(255, 60, 40, ${this.fx.redPulse})`;
      g.fillRect(A.x, A.y, A.w, A.h);
    }
    this.enemyRects.clear();
    this.itemPos.clear();
    const live = this.mode === "combat";
    st.combatants.forEach((c, i) => {
      const P = this.fighterLayout(st, i);
      const enemy = c.side === "enemy";
      const frame = Math.floor(this.time * 2 + i * 0.7) % 2;
      const lunge = this.fx.lunge.get(i) ?? 0;
      const dx = lunge > 0 ? Math.sin((lunge / 0.16) * Math.PI) * 10 * (enemy ? -1 : 1) : 0;
      const sprite = enemy ? c.id : "player";
      drawFighter(this.g, sprite, P.cx, P.ground, P.s, enemy, {
        alpha: c.alive ? 1 : 0.25,
        flash: this.fx.hit.get(i),
        bob: c.alive ? frame : 0,
        dx,
      });
      const barW = Math.round(Math.min(Math.max(16 * P.s, 54), P.slot * 0.92));
      drawHpBar(g, P.cx, P.ground + 10, barW, c.hp, c.maxHp, c.shield);
      drawStatuses(g, P.cx, P.ground + 26, c.statuses);
      if (enemy) {
        let label = c.rank === "boss" ? `★ ${c.name}` : c.rank === "elite" ? `☆ ${c.name}` : c.name;
        // nom raccourci pour tenir dans sa colonne (3 ennemis sur un téléphone)
        g.font = "900 11px Nunito, system-ui, sans-serif";
        while (label.length > 4 && g.measureText(label).width > P.slot - 6) label = `${label.slice(0, -2).trimEnd()}…`;
        outlinedText(g, label, P.cx, P.ground - 16 * P.s - 10, c.rank === "mob" ? COLORS.ink : "#ffd27a", 11);
        const bottom = this.drawMiniBag(c, P.cx, P.ground + 40, P.slot, live);
        this.enemyRects.set(i, { x: P.cx - P.slot / 2, y: P.ground - 16 * P.s - 18, w: P.slot, h: bottom - (P.ground - 16 * P.s - 18) });
      }
    });
    if (this.mode === "prep") {
      outlinedText(g, "Touche un ennemi pour voir son sac", A.x + A.w / 2, A.y + A.h - 10, "rgba(253,243,222,.75)", 11);
    }
  }

  /** Bandeau d'icônes du sac ennemi, avec barres de cooldown. Renvoie le bas du bandeau. */
  private drawMiniBag(c: Combatant, cx: number, y: number, slot: number, live: boolean): number {
    const g = this.g;
    const items = c.items.filter((i) => !i.removed);
    const A = this.L.arena;
    const size = crispSize(Math.max(14, Math.min(24, A.h * 0.085)));
    const gap = 3;
    const perRow = Math.max(1, Math.floor((slot - 4) / (size + gap)));
    const rows = Math.ceil(items.length / perRow);
    items.forEach((it, k) => {
      const row = Math.floor(k / perRow);
      const inRow = Math.min(perRow, items.length - row * perRow);
      const x = Math.round(cx - (inRow * (size + gap) - gap) / 2 + (k % perRow) * (size + gap));
      const yy = y + row * (size + 8);
      g.fillStyle = COLORS.dark;
      g.fillRect(x - 1, yy - 1, size + 2, size + 6);
      g.fillStyle = "#3b2a20";
      g.fillRect(x, yy, size, size);
      g.drawImage(spriteCanvas(it.def.id), x, yy, size, size);
      const frozen = it.timed.some((t) => t.kind === "freeze");
      if (frozen) {
        g.fillStyle = "rgba(140,210,255,.5)";
        g.fillRect(x, yy, size, size);
      }
      const fl = this.fx.itemFlash.get(it.uid);
      if (fl) {
        g.fillStyle = `rgba(255,250,220,${Math.min(0.8, fl * 3)})`;
        g.fillRect(x, yy, size, size);
      }
      if (it.cooldownMs !== null) {
        const p = live ? this.progressOf(it) : 0;
        g.fillStyle = "#1a1220";
        g.fillRect(x, yy + size + 1, size, 3);
        g.fillStyle = frozen ? COLORS.freeze : "#ffd27a";
        g.fillRect(x, yy + size + 1, Math.round(size * p), 3);
      }
      this.itemPos.set(it.uid, { x: x + size / 2, y: yy + size / 2 });
    });
    return y + rows * (size + 8);
  }

  /** Avancement interpolé d'une barre de cooldown (0..1). */
  private progressOf(it: ItemInstance): number {
    if (it.cooldownMs === null) return 0;
    const f = this.fight;
    let p = it.progressMs;
    if (f && !f.paused && !f.state.outcome && !it.timed.some((t) => t.kind === "freeze")) {
      p += (f.acc / TICK_S) * f.state.rules.tickMs * itemSpeed(f.state, it);
    }
    return Math.min(1, p / it.cooldownMs);
  }

  private drawBagArea(): void {
    const g = this.g;
    const L = this.L;
    const { ox, oy } = this.gridOrigin();
    drawSlots(g, this.bag.cells, ox, oy, L.cell);

    if (this.mode === "combat" && this.fight) {
      for (const it of this.fight.state.combatants[0].items) {
        if (it.removed) continue;
        const cells = it.cells.map(([x, y]) => [x, y] as Vec);
        drawItem(g, { id: it.def.id, def: it.def, cells, rot: it.rot, mirror: it.mirror }, ox, oy, L.cell, {
          progress: it.cooldownMs !== null ? this.progressOf(it) : null,
          flash: this.fx.itemFlash.get(it.uid),
          frozen: it.timed.some((t) => t.kind === "freeze"),
          slowed: it.timed.some((t) => t.kind === "slow"),
          hasted: it.timed.some((t) => t.kind === "haste"),
          charges: it.charges,
          shake: this.fx.shake.get(it.uid),
          dim: it.charges === 0 && it.def.effects.length > 0,
        });
        const xs = it.cells.map((c) => c[0]);
        const ys = it.cells.map((c) => c[1]);
        this.itemPos.set(it.uid, {
          x: ox + ((Math.min(...xs) + Math.max(...xs) + 1) / 2) * L.cell,
          y: oy + ((Math.min(...ys) + Math.max(...ys) + 1) / 2) * L.cell,
        });
      }
      return;
    }

    // extension en main : cases du bord où elle peut aller
    const d = this.drag;
    if (d && this.bag.isExtension(this.bag.get(d.uid)!)) {
      g.strokeStyle = "rgba(255, 210, 122, .7)";
      g.lineWidth = 2;
      g.setLineDash([4, 4]);
      for (const [x, y] of this.bag.extensionSlots()) g.strokeRect(ox + x * L.cell + 4, oy + y * L.cell + 4, L.cell - 8, L.cell - 8);
      g.setLineDash([]);
    }
    // aperçu de dépôt
    const anchor = this.dragAnchor();
    if (d && anchor && inRect(L.grid, d.x, d.y, L.cell * 0.5)) {
      const chk = this.bag.check(d.uid, anchor, d.rot, d.mirror);
      g.fillStyle = chk.ok ? COLORS.ok : COLORS.bad;
      for (const [x, y] of chk.cells) g.fillRect(ox + x * L.cell + 2, oy + y * L.cell + 2, L.cell - 4, L.cell - 4);
    }
    for (const e of this.bag.placed()) {
      if (d?.uid === e.uid) continue;
      const def = this.content.items[e.item];
      const pi = this.previewItem(e.uid);
      const buffed = !!pi && (pi.mods.haste > 0 || Object.values(pi.mods.buffs).some((v) => v > 0));
      drawItem(g, { id: e.item, def, cells: this.bag.cellsAt(e, e.pos!), rot: e.rot, mirror: e.mirror }, ox, oy, L.cell, {
        charges: def.charges !== null ? e.charges ?? def.charges : null,
        buffed,
        markers: true,
        shake: this.fx.shake.get(e.uid),
      });
    }
    this.drawFuseBadges(ox, oy);
  }

  /** Pastilles ⚗ entre les objets qui peuvent fusionner. */
  private drawFuseBadges(ox: number, oy: number): void {
    const g = this.g;
    const c = this.L.cell;
    this.fuseBadges = [];
    if (this.drag) return;
    const r = Math.max(10, Math.min(16, c * 0.22));
    const pulse = 0.5 + 0.5 * Math.sin(this.time * 4);
    for (const opt of this.fusions) {
      const cells = opt.uids.flatMap((u) => {
        const e = this.bag.get(u);
        return e?.pos ? this.bag.cellsAt(e, e.pos) : [];
      });
      if (!cells.length) continue;
      // point de contact : milieu des centres des ingrédients
      const centers = opt.uids.map((u) => {
        const e = this.bag.get(u)!;
        const cs = this.bag.cellsAt(e, e.pos!);
        return [cs.reduce((a, q) => a + q[0], 0) / cs.length, cs.reduce((a, q) => a + q[1], 0) / cs.length];
      });
      let x = ox + (centers.reduce((a, q) => a + q[0], 0) / centers.length + 0.5) * c;
      let y = oy + (centers.reduce((a, q) => a + q[1], 0) / centers.length + 0.5) * c;
      for (let k = 0; k < 6 && this.fuseBadges.some((b) => Math.hypot(b.x - x, b.y - y) < r * 2); k++) {
        x += r * 1.6;
        y += r * 0.4;
      }
      this.fuseBadges.push({ x, y, r });
      g.fillStyle = `rgba(180, 122, 232, ${0.35 + pulse * 0.3})`;
      g.beginPath();
      g.arc(x, y, r + 4, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = COLORS.dark;
      g.beginPath();
      g.arc(x, y, r + 1.5, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = opt.recipe.kind === "upgrade" ? "#f2b84a" : "#b47ae8";
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
      g.font = `${Math.round(r * 1.2)}px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText(opt.recipe.kind === "upgrade" ? "⬆️" : "⚗️", x, y + 1);
    }
  }

  private showFusion(index: number): void {
    const opt = this.fusions[index];
    if (!opt) return;
    const res = this.content.items[opt.recipe.result];
    const ings = opt.uids
      .map((u) => this.bag.get(u)?.item)
      .filter((x): x is string => !!x)
      .map((id) => `<span class="bb-ing"><img src="${iconUrl(id)}" alt="" width="40" height="40"><small>${esc(this.content.items[id].name)}</small></span>`)
      .join('<span class="bb-plus">+</span>');
    this.showModal(`
      <h2 class="bb-title">${opt.recipe.kind === "upgrade" ? "Amélioration" : "Fusion"}</h2>
      <div class="bb-recipe">${ings}<span class="bb-plus">→</span></div>
      <div class="bb-cards">${this.itemCard(res.id, "")}</div>
      <p class="bb-seed">Les ingrédients disparaissent. Le résultat prend leur place s'il y rentre, sinon il va dans ta réserve.${this.ctx === "run" ? " Une boutique peut le défusionner contre de l'or." : ""}</p>
      <div class="bb-actions">
        <button type="button" class="btn btn-small btn-ghost" data-close>Annuler</button>
        <button type="button" class="btn btn-small" data-act="fuse:${index}">⚗ Fusionner</button>
      </div>`);
  }

  private drawStash(): void {
    const g = this.g;
    const r = this.L.stash;
    if (!r) return;
    g.fillStyle = "#241a14";
    g.fillRect(r.x, r.y, r.w, r.h);
    g.strokeStyle = "#4a382c";
    g.lineWidth = 2;
    g.setLineDash([6, 4]);
    g.strokeRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2);
    g.setLineDash([]);
    outlinedText(g, "Réserve", r.x + 10, r.y + 13, "#d9c4a0", 12, "left");
    const c = this.L.stashCell;
    for (const e of this.bag.stashed()) {
      const rr = this.stashRects.get(e.uid);
      if (!rr) continue;
      const def = this.content.items[e.item];
      drawItem(g, { id: e.item, def, cells: this.bag.shape(e), rot: e.rot, mirror: e.mirror }, rr.x, rr.y, c, {
        charges: def.charges !== null ? e.charges ?? def.charges : null,
        shake: this.fx.shake.get(e.uid),
      });
    }
    if (this.bag.stashed().length === 0) outlinedText(g, "Dépose ici les objets à ranger", r.x + r.w / 2, r.y + r.h / 2, "rgba(217,196,160,.6)", 12);
  }

  private drawDrag(): void {
    const d = this.drag;
    if (!d) return;
    const e = this.bag.get(d.uid)!;
    const def = this.content.items[e.item];
    const c = this.L.cell;
    const shape = this.bag.shape(e, d.rot, d.mirror);
    drawItem(this.g, { id: e.item, def, cells: shape, rot: d.rot, mirror: d.mirror }, d.x - d.gx * c, d.y - d.gy * c, c, {
      alpha: 0.9,
      markers: true,
      charges: def.charges !== null ? e.charges ?? def.charges : null,
    });
  }

  private drawFx(): void {
    const g = this.g;
    const fx = this.fx;
    for (const p of fx.particles) {
      g.globalAlpha = 1 - p.t / p.life;
      g.fillStyle = p.color;
      g.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
    }
    g.globalAlpha = 1;
    for (const p of fx.projectiles) {
      const k = p.t / p.life;
      const x = p.x0 + (p.x1 - p.x0) * k;
      const y = p.y0 + (p.y1 - p.y0) * k - Math.sin(k * Math.PI) * 60;
      g.save();
      g.translate(x, y);
      g.rotate(k * 8);
      g.drawImage(spriteCanvas(p.sprite), -12, -12, 24, 24);
      g.restore();
    }
    for (const f of fx.floats) {
      const k = f.t / f.life;
      g.globalAlpha = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
      outlinedText(g, f.text, f.x, f.y - k * 34, f.color, f.big ? 20 : 15);
    }
    g.globalAlpha = 1;
    if (fx.banner) {
      const A = this.L.arena;
      const k = fx.banner.t;
      const a = k < 0.2 ? k / 0.2 : k > 1.3 ? Math.max(0, 1 - (k - 1.3) / 0.3) : 1;
      g.globalAlpha = a;
      g.fillStyle = "rgba(20,12,16,.6)";
      g.fillRect(A.x, A.y + A.h * 0.12, A.w, 34);
      outlinedText(g, fx.banner.text, A.x + A.w / 2, A.y + A.h * 0.12 + 17, fx.banner.color, 20);
      g.globalAlpha = 1;
    }
  }
}
