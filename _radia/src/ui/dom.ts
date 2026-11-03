/* Petits utilitaires DOM sans dépendance. */
export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Record<string, string | boolean | undefined> = {}, ...kids: (Node | string | null | undefined | false)[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === false) continue;
    if (k === "class") el.className = String(v);
    else if (k === "html") el.innerHTML = String(v);
    else el.setAttribute(k, v === true ? "" : String(v));
  }
  for (const k of kids) if (k !== null && k !== undefined && k !== false) el.append(k);
  return el;
}

export function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Bouton avec petit rebond au toucher (classe .btn) et son. */
export function button(label: string, cls: string, onTap: () => void, attrs: Record<string, string> = {}): HTMLButtonElement {
  const b = h("button", { class: "btn " + cls, type: "button", ...attrs });
  b.innerHTML = label;
  b.addEventListener("click", (e) => { e.preventDefault(); onTap(); });
  return b;
}

/** Vibration courte si l'appareil et le réglage le permettent (Android ; ignoré sur iPhone). */
export function haptic(enabled: boolean, ms = 12): void {
  if (!enabled) return;
  try { navigator.vibrate?.(ms); } catch { /* non pris en charge */ }
}
