/* Point d'entrée de l'application RADIA ♛.
   En production, ce module est chiffré : le chargeur (src/loader) le déchiffre
   avec le mot de passe puis appelle start(). En développement, src/dev.ts l'appelle. */
import content from "@content";
import { Store } from "./store/save";
import { AudioManager } from "./audio/audio";
import { AugusteAI, type EngineUrls } from "./ai/auguste";
import { pieceSpriteSVG } from "./art/pieces";
import { GameScreen } from "./ui/game";
import { HomeScreen, AlbumScreen, StatsScreen, openSettings } from "./ui/screens";
import { playFinale } from "./ui/finale";
import { setModalHost } from "./ui/modal";
import { h } from "./ui/dom";
import type { Ctx, ScreenId, Vault } from "./ui/context";
import css from "./styles.css?inline";

export interface StartOptions { engines: EngineUrls; version: string }

interface Screen { el: HTMLElement; enter(o?: object): void; exit(): void }

export function start(root: HTMLElement, vault: Vault, opts: StartOptions): void {
  const style = document.createElement("style");
  style.textContent = css;
  document.head.append(style);
  document.title = content.title;
  root.innerHTML = pieceSpriteSVG();
  const app = h("div", { class: "app" });
  const modals = h("div", { class: "modals" });
  root.append(app, modals);
  setModalHost(modals);

  const store = new Store();
  const audio = new AudioManager();
  const ai = new AugusteAI(opts.engines);
  const p = store.prefs;
  audio.sfxOn = p.sfx;
  audio.setSfxVolume(p.sfxVolume);
  audio.setMusicVolume(p.musicVolume);
  if (content.music) void vault.url(content.music).then((u) => {
    if (u) { audio.setMusicSource(u); audio.setMusicEnabled(store.prefs.music); game?.refreshMusicBtn(); }
    else console.warn("Musique introuvable : place le MP3 dans private/" + content.music);
  });

  const fsEl = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => void };
  const doc = document as Document & { webkitFullscreenElement?: Element; webkitExitFullscreen?: () => void };
  const fullscreen = {
    supported: !!(fsEl.requestFullscreen || fsEl.webkitRequestFullscreen) && !/iPhone|iPod/.test(navigator.userAgent),
    active: () => !!(document.fullscreenElement || doc.webkitFullscreenElement),
    toggle: () => {
      try {
        if (fullscreen.active()) void (document.exitFullscreen?.() ?? doc.webkitExitFullscreen?.());
        else void (fsEl.requestFullscreen?.({ navigationUI: "hide" }) ?? fsEl.webkitRequestFullscreen?.());
      } catch { /* refusé par le navigateur */ }
    },
  };

  let current: Screen | null = null;
  let game: GameScreen | null = null;
  const screens: Partial<Record<ScreenId, Screen>> = {};
  const about = `RADIA ♛ v${opts.version} — fait main, avec amour ♡`;
  // niveau d'Auguste choisi discrètement par l'adresse (…/radia/?niveau=joueur)
  const lv = /[?&]niveau=(doux|joueur|defi)/.exec(location.search)?.[1] as "doux" | "joueur" | "defi" | undefined;
  if (lv) store.setPref("difficulty", lv);

  const ctx: Ctx = {
    content, store, audio, ai, vault, fullscreen,
    tap: () => { audio.unlock(); audio.play("button"); },
    go: (id, o) => {
      const next = screens[id] ?? (screens[id] = make(id));
      if (current && current !== next) {
        current.exit();
        const old = current.el;
        old.classList.add("leaving");
        old.classList.remove("active");
        setTimeout(() => { old.classList.remove("leaving"); if (!old.classList.contains("active")) old.hidden = true; }, 380);
      }
      next.el.hidden = false;
      current = next;
      next.enter(o);
      requestAnimationFrame(() => next.el.classList.add("active"));
      app.dataset.screen = id;
    },
    openSettings: (inGame = false) => openSettings(ctx, inGame, () => {
      const pp = store.prefs;
      audio.sfxOn = pp.sfx;
      game?.applyPrefs();
    }, about),
    openFinale: async () => {
      const r = await playFinale(ctx, modals);
      if (r === "play") ctx.go("game", { rematch: true });
      else if (current === screens.home) screens.home!.enter();
    },
  };

  function make(id: ScreenId): Screen {
    let s: Screen;
    if (id === "game") s = game = new GameScreen(ctx);
    else if (id === "album") s = new AlbumScreen(ctx);
    else if (id === "stats") s = new StatsScreen(ctx);
    else s = new HomeScreen(ctx);
    s.el.hidden = true;
    app.append(s.el);
    return s;
  }

  // première interaction : débloque l'audio (règle des navigateurs)
  const first = () => { audio.unlock(); window.removeEventListener("pointerdown", first, true); };
  window.addEventListener("pointerdown", first, true);
  // empêche le zoom par double-toucher et le défilement élastique sur iOS
  document.addEventListener("dblclick", (e) => e.preventDefault(), { passive: false });
  document.addEventListener("gesturestart", (e) => e.preventDefault());

  ctx.go("home");
  if (/[?&]debug\b/.test(location.search)) {
    (window as unknown as Record<string, unknown>).RADIA_DEBUG = {
      ctx, game: () => { if (!screens.game) ctx.go("game"); return game!.debug(); },
    };
  }
  // Stockfish se charge en tâche de fond dès l'accueil
  setTimeout(() => void ai.warmup(), 400);
}
