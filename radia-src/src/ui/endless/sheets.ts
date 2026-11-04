/** Feuilles d'information : trésor, événement secondaire, objectifs. */
import { h, tap } from '../dom';
import { icon } from '../icons';
import { save } from '../../core/app';
import { fmt } from '../../core/wallet';
import { goals, secondaryView, treasureView, pendingChests } from '../../game/endless';
import { groupLoot, lootText, pct, secIcon } from './logic';
import { oddsTable, openChestFlow } from './chestFlow';
import { openSheet } from './sheet';
import { chestSvg } from './art';
import type { EndlessEnv } from './hud';

const bar = (p: number, color?: string) => h('i.en-bar', h('b', { style: `width:${p}%${color ? `;background:${color}` : ''}` }));

export function openTreasureSheet(env: EndlessEnv): void {
  const fun = save.data.fun;
  const v = treasureView(fun);
  const pend = pendingChests(fun);
  const body = h('div.en-tre-body',
    h('div.en-tre-top', h('span.en-tre-big', { html: chestSvg('#FFC857', 54) }), h('div', h('b', pend > 0 ? `${pend} coffre${pend > 1 ? 's' : ''} à ouvrir` : 'Jauge de trésor'), h('small', `${Math.floor(v.points)}/${v.goal} · environ 1 coffre toutes les 30 fusions`))),
    bar(pct(v.points, v.goal)),
    h('p.muted.en-small', 'Chaque fusion remplit la jauge (plus pour les gros objets). Les commandes et les niveaux maximum aussi.'));
  let sheet: ReturnType<typeof openSheet>;
  if (pend > 0) {
    const b = h('button.btn.gold.wide', `Ouvrir un coffre (${pend})`);
    b.addEventListener('click', tap(() => { sheet.close(); void openChestFlow(env).then(() => env.refresh()); }));
    body.append(b);
  }
  body.append(h('h4', 'Probabilités'), oddsTable());
  sheet = openSheet({ title: 'Trésor', body, accent: '#FFC857' });
}

export function openSecondarySheet(env: EndlessEnv, id: string): void {
  const fun = save.data.fun;
  const s = secondaryView(fun).find((x) => x.id === id);
  if (!s) return;
  const rewards = groupLoot(s.nextReward);
  const body = h('div.en-sec',
    h('p', s.blurb),
    h('div.en-sec-prog', h('b', s.text), bar(pct(s.progress, s.goal), s.color), h('small', `${fmt(s.progress)}/${fmt(s.goal)} · palier ${Math.min(s.stage + 1, s.stages)}/${s.stages}`)),
    h('h4', 'Récompense du palier'),
    h('ul.en-perks', ...rewards.map((r) => h('li', lootText(r)))),
    h('p.muted.en-small', 'Sans date limite : tu avances à ton rythme, rien n\'est perdu.'));
  void env;
  openSheet({ title: s.name, sub: 'Événement', body, accent: s.color });
}

export function openGoalsSheet(env: EndlessEnv): void {
  const g = goals(env.state(), save.data.fun);
  const row = (tag: string, x: typeof g.immediate) => h('div.en-goal-row',
    h('small.en-goal-tag', tag), h('b', x.label), bar(Math.round(x.ratio * 100)),
    h('div.en-goal-meta', h('span', x.goal > 1 ? `${fmt(x.progress)}/${fmt(x.goal)}` : ''), h('span.rw', `Prochaine récompense : ${x.reward}`)));
  const ch = env.state().challenge;
  const body = h('div.en-goals', row('Maintenant', g.immediate), row('Bientôt', g.mid), row('Plus tard', g.long),
    ch ? h('div.en-goal-row', h('small.en-goal-tag', 'Défi'), h('b', env.challengeText()), h('div.en-goal-meta', h('span.rw', `Récompense : +${ch.reward} ♡`))) : null);
  const w = h('button.btn.secondary.wide', icon('home', 18), ' Aller dans MON MONDE');
  let sheet: ReturnType<typeof openSheet>;
  w.addEventListener('click', tap(() => { sheet.close(); void env.openWorld('hub'); }));
  body.append(h('p.muted.en-small', 'Ce que tu gagnes sert à décorer le château, habiller Radia, cultiver le jardin et améliorer les générateurs.'), w);
  sheet = openSheet({ title: 'Mes objectifs', body, accent: '#E8558F' });
}
export { secIcon };
