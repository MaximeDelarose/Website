/* La surprise finale secrète : le plateau s'assombrit, les pièces s'effacent,
   seule la dame blanche reste… et devient Radia. Auguste apparaît en face. */
import { pieceSVG } from "../art/pieces";
import { radiaSVG, augusteSVG } from "../art/portraits";
import { heartPath } from "../art/illustrations";
import { Particles } from "../fx/particles";
import { h, sleep } from "./dom";
import type { Ctx } from "./context";

const START = ["rnbqkbnr", "pppppppp", "", "", "", "", "PPPPPPPP", "RNBQKBNR"];

export async function playFinale(ctx: Ctx, host: HTMLElement): Promise<"play" | "close"> {
  const c = ctx.content;
  const s = ctx.store;
  const board = h("div", { class: "fin-board" });
  for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) {
    const sq = h("div", { class: "fin-sq " + ((r + f) % 2 ? "dark" : "light") });
    const ch = START[r][f];
    if (ch) {
      const color = ch === ch.toUpperCase() ? "w" : "b";
      const t = ch.toLowerCase() as "p";
      const isQueen = color === "w" && t === ("q" as string);
      const p = h("div", { class: "fin-piece" + (isQueen ? " fin-queen" : ""), html: pieceSVG(color, t), style: `--d:${((r * 8 + f) * 37) % 23 / 10}s` });
      sq.append(p);
    }
    board.append(sq);
  }
  const radia = h("div", { class: "fin-char fin-radia", html: radiaSVG({ crown: true, expr: "smile", outfit: s.prefs.outfit }) });
  const aug = h("div", { class: "fin-char fin-aug", html: augusteSVG({ expr: "tender" }) });
  const heart = h("div", { class: "fin-heart", html: `<svg viewBox="0 0 100 100"><path d="${heartPath(50, 52, 3.6)}"/></svg>` });
  const text = h("p", { class: "fin-text", "aria-live": "polite" });
  const next = h("button", { class: "btn primary fin-next", type: "button" }, "Suivant ♡");
  const close = h("button", { class: "icon-btn fin-close", type: "button", "aria-label": "Fermer", html: `<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>` });
  const stage = h("div", { class: "fin-stage" }, board, radia, aug, heart);
  const fx = h("div", { class: "fin-fx" });
  const el = h("section", { class: "finale" }, fx, stage, h("div", { class: "fin-dialog" }, text, next), close);
  host.append(el);
  const parts = new Particles(fx);
  parts.reduced = s.prefs.reducedFx;
  requestAnimationFrame(() => el.classList.add("on"));

  let resolveTap: (() => void) | null = null;
  next.onclick = () => { ctx.tap(); resolveTap?.(); };
  const waitTap = () => new Promise<void>((r) => (resolveTap = r));
  let closed = false;
  const result = new Promise<"play" | "close">((resolve) => {
    close.onclick = () => { closed = true; ctx.tap(); resolve("close"); };
    void (async () => {
      next.hidden = true;
      await sleep(900);
      el.classList.add("dim");           // le plateau devient plus sombre
      await sleep(1400);
      el.classList.add("fade-pieces");    // les pièces disparaissent doucement
      await sleep(2600);
      el.classList.add("queen-center");   // la dame blanche au centre
      await sleep(1500);
      el.classList.add("queen-radia");    // elle devient Radia
      await sleep(1300);
      el.classList.add("aug-in");         // Auguste apparaît en face
      await sleep(1100);
      next.hidden = false;
      for (let i = 0; i < c.finale.lines.length; i++) {
        if (closed) return;
        text.classList.remove("show");
        await sleep(200);
        text.textContent = "« " + c.finale.lines[i] + " »";
        text.classList.add("show");
        next.textContent = i < c.finale.lines.length - 1 ? "Suivant ♡" : "♡";
        await waitTap();
      }
      if (closed) return;
      text.classList.remove("show");
      el.classList.add("heart-on");
      ctx.audio.play("card");
      const r = stage.getBoundingClientRect(), fr = fx.getBoundingClientRect();
      parts.sparkles(r.left - fr.left + r.width / 2, r.top - fr.top + r.height * 0.45, Math.max(40, r.width / 6), 30);
      await sleep(1200);
      text.textContent = c.finale.thanks;
      text.classList.add("show", "thanks");
      next.textContent = c.finale.button;
      next.classList.add("big");
      s.data.finaleSeen = true;
      s.save();
      await waitTap();
      resolve("play");
    })();
  });
  const out = await result;
  el.classList.remove("on");
  el.classList.add("off");
  setTimeout(() => el.remove(), 600);
  s.data.finaleSeen = true;
  s.save();
  return out;
}
