/* Écrans secondaires : accueil, album des souvenirs, statistiques, paramètres. */
import { homeSceneSVG } from "../art/illustrations";
import { DIFFICULTIES, type Difficulty } from "../ai/persona";
import { CADENCES, type Cadence } from "../store/save";
import { cardVisual, showCard } from "./card";
import { h } from "./dom";
import { openModal, confirmModal } from "./modal";
import { ICON } from "./game";
import type { Ctx } from "./context";

// ====================================================================== accueil
export class HomeScreen {
  readonly el: HTMLElement;
  private actions: HTMLElement;
  private scene: HTMLElement;
  constructor(private readonly ctx: Ctx) {
    const c = ctx.content;
    this.scene = h("div", { class: "home-art" });
    this.actions = h("div", { class: "home-actions" });
    const petals = h("div", { class: "petals", "aria-hidden": "true" });
    for (let i = 0; i < 14; i++) {
      const p = h("i", { style: `left:${(i * 7.3 + 3) % 100}%;animation-delay:${(i * 0.83) % 9}s;animation-duration:${9 + (i % 5) * 1.7}s;--drift:${(i % 2 ? 1 : -1) * (20 + (i % 4) * 12)}px` });
      petals.append(p);
    }
    const sky = h("div", { class: "sky", "aria-hidden": "true" });
    for (let i = 0; i < 40; i++) sky.append(h("i", { style: `left:${(i * 37) % 100}%;top:${(i * 53) % 60}%;animation-delay:${(i % 7) * 0.5}s` }));
    this.el = h("section", { class: "screen home-screen" },
      sky, petals,
      h("div", { class: "home-inner" },
        h("header", { class: "home-title" }, h("h1", {}, c.title), h("p", {}, c.subtitle)),
        this.scene,
        this.actions,
        h("p", { class: "home-foot" }, "Un adversaire virtuel · aucune partie en ligne"),
      ),
    );
  }

  enter(): void {
    const ctx = this.ctx, c = ctx.content, s = ctx.store;
    this.scene.innerHTML = homeSceneSVG(s.prefs.outfit);
    this.actions.textContent = "";
    const add = (label: string, cls: string, f: () => void) => {
      const b = h("button", { class: "btn " + cls, type: "button", html: label });
      b.onclick = () => { ctx.tap(); f(); };
      this.actions.append(b);
      return b;
    };
    const cur = s.data.current;
    if (cur && cur.moves.length) {
      add("Reprendre la partie", "primary big", () => ctx.go("game", { resume: true }));
      add("Nouvelle partie", "soft", () => { s.data.current = null; s.save(); ctx.go("game", { rematch: false }); });
    } else {
      add("JOUER", "primary big", () => ctx.go("game"));
    }
    const sub = h("button", { class: "play-sub", type: "button" },
      DIFFICULTIES[s.prefs.difficulty].label + " · " + CADENCES[s.prefs.cadence].label + " · changer");
    sub.onclick = () => { ctx.tap(); void ctx.openSettings().then(() => this.enter()); };
    this.actions.append(sub);
    const grid = h("div", { class: "home-grid" });
    this.actions.append(grid);
    const small = (label: string, icon: string, f: () => void) => {
      const b = h("button", { class: "btn tile", type: "button", html: icon + `<span>${label}</span>` });
      b.onclick = () => { ctx.tap(); f(); };
      grid.append(b);
    };
    small("MES SOUVENIRS", ICON.album, () => ctx.go("album"));
    small("STATISTIQUES", `<svg viewBox="0 0 24 24"><path d="M5 20V10M12 20V4M19 20v-7"/></svg>`, () => ctx.go("stats"));
    small("PARAMÈTRES", ICON.gear, () => void ctx.openSettings().then(() => this.enter()));
    if (s.finaleUnlocked) {
      const b = add(c.finale.menuLabel, "secret" + (s.data.finaleSeen ? "" : " glow"), () => void ctx.openFinale());
      b.classList.add("secret-btn");
    }
  }
  exit(): void {}
}

