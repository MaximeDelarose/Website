/** « Une petite pensée ♡ » : carte à l'ouverture depuis la notification + liste « Petites pensées ♡ » (historique conservé). */
import { h } from '../dom';
import { ui } from '../ui';
import { save } from '../../core/app';
import { collectThoughts, mergeThoughts, type Thought } from '../../core/push';

const fmt = (at: number): string => { const d = new Date(at); return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }); };

/** Ramasse les pensées reçues par le service worker et les range dans la sauvegarde. Renvoie les nouvelles. */
export async function importThoughts(): Promise<Thought[]> {
  const got = await collectThoughts();
  if (!got.length) return [];
  const hist = save.data.fun.thoughts;
  const fresh = mergeThoughts(hist, got);
  // au-delà de 60, on retire d'abord les pensées NON gardées (mergeThoughts a déjà borné ; on remet les « gardées » si besoin)
  if (fresh.length) save.save();
  return fresh;
}

let cardOpen = false;
/** Petite carte (aucune animation longue obligatoire) avec la pensée ; « Garder » la protège de l'oubli. */
export async function showThoughtCard(t: Thought): Promise<void> {
  if (cardOpen) return; cardOpen = true;
  const stored = save.data.fun.thoughts.find((x) => x.at === t.at && x.text === t.text);
  const r = await ui.modal({
    title: 'Une petite pensée ♡',
    body: h('div', { style: 'text-align:center;font-size:17px;line-height:1.45;padding:6px 2px' }, h('p', { style: 'margin:0 0 8px' }, t.text), h('small.muted', fmt(t.at))),
    actions: [{ label: stored?.kept ? 'Gardée ♡' : 'Garder ♡', value: 'keep', style: 'primary' }, { label: 'Fermer', value: 'ok', style: 'secondary' }],
  });
  cardOpen = false;
  if (r === 'keep' && stored) { stored.kept = true; save.save(); ui.toast({ title: 'Gardée dans « Petites pensées »', icon: 'heart', ms: 2200 }); }
}

/** Liste des petites pensées (les plus récentes d'abord). */
export async function openThoughtsList(): Promise<void> {
  const hist = save.data.fun.thoughts.slice().reverse();
  const body = h('div', { style: 'text-align:left;max-height:55vh;overflow-y:auto;font-size:14.5px' },
    ...(hist.length ? hist.map((t) => h('div', { style: 'padding:8px 2px;border-bottom:1px solid #f0dfe8' }, h('p', { style: 'margin:0' }, t.kept ? '♡ ' : '', t.text), h('small.muted', fmt(t.at)))) : [h('p.muted', 'Les petites pensées que tu recevras apparaîtront ici ♡')]));
  await ui.modal({ title: 'Petites pensées ♡', body, actions: [{ label: 'Fermer', value: 'ok', style: 'secondary' }] });
}
