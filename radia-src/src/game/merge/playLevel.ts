/**
 * Lance un niveau de fusion (ou le mode infini) : interface HTML (HUD) +
 * scène Phaser, récompenses, sauvegarde automatique. Résout à la fin.
 */
import { h, tap, clear } from '../../ui/dom';
import { icon } from '../../ui/icons';
import { ui } from '../../ui/ui';
import { game, save, audio, events } from '../../core/app';
import { addHearts, bark, checkAchievements, discover, setBarkSink, spendHearts, stat, statMax } from '../../core/progress';
import { COLLECTIONS, itemBlurb, itemName, type ItemRef } from '../../data/items';
import { CHAPTERS } from '../../data/story';
import { MergeScene, type MergeHost } from './MergeScene';
import * as R from './rules';
import type { BoardEvent, LevelDef, Objective, RunState } from './types';
import { itemImageUrl } from './textures';
import { canvasUrl } from '../art/kit';
import { medallionCanvas } from '../art/characters';
import { setBackdrop, themeForChapter } from '../scenes/backdrop';
import { openSettings } from '../../ui/screens/settings';
import { addRes } from '../../core/world';
import { mergeReward, deliverReward, levelReward, addGain, type Gain } from '../world/fusionRewards';
import { RES_NAMES, type ResKind } from '../../data/world/ids';
import { resIconUrl } from '../art/world/resources';
import { hasPhotos, photoUrl, photoUrlNow } from '../../core/photos';
import { wallet, fmt, fmtTime } from '../../core/wallet';
import { openShop, shopButton, diamondUrl, energyUrl, bagIconUrl } from '../../ui/screens/shop';
import { openEnergyPanel } from '../../ui/components/energyPanel';
import { drawRequester } from '../art/generators';
import { paint } from '../art/kit';

/** Personnages qui passent commande. */
const REQUESTERS = ['auguste', 'cat', 'florist', 'pawn'] as const;
const requesterUrl = (who: (typeof REQUESTERS)[number]) => who === 'auguste'
  ? (hasPhotos() && photoUrlNow('head-new')) || canvasUrl('med:auguste', () => medallionCanvas('auguste', { expr: 'smile' }, 120))
  : canvasUrl(`req:${who}`, () => paint(64, 64, 2, (c) => drawRequester(c, who, 64)));

export type LevelResult = 'won' | 'quit';

const PRICES = { wand: 25, wind: 10 } as const;

function objIcon(o: Objective): HTMLElement {
  if (o.t === 'create') return h('img', { src: itemImageUrl({ c: o.item[0], l: o.item[1] }, 72), alt: '' });
  const name = { orders: 'basket', gifts: 'gift', score: 'star', merges: 'sparkle', combo: 'bolt' }[o.t];
  return h('span.ic', icon(name, 22));
}

function objLabel(o: Objective, s: RunState): string {
  const p = R.objectiveProgress(s, o);
  if (o.t === 'gifts') {
    const left = s.cells.filter((c) => c.gift).length;
    return left ? `${left} paquet${left > 1 ? 's' : ''}` : 'Ouverts';
  }
  if (o.t === 'combo') return `×${p.cur}/×${p.max}`;
  return `${p.cur}/${p.max}`;
}

export function objectiveText(o: Objective): string {
  switch (o.t) {
    case 'create': return `Créer ${o.count && o.count > 1 ? o.count + ' × ' : ''}${itemName({ c: o.item[0], l: o.item[1] })}`;
    case 'orders': return `Livrer ${o.count} commande${o.count > 1 ? 's' : ''}`;
    case 'gifts': return 'Ouvrir tous les paquets cadeaux';
    case 'score': return `Atteindre ${o.value} points`;
    case 'merges': return `Réussir ${o.count} fusions`;
    case 'combo': return `Faire un combo ×${o.value}`;
  }
}