// ====================================================================== album
export class AlbumScreen {
  readonly el: HTMLElement;
  private grid: HTMLElement;
  private count: HTMLElement;
  constructor(private readonly ctx: Ctx) {
    this.grid = h("div", { class: "album-grid" });
    this.count = h("p", { class: "album-count" });
    const back = h("button", { class: "icon-btn", type: "button", "aria-label": "Retour", html: ICON.back });
    back.onclick = () => { ctx.tap(); ctx.go("home"); };
    this.el = h("section", { class: "screen page album-screen" },
      h("header", { class: "page-head" }, back, h("h2", {}, "Mes souvenirs"), h("span", { class: "spacer" })),
      this.count, this.grid);
  }
  enter(): void {
    const { content: c, store: s } = this.ctx;
    const cards = c.cards.filter((x) => !x.secret);
    const n = cards.filter((x) => s.isUnlocked(x.id)).length;
    this.count.textContent = `${n} / ${cards.length} souvenirs découverts · capture des pièces d'${c.rival.name} pour en débloquer d'autres`;
    this.grid.textContent = "";
    const sorted = [...cards].sort((a, b) => (s.data.unlocked[a.id]?.order ?? 999) - (s.data.unlocked[b.id]?.order ?? 999));
    for (const card of sorted) {
      const u = s.data.unlocked[card.id];
      const tile = h("button", { class: "album-tile" + (u ? "" : " locked"), type: "button", "aria-label": u ? card.title : "Souvenir verrouillé" });
      if (u) {
        tile.append(cardVisual(this.ctx, card), h("span", { class: "at-title" }, card.title), h("span", { class: "at-order" }, "n°" + u.order + " · " + new Date(u.at).toLocaleDateString("fr-FR")));
        tile.onclick = () => { this.ctx.tap(); void showCard(this.ctx, card, { header: "Souvenir n°" + u.order, button: "Fermer", isNew: false }); };
      } else {
        tile.innerHTML = `<span class="lock"><svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg></span><span class="at-title">${card.trigger === "queen" ? "Capture sa dame…" : card.trigger === "rook" ? "Capture une tour…" : card.tier === 3 ? "Un message rare…" : "À découvrir"}</span>`;
        tile.onclick = () => this.ctx.audio.play("illegal");
      }
      this.grid.append(tile);
    }
    // la scène finale
    const fin = h("button", { class: "album-tile finale-tile" + (s.finaleUnlocked ? "" : " locked"), type: "button" });
    fin.innerHTML = s.finaleUnlocked
      ? `<span class="fin-heart">♡</span><span class="at-title">${c.finale.albumTitle}</span><span class="at-order">revoir la scène</span>`
      : `<span class="lock"><svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg></span><span class="at-title">${c.finale.albumTitle}</span><span class="at-order">une victoire ou trois parties</span>`;
    fin.onclick = () => { this.ctx.tap(); if (s.finaleUnlocked) void this.ctx.openFinale(); };
    this.grid.append(fin);
  }
  exit(): void {}
}

