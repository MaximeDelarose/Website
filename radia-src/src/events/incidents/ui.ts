/** Interface des incidents : notification, panneau de choix (coût, conséquence), lancement des scènes, fin avec effet visuel. */
import './incidents.css';
import { h, tap } from '../../ui/dom';
import { ui } from '../../ui/ui';
import { save, audio, events } from '../../core/app';
import { world, spendRes } from '../../core/world';
import { haptic } from '../../core/haptics';
import { fmt } from '../../core/wallet';
import { registerBusy } from '../bus';
import { speakerFace } from '../ctx';
import { incidentById, type IncidentDef, type IncidentOpt } from './data';
import { consequenceText, defer, escalationIn, syncCost } from './manager';
import { finishActive, activeIncident } from './runtime';
import { noticeIcon, showNotice } from './notice';
import { applyRareFlower, applyReward, rollParcel, rollRareFlower, shopLot } from './rewards';
import { augusteSays } from '../../ui/components/augusteSays';

let panel: HTMLElement | null = null;
registerBusy(() => !!panel || !!document.querySelector('.inc-layer'));

export function announceIncident(id: string): void {
  const def = incidentById(id);
  if (!def || !save.data.fun.incidents.active) return;
  showNotice({
    icon: def.icon, title: `Château — ${def.title}`, text: def.notif, ttl: 16_000, variant: 'castle',
    actions: [{ label: 'Voir', run: () => void openPanel(def) }, { label: 'Plus tard', secondary: true, run: () => undefined }],
  });
}
export function openActive(): void {
  const a = activeIncident();
  const def = a && incidentById(a.id);
  if (def) void openPanel(def);
}

const minutes = (ms: number): string => { const m = Math.ceil(ms / 60_000); return `${m} min`; };

/** Texte d'état du coût selon que l'incident a été reporté ou non. */
export function costLines(def: IncidentDef): string[] {
  const st = save.data.fun.incidents;
  if (!st.active || def.baseCost <= 0) return [];
  const cost = syncCost(st, def);
  const lines: string[] = [];
  const left = escalationIn(def, st);
  if (left === null) { const c = consequenceText(def); if (c) lines.push(c); }
  else if (left > 0) lines.push(`Coût actuel : ${cost} pièces · il passera à ${def.capCost} dans ${minutes(left)} de jeu`);
  else lines.push(`Le coût est maintenant de ${cost} pièces (c’est le maximum, il ne montera plus)`);
  return lines;
}

export async function openPanel(def: IncidentDef): Promise<void> {
  if (panel) return;
  const st = save.data.fun.incidents;
  if (!st.active || st.active.id !== def.id) return;
  const coins = () => world().res.coins;
  const msg = h('p.inc-msg');
  const optsBox = h('div.inc-opts');
  const card = h('div.inc-card',
    h('div.inc-card-h', h('div.inc-ico', noticeIcon(def.icon, 26)), h('div', h('b', def.title), h('small', def.notif))),
    h('div.inc-aug', h('img', { src: speakerFace('auguste'), alt: 'Auguste' }), h('p', `« ${def.auguste} »`)),
    optsBox, msg);
  const back = h('div.inc-layer.panel', card);
  panel = back;
  ui.root.append(back);
  audio.play('pop2');
  const close = () => { back.classList.add('out'); window.setTimeout(() => back.remove(), 220); panel = null; };

  const render = () => {
    optsBox.replaceChildren();
    const cost = st.active ? syncCost(st, def) : 0;
    for (const o of def.options) optsBox.append(optionButton(o, cost));
    const cl = costLines(def);
    for (const t of cl) optsBox.append(h('p.inc-conseq', t));
  };
  function optionButton(o: IncidentOpt, cost: number): HTMLElement {
    let label = o.label;
    if (o.kind === 'pay') label = `${o.label} — ${cost} pièces`;
    if (o.kind === 'bonus') { const b = save.data.boosters; label = `${o.label} (${b.wand + b.wind} dispo)`; }
    const b = h(`button.btn.inc-opt${o.kind === 'pay' ? '.gold' : o.kind === 'defer' ? '.secondary' : ''}`, { on: { click: tap(() => void choose(o), { sound: false }) } },
      h('span', label), o.sub ? h('small', o.sub) : null);
    return b;
  }
  async function choose(o: IncidentOpt) {
    const a = st.active;
    if (!a) { close(); return; }
    if (o.kind === 'defer') {
      defer(st);
      syncCost(st, def);
      save.save();
      audio.play('select');
      close();
      return;
    }
    if (o.kind === 'pay') {
      const cost = syncCost(st, def);
      if (!spendRes('coins', cost)) {
        audio.play('invalid'); haptic('error');
        msg.textContent = `Il te manque ${fmt(cost - coins())} pièces. Pas de souci : la solution gratuite reste toujours là ♡`;
        return;
      }
      audio.play('deliver'); haptic('reward');
      close();
      await complete(def, 'pay');
      return;
    }
    if (o.kind === 'bonus') {
      const b = save.data.boosters;
      if (b.wind > 0) b.wind--; else if (b.wand > 0) b.wand--; else { msg.textContent = 'Pas de bonus pour l’instant. L’arrosage reste gratuit ♡'; audio.play('invalid'); return; }
      save.save();
      close();
      await complete(def, 'bonus');
      return;
    }
    close();
    const ok = await runScene(def, o);
    if (ok) await complete(def, o.kind);
  }
  render();
  void def;
}

