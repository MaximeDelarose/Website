/* La carte souvenir : photo ou illustration, titre, phrase d'Auguste, bouton. */
import type { MemoryCard } from "../content/types";
import { artSVG } from "../art/illustrations";
import { h, esc } from "./dom";
import { openModal } from "./modal";
import type { Ctx } from "./context";

export function cardVisual(ctx: Ctx, card: MemoryCard): HTMLElement {
  const box = h("div", { class: "card-visual" });
  if (card.image) {
    const img = h("img", { alt: card.title, decoding: "async" }) as HTMLImageElement;
    box.classList.add("loading");
    ctx.vault.url(card.image).then((u) => {
      if (u) { img.src = u; img.onload = () => box.classList.remove("loading"); }
      else { box.innerHTML = artSVG(card.art ?? "heart") + `<span class="ph-tag">photo à ajouter : ${esc(card.image!)}</span>`; box.classList.remove("loading"); }
    });
    box.append(img);
  } else {
    box.innerHTML = artSVG(card.art ?? "heart");
  }
  return box;
}

export function showCard(ctx: Ctx, card: MemoryCard, o: { header: string; button: string; isNew: boolean; order?: number }): Promise<void> {
  const c = ctx.content;
  const el = h("div", { class: "memory-card kind-" + card.kind },
    h("div", { class: "mc-header" }, o.header),
    cardVisual(ctx, card),
    h("div", { class: "mc-body" },
      h("h3", { class: "mc-title" }, card.title, o.isNew ? h("span", { class: "mc-new" }, "nouveau") : null),
      h("p", { class: "mc-text" }, "« " + card.text + " »"),
      h("p", { class: "mc-sign" }, "— " + c.rival.name),
    ),
  );
  const btn = h("button", { class: "btn primary mc-btn", type: "button" }, o.button);
  el.append(btn);
  const m = openModal(el, { cls: "card-modal" });
  btn.addEventListener("click", () => { ctx.tap(); m.close(); });
  setTimeout(() => btn.focus({ preventScroll: true }), 300);
  return m.closed;
}