// ====================================================================== statistiques
export class StatsScreen {
  readonly el: HTMLElement;
  private body: HTMLElement;
  constructor(private readonly ctx: Ctx) {
    this.body = h("div", { class: "stats" });
    const back = h("button", { class: "icon-btn", type: "button", "aria-label": "Retour", html: ICON.back });
    back.onclick = () => { ctx.tap(); ctx.go("home"); };
    this.el = h("section", { class: "screen page stats-screen" },
      h("header", { class: "page-head" }, back, h("h2", {}, "Statistiques"), h("span", { class: "spacer" })), this.body);
  }
  enter(): void {
    const s = this.ctx.store, st = s.stats, c = this.ctx.content;
    const cards = c.cards.filter((x) => !x.secret);
    const unlocked = cards.filter((x) => s.isUnlocked(x.id)).length;
    const favD = s.favourite(st.byDifficulty) as Difficulty | null;
    const favC = s.favourite(st.byCadence) as Cadence | null;
    const done = s.completedGames;
    const rate = done ? Math.round((st.wins / done) * 100) + " %" : "—";
    const items: [string, string][] = [
      ["Parties jouées", String(st.games)],
      ["Victoires", String(st.wins)],
      ["Défaites", String(st.losses)],
      ["Nulles", String(st.draws)],
      ["Taux de victoire", rate],
      ["Pièces capturées", String(st.captures)],
      ["Dames capturées", String(st.queensCaptured)],
      ["Messages débloqués", `${unlocked} / ${cards.length}`],
      ["Revanches demandées", String(st.rematches)],
      ["Difficulté préférée", favD ? DIFFICULTIES[favD].label : "—"],
      ["Cadence préférée", favC ? CADENCES[favC].label : "—"],
      ["Victoire la plus rapide", st.bestWinMoves ? st.bestWinMoves + (st.bestWinMoves > 1 ? " coups" : " coup") : "—"],
    ];
    this.body.innerHTML = items.map(([k, v], i) => `<div class="stat${i < 4 ? " big" : ""}"><span class="sv">${v}</span><span class="sk">${k}</span></div>`).join("");
    if (!st.games) this.body.insertAdjacentHTML("beforeend", `<p class="muted center">Joue ta première partie pour remplir tes statistiques ♡</p>`);
  }
  exit(): void {}
}

