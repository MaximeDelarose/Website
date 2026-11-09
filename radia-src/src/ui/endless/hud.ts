/**
 * Interface du mode infini (Endless 2.0) : commandes, jauge de trésor, événements secondaires,
 * objectif immédiat, panneau de l'objet sélectionné (sous le plateau), bulles d'informations, réactions d'Auguste.
 * Aucun bouton d'information ne recouvre un sprite : appui long = fiche, panneau « Infos » sous le plateau.
 * playLevel.ts la crée une fois ; le moteur est câblé là-bas (bindEndless, applyEvents…).
 */
import { xpView } from '../../game/endless/xp';
import { FULL_HINT_RATIO, isPrecious, occupancy, saleValue, sellable } from '../../game/endless/storage';
import './endless.css';
import { h, tap } from '../dom';
import { icon } from '../icons';
import { ui } from '../ui';
import { audio, reducedFx, save } from '../../core/app';
import { haptic } from '../../core/haptics';
import { fmt, wallet } from '../../core/wallet';
import { COLLECTIONS, collMax, itemName, itemBlurb, SPECIAL_ITEMS, type CollectionId, type ItemRef } from '../../data/items';
import { RES_NAMES } from '../../data/world/ids';
import { diamondUrl, openShop } from '../screens/shop';
import { resIconUrl } from '../../game/art/world/resources';
import { itemImageUrl, lockIconUrl } from '../../game/merge/textures';
import { describeLock } from '../../game/merge/locks';
import type { MergeScene } from '../../game/merge/MergeScene';
import * as R from '../../game/merge/rules';
import type { BoardEvent, LevelDef, RunState } from '../../game/merge/types';
import { getSpecialOrder, deliverSpecialItem, completeSpecialOrder } from '../../events/incidents/chocOrder';
import { goals, secondaryView, treasureView, pendingChests, genLevel, generatorInfo, collOfKind, type LootResult } from '../../game/endless';
import { pickReaction } from '../../game/fx/reactions';
import { pickLine } from '../../data/augusteTone';
import { augusteSays } from '../components/augusteSays';
import { notify, recordNotice } from '../notify';
import { isBoardBusy, isComboBusy, onComboEnd, onBoardBusyChange } from '../../game/fx/comboState';
import { openCustomerSheet, showThanks } from './customerSheet';
import { customerPortraitUrl } from '../../game/art/customers';
import { customerById } from '../../data/customers';
import { sparkleBurst } from '../fx/sparkle';
import { chestSvg } from './art';
import { openChestFlow } from './chestFlow';
import { openInfoFor, openLockSheet } from './itemSheet';
import { openGoalsSheet, openSecondarySheet, openTreasureSheet } from './sheets';
import { clothName, furnitureName, settleLoot } from './host';
import {
  ReactionGate, REACTION_PRIO, TIER_META, bestReaction, limitChips, lootText, newlyReady, orderCardModel, pct, resUse, secIcon, missingText,
  type OrderCardModel, type ReactionKey, type ReactionWish, type RewardKind,
} from './logic';

export type AnchorKey = 'coins' | 'energy' | 'hearts' | 'diamonds' | 'chest' | 'world' | 'bag';
export interface FeedOpts { kind?: 'gain' | 'info' | 'good'; img?: string; btn?: { label: string; fn: () => void }; ms?: number }

/** Ce que l'interface du mode infini attend de playLevel. */
export interface EndlessEnv {
  def: LevelDef;
  state(): RunState;
  scene(): MergeScene | null;
  persist(): void;
  anchor(k: AnchorKey): { x: number; y: number };
  push(ev: BoardEvent[]): void;
  refreshRes(): void;
  openWorld(which?: 'hub' | 'dressing' | 'castle'): Promise<void>;
  challengeText(): string;
  feed(text: string, o?: FeedOpts): void;
  inventoryToast(cloth: string[], furniture: string[]): void;
  refresh(): void;
  /** Libère une case verrouillée en dépensant l'énergie affichée (jamais d'argent réel). */
  buyLock(cell: number): void;
}

export interface EndlessHud {
  env: EndlessEnv;
  /** Zone des commandes (3 cartes + commande spéciale). */
  top: HTMLElement;
  /** Calque transparent (ne capte pas le toucher). */
  layer: HTMLElement;
  /** Panneau de l'objet sélectionné, à placer SOUS le plateau (au-dessus de la barre d'actions). */
  sel: HTMLElement;
  /** Objet mis en avant (touché, sélectionné) : -1 = aucun. */
  select(cell: number): void;
  /** Appui long : ouvre la fiche de l'objet, du générateur ou de la case verrouillée. */
  longPress(cell: number): void;
  /** Pile des gains passagers : playLevel la place dans le conteneur ancré au-dessus des actions. */
  feedEl: HTMLElement;
  onEvents(ev: BoardEvent[], got: LootResult): void;
  refresh(): void;
  openChest(force?: Parameters<typeof openChestFlow>[1]): Promise<boolean>;
  feed: EndlessEnv['feed'];
  destroy(): void;
}

