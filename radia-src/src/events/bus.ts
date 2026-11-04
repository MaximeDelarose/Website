/** Mini-bus : les boutons du téléphone (badge) se rafraîchissent quand l'état des invitations change. */
type Fn = () => void;
const subs = new Set<Fn>();
export const onPhoneChange = (fn: Fn): (() => void) => { subs.add(fn); return () => subs.delete(fn); };
export const emitPhone = (): void => { for (const f of [...subs]) f(); };

/** Interactions « amusantes » (incidents, Tindeur) : tant qu'une est ouverte, aucune autre notification n'apparaît. */
const busy = new Set<() => boolean>();
export const registerBusy = (fn: () => boolean): void => { busy.add(fn); };
export const funBusy = (): boolean => { for (const f of busy) if (f()) return true; return false; };