async function runScene(def: IncidentDef, o: IncidentOpt): Promise<boolean> {
  const seed = save.data.fun.incidents.active?.seed ?? 1;
  const w = world();
  switch (def.scene) {
    case 'plumbing': return (await import('./scenes/plumbing')).runPlumbing(seed);
    case 'wires': return (await import('./scenes/wires')).runWires(seed);
    case 'watering': { const g = await import('./scenes/garden'); return o.id === 'game' ? g.runWeeds(seed) : g.runWatering(seed); }
    case 'catTidy': return (await import('./scenes/tidy')).runTidy();
    case 'delivery': { const rw = rollParcel(seed, w); const m = await import('./scenes/reveal'); return m.runReveal({ title: 'Livraison surprise', hint: 'Touche le colis pour l’ouvrir.', emoji: '🎁', openLabel: 'Ouvrir', rewards: [rw] }); }
    case 'newShop': { const lot = shopLot(seed, w); const m = await import('./scenes/reveal'); return m.runReveal({ title: 'Nouvelle boutique', hint: 'Touche le sac de bienvenue.', emoji: '🛍️', openLabel: 'Ouvrir le sac', rewards: lot, footer: 'Ton lot d’ouverture est dans ton dressing et ton château ♡' }); }
    case 'rareFlower': { const id = rollRareFlower(seed, w); const m = await import('./scenes/reveal'); return m.runRareFlower(id, id ? 'Une nouvelle variété pour ton jardin ♡' : 'Ta collection est complète : voici des fleurs pour tes bouquets ♡'); }
    case 'chocOrder': return (await import('./scenes/order')).runOrder();
    default: return false;
  }
}

/** Effets réels de la résolution (récompense, ressources), puis clôture de l'incident. */
async function complete(def: IncidentDef, how: string): Promise<void> {
  const st = save.data.fun.incidents;
  if (!st.active || st.active.id !== def.id) return; // déjà clos (ex. commande validée par Endless)
  const seed = st.active.seed;
  const w = world();
  if (how !== 'pay' && how !== 'bonus') {
    if (def.scene === 'delivery') applyReward(w, rollParcel(seed, w));
    else if (def.scene === 'newShop') for (const r of shopLot(seed, w)) applyReward(w, r);
    else if (def.scene === 'rareFlower') applyRareFlower(w, rollRareFlower(seed, w));
    else if (def.scene === 'watering') w.res.flowers = Math.min(999_999_999, w.res.flowers + 4);
    else if (def.scene === 'catTidy') w.res.coins += 30;
  } else if (def.scene === 'watering') w.res.flowers += 2;
  finishActive();
  events.emit('economy', undefined);
  augusteSays(def.doneLine, 4200);
}