export interface HudCfg {
  def: LevelDef;
  getState: () => RunState;
  getScene: () => MergeScene | null;
  persist: () => void;
  anchor: EndlessEnv['anchor'];
  push: EndlessEnv['push'];
  refreshRes: () => void;
  openWorld: EndlessEnv['openWorld'];
  challengeText: () => string;
  /** Vrai tant qu'une fusion s'anime (aucune réaction d'Auguste à ce moment). */
  busy: () => boolean;
  /** Panneau d'énergie (quand il manque de l'énergie pour libérer une case). */
  openEnergy?: () => void;
}

const RES_ICON: Record<RewardKind, (s: number) => string> = {
  coins: (s) => resIconUrl('coins', s), flowers: (s) => resIconUrl('flowers', s), fabric: (s) => resIconUrl('fabric', s), cocoa: (s) => resIconUrl('cocoa', s),
  hearts: () => '', energy: () => '',
};

export function createEndlessHud(cfg: HudCfg): EndlessHud {
  const fun = () => save.data.fun;
  const ordersEl = h('div.en-orders');
  const chocEl = h('div.en-choc');
  const statusEl = h('div.en-status');
  const goalEl = h('button.en-goal', { 'aria-label': 'Mes objectifs' });
  const top = h('div.en-top', ordersEl, chocEl, statusEl, goalEl);
  const feedEl = h('div.en-feed');
  const layer = h('div.en-layer');
  const selEl = h('div.en-sel.empty', { 'aria-live': 'polite' });
  // un toucher sur la fiche (hors boutons) la referme : on retrouve aussitôt la rangée d'actions
  selEl.addEventListener('click', (ev) => { if (!(ev.target as HTMLElement).closest('button')) cfg.getScene()?.deselect(); });
  let focus = -1;
  const gate = new ReactionGate(); // 90 s entre deux réactions ordinaires, 30 s entre deux importantes
  let prevReady: boolean[] = [false, false, false];
  let lastOrderIds: (number | undefined)[] = [];
  let alive = true;
  let wishes: ReactionWish[] = [];
  let wishTimer: number | undefined;
  let lastFeed = '';
  let lastFeedAt = 0;

  // ---------------------------------------------------------------- bulles d'information
  // PENDANT UN COMBO : les gains et annonces (« Drop : … », « Nouveau : … ») sont mis de côté puis résumés en UNE seule pastille à la fin de la chaîne ;
  // rien n'apparaît sur la voie du bas tant que les fusions s'enchaînent. Les petites infos demandées par un toucher (kind « info ») restent immédiates.
  const held: { text: string; o: FeedOpts }[] = [];
  const flushHeld = (): void => {
    if (!alive || !held.length || isBoardBusy()) return;
    const items = held.splice(0, held.length);
    if (items.length === 1) { feed(items[0].text, items[0].o); return; }
    const head = items.slice(0, 2).map((i) => i.text.replace(/^(Drop|Nouveau)\s*:\s*/i, '')).join(' · ');
    feed(`${items.length} récompenses · ${head}${items.length > 2 ? ' …' : ''}`, { kind: 'good', ms: 3400 });
  };
  const feed: EndlessEnv['feed'] = (text, o = {}) => {
    recordNotice(text); // historique des annonces (consultable)
    if (isComboBusy() && o.kind !== 'info') { if (!held.some((x) => x.text === text)) held.push({ text, o }); return; }
    const now = Date.now();
    if (text === lastFeed && now - lastFeedAt < 900) return;
    lastFeed = text;
    lastFeedAt = now;
    // une seule pastille à la fois, jamais pendant un message d'Auguste (gestionnaire central) : la voie du bas ne déborde pas sur le plateau
    notify({
      key: `feed:${text}`, channel: 'ambient', prio: o.kind === 'good' ? 1 : 0, ttl: 2500, ms: o.ms ?? 2300,
      show: () => {
        const pill = h(`div.en-pill.${o.kind ?? 'gain'}`, o.img ? h('img', { src: o.img, alt: '' }) : null, h('span', text));
        if (o.btn) {
          const b = h('button.en-pill-btn', o.btn.label);
          b.addEventListener('click', tap(() => { pill.remove(); o.btn!.fn(); }, { sound: false }));
          pill.append(b);
          pill.classList.add('has-btn');
        }
        feedEl.replaceChildren();
        feedEl.append(pill);
        return (immediate) => { if (immediate) { pill.remove(); return; } pill.classList.add('out'); window.setTimeout(() => pill.remove(), 300); };
      },
    });
  };

  const inventoryToast: EndlessEnv['inventoryToast'] = (cloth, furniture) => {
    cloth.slice(0, 2).forEach((c, i) => window.setTimeout(() => feed(`Nouveau dans ton dressing : ${clothName(c)}`, { kind: 'good', ms: 6000, btn: { label: 'Voir', fn: () => void env.openWorld('dressing') } }), 400 + i * 700));
    furniture.slice(0, 2).forEach((f, i) => window.setTimeout(() => feed(`Nouveau dans ton château : ${furnitureName(f)}`, { kind: 'good', ms: 6000, btn: { label: 'Voir', fn: () => void env.openWorld('castle') } }), 400 + i * 700));
  };

  const env: EndlessEnv = {
    def: cfg.def,
    state: cfg.getState,
    scene: cfg.getScene,
    persist: cfg.persist,
    anchor: cfg.anchor,
    push: cfg.push,
    refreshRes: cfg.refreshRes,
    openWorld: cfg.openWorld,
    challengeText: cfg.challengeText,
    feed,
    inventoryToast,
    refresh: () => refresh(),
    buyLock: (cell) => buyLock(cell),
  };

  // ---------------------------------------------------------------- réactions d'Auguste (parcimonie)
  const wish = (key: ReactionKey) => { wishes.push({ key, prio: REACTION_PRIO[key] }); };
  function flushWishes() {
    if (!wishes.length || wishTimer) return;
    wishTimer = window.setTimeout(() => {
      wishTimer = undefined;
      // pas de bulle d'Auguste PENDANT un combo ou un glissement : la réaction retenue est dite une fois la chaîne terminée
      if (isBoardBusy()) return;
      const best = bestReaction(wishes);
      wishes = [];
      if (!alive || !best) return;
      const now = Date.now();
      if (!gate.allow(now, cfg.busy(), best.prio)) return;
      const pick = () => (best.key === 'orderDone' ? pickLine('orderDone') : best.key === 'energyLow' ? pickLine('energyLow') : pickReaction(best.key));
      let text = pick();
      for (let k = 0; k < 4 && gate.repeats(text); k++) text = pick(); // jamais deux fois la même phrase de suite
      if (gate.repeats(text)) return;
      gate.mark(now, text);
      // la bulle rejoint la voie des notices sous le plateau (jamais sur les cases) ; sans cette voie, on se tait
      augusteSays(text, 2200, {
        className: 'en-aug',
        mount: (el) => {
          const dock = feedEl.parentElement;
          if (!dock) return false;
          feedEl.replaceChildren();
          dock.insertBefore(el, feedEl);
          return true;
        },
      });
    }, 1500);
  }

  const offEnd = onComboEnd(() => { flushHeld(); });
  const offBusy = onBoardBusyChange(() => {
    if (!isBoardBusy()) { flushHeld(); if (wishes.length) flushWishes(); return; }
    // un combo démarre : ce qui s'affichait juste avant (pastille, bulle d'Auguste) s'efface tout de suite, pour ne rien laisser traîner sur la voie du bas
    if (isComboBusy()) feedEl.parentElement?.querySelectorAll('.en-pill, .en-aug').forEach((e) => { e.classList.add('out'); window.setTimeout(() => e.remove(), 250); });
  });

  // ---------------------------------------------------------------- commandes
  const chip = (kind: RewardKind, n: number) => {
    const src = RES_ICON[kind](28);
    return h(`span.en-rw.${kind}`, src ? h('img', { src, alt: kind }) : h('i', kind === 'hearts' ? '♡' : '⚡'), h('b', fmt(n)));
  };

  function orderCard(m: OrderCardModel): HTMLElement {
    const st = cfg.getState();
    const o = st.orders[m.slot]!;
    const left = R.replacesLeft();
    const rep = h(`button.en-rep${left <= 0 ? '.zero' : ''}`, { 'aria-label': `Remplacer gratuitement (${left} restant${left > 1 ? 's' : ''})` }, icon('refresh', 13), h('b', String(left)));
    rep.addEventListener('click', tap(() => {
      if (R.replacesLeft() <= 0) { haptic('error'); feed('Plus de remplacement pour l\'instant · +1 toutes les 8 min de jeu ou 6 commandes', { kind: 'info', ms: 3200 }); return; }
      haptic('select');
      env.push(R.replaceOrder(cfg.getState(), cfg.def, m.slot));
    }, { sound: false }));
    const items = h('div.en-items', ...m.items.map((x) => h(`div.en-it${x.have ? '.have' : ''}`, { title: itemName(x.ref) }, h('img', { src: itemImageUrl(x.ref, 64), alt: itemName(x.ref) }), x.have ? h('i.en-ck', '✓') : h('i.en-ratio', { style: `--r:${Math.round(x.ratio * 100)}%` }))));
    const rw = h('div.en-rws', ...m.chips.filter((c) => c.kind !== 'energy').slice(0, 3).map((c) => chip(c.kind, c.n)));
    let foot: HTMLElement;
    if (m.ready) {
      foot = h('button.en-give', 'Donner');
      foot.addEventListener('click', tap(() => { haptic('select'); cfg.getScene()?.deliver(m.slot); }, { sound: false }));
    } else {
      const price = R.rushPrice(o);
      const rush = h('button.en-rush', { 'aria-label': `Terminer avec ${price} diamants (facultatif)` }, h('img', { src: diamondUrl(32), alt: '' }), String(price));
      rush.addEventListener('click', tap(async () => {
        const ok = await ui.confirm('Accélérer la commande ?', `Facultatif : terminer tout de suite pour ${price} diamants (tu en as ${fmt(wallet.diamonds())}). Tu peux aussi simplement jouer ♡`, `Oui · ${price} 💎`, 'Non merci');
        if (!ok) return;
        if (!wallet.spendDiamonds(price)) { haptic('error'); const g = await ui.confirm('Pas assez de diamants', 'Pas grave : les commandes se livrent aussi en jouant.', 'Boutique', 'Plus tard'); if (g) void openShop('diamonds'); return; }
        cfg.getScene()?.rushOrder(m.slot);
      }, { sound: false }));
      foot = h('div.en-foot', h('i.en-bar', h('b', { style: `width:${Math.round(m.ratio * 100)}%;background:${m.color}` })), rush);
    }
    // portrait rond + prénom à la place du point de couleur (même ligne, la carte ne grandit pas) ; le palier reste lisible (sous le prénom)
    const cust = o.customer ? customerById(o.customer) : undefined;
    const who = cust
      ? { av: h('img.en-av', { src: customerPortraitUrl(cust.id, 24), alt: '', 'data-cust': cust.id }), lab: h('span.en-who', h('b', cust.name), h('small', m.tierLabel)) }
      : { av: h('i.en-dot'), lab: h('span.en-lab', m.tierLabel) };
    const card = h(`div.en-card${m.ready ? '.ready' : ''}${lastOrderIds[m.slot] !== o.id ? '.fresh' : ''}`, { 'data-slot': String(m.slot), style: `--tc:${m.color}` },
      h('div.en-card-top', who.av, who.lab, rep), items, rw, foot);
    card.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('button')) return;
      const sc = cfg.getScene();
      if (m.cells.length && sc) sc.highlightCells(m.cells);
      // toucher la carte : la demande du client s'ouvre dans une petite fiche (jamais de long texte sur la carte)
      if (cust) openCustomerSheet(cust.id, o.id, m.items.map((x) => itemName(x.ref)), m.tierLabel, fun().customers);
      else feed(m.ready ? 'Prête à livrer !' : missingText(m, itemName), { kind: 'info', ms: 2200 });
    });
    return card;
  }

  function renderOrders() {
    const st = cfg.getState();
    const models = [0, 1, 2].map((s) => orderCardModel(st, s));
    const ready = models.map((m) => !!m?.ready);
    ordersEl.textContent = '';
    models.forEach((m, slot) => { ordersEl.append(m ? orderCard(m) : h('div.en-card.empty', { 'data-slot': String(slot) })); });
    const fresh = newlyReady(prevReady, ready);
    prevReady = ready;
    lastOrderIds = st.orders.map((o) => o?.id);
    if (fresh.length) {
      const m = models[fresh[0]];
      const sc = cfg.getScene();
      if (m && sc) window.setTimeout(() => sc.highlightCells(m.cells), 500);
    }
  }

  // ---------------------------------------------------------------- commande spéciale de chocolats
  function renderChoc() {
    chocEl.textContent = '';
    const o = getSpecialOrder(fun());
    if (!o || o.complete) { chocEl.classList.remove('on'); return; }
    chocEl.classList.add('on');
    const st = cfg.getState();
    const lines = o.lines.map((l) => {
      const idx = l.have < l.n ? st.cells.findIndex((c) => c.item?.c === 'choc' && c.item.l === l.l) : -1;
      const b = h(`button.en-choc-line${idx >= 0 ? '.can' : ''}`, { 'aria-label': `Chocolat niveau ${l.l}`, disabled: idx < 0 && l.have < l.n },
        h('img', { src: itemImageUrl({ c: 'choc', l: l.l }, 48), alt: '' }), h('b', `${l.have}/${l.n}`));
      b.addEventListener('click', tap(() => giveChoc(l.l, idx), { sound: false }));
      return b;
    });
    chocEl.append(h('span.en-choc-t', '🍫 Commande spéciale'), h('div.en-choc-lines', ...lines), h('span.en-choc-rw', `+${o.reward.coins} 🪙 · +${o.reward.diamonds} 💎`));
  }

  function giveChoc(level: number, idx: number) {
    if (idx < 0) { feed('Fabrique ce chocolat pour la commande spéciale', { kind: 'info' }); return; }
    const st = cfg.getState();
    if (!deliverSpecialItem(level, fun())) return;
    const r = R.stashItem(st, cfg.def, idx);
    if (r) env.push(r.ev);
    haptic('reward');
    const sc = cfg.getScene();
    sc?.flyTo('cocoa', idx, env.anchor('world'));
    feed(`Chocolat livré · ${itemName({ c: 'choc', l: level })}`, { kind: 'good' });
    const res = completeSpecialOrder(fun());
    if (res.ok && res.reward) {
      haptic('reward');
      audio.play('reward');
      feed(`Commande spéciale terminée ! +${res.reward.coins} pièces · +${res.reward.diamonds} 💎`, { kind: 'good', ms: 3800 });
      const rr = chocEl.getBoundingClientRect();
      sparkleBurst(rr.left + rr.width / 2, rr.top + rr.height / 2, { rarity: 'rare' });
      wallet.notify();
    }
    save.save();
    refresh();
  }

  // ---------------------------------------------------------------- jauge de trésor, événements secondaires, objectif
  let lastPts = -1;
  function renderStatus() {
    const f = fun();
    const tv = treasureView(f);
    const pend = pendingChests(f);
    statusEl.textContent = '';
    const tre = h(`button.en-tre${pend > 0 ? '.pending' : ''}`, { 'aria-label': pend > 0 ? `Coffres à ouvrir : ${pend}` : 'Jauge de trésor' },
      h('span.en-tre-ic', { html: chestSvg(pend > 0 ? '#FFC857' : '#B9A5E8', 26, false) }),
      h('i.en-bar.tre', h('b', { style: `width:${pct(tv.points, tv.goal)}%` })),
      h('small', pend > 0 ? `${pend} à ouvrir` : `${Math.floor(tv.points)}/${tv.goal}`),
      pend > 0 ? h('em.en-badge', String(pend)) : null);
    tre.addEventListener('click', tap(() => {
      if (pend > 0) void openChestFlow(env).then(() => refresh());
      else openTreasureSheet(env);
    }, { sound: false }));
    tre.addEventListener('contextmenu', (e) => { e.preventDefault(); openTreasureSheet(env); });
    // niveau de Radia : pastille discrète + jauge d'XP
    const xv = xpView(f);
    const lvl = h('button.en-lvl', { 'aria-label': `Niveau ${xv.level} de Radia, ${xv.into} sur ${xv.need} XP`, 'data-level': String(xv.level) },
      h('b', String(xv.level)), h('i.en-bar.thin', h('b', { style: `width:${Math.round(xv.ratio * 100)}%` })));
    lvl.addEventListener('click', tap(() => feed(`Niveau ${xv.level} · ${xv.into}/${xv.need} XP${xv.need ? '' : ' (max)'}`, { kind: 'info', ms: 2400 }), { sound: false }));
    statusEl.append(lvl);
    statusEl.append(tre);
    if (pend > 0) {
      const i = h('button.en-odds-btn', { 'aria-label': 'Probabilités des coffres' }, icon('info', 16));
      i.addEventListener('click', tap(() => openTreasureSheet(env), { sound: false }));
      statusEl.append(i);
    }
    for (const s of limitChips(secondaryView(f))) {
      const c = h('button.en-chip', { 'aria-label': `${s.name} : ${s.progress}/${s.goal}`, style: `--c:${s.color};--p:${pct(s.progress, s.goal)}%`, 'data-sec': s.id },
        h('span.en-ring', icon(secIcon(s.icon), 15)), h('b', `${s.progress}/${s.goal}`));
      c.addEventListener('click', tap(() => openSecondarySheet(env, s.id), { sound: false }));
      statusEl.append(c);
    }
    if (lastPts >= 0 && tv.points > lastPts) { tre.classList.add('bump'); window.setTimeout(() => tre.classList.remove('bump'), 400); }
    lastPts = tv.points;

    // objectif immédiat : une seule petite ligne
    const g = goals(cfg.getState(), f).immediate;
    goalEl.textContent = '';
    goalEl.append(h('i.en-target', '◎'), h('span', g.label), h('b', g.goal > 1 ? `${g.progress}/${g.goal}` : ''), h('i.en-bar.thin', h('b', { style: `width:${Math.round(g.ratio * 100)}%` })));
  }
  goalEl.addEventListener('click', tap(() => openGoalsSheet(env), { sound: false }));

  // ---------------------------------------------------------------- panneau de l'objet sélectionné (sous le plateau)
  /** Libère une case verrouillée contre de l'énergie gagnée en jouant. */
  function buyLock(cell: number) {
    const st = cfg.getState();
    const lock = st.cells[cell]?.lock;
    if (!lock) return;
    const ev = R.buyUnlock(st, cfg.def, cell, (n) => wallet.useEnergy(n), Date.now());
    if (!ev.length) {
      haptic('error');
      feed(`Il te faut ${lock.price} ⚡ pour libérer cette case · tu en gagnes en jouant`, { kind: 'info', ms: 3600, btn: cfg.openEnergy ? { label: 'Options', fn: () => cfg.openEnergy!() } : undefined });
      return;
    }
    cfg.refreshRes();
    cfg.push(ev);
  }

  const imgOf = (src: string, cls = ''): HTMLImageElement => { const i = h('img', { src, alt: '' }); if (cls) i.className = cls.replace('.', ''); return i; };

  function renderSel() {
    const st = cfg.getState();
    const cell = focus >= 0 ? st.cells[focus] : null;
    const it: ItemRef | null = cell?.item ?? null;
    const lock = cell?.lock ?? null;
    selEl.textContent = '';
    // la fiche prend la place de la rangée d'actions : celle-ci est masquée (jamais deux boutons l'un sur l'autre)
    selEl.parentElement?.classList.toggle('sel-open', !!(it || lock));
    if (!it && !lock) {
      focus = -1;
      // plus de bandeau d'aide permanent : l'état vide ne prend aucune place (l'aide vit dans le menu d'aide)
      selEl.className = 'en-sel empty';
      return;
    }
    const fn = focus;
    const info = h('button.en-sel-info', { 'aria-label': 'Infos sur cet objet' }, 'Infos');
    info.addEventListener('click', tap(() => { if (lock) openLockSheet(env, fn); else if (it) openInfoFor(env, it); }, { sound: false }));
    if (lock) {
      const v = describeLock(lock, { merges: st.merges, fun: fun() });
      selEl.className = `en-sel lock k-${lock.kind}`;
      const buy = h('button.en-sel-buy', { 'aria-label': `Libérer pour ${lock.price} énergie` }, h('span', '⚡'), h('b', String(lock.price)));
      buy.addEventListener('click', tap(() => buyLock(fn), { sound: false }));
      selEl.append(
        imgOf(lock.item ? itemImageUrl(lock.item, 64) : lockIconUrl(lock.kind, 64), '.en-sel-ic'),
        h('div.en-sel-tx', h('b', v.prize ? `${v.title} · ${v.prize.replace('Dessous : ', '')}` : v.title), h('small', v.progress ? `${v.objective} (${v.progress})` : v.objective)),
        info, buy,
      );
      return;
    }
    const r = it!;
    selEl.className = `en-sel ${r.c === 'gen' ? 'gen' : r.c === 'special' ? 'special' : 'item'}`;
    let name = itemName(r);
    let sub = '';
    let next: ItemRef | null = null;
    if (r.c === 'gen') {
      const gi = generatorInfo(r.l, genLevel(fun(), collOfKind(r.l) ?? 'flowers'));
      sub = `Niveau ${gi.level}/${gi.maxLevel} · produit « ${COLLECTIONS[gi.coll].name} » (jusqu'à ${itemName({ c: gi.coll, l: gi.maxProduced })})`;
      name = gi.name;
    } else if (r.c === 'special') {
      sub = SPECIAL_ITEMS[r.l]?.blurb ?? itemBlurb(r);
    } else {
      const max = collMax(r.c);
      sub = `${COLLECTIONS[r.c].name} · niveau ${r.l}/${max}${r.l < max ? '' : ' (maximum)'}`;
      if (r.l < max) next = { c: r.c, l: r.l + 1 };
    }
    selEl.append(imgOf(itemImageUrl(r, 64), '.en-sel-ic'), h('div.en-sel-tx', h('b', name), h('small', sub)));
    if (next) selEl.append(h('div.en-sel-next', { 'aria-label': `Niveau suivant : ${itemName(next)}`, title: itemName(next) }, h('i', '→'), imgOf(itemImageUrl(next, 48)), h('small', itemName(next))));
    selEl.append(info);
    if (sellable(r)) {
      const sell = h('button.en-sel-sell', { 'aria-label': 'Vendre cet objet' }, 'Vendre');
      sell.addEventListener('click', tap(() => { void sellItem(fn); }, { sound: false }));
      selEl.append(sell);
    }
  }

  /** Vente d'un objet avec confirmation ; protège les objets précieux et ceux qui servent à une commande. */
  async function sellItem(idx: number): Promise<void> {
    const st = cfg.getState();
    const r = st.cells[idx]?.item;
    if (!r || !sellable(r)) return;
    const used = st.orders.some((o, slot) => o && R.orderCells(st, slot)?.includes(idx));
    const value = saleValue(r);
    const warn = used ? 'Cet objet sert à une de tes commandes en cours. ' : isPrecious(r) ? 'C’est un objet précieux. ' : '';
    const v = await ui.modal({
      title: `Vendre « ${itemName(r)} » ?`,
      body: h('p', `${warn}Tu recevras ${value} pièce${value > 1 ? 's' : ''}. Tu peux aussi le mettre dans ton sac (glisse-le dessus) pour le garder ♡`),
      actions: [{ label: `Vendre (+${value} 🪙)`, value: 'y', style: used || isPrecious(r) ? 'secondary' : undefined }, { label: 'Garder', value: 'n', style: 'secondary' }],
    });
    const cur = cfg.getState().cells[idx]?.item; // l'état a pu changer pendant la confirmation
    if (v !== 'y' || !cur || cur.c !== r.c || cur.l !== r.l) return;
    const out = R.stashItem(cfg.getState(), cfg.def, idx);
    if (!out) return;
    env.push(out.ev);
    save.data.world.res.coins += value;
    haptic('reward'); audio.play('reward');
    feed(`Vendu · +${value} pièce${value > 1 ? 's' : ''}`, { kind: 'good' });
    wallet.notify(); save.save(); focus = -1; refresh();
  }

  function select(cell: number) { focus = cell; renderSel(); }
  function longPress(cell: number) {
    const st = cfg.getState();
    const c = st.cells[cell];
    if (!c) return;
    focus = cell;
    renderSel();
    if (c.lock && !c.item) openLockSheet(env, cell);
    else if (c.item) openInfoFor(env, c.item);
  }

  // ---------------------------------------------------------------- tout rafraîchir
  let lastFullHint = 0;
  /** Plateau presque plein : un seul conseil discret toutes les 3 minutes, jamais pendant une fusion. */
  function fullHint() {
    const now = Date.now();
    if (now - lastFullHint < 180_000 || cfg.busy() || isBoardBusy() || isComboBusy()) return;
    if (occupancy(cfg.getState()).ratio < FULL_HINT_RATIO) return;
    lastFullHint = now;
    feed('Ton plateau commence à être plein ♡ Range dans le sac ou vends ce qui ne sert pas.', { kind: 'info', ms: 4200 });
  }

  function refresh() {
    if (!alive) return;
    fullHint();
    renderOrders();
    renderChoc();
    renderStatus();
    renderSel();
    cfg.refreshRes();
  }

  // ---------------------------------------------------------------- événements
  function fly(kind: string, from: number, to: AnchorKey, k: number) {
    const sc = cfg.getScene();
    if (!sc || reducedFx()) return;
    window.setTimeout(() => sc.flyTo(kind, from, env.anchor(to), () => cfg.refreshRes()), 140 * k);
  }

  /** Petit « +N » qui monte près d'un compteur (jamais sur le plateau, jamais interactif). */
  function gainNear(to: AnchorKey, text: string): void {
    const a = env.anchor(to);
    if (!a || !alive) return;
    const el = h('span.en-gain', { 'aria-hidden': 'true' }, text);
    el.style.left = `${a.x}px`; el.style.top = `${a.y + 14}px`;
    layer.append(el);
    window.setTimeout(() => el.remove(), 1000);
  }

  /** Niveau gagné : une pastille qui s'illumine + une ligne discrète (jamais de fenêtre qui cache le plateau). */
  function lvlUp(to: number, unlock?: string): void {
    window.setTimeout(() => {
      const b = statusEl.querySelector('.en-lvl');
      if (b && !reducedFx()) { b.classList.add('up'); window.setTimeout(() => b.classList.remove('up'), 1400); }
      feed(`Niveau ${to} ♡${unlock ? ` · ${unlock}` : ''}`, { kind: 'good', ms: 3600 });
      audio.play('reward'); haptic('reward');
    }, 700);
  }

  function onEvents(ev: BoardEvent[], got: LootResult) {
    const sc = cfg.getScene();
    for (const e of ev) {
      switch (e.t) {
        case 'merge':
          if (e.result.c !== 'special' && e.result.c !== 'gen' && e.result.l >= 7) wish('rare');
          break;
        case 'deliver': {
          haptic('reward');
          if (e.customer && e.thanks) {
            const up = !!e.loyalty && e.loyalty.to > e.loyalty.from;
            showThanks({
              id: e.customer, text: up && e.story ? e.story : e.thanks, levelUp: up, dock: feedEl.parentElement, feed: feedEl,
              onShow: () => { if (up) { sparkleBurst(window.innerWidth / 2, window.innerHeight * 0.78, { rarity: 'rare', count: 10 }); audio.play('sparkle'); haptic('reward'); } },
            });
            if (up && e.loyalty) settleLoot([{ kind: 'coins', n: 20 * e.loyalty.to, rarity: 'rare', seed: 0 }]);
          }
          const from = e.cells[0] ?? 14;
          const g = e.gain ?? {};
          let k = 0;
          if (g.coins) fly('coin', from, 'coins', k++);
          for (const m of ['flowers', 'fabric', 'cocoa'] as const) if (g[m]) fly(m, from, 'coins', k++);
          if (e.energy) fly('energy', from, 'energy', k++);
          const parts: string[] = [];
          if (g.coins) parts.push(`+${g.coins} pièces`);
          for (const m of ['flowers', 'fabric', 'cocoa'] as const) if (g[m]) parts.push(`+${g[m]} ${RES_NAMES[m].toLowerCase()}`);
          if (e.energy) parts.push(`+${e.energy} ⚡`);
          feed(parts.length ? parts.join(' · ') : 'Commande livrée ♡', { kind: 'good', ms: 2800 });
          if (e.levelUp) {
            lvlUp(e.levelUp.to, e.levelUp.unlock);
          }
          const rr = ordersEl.querySelector(`[data-slot="${e.slot}"]`)?.getBoundingClientRect();
          if (rr) sparkleBurst(rr.left + rr.width / 2, rr.top + rr.height / 2, { rarity: e.tier === 'hard' ? 'epic' : e.tier === 'mid' ? 'rare' : 'uncommon' });
          if (e.tier === 'hard') wish('orderDone'); // seule une commande difficile mérite un mot d'Auguste
          break;
        }
        case 'orderReplace': {
          const lab = TIER_META[e.tier].label.toLowerCase();
          feed(`Commande ${lab} remplacée · ${e.left} gratuite${e.left > 1 ? 's' : ''} restante${e.left > 1 ? 's' : ''}`, { kind: 'info' });
          break;
        }
        case 'replaceGain': feed(`+${e.n} remplacement gratuit (${e.total})`, { kind: 'good' }); break;
        case 'drop': {
          sc?.dropFx(e.at, e.rarity);
          if (e.auto) {
            const fk = ({ coins: 'coin', diamonds: 'diamond', energy: 'energy', hearts: 'heart', flowers: 'flowers', fabric: 'fabric', cocoa: 'cocoa', ticket: 'ticket', chest: 'chest' } as Record<string, string>)[e.loot.kind];
            if (fk) fly(fk, e.at, e.loot.kind === 'diamonds' ? 'diamonds' : e.loot.kind === 'energy' ? 'energy' : e.loot.kind === 'hearts' ? 'hearts' : e.loot.kind === 'chest' ? 'chest' : 'coins', 0);
          }
          if (e.rarity !== 'common' || e.loot.kind !== 'coins') feed(`Drop : ${lootText(e.loot)}`, { kind: 'gain' });
          if (e.rarity === 'epic' || e.rarity === 'legendary') wish('rare');
          break;
        }
        case 'chest':
          feed(e.pending > 1 ? `Coffre gagné ! (${e.pending} à ouvrir)` : 'Coffre gagné ! Touche la jauge pour l\'ouvrir', { kind: 'good', ms: 3200 });
          haptic('reward');
          break;
        case 'discover':
          if (e.isNew) {
            if (e.item.l >= 2 && e.item.c !== 'special' && e.item.c !== 'gen') {
              const rw = e.reward.filter((l) => l.kind === 'coins' || l.kind === 'energy').map(lootText).join(' ');
              feed(`Nouveau : ${itemName(e.item)}${rw ? ` · ${rw}` : ''}`, { kind: 'good', img: itemImageUrl(e.item, 48), ms: 2600 });
            }
            if (e.completed) {
              haptic('reward');
              audio.play('reward');
              ui.toast({ title: 'Chaîne complète !', sub: `« ${COLLECTIONS[e.completed as CollectionId].name} » : récompense ajoutée ♡`, icon: 'trophy', ms: 3400 });
              sparkleBurst(window.innerWidth / 2, window.innerHeight * 0.4, { rarity: 'epic' });
              wish('maxMerge');
            } else if (e.milestone) {
              haptic('reward');
              feed('Palier d\'album atteint ! Récompense ajoutée', { kind: 'good', ms: 3000 });
            }
          }
          break;
        case 'maxMerge':
          feed(`Niveau max ! ${e.loot.filter((l) => l.kind === 'coins').map(lootText).join('')}`.trim(), { kind: 'good', ms: 2800 });
          wish('maxMerge');
          break;
        case 'unlock': {
          const d = COLLECTIONS[e.coll as CollectionId];
          haptic('reward');
          audio.play('reward');
          ui.toast({ title: 'Nouvelle collection !', sub: `${d.name} · un nouveau générateur arrive`, img: itemImageUrl({ c: 'gen', l: e.kind }, 96), ms: 3400 });
          sparkleBurst(window.innerWidth / 2, window.innerHeight * 0.35, { rarity: 'epic' });
          break;
        }
        case 'comboTier':
          // pas de bandeau : une petite icône vole vers le compteur concerné, qui s'anime avec un « +N » discret
          if (!e.capped) {
            const at = sc?.lastMerge ?? 14;
            if (e.energy) { fly('energy', at, 'energy', 0); gainNear('energy', `+${e.energy} ⚡`); }
            if (e.hearts) { fly('heart', at, 'hearts', 1); gainNear('hearts', `+${e.hearts} ♡`); }
            if (e.reward === 'wand') feed('+1 Baguette magique', { kind: 'good' });
          }
          break;
        case 'rescue':
          feed('Une Étoile filante t\'a débloqué ✨', { kind: 'info', ms: 2800 });
          break;
        case 'cellUnlock': {
          const rewards = e.reward.filter((l) => l.kind !== 'chest' || true);
          const txt = e.item ? itemName(e.item) : rewards.map(lootText).slice(0, 2).join(' · ');
          const how = e.how === 'merge' ? '' : e.how === 'order' ? ' (commande livrée)' : e.how === 'energy' ? ' (énergie)' : e.how === 'zone' ? ' (plateau agrandi)' : '';
          if (e.how !== 'zone') feed(`${e.kind === 'sand' ? 'Sable dissipé' : 'Libéré'}${txt ? ` : ${txt}` : ''}${how}`, { kind: 'good', img: e.item ? itemImageUrl(e.item, 48) : undefined, ms: 2600 });
          let k = 0;
          for (const l of rewards) {
            if (l.kind === 'diamonds') fly('diamond', e.at, 'diamonds', k++);
            else if (l.kind === 'energy') fly('energy', e.at, 'energy', k++);
            else if (l.kind === 'coins') fly('coin', e.at, 'coins', k++);
            else if (l.kind === 'chest') fly('chest', e.at, 'chest', k++);
          }
          if (e.rarity === 'epic' || e.rarity === 'legendary') wish('rare');
          break;
        }
        case 'zone':
          feed('Le plateau s\'agrandit ! Une nouvelle zone s\'ouvre ✨', { kind: 'good', ms: 3600 });
          break;
        case 'lockNew':
          feed('Une surprise est apparue sur le plateau', { kind: 'info', ms: 2200 });
          break;
        case 'invalid':
          if (e.reason === 'locked') {
            const lk = cfg.getState().cells[e.to]?.lock ?? cfg.getState().cells[e.from]?.lock;
            if (lk) feed(describeLock(lk, { merges: cfg.getState().merges, fun: fun() }).objective, { kind: 'info', ms: 3200 });
          }
          break;
        case 'secondary':
          if (e.done) {
            haptic('reward');
            const chipEl = statusEl.querySelector(`[data-sec="${e.id}"]`) ?? statusEl;
            const r = chipEl.getBoundingClientRect();
            sparkleBurst(r.left + r.width / 2, r.top + r.height / 2, { rarity: e.final ? 'epic' : 'rare' });
            const s = secondaryView(fun()).find((x) => x.id === e.id);
            feed(`Palier atteint${e.reward?.length ? ` : ${e.reward.filter((l) => l.kind !== 'chest').map(lootText).slice(0, 2).join(', ')}` : ''}`, { kind: 'good', ms: 3200 });
            void s;
            if (chipEl instanceof HTMLElement && !reducedFx()) chipEl.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.25)' }, { transform: 'scale(1)' }], { duration: 520 });
          }
          break;
        default: break;
      }
    }
    if (got.cloth.length || got.furniture.length) inventoryToast(got.cloth, got.furniture);
    flushWishes();
    refresh();
  }

  // premier rendu
  refresh();

  // aide d'accueil : une seule fois, pour une joueuse qui n'a encore livré aucune commande (jamais de bandeau permanent)
  if ((fun().endless2.counters.orders ?? 0) === 0) window.setTimeout(() => { if (alive) feed('Touche un objet · appui long pour ses infos', { kind: 'info', ms: 4500 }); }, 1500);

  return {
    env, top, layer, sel: selEl, select, longPress, feedEl, onEvents, refresh, feed,
    openChest: (force) => openChestFlow(env, force),
    destroy() {
      alive = false;
      offEnd(); offBusy();
      window.clearTimeout(wishTimer);
      layer.remove();
      selEl.remove();
    },
  };
}

export { resUse };
