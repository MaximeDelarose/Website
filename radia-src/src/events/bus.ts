/** Mini-bus : les boutons du téléphone (badge) se rafraîchissent quand l'état des invitations change. */
type Fn = () => void;
const subs = new Set<Fn>();
export const onPhoneChange = (fn: Fn): (() => void) => { subs.add(fn); return () => subs.delete(fn); };
export const emitPhone = (): void => { for (const f of [...subs]) f(); };
