import { useSyncExternalStore } from "react";

/** Routage minimal par « # » : le mode solo reste à la racine, le mode coopératif vit sous #salle. */
export interface Route { kind: "solo" | "room"; code: string | null }

function parse(hash: string): Route {
  const m = /^#salle(?:=([A-Za-z\- ]{0,12}))?$/.exec(decodeURIComponent(hash));
  return m ? { kind: "room", code: m[1] ? m[1].toUpperCase() : null } : { kind: "solo", code: null };
}

let current = parse(location.hash);
const listeners = new Set<() => void>();
window.addEventListener("hashchange", () => {
  const next = parse(location.hash);
  if (next.kind === current.kind && next.code === current.code) return;
  current = next;
  listeners.forEach((l) => l());
});

export function useRoute(): Route {
  return useSyncExternalStore((cb) => { listeners.add(cb); return () => { listeners.delete(cb); }; }, () => current);
}

export function goRoom(code?: string): void { location.hash = code ? `#salle=${code}` : "#salle"; }
export function goSolo(): void { history.replaceState(null, "", location.pathname + location.search); current = { kind: "solo", code: null }; listeners.forEach((l) => l()); }
export function roomLink(code: string): string { return `${location.origin}${location.pathname}#salle=${code}`; }