// ====================================================================== paramètres
export function openSettings(ctx: Ctx, inGame: boolean, onChange: () => void, about: string): Promise<void> {
  const s = ctx.store;
  const p = s.prefs;
  const box = h("div", { class: "settings" }, h("h3", {}, "Paramètres"));
  const section = (title: string) => { const sec = h("div", { class: "set-sec" }, h("h4", {}, title)); box.append(sec); return sec; };

  const seg = <T extends string>(parent: HTMLElement, label: string, opts: [T, string, string?][], cur: T, set: (v: T) => void, note?: string) => {
    const row = h("div", { class: "set-row col" }, h("span", { class: "set-label" }, label));
    const g = h("div", { class: "seg", role: "radiogroup" });
    for (const [v, l, d] of opts) {
      const b = h("button", { class: "seg-btn" + (v === cur ? " on" : ""), type: "button", role: "radio", "aria-checked": String(v === cur) }, l);
      if (d) b.title = d;
      b.onclick = () => { ctx.tap(); g.querySelectorAll(".seg-btn").forEach((x) => { x.classList.remove("on"); x.setAttribute("aria-checked", "false"); }); b.classList.add("on"); b.setAttribute("aria-checked", "true"); set(v); if (desc) desc.textContent = d ?? ""; onChange(); };
      g.append(b);
    }
    row.append(g);
    const desc = opts.some((o) => o[2]) ? h("span", { class: "set-note" }, opts.find((o) => o[0] === cur)?.[2] ?? "") : null;
    if (desc) row.append(desc);
    if (note) row.append(h("span", { class: "set-note" }, note));
    parent.append(row);
  };
  const toggle = (parent: HTMLElement, label: string, on: boolean, set: (v: boolean) => void, note?: string) => {
    const id = "t" + Math.random().toString(36).slice(2);
    const input = h("input", { type: "checkbox", id, class: "switch" }) as HTMLInputElement;
    input.checked = on;
    input.onchange = () => { ctx.tap(); set(input.checked); onChange(); };
    const row = h("label", { class: "set-row", for: id }, h("span", { class: "set-label" }, label, note ? h("small", {}, note) : null), input);
    parent.append(row);
  };
  const slider = (parent: HTMLElement, label: string, v: number, set: (v: number) => void) => {
    const input = h("input", { type: "range", min: "0", max: "100", value: String(Math.round(v * 100)), class: "range", "aria-label": label }) as HTMLInputElement;
    const val = h("span", { class: "range-val" }, Math.round(v * 100) + " %");
    input.oninput = () => { set(Number(input.value) / 100); val.textContent = input.value + " %"; };
    input.onchange = () => { s.save(); onChange(); };
    parent.append(h("div", { class: "set-row" }, h("span", { class: "set-label" }, label), h("div", { class: "range-wrap" }, input, val)));
  };

  const game = section("Partie");
  const diffs = (Object.keys(DIFFICULTIES) as Difficulty[]).map((d) => [d, DIFFICULTIES[d].label, DIFFICULTIES[d].description] as [Difficulty, string, string]);
  seg(game, "Difficulté d'" + ctx.content.rival.name, diffs, p.difficulty, (v) => s.setPref("difficulty", v), inGame ? "S'applique à la prochaine partie." : undefined);
  seg(game, "Cadence", (Object.keys(CADENCES) as Cadence[]).map((c) => [c, CADENCES[c].label] as [Cadence, string]), p.cadence, (v) => s.setPref("cadence", v), "Sans incrément. " + (inGame ? "S'applique à la prochaine partie." : ""));

  const snd = section("Son");
  toggle(snd, "Musique", p.music, (v) => { s.setPref("music", v); ctx.audio.setMusicEnabled(v); }, ctx.audio.hasMusic ? undefined : "fichier musical absent");
  slider(snd, "Volume musique", p.musicVolume, (v) => { s.data.prefs.musicVolume = v; ctx.audio.setMusicVolume(v); });
  toggle(snd, "Effets sonores", p.sfx, (v) => { s.setPref("sfx", v); ctx.audio.sfxOn = v; });
  slider(snd, "Volume effets", p.sfxVolume, (v) => { s.data.prefs.sfxVolume = v; ctx.audio.setSfxVolume(v); ctx.audio.play("select"); });

  const disp = section("Affichage");
  toggle(disp, "Afficher les coups possibles", p.showLegal, (v) => s.setPref("showLegal", v));
  toggle(disp, "Coordonnées des cases", p.showCoords, (v) => s.setPref("showCoords", v));
  toggle(disp, "Effets réduits", p.reducedFx, (v) => s.setPref("reducedFx", v), "moins de particules et d'animations");
  toggle(disp, "Vibrations", p.haptics, (v) => s.setPref("haptics", v), "si l'appareil le permet (pas sur iPhone)");
  seg(disp, "Tenue de " + ctx.content.player.name, [["hoodie", "Sweat à capuche"], ["elegant", "Chemise à rayures"]], p.outfit, (v) => s.setPref("outfit", v));
  if (ctx.fullscreen.supported) {
    const fb = h("button", { class: "btn soft full", type: "button", html: ICON.full + " Plein écran" });
    fb.onclick = () => { ctx.tap(); ctx.fullscreen.toggle(); };
    disp.append(fb);
  } else {
    disp.append(h("p", { class: "set-note" }, "Plein écran : sur iPhone, ajoute le jeu à l'écran d'accueil (Partager → « Sur l'écran d'accueil ») pour l'ouvrir sans barres."));
  }

  const misc = section("Autres");
  const introBtn = h("button", { class: "btn soft", type: "button" }, "Revoir l'introduction");
  introBtn.onclick = () => { ctx.tap(); s.data.introSeen = false; s.save(); introBtn.textContent = "Elle s'affichera à la prochaine partie ♡"; };
  const reset = h("button", { class: "btn danger", type: "button" }, "Effacer mes données");
  reset.onclick = async () => {
    if (await confirmModal("Tout effacer ?", "Statistiques, souvenirs débloqués et réglages de cet appareil seront supprimés.", "Effacer")) {
      s.resetAll(); onChange(); m.close();
    }
  };
  misc.append(introBtn, reset, h("p", { class: "about", html: about }));

  const close = h("button", { class: "btn primary", type: "button" }, "Fermer");
  box.append(close);
  const m = openModal(box, { cls: "settings-modal", dismissable: true });
  close.onclick = () => { ctx.tap(); m.close(); };
  return m.closed;
}
