/** Ouverture d'un coffre : animation par rareté, contenu posé sur le plateau ou crédité. */
import { h, tap } from '../dom';
import { audio, reducedFx } from '../../core/app';
import { haptic } from '../../core/haptics';
import { wallet } from '../../core/wallet';
import { save } from '../../core/app';
import { openChest, pendingChests, chestOdds } from '../../game/endless';
import * as R from '../../game/merge/rules';
import type { BoardEvent, Loot } from '../../game/merge/types';
import type { Rarity } from '../../data/items';
import { itemImageUrl } from '../../game/merge/textures';
import { revealItem, sparkleBurst, confetti } from '../fx/sparkle';
import { chestSvg } from './art';
import { chestLook, groupLoot, lootText, LOOT_FLY } from './logic';
import { clothName, furnitureName, settleLoot } from './host';
import { openSheet } from './sheet';
import type { EndlessEnv } from './hud';
import { ui } from '../ui';

const sleep = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));

/** Tableau des probabilités publiées (couleurs de rareté). */
export function oddsTable(): HTMLElement {
  const o = chestOdds();
  return h('div.en-odds',
    ...o.rows.map((r) => h('div.en-odds-row', h('i.en-dot', { style: `background:${r.color}` }), h('span', r.name), h('b', `${String(r.pct).replace('.', ',')} %`))),
    h('p.muted.en-odds-note', o.text));
}

export function openOddsSheet(): void {
  openSheet({ title: 'Probabilités des coffres', sub: 'Publiées telles quelles · aucun achat requis', body: h('div', oddsTable(), h('p.muted.en-odds-note', 'Les coffres se gagnent en jouant : jauge de trésor, drops, niveaux maximum.')) });
}

/** Ouvre UN coffre en attente. Renvoie faux s'il n'y en a pas. `force` : rareté imposée (mode développeur, visuel seulement). */
export async function openChestFlow(env: EndlessEnv, force?: Rarity): Promise<boolean> {
  const fun = save.data.fun;
  const res = openChest(fun);
  if (!res) return false;
  const rarity = force ?? res.rarity;
  const look = chestLook(rarity);
  const state = env.state();
  const placed = R.placeLoot(state, res.loot);
  const out = settleLoot(placed.loot);
  env.persist();

  const calm = reducedFx();
  // fermé : couleur neutre (la rareté ne se dévoile qu'à l'ouverture)
  const NEUTRAL = '#B9A5E8';
  const chest = h(`div.en-chest${calm ? '.calm' : ''}`, { style: `--rc:${NEUTRAL}` });
  chest.innerHTML = chestSvg(NEUTRAL, 132, false);
  const halo = h('i.en-chest-halo');
  const title = h('h3.en-chest-title', { style: 'color:#fff' }, 'Un coffre pour toi !');
  const sub = h('p.en-chest-sub', 'Touche-le pour l\'ouvrir');
  const list = h('div.en-chest-loot');
  const left = pendingChests(fun);
  const more = h('button.btn.secondary', `Ouvrir le suivant (${left})`);
  const ok = h('button.btn', 'Super !');
  const odds = h('button.en-link', 'Probabilités');
  odds.addEventListener('click', tap(() => openOddsSheet(), { sound: false }));
  const actions = h('div.actions.en-chest-actions', { style: 'visibility:hidden' }, ok, left > 0 ? more : null, odds);
  const card = h(`div.en-chest-card.r${look.tier}`, { style: `--rc:${NEUTRAL}` }, halo, chest, title, sub, list, actions);
  const back = h('div.en-chest-back', card);
  ui.root.append(back);
  if (!calm) chest.animate([{ transform: 'scale(.4) rotate(-8deg)', opacity: 0 }, { transform: 'scale(1.08)', opacity: 1, offset: 0.6 }, { transform: 'scale(1)' }], { duration: 420, easing: 'cubic-bezier(.34,1.56,.64,1)' });

  // attente d'un toucher (ou ouverture automatique au bout de 2 s)
  await new Promise<void>((resolve) => {
    let go = false;
    const fire = () => { if (go) return; go = true; resolve(); };
    chest.addEventListener('click', fire);
    back.addEventListener('click', fire);
    if (!calm) chest.animate([{ transform: 'rotate(0)' }, { transform: 'rotate(-4deg)' }, { transform: 'rotate(4deg)' }, { transform: 'rotate(0)' }], { duration: 900, iterations: 2, delay: 450 });
    window.setTimeout(fire, 2200);
  });

  // ouverture : secousse proportionnelle à la rareté
  if (!calm) await chest.animate([{ transform: 'translateX(0)' }, ...Array.from({ length: look.shake * 2 }, (_, i) => ({ transform: `translateX(${i % 2 ? 7 : -7}px) rotate(${i % 2 ? 3 : -3}deg)` })), { transform: 'translateX(0)' }], { duration: 260 + look.tier * 80 }).finished.catch(() => undefined);
  chest.innerHTML = chestSvg(look.color, 132, true);
  card.style.setProperty('--rc', look.color);
  chest.style.setProperty('--rc', look.color);
  title.style.color = look.color;
  const r = chest.getBoundingClientRect();
  const cx = r.left + r.width / 2;
  const cy = r.top + r.height * 0.4;
  const sc = env.scene();
  if (sc) sc.chestFx(cx, cy); else { haptic('chest'); audio.play('reward'); }
  void revealItem(chest, { rarity, kind: 'item' });
  halo.classList.add('on');
  title.textContent = `${look.title} !`;
  title.classList.add('pop');
  sub.textContent = look.tier >= 3 ? (look.tier === 4 ? 'Légendaire… quelle chance ♡' : 'Épique ! Joli tirage.') : look.tier === 2 ? 'Un beau butin.' : 'Voyons ce qu\'il y a dedans.';
  if (look.confetti && !calm) { confetti(cx, cy - 60); window.setTimeout(() => sparkleBurst(cx, cy, { rarity, count: 14 }), 380); }

  // contenu, ligne par ligne
  const lines = displayLines(placed.loot, out.cloth, out.furniture, out.dupCoins);
  for (const l of lines) {
    const row = h('div.en-loot-row', l.img ? h('img', { src: l.img, alt: '' }) : h('i.en-loot-ic', l.ic ?? '✦'), h('span', l.text));
    if (l.color) row.style.setProperty('--lc', l.color);
    list.append(row);
    if (!calm) row.animate([{ opacity: 0, transform: 'translateY(10px) scale(.9)' }, { opacity: 1, transform: 'none' }], { duration: 300, easing: 'ease-out' });
    await sleep(calm ? 0 : 200);
  }
  (actions as HTMLElement).style.visibility = 'visible';

  const choice = await new Promise<'ok' | 'more'>((resolve) => {
    ok.addEventListener('click', tap(() => resolve('ok')));
    more.addEventListener('click', tap(() => resolve('more')));
  });
  back.classList.add('leaving');
  window.setTimeout(() => back.remove(), 200);

  // objets posés sur le plateau + monnaies qui rejoignent les compteurs
  afterOpen(env, placed.events, placed.loot, out.cloth, out.furniture);
  if (choice === 'more') {
    await sleep(500);
    await openChestFlow(env);
  }
  return true;
}

