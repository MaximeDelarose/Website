/* Fenêtres modales (cartes, résultats, confirmations, menus) empilables. */
import { h } from "./dom";

export interface ModalHandle { el: HTMLElement; close: () => void; closed: Promise<void> }

let host: HTMLElement;
export function setModalHost(el: HTMLElement): void { host = el; }

export function openModal(content: HTMLElement, o: { cls?: string; dismissable?: boolean; onClose?: () => void } = {}): ModalHandle {
  const veil = h("div", { class: "modal-veil " + (o.cls ?? "") });
  const box = h("div", { class: "modal", role: "dialog", "aria-modal": "true" }, content);
  veil.append(box);
  host.append(veil);
  requestAnimationFrame(() => veil.classList.add("open"));
  let done!: () => void;
  const closed = new Promise<void>((r) => (done = r));
  let isClosed = false;
  const close = () => {
    if (isClosed) return;
    isClosed = true;
    veil.classList.remove("open");
    veil.classList.add("closing");
    setTimeout(() => veil.remove(), 260);
    o.onClose?.();
    done();
  };
  if (o.dismissable) veil.addEventListener("click", (e) => { if (e.target === veil) close(); });
  return { el: box, close, closed };
}

export function confirmModal(title: string, text: string, yes: string, no = "Annuler"): Promise<boolean> {
  return new Promise((resolve) => {
    let answered = false;
    const content = h("div", { class: "confirm" }, h("h3", {}, title), h("p", {}, text));
    const row = h("div", { class: "btn-row" });
    const bNo = h("button", { class: "btn ghost", type: "button" }, no);
    const bYes = h("button", { class: "btn primary", type: "button" }, yes);
    row.append(bNo, bYes);
    content.append(row);
    const m = openModal(content, { dismissable: true, onClose: () => { if (!answered) resolve(false); } });
    bNo.onclick = () => { answered = true; resolve(false); m.close(); };
    bYes.onclick = () => { answered = true; resolve(true); m.close(); };
  });
}