export function playLevel(def: LevelDef, mode: 'story' | 'endless' = 'story', opts: { replay?: boolean } = {}): Promise<LevelResult> {
  return new Promise((resolve) => {
    // ---------------------------------------------------------- état
    let state: RunState;
    const saved = opts.replay ? null : mode === 'endless' ? save.data.endless.run : save.data.run;
    if (saved && saved.mode === mode && (mode === 'endless' || saved.levelId === def.id) && !saved.won) state = saved;
    else {
      state = R.createRun(def, mode, mode === 'endless' ? (Date.now() >>> 0) : undefined);
      if (mode === 'endless') save.data.endless.runs++;
    }
    // anciennes parties (avant les générateurs) : on les pose sur le plateau
    R.ensureGenerators(state, def);
    const persist = () => {
      if (opts.replay) return; // une partie rejouée n'écrase pas celle de l'histoire
      if (mode === 'endless') save.data.endless.run = state;
      else save.data.run = state;
      save.save();
    };
    persist();

    // pièces et matériaux gagnés pendant ce niveau (créditent le château)
    let totalGain: Gain = {};
    const gain = (g: Gain) => {
      totalGain = addGain(totalGain, g);
      for (const [k, n] of Object.entries(g) as [ResKind, number][]) if (n) addRes(k, n);
    };
    let booster: 'wand' | 'wind' | null = null;
    let finished = false;
    let infoTimer: number | undefined;
    let scene: MergeScene | null = null;
    let invalidStreak = 0;

    // ---------------------------------------------------------- HUD
    const chapter = CHAPTERS.find((c) => c.n === def.chapter);
    const heartsEl = h('button.res-chip.interactive', { 'aria-label': 'Cœurs' }, h('span.ic', icon('heart')), h('span', fmt(save.data.hearts)));
    const energyEl = h('button.res-chip.interactive', { 'aria-label': 'Énergie' }, h('img', { src: energyUrl(52), alt: '' }), h('span', ''), h('small', ''));
    const diamondEl = h('button.res-chip.interactive', { 'aria-label': 'Diamants' }, h('img', { src: diamondUrl(52), alt: '' }), h('span', ''), h('span.plus', '+'));
    const resRow = h('div.res-row', energyEl, heartsEl, diamondEl);
    const renderRes = () => {
      const e = wallet.energy();
      (energyEl.children[1] as HTMLElement).textContent = fmt(e);
      const next = wallet.nextEnergyIn();
      (energyEl.children[2] as HTMLElement).textContent = next ? fmtTime(next) : '';
      energyEl.classList.toggle('low', e < 5);
      (diamondEl.children[1] as HTMLElement).textContent = fmt(wallet.diamonds());
    };
    const resTimer = window.setInterval(renderRes, 1000);
    energyEl.addEventListener('click', tap(() => void openEnergyPanel(false)));
    diamondEl.addEventListener('click', tap(() => void openShop('diamonds')));
    heartsEl.addEventListener('click', tap(() => ui.toast({ title: `${fmt(save.data.hearts)} cœurs`, sub: 'Gagnés en livrant les commandes · pour décorer notre petit monde', icon: 'heart' })));
    const augImg = h('img', { src: canvasUrl('med:auguste', () => medallionCanvas('auguste', { expr: 'smile' }, 120)), alt: '' });
    const aug = h('button.mh-auguste', { 'aria-label': 'Auguste' }, augImg);
    // avec le lien secret : la tête de l'illustration
    if (hasPhotos()) void photoUrl('head-new').then((u) => { if (u) augImg.src = u; });
    const titleEl = h('div.mh-title',
      h('b', mode === 'endless' ? 'Mode infini' : `${def.id}. ${def.title}`),
      h('small', mode === 'endless' ? `Record : ${save.data.endless.best}` : `Chapitre ${def.chapter} · ${chapter?.title ?? ''}`));
    const pauseBtn = h('button.icon-btn', { 'aria-label': 'Pause', on: { click: tap(() => void pause()) } }, icon('pause'));
    const objsEl = h('div.mh-objs');
    const ordersEl = h('div.mh-orders');
    const top = h('div.mh-top', h('div.mh-bar', pauseBtn, titleEl, aug), resRow, objsEl, ordersEl);

    const countEl = (k: 'wand' | 'wind') => {
      const n = save.data.boosters[k];
      return n > 0 ? h('span.count', String(n)) : h('span.count.buy', `${PRICES[k]}♡`);
    };
    const wandBtn = h('button.booster', { 'aria-label': 'Baguette magique' }, icon('wand'), h('small', 'Baguette'));
    const windBtn = h('button.booster', { 'aria-label': 'Souffle' }, icon('wind'), h('small', 'Souffle'));
    const hintBtn = h('button.booster', { 'aria-label': 'Indice' }, icon('hint'), h('small', 'Indice'));
    const refreshBoosters = () => {
      for (const [btn, k] of [[wandBtn, 'wand'], [windBtn, 'wind']] as const) {
        btn.querySelector('.count')?.remove();
        btn.append(countEl(k));
        btn.classList.toggle('active', booster === k);
      }
    };
    const bagBtn = h('button.booster.bag-btn', { 'aria-label': 'Sac' }, h('img', { src: bagIconUrl(), alt: '', style: 'width:30px;height:30px' }), h('small', 'Sac'), h('span.count', ''));
    const renderBag = () => { (bagBtn.querySelector('.count') as HTMLElement).textContent = `${wallet.bag().length}/${wallet.bagSlots()}`; };
    bagBtn.addEventListener('click', tap(() => void openBag()));
    const bottom = h('div.mh-bottom', h('div.mh-side', wandBtn, hintBtn), h('div.mh-side', bagBtn, windBtn, shopButton()));
    const hud = h('div.merge-hud', top, bottom);
    ui.root.append(hud);
    refreshBoosters();
    renderRes();
    renderBag();
    let skinNow = wallet.skin();
    const offEco = events.on('economy', () => {
      renderRes();
      renderBag();
      refreshBoosters();
      if (wallet.skin() !== skinNow) { skinNow = wallet.skin(); scene?.layout(); }
    });
    const offBoost = events.on('boosters', () => refreshBoosters());

    const info = (html: Node | string, ms = 2600) => {
      hud.querySelector('.mh-info')?.remove();
      window.clearTimeout(infoTimer);
      const el = h('div.mh-info', html);
      hud.append(el);
      if (ms > 0) infoTimer = window.setTimeout(() => el.remove(), ms);
    };
    const clearInfo = () => { hud.querySelector('.mh-info')?.remove(); };

    const offHearts = events.on('hearts', (n) => {
      (heartsEl.lastChild as HTMLElement).textContent = fmt(n);
      heartsEl.classList.add('bump');
      window.setTimeout(() => heartsEl.classList.remove('bump'), 200);
    });

    setBarkSink((text) => {
      const r = aug.getBoundingClientRect();
      ui.bubble(text, Math.max(10, r.right - 240), r.bottom + 70, 3200);
    });

    aug.addEventListener('click', tap(() => {
      stat('augusteTaps');
      bark('tapAuguste', true);
      checkAchievements();
    }, { sound: false }));

    // ---------------------------------------------------------- objectifs / commandes
    const renderObjectives = (pulse = -1) => {
      clear(objsEl);
      if (mode === 'endless') {
        const ch = state.challenge;
        const pr = R.challengeProgress(state);
        objsEl.append(h('span.obj-chip', h('span.ic', icon('star', 20)), h('span.mh-score', `${state.score}`)));
        if (ch && pr) {
          objsEl.append(h('span.obj-chip', objIcon(ch.obj), `${objectiveText(ch.obj)} · ${ch.obj.t === 'combo' ? `×${pr.cur}/×${pr.max}` : `${pr.cur}/${pr.max}`}`));
        }
        return;
      }
      def.objectives.forEach((o, i) => {
        const done = R.objectiveDone(state, o);
        const chip = h(`span.obj-chip${done ? '.done' : ''}${pulse === i ? '.pulse' : ''}`, { title: objectiveText(o) }, objIcon(o), objLabel(o, state));
        objsEl.append(chip);
      });
    };

    const renderOrders = () => {
      clear(ordersEl);
      state.orders.forEach((o, slot) => {
        if (!o) return;
        const cells = R.orderCells(state, slot);
        const have = new Set<number>();
        const imgs = o.items.map((r) => {
          const idx = state.cells.findIndex((c, i) => !have.has(i) && c.item?.c === r.c && c.item.l === r.l);
          if (idx >= 0) have.add(idx);
          return h(`img${idx >= 0 ? '' : '.missing'}`, { src: itemImageUrl(r, 76), alt: itemName(r), title: itemName(r) });
        });
        const give = h('button.btn.small.give', { disabled: !cells, on: { click: tap(() => { if (scene?.deliver(slot)) { /* animé */ } }) } }, 'Donner');
        const who = REQUESTERS[o.id % REQUESTERS.length];
        const rush = cells ? null : h('button.rush', { 'aria-label': 'Terminer avec des diamants' }, h('img', { src: diamondUrl(32), alt: '' }), String(R.rushPrice(o)));
        rush?.addEventListener('click', tap(async () => {
          const price = R.rushPrice(o);
          const ok = await ui.confirm('Accélérer la commande ?', `Terminer la commande tout de suite pour ${price} diamants (tu en as ${fmt(wallet.diamonds())}).`, `Oui · ${price} 💎`, 'Non');
          if (!ok) return;
          if (!wallet.spendDiamonds(price)) { const g = await ui.confirm('Pas assez de diamants', 'La carte d\'Auguste peut arranger ça… 😌', 'Boutique', 'Plus tard'); if (g) void openShop('diamonds'); return; }
          scene?.rushOrder(slot);
        }));
        const card = h(`div.order.interactive${cells ? '.ready' : ''}`, { 'data-slot': String(slot) },
          h('img.who', { src: requesterUrl(who), alt: '' }), rush, h('div.items', ...imgs), h('span.reward', `+${R.orderHearts(o)} ♡`), give);
        ordersEl.append(card);
      });
    };

    const refresh = () => { renderObjectives(); renderOrders(); };
    refresh();

    // ---------------------------------------------------------- hôte de la scène
    const host: MergeHost = {
      area: () => ({ top: top.getBoundingClientRect().bottom + 8, bottom: bottom.getBoundingClientRect().top - 4 }),
      onEvents: (ev: BoardEvent[], s: RunState) => onEvents(ev, s),
      onWin: () => void win(),
      onInspect: (r: ItemRef | null) => {
        if (!r) { clearInfo(); return; }
        const coll = r.c === 'special' ? 'Objet spécial' : r.c === 'gen' ? 'Générateur · touche-le pour produire' : `${COLLECTIONS[r.c].name} · niveau ${r.l}`;
        info(h('div', h('b', itemName(r)), h('small', ` — ${coll}`), h('div', itemBlurb(r))), 3200);
      },
      booster: () => booster,
      boosterUsed: (kind, ok) => {
        if (ok) {
          save.data.boosters[kind] = Math.max(0, save.data.boosters[kind] - 1);
          save.save();
          stat(kind === 'wand' ? 'wandsUsed' : 'windsUsed');
        }
        booster = null;
        clearInfo();
        refreshBoosters();
      },
      orderAnchor: (slot) => {
        const el = ordersEl.querySelector(`[data-slot="${slot}"]`);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      },
      heartsAnchor: () => { const r = heartsEl.getBoundingClientRect(); return { x: r.left + 14, y: r.top + r.height / 2 }; },
      onStuck: () => void stuck(),
      onFull: () => info('Plus de place ! Fusionne ou livre une commande.', 2200),
      onActivity: () => { /* rien */ },
      useEnergy: (n) => {
        if (wallet.useEnergy(n)) { renderRes(); return true; }
        energyEl.classList.add('bump');
        window.setTimeout(() => energyEl.classList.remove('bump'), 250);
        void openEnergyPanel(true);
        return false;
      },
      overBag: (x, y) => {
        const r = bagBtn.getBoundingClientRect();
        return x > r.left - 24 && x < r.right + 24 && y > r.top - 30 && y < r.bottom + 20;
      },
      bagHasRoom: () => wallet.bagHasRoom(),
      bagPut: (r) => { wallet.bagPut(r); bagBtn.classList.add('drop'); window.setTimeout(() => bagBtn.classList.remove('drop'), 300); },
      bagAnchor: () => { const r = bagBtn.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; },
      onBagFull: () => info(`Sac plein (${wallet.bagSlots()} places) · agrandis-le dans la boutique`, 2400),
      skin: () => wallet.skin(),
      fxStyle: () => wallet.fxStyle(),
    };

    // ---------------------------------------------------------- sac
    async function openBag() {
      const items = wallet.bag();
      const grid = h('div.bag-grid');
      let pickedIndex = -1;
      for (let k = 0; k < wallet.bagSlots(); k++) {
        const it = items[k];
        if (!it) { grid.append(h('div.bag-cell.empty')); continue; }
        const b = h('button.bag-cell', { 'aria-label': itemName(it) }, h('img', { src: itemImageUrl(it, 80), alt: '' }));
        b.addEventListener('click', tap(() => { pickedIndex = k; (document.querySelector('.modal-backdrop:last-child .actions button') as HTMLElement)?.click(); }));
        grid.append(b);
      }
      const v = await ui.modal({
        title: 'Le sac de Radia',
        body: h('div', h('p', { style: 'margin:0 0 6px;font-size:15px' }, items.length ? 'Touche un objet pour le poser sur le plateau.' : 'Glisse un objet du plateau jusqu\'au sac pour le garder pour plus tard.'), grid),
        actions: [{ label: 'Fermer', value: 'close', style: 'secondary' }, { label: 'Agrandir le sac', value: 'more', style: 'gold' }],
      });
      if (v === 'more') { void openShop('spend'); return; }
      if (pickedIndex >= 0) {
        const it = wallet.bag()[pickedIndex];
        if (!it) return;
        if (scene?.placeFromBag(it)) wallet.bagTake(pickedIndex);
        else info('Plus de place sur le plateau !', 2000);
      }
    }

    const toggleBooster = (k: 'wand' | 'wind') => {
      if (finished) return;
      if (booster === k) { booster = null; clearInfo(); refreshBoosters(); return; }
      if (save.data.boosters[k] <= 0) {
        void ui.confirm(k === 'wand' ? 'Baguette magique' : 'Souffle',
          `${k === 'wand' ? 'Fait monter un objet d\'un niveau.' : 'Retire un objet du plateau.'} En acheter une pour ${PRICES[k]} cœurs ? (Tu en as ${save.data.hearts}.)`,
          'Acheter', 'Non merci').then((yes) => {
          if (!yes) return;
          if (spendHearts(PRICES[k])) { save.data.boosters[k]++; save.save(); refreshBoosters(); audio.play('reward'); }
          else ui.toast({ title: 'Pas assez de cœurs', sub: 'Livre des commandes pour en gagner ♡', icon: 'heart' });
        });
        return;
      }
      booster = k;
      refreshBoosters();
      info(k === 'wand' ? 'Touche un objet pour le faire monter d\'un niveau ✨' : 'Touche un objet à retirer du plateau 🍃', 0);
    };
    wandBtn.addEventListener('click', tap(() => toggleBooster('wand')));
    windBtn.addEventListener('click', tap(() => toggleBooster('wind')));
    hintBtn.addEventListener('click', tap(() => {
      if (!scene?.showHint()) info(R.emptyCount(state) > 0 ? 'Aucune fusion possible : touche un générateur !' : 'Plateau bloqué… essaie le Souffle.', 2400);
    }));

    // ---------------------------------------------------------- événements
    function onEvents(ev: BoardEvent[], s: RunState) {
      let pulse = -1;
      for (const e of ev) {
        if (e.t === 'merge') {
          stat('merges');
          invalidStreak = 0;
          gain(mergeReward(e.result, e.combo));
          isNew(e.result);
          if (e.result.l >= 7) bark('rare');
        } else if (e.t === 'spawn' || e.t === 'giftOpen' || e.t === 'upgrade') {
          isNew(e.item);
          if (e.t === 'giftOpen') stat('giftsOpened');
        } else if (e.t === 'deliver') {
          addHearts(e.hearts);
          stat('ordersDelivered');
          gain(deliverReward(e.items ?? [], e.hearts));
          // récompenses de commande : un peu d'énergie, parfois un diamant
          wallet.giveEnergy(3);
          if ((save.data.stats.ordersDelivered ?? 0) % 3 === 0) { wallet.giveDiamonds(1); ui.toast({ title: '+1 diamant', sub: 'Pour ta commande ♡', img: diamondUrl(64), ms: 1600 }); }
        } else if (e.t === 'combo') {
          statMax('bestCombo', e.value);
          if (e.value >= 5) { bark('combo5'); wallet.giveEnergy(5); } else if (e.value >= 3) bark('combo3');
          if (e.reward === 'wand') { save.data.boosters.wand++; refreshBoosters(); ui.toast({ title: 'Combo ×8 !', sub: '+1 Baguette magique', icon: 'wand' }); }
          if (e.reward === 'hearts') addHearts(e.value >= 12 ? 15 : 5);
          if (e.reward === 'star') ui.toast({ title: `Combo ×${e.value} !`, sub: 'Une Étoile filante est apparue ✨', icon: 'sparkle' });
        } else if (e.t === 'invalid') {
          invalidStreak++;
          if (invalidStreak >= 3) { bark('invalid'); invalidStreak = 0; }
          if (e.reason === 'max') info('Cet objet est déjà au niveau maximum ✨', 2000);
        } else if (e.t === 'challenge') {
          save.data.endless.challenges++;
          addHearts(e.reward);
          ui.toast({ title: 'Défi réussi !', sub: `+${e.reward} cœurs ♡`, icon: 'star' });
          audio.play('reward');
        }
      }
      if (mode !== 'endless') def.objectives.forEach((o, i) => { if (R.objectiveDone(s, o) && !objsEl.children[i]?.classList.contains('done')) pulse = i; });
      if (mode === 'endless' && s.score > save.data.endless.best) save.data.endless.best = s.score;
      renderObjectives(pulse);
      renderOrders();
      persist();
      checkAchievements();
    }

    function isNew(r: ItemRef) {
      if (!discover(r)) return;
      if (r.l >= 2 || r.c === 'special') {
        ui.toast({ title: `Nouveau : ${itemName(r)}`, sub: itemBlurb(r), img: itemImageUrl(r, 96), ms: 2400 });
        if (r.l >= 4) bark('discover');
      }
    }

    // ---------------------------------------------------------- pause / blocage
    async function pause() {
      if (finished) return;
      const v = await ui.modal({
        title: 'Pause',
        body: mode === 'endless' ? `Score : ${state.score} · Record : ${save.data.endless.best}` : h('div', ...def.objectives.map((o) => h('p', { style: 'margin:4px 0' }, `${R.objectiveDone(state, o) ? '✓' : '○'} ${objectiveText(o)}`))),
        actions: [
          { label: 'Reprendre', value: 'resume' },
          { label: 'Paramètres', value: 'settings', style: 'secondary' },
          { label: mode === 'endless' ? 'Nouvelle partie' : 'Recommencer le niveau', value: 'restart', style: 'secondary' },
          { label: 'Quitter vers le menu', value: 'quit', style: 'lavande' },
        ],
      });
      if (v === 'settings') { await openSettings(); return; }
      if (v === 'restart') {
        if (!(await ui.confirm('Recommencer ?', 'Le plateau sera remis à zéro.', 'Recommencer', 'Annuler'))) return;
        state = R.createRun(def, mode, mode === 'endless' ? (Date.now() >>> 0) : undefined);
        persist();
        restartScene();
        refresh();
        return;
      }
      if (v === 'quit') finish('quit');
    }

    let stuckOpen = false;
    async function stuck() {
      if (finished || stuckOpen || !R.isStuck(state)) return;
      stuckOpen = true;
      bark('stuck');
      const v = await ui.modal({
        title: 'Plus de place !',
        body: 'Aucune fusion possible et le plateau est plein. Le Souffle magique va libérer quelques cases (gratuit).',
        actions: [{ label: 'Souffle magique ✨', value: 'go' }],
        dismissible: false,
      });
      stuckOpen = false;
      if (v === 'go') scene?.recover();
    }

    // ---------------------------------------------------------- victoire
    async function win() {
      if (finished) return;
      const stars = R.stars(state, def);
      const rec = save.data.levels[def.id];
      const first = !rec?.done;
      save.data.levels[def.id] = { stars: Math.max(stars, rec?.stars ?? 0), best: Math.max(state.score, rec?.best ?? 0), done: true };
      const reward = first ? def.reward.hearts : Math.ceil(def.reward.hearts / 3);
      addHearts(reward);
      gain(levelReward(def.reward.hearts, first));
      const gems = first && mode === 'story' ? (def.id % 6 === 0 ? 10 : 3) : 0;
      if (first) {
        if (def.reward.wand) save.data.boosters.wand += def.reward.wand;
        if (def.reward.wind) save.data.boosters.wind += def.reward.wind;
        wallet.giveDiamonds(gems);
      }
      wallet.giveEnergy(first ? 15 : 5);
      stat('levelsWon');
      if (!opts.replay) save.data.run = null;
      save.save();
      checkAchievements();
      bark('win');

      if (def.id === 30 && mode === 'story' && !opts.replay) {
        await scene?.finale();
        finish('won');
        return;
      }
      scene?.celebrate(stars);
      audio.play('victory');
      audio.duck(0.5, 2);
      await new Promise((r) => window.setTimeout(r, 700));
      const body = h('div',
        h('div.win-stars', ...[1, 2, 3].map((k) => h(`span${k <= stars ? '.on' : ''}`, '★'))),
        h('div.win-stats',
          h('span.chip', icon('star', 16), `${state.score} pts`),
          ...(['coins', 'flowers', 'fabric', 'cocoa'] as const).map((k) => totalGain[k]
            ? h('span.chip', h('img', { src: resIconUrl(k, 32), alt: RES_NAMES[k], style: 'width:20px;height:20px' }), `+${fmt(totalGain[k]!)}`)
            : null),
          h('span.chip', { style: 'color:#E8558F' }, icon('heart', 16), `+${reward + state.hearts}`),
          gems ? h('span.chip', h('img', { src: diamondUrl(32), alt: '', style: 'width:18px;height:18px' }), `+${gems}`) : null,
          h('span.chip', h('img', { src: energyUrl(32), alt: '', style: 'width:18px;height:18px' }), `+${first ? 15 : 5}`)),
        stars < 3 ? h('p.muted', { style: 'font-size:14px;margin:6px 0 0' }, `3 étoiles : toucher les générateurs ${def.par} fois au plus (${state.taps} cette fois).`) : h('p', { style: 'margin:6px 0 0' }, 'Parfait ! ✨'),
        first && (def.reward.wand || def.reward.wind) ? h('p', { style: 'margin:4px 0 0;font-size:15px' }, `Bonus : ${def.reward.wand ? '+1 Baguette ' : ''}${def.reward.wind ? '+1 Souffle' : ''}`) : null,
      );
      await ui.modal({ title: 'Niveau réussi !', body, actions: [{ label: 'Continuer', value: 'ok' }], dismissible: false });
      finish('won');
    }

    // ---------------------------------------------------------- scène
    const g = game();
    const startScene = () => {
      if (!g.scene.getScene(MergeScene.KEY)) g.scene.add(MergeScene.KEY, MergeScene, false);
      g.scene.start(MergeScene.KEY, { def, state, host });
      scene = g.scene.getScene(MergeScene.KEY) as MergeScene;
    };
    const restartScene = () => {
      g.scene.stop(MergeScene.KEY);
      startScene();
    };
    setBackdrop(mode === 'endless' ? 'monde' : themeForChapter(def.chapter));
    // laisser le HUD se mettre en place avant de mesurer la zone libre
    requestAnimationFrame(() => requestAnimationFrame(startScene));

    function finish(r: LevelResult) {
      if (finished) return;
      finished = true;
      persist();
      if (r === 'won' && mode === 'story' && !opts.replay) { save.data.run = null; save.save(); }
      offHearts();
      offEco();
      offBoost();
      window.clearInterval(resTimer);
      setBarkSink(null);
      window.clearTimeout(infoTimer);
      hud.style.transition = 'opacity 0.3s';
      hud.style.opacity = '0';
      window.setTimeout(() => hud.remove(), 320);
      g.scene.stop(MergeScene.KEY);
      resolve(r);
    }
  });
}
