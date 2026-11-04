/** Fiches d'un objet du plateau et d'une case verrouillée (ouvertes par appui long ou par le bouton « Infos » du panneau). */
import { h, tap } from '../dom';
import { COLLECTIONS, GENERATORS, SPECIAL_ITEMS, collMax, genKindOf, itemBlurb, itemName, type CollectionId, type ItemRef } from '../../data/items';
import { save } from '../../core/app';
import { itemImageUrl, lockIconUrl } from '../../game/merge/textures';
import { describeLock } from '../../game/merge/locks';
import { isDiscovered } from '../../game/endless';
import { mergeReward } from '../../game/world/fusionRewards';
import * as R from '../../game/merge/rules';
import { openSheet } from './sheet';
import { openGenSheet } from './genSheet';
import { lootText } from './logic';
import type { EndlessEnv } from './hud';

/** Ouvre la bonne fiche pour un objet : générateur → feuille du générateur, sinon fiche d'objet. */
export function openInfoFor(env: EndlessEnv, ref: ItemRef): void {
  if (ref.c === 'gen') openGenSheet(env, ref.l);
  else openItemSheet(env, ref);
}

export function openItemSheet(env: EndlessEnv, ref: ItemRef): void {
  const body = h('div.en-item');
  const isSpecial = ref.c === 'special';
  const coll = !isSpecial ? COLLECTIONS[ref.c as CollectionId] : null;
  const max = isSpecial ? 1 : collMax(ref.c);
  const sheet = openSheet({ title: 'Objet', body, accent: coll?.color });
  const art = h('img.en-gen-art', { src: itemImageUrl(ref, 112), alt: '' });
  body.append(h('div.en-gen-head', art, h('div', h('b', itemName(ref)), coll ? h('div.en-gen-lv', `Niveau ${ref.l}/${max}`, h('span.en-pips', ...Array.from({ length: max }, (_, i) => h(`i${i < ref.l ? '.on' : ''}`)))) : null, h('small', coll ? coll.name : 'Objet spécial'))));
  body.append(h('p.en-gen-desc', itemBlurb(ref)));
  if (isSpecial) {
    const sp = SPECIAL_ITEMS[ref.l];
    if (sp) body.append(h('p', sp.blurb));
  } else if (coll) {
    const next: ItemRef | null = ref.l < max ? { c: ref.c, l: ref.l + 1 } : null;
    body.append(h('h4', 'Fusion'));
    if (next) {
      const g = mergeReward(next, 1);
      body.append(
        h('div.en-merge-row', h('img', { src: itemImageUrl(ref, 56), alt: '' }), h('b', '+'), h('img', { src: itemImageUrl(ref, 56), alt: '' }), h('b', '→'), h('img', { src: itemImageUrl(next, 56), alt: itemName(next) })),
        h('p', `Deux « ${itemName(ref)} » donnent ${itemName(next)}.${g.coins ? ` Une fusion rapporte environ ${g.coins} pièces.` : ''}`),
      );
    } else body.append(h('p.en-max', 'Niveau maximum ✨ : une fusion de ce niveau offre un bonus et un drop rare garanti.'));
    const gk = genKindOf(ref.c as CollectionId);
    body.append(h('h4', 'D\'où ça vient'), h('p', `Le générateur « ${GENERATORS[gk]?.name ?? ''} » en produit, ou une fusion des niveaux d\'en dessous.`));
    const known = isDiscovered(save.data.fun, ref);
    body.append(h('p.muted.en-small', known ? 'Déjà dans ton album ♡' : 'Pas encore dans ton album.'));
  }
  void sheet.closed;
  void env;
}

/** Fiche d'une case verrouillée : ce qu'il y a dessous, comment la libérer, prix en énergie. */
export function openLockSheet(env: EndlessEnv, cell: number): void {
  const st = env.state();
  const lock = st.cells[cell]?.lock;
  if (!lock) return;
  const v = describeLock(lock, { merges: st.merges, fun: save.data.fun });
  const body = h('div.en-item');
  const sheet = openSheet({ title: 'Case verrouillée', body, accent: '#8E7BC4' });
  const art = lock.item ? itemImageUrl(lock.item, 112) : lockIconUrl(lock.kind, 112);
  body.append(
    h('div.en-gen-head', h('img.en-gen-art', { src: art, alt: '' }), h('div', h('b', v.title), h('div.en-gen-lv', v.prize || 'Surprise'))),
    h('p.en-lock-obj', v.objective),
  );
  if (v.progress) body.append(h('p.en-small', `Progression : ${v.progress}`));
  if (lock.reward) body.append(h('p.en-lock-prize', `Récompense visible : ${lootText(lock.reward)}`));
  body.append(h('ul.en-perks', ...v.alt.map((a) => h('li', a))));
  const buy = h('button.btn.gold.wide', `Libérer pour ${v.price} ⚡`);
  buy.addEventListener('click', tap(() => { sheet.close(); env.buyLock(cell); }, { sound: false }));
  body.append(buy, h('p.muted.en-small.center', 'L\'énergie se gagne en jouant : jamais d\'achat nécessaire.'));
  void R;
}