interface Line { text: string; img?: string; ic?: string; color?: string }
function displayLines(loot: Loot[], cloth: string[], furniture: string[], dup: number): Line[] {
  const out: Line[] = [];
  for (const l of groupLoot(loot)) {
    if (l.kind === 'cloth' || l.kind === 'bag' || l.kind === 'accessory' || l.kind === 'deco') continue;
    const img = (l.kind === 'rareItem' || l.kind === 'star') && l.item ? itemImageUrl(l.item, 64) : undefined;
    out.push({ text: l.kind === 'rareItem' && l.item ? `${lootText(l)} (sur le plateau)` : lootText(l), img, ic: icFor(l.kind), color: l.rarity ? undefined : undefined });
  }
  for (const c of cloth) out.push({ text: `${clothName(c)} · dans ton dressing`, ic: '👗' });
  for (const f of furniture) out.push({ text: `${furnitureName(f)} · pour le château`, ic: '🛋️' });
  if (dup > 0) out.push({ text: `Déjà possédé : converti en ${dup} pièces`, ic: '🪙' });
  return out;
}
const icFor = (k: string): string => ({ coins: '🪙', diamonds: '💎', energy: '⚡', hearts: '♡', flowers: '✿', fabric: '🧵', cocoa: '🍫', chest: '🎁', ticket: '🎟️', fragment: '🧩', star: '⭐', wand: '🪄', wind: '🍃' } as Record<string, string>)[k] ?? '✦';

/** Après la fermeture : événements sur le plateau, envols de monnaies, inventaire. */
function afterOpen(env: EndlessEnv, events: BoardEvent[], loot: Loot[], cloth: string[], furniture: string[]): void {
  const sc = env.scene();
  if (events.length) env.push(events);
  for (const l of events) if (l.t === 'spawn') sc?.dropFx(l.at, 'rare');
  let k = 0;
  for (const l of groupLoot(loot)) {
    const fly = LOOT_FLY[l.kind];
    if (!fly || !sc) continue;
    const to = env.anchor(fly === 'diamond' ? 'diamonds' : fly === 'energy' ? 'energy' : fly === 'heart' ? 'hearts' : fly === 'chest' ? 'chest' : 'coins');
    window.setTimeout(() => sc.flyTo(fly, 14 + (k % 3), to, () => env.refreshRes()), 120 * k++);
  }
  wallet.notify();
  env.inventoryToast(cloth, furniture);
  env.refresh();
}
