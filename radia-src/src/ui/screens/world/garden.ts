import '../../styles/world-garden.css';
/**
 * « Jardin royal » : parcelles tactiles, plantation, récolte, fusion des
 * fleurs, atelier de bouquets. Règles : src/game/world/garden.ts (pures).
 */
import { h, tap } from '../../dom';
import { ui } from '../../ui';
import { icon } from '../../icons';
import { save, audio, events, reducedFx } from '../../../core/app';
import { addHearts, checkAchievements, stat } from '../../../core/progress';
import { firstTime } from '../../../core/world';
import { wallet, fmt, fmtTime } from '../../../core/wallet';
import { FLOWER_NAMES, RES_NAMES, type FlowerId } from '../../../data/world/ids';
import { bloom, bloomAt, sparkleBurst } from '../../fx/sparkle';
import { BOUQUET_MAX, BOUQUET_MIN, FLOWERS, FUSION_COST, MAX_PLOTS, nextFlower } from '../../../data/world/garden';
import * as G from '../../../game/world/garden';
import { drawBouquet, drawFlower, drawFlowerSilhouette, drawGardenScene, plotLayout, type ScenePlot, type Stage } from '../../../game/art/world/garden';
import { canvasUrl, paint } from '../../../game/art/kit';
import { reactAuguste } from '../../../game/world/auguste';
import { playLines } from '../../components/Dialogue';
import { diamondUrl } from '../shop';
import { setBackdrop } from '../../../game/scenes/backdrop';

const world = () => save.data.world;
const commit = () => { save.save(); events.emit('economy', undefined); };
const now = () => Date.now();

export const flowerUrl = (id: FlowerId, stage: Stage = 3, size = 72) => canvasUrl(`gd:f:${id}:${stage}:${size}`, () => paint(size, size, 2, (c) => drawFlower(c, id, stage, size)));
const silUrl = (id: FlowerId, size = 72) => canvasUrl(`gd:s:${id}:${size}`, () => paint(size, size, 2, (c) => drawFlowerSilhouette(c, id, size)));
const bouquetUrl = (ids: string[], size = 120) => canvasUrl(`gd:b:${[...ids].join('+')}:${size}`, () => paint(size, size, 2, (c) => drawBouquet(c, ids, size)));

const costText = (id: FlowerId) => {
  const c = FLOWERS[id].cost;
  return Object.entries(c).map(([k, n]) => `${n} ${RES_NAMES[k as keyof typeof RES_NAMES].toLowerCase()}`).join(' + ');
};

type Exit = 'back' | 'decor';

export async function openGarden(): Promise<void> {
  for (;;) {
    const r = await runGarden();
    if (r !== 'decor') return;
    const m = await import('../decor');
    await m.openDecor();
  }
}

function runGarden(): Promise<Exit> {
  return new Promise((resolve) => {
    setBackdrop('monde');
    G.syncGarden(world(), now());
    save.save();

    const cv = h('canvas.gd-canvas');
    const fx = h('div.gd-fx');
    const stage = h('div.gd-stage', cv, fx);
    const chips = h('div.gd-chips');
    const sheetHost = h('div.gd-host');
    const bar = h('div.gd-bar');
    const scr = h('div.bg-soft.gd-screen', ui.header('Jardin royal', () => close('back')), chips, stage, bar, sheetHost);
    ui.showScreen(scr);

    const popAt = new Map<number, number>();
    const lastStage = new Map<number, number>();
    let raf = 0, last = 0, closed = false;
    const t0 = performance.now();

    // ------------------------------------------------------------ scène
    const scenePlots = (): (ScenePlot | null)[] => {
      const n = now();
      return world().garden.plots.map((p, i) => {
        if (!p || !p.flower || !G.isFlower(p.flower)) return null;
        const pa = popAt.get(i);
        return { flower: p.flower, stage: G.stageAt(p, n), progress: G.progress(p, n), pop: pa === undefined ? undefined : (performance.now() - pa) / 1000 };
      });
    };
    const draw = (t: number) => {
      if (closed) return;
      raf = requestAnimationFrame(draw);
      if (t - last < 50) return;
      last = t;
      const r = cv.getBoundingClientRect();
      if (!r.width) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.round(r.width), hh = Math.round(r.height);
      if (cv.width !== w * dpr || cv.height !== hh * dpr) { cv.width = w * dpr; cv.height = hh * dpr; }
      const ctx = cv.getContext('2d')!;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const sp = scenePlots();
      sp.forEach((p, i) => {
        const st = p ? p.stage : -1;
        const prev = lastStage.get(i);
        if (prev !== undefined && prev !== st && st === 3) { audio.play('sparkle'); popAt.set(i, performance.now()); }
        lastStage.set(i, st);
      });
      drawGardenScene(ctx, w, hh, sp, reducedFx() ? 0 : (t - t0) / 1000, dpr);
    };
    raf = requestAnimationFrame(draw);

    // ------------------------------------------------------------ puces & barre
    const refresh = () => {
      const w = world();
      chips.textContent = '';
      chips.append(
        h('span.chip', icon('flower', 16), h('b', fmt(w.res.flowers))),
        h('span.chip.gold', h('i.coin'), h('b', fmt(w.res.coins))),
        h('span.chip', h('img', { src: diamondUrl(32), alt: '', style: 'width:18px;height:18px' }), h('b', fmt(wallet.diamonds()))),
      );
      bar.textContent = '';
      const b = (label: string, ic: string, fn: () => void, cls = '') => h(`button.btn.small${cls}`, { on: { click: tap(fn) } }, icon(ic, 18), label);
      const bq = G.bouquetCount(w);
      bar.append(
        b('Fleurs', 'basket', () => openInventory()),
        b(bq ? `Bouquets (${bq})` : 'Bouquets', 'gift', () => openAtelier(), '.lavande'),
        b('Allées', 'sparkle', () => close('decor'), '.secondary'),
      );
      if (G.canBuyPlot(w)) bar.append(h('button.btn.small.gold.gd-plot-btn', { on: { click: tap(buyPlot) } }, `+ Parcelle · ${fmt(G.nextPlotPrice(w))}`));
    };
    const off = events.on('economy', refresh);
    const offH = events.on('hearts', refresh);
    const tick = window.setInterval(() => { if (!sheetHost.firstChild) refreshSheetLess(); }, 1000);
    const refreshSheetLess = () => { /* la scène se met à jour seule */ };
    refresh();

    // ------------------------------------------------------------ effets
    const pos = (i: number) => {
      const r = cv.getBoundingClientRect();
      const lay = plotLayout(world().garden.plots.length, r.width, r.height)[i];
      return { x: lay.x + lay.w / 2, y: lay.y + lay.h * 0.5 };
    };
    const burst = (x: number, y: number, kind: 'petal' | 'spark', n: number) => {
      if (reducedFx()) n = Math.ceil(n / 3);
      for (let k = 0; k < n; k++) {
        const a = Math.random() * Math.PI * 2, d = 40 + Math.random() * 70;
        const el = h(`i.gd-p.${kind}`, { style: `left:${x}px;top:${y}px;--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d - 30}px;--r:${Math.random() * 360}deg;--c:${['#FFB3CC', '#FF75A8', '#FFFFFF', '#F5B5C8', '#F3C86B'][k % 5]}` });
        fx.append(el);
        window.setTimeout(() => el.remove(), 1000);
      }
    };
    const floatText = (x: number, y: number, text: string) => {
      const el = h('div.gd-float', { style: `left:${x}px;top:${y}px` }, text);
      fx.append(el);
      window.setTimeout(() => el.remove(), 1500);
    };

    // ------------------------------------------------------------ interactions
    cv.addEventListener('click', (e) => {
      if (sheetHost.firstChild) return;
      const r = cv.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      const lay = plotLayout(world().garden.plots.length, r.width, r.height);
      const i = lay.findIndex((l) => x >= l.x && x <= l.x + l.w && y >= l.y && y <= l.y + l.h);
      if (i < 0) return;
      const p = world().garden.plots[i];
      if (!p || !p.flower) { audio.play('pop1'); openPicker(i); }
      else if (G.isReady(p, now())) doHarvest(i);
      else { audio.play('pop1'); openGrowing(i); }
    });

    function doHarvest(i: number) {
      const res = G.harvest(world(), i, now());
      if (!res.ok || !res.id) return;
      commit();
      stat('world.garden.harvested');
      audio.play('pop3'); window.setTimeout(() => audio.play('sparkle'), 120);
      const { x, y } = pos(i);
      burst(x, y, 'petal', 16); burst(x, y, 'spark', 8);
      floatText(x, y - 20, `+1 ${FLOWER_NAMES[res.id]}`);
      window.setTimeout(() => floatText(x, y + 4, `+${res.flowers} fleurs`), 250);
      popAt.set(i, performance.now());
      for (const u of res.unlocked ?? []) {
        window.setTimeout(() => { const cr = cv.getBoundingClientRect(); bloomAt(cr.left + x, cr.top + y); sparkleBurst(cr.left + x, cr.top + y, { rarity: 'rare', count: 10 }); audio.play('rare'); ui.toast({ title: `Nouvelle variété : ${FLOWER_NAMES[u]}`, sub: 'Tu peux la planter !', img: flowerUrl(u, 3, 72) }); }, 500);
      }
      reactAuguste('flowers', 0.12);
      checkAchievements();
    }

    function buyPlot() {
      const r = G.buyPlot(world());
      if (!r.ok) { audio.play('invalid'); ui.toast({ title: r.reason ?? 'Impossible', sub: 'Gagne des pièces en fusionnant ♡', icon: 'lock' }); return; }
      commit(); audio.play('chest');
      ui.toast({ title: 'Nouvelle parcelle !', sub: `${world().garden.plotCount} parcelles`, icon: 'flower' });
      const i = world().garden.plotCount - 1;
      popAt.set(i, performance.now());
    }

    // ------------------------------------------------------------ feuilles (sheets)
    function sheet(title: string, body: HTMLElement, onClose?: () => void): { close: () => void; body: HTMLElement } {
      const bodyEl = h('div.gd-sheet-body', body);
      const layer = h('div.gd-layer');
      const closeIt = () => { layer.classList.add('out'); window.setTimeout(() => { layer.remove(); onClose?.(); }, 180); };
      const sh = h('div.gd-sheet', { role: 'dialog' },
        h('div.gd-sheet-head', h('h3', title), h('button.icon-btn', { 'aria-label': 'Fermer', on: { click: tap(closeIt) } }, icon('close'))), bodyEl);
      layer.append(sh);
      layer.addEventListener('click', (e) => { if (e.target === layer) closeIt(); });
      sheetHost.append(layer);
      return { close: closeIt, body: bodyEl };
    }

    function openPicker(i: number) {
      const list = h('div.gd-list');
      const s = sheet('Que planter ?', list);
      const render = () => {
        list.textContent = '';
        const w = world();
        for (const id of G.FUSION_ORDER) {
          const d = FLOWERS[id];
          const un = G.isUnlocked(w, id);
          let action: HTMLElement;
          if (un) {
            const ok = (Object.entries(d.cost) as [keyof typeof w.res, number][]).every(([k, n]) => w.res[k] >= n);
            action = h(`button.btn.small${ok ? '' : '.locked'}`, { on: { click: tap(() => plantIt(id)) } }, 'Planter');
          } else {
            const auto = d.unlockHarvest;
            const got = auto ? G.totalHarvested(w, auto.from) : 0;
            action = h('button.btn.small.gold', { on: { click: tap(() => unlockIt(id)) } }, icon('lock', 14), ` ${fmt(d.unlockCoins)}`);
            void got;
          }
          const sub = un
            ? `${fmtTime(d.growMs)} · ${costText(id)}`
            : d.unlockHarvest ? `Récolte ${d.unlockHarvest.n} × ${FLOWER_NAMES[d.unlockHarvest.from]} (${Math.min(d.unlockHarvest.n, G.totalHarvested(w, d.unlockHarvest.from))}/${d.unlockHarvest.n}) ou paie` : '';
          list.append(h(`div.gd-row${un ? '' : '.locked'}`,
            h('img', { src: un ? flowerUrl(id, 3, 64) : silUrl(id, 64), alt: '' }),
            h('div.grow', h('b', un ? FLOWER_NAMES[id] : '???'), h('small', sub)),
            action));
        }
      };
      const plantIt = (id: FlowerId) => {
        const r = G.plant(world(), i, id, now());
        if (!r.ok) { audio.play('invalid'); ui.toast({ title: r.reason ?? 'Impossible', sub: costText(id) + ' nécessaire', icon: 'lock' }); return; }
        commit(); stat('world.garden.planted');
        audio.play('drop'); window.setTimeout(() => audio.play('pop2'), 120);
        popAt.set(i, performance.now());
        s.close();
        const { x, y } = pos(i);
        window.setTimeout(() => { burst(x, y + 20, 'spark', 6); }, 200);
        if (firstTime('tip.garden.grow')) ui.toast({ title: 'Ça pousse tout seul ♡', sub: 'Reviens quand tu veux : rien ne se fane jamais', icon: 'flower', ms: 3600 });
        reactAuguste('garden', 0.2);
      };
      const unlockIt = (id: FlowerId) => {
        const r = G.unlockWithCoins(world(), id);
        if (!r.ok) { audio.play('invalid'); ui.toast({ title: r.reason ?? 'Impossible', icon: 'lock' }); return; }
        commit(); audio.play('rare');
        bloomAt(window.innerWidth / 2, 110);
        ui.toast({ title: `${FLOWER_NAMES[id]} débloquée`, img: flowerUrl(id, 3, 72) });
        render();
      };
      render();
    }

    function openGrowing(i: number) {
      const p = world().garden.plots[i];
      if (!p || !p.flower || !G.isFlower(p.flower)) return;
      const id = p.flower;
      const timer = h('b.gd-timer');
      const btn = h('button.btn.gold.wide');
      const body = h('div.gd-grow',
        h('img', { src: flowerUrl(id, G.stageAt(p, now()), 96), alt: '' }),
        h('h4', FLOWER_NAMES[id]), timer,
        h('div.bar', h('i.gd-bar-i')),
        btn,
        h('small', 'Aucune pression : elle t\'attend, même plusieurs jours.'));
      const s = sheet('En train de pousser', body);
      const upd = () => {
        const pp = world().garden.plots[i];
        if (!pp || !G.isFlower(pp.flower ?? '')) { s.close(); return; }
        const n = now();
        if (G.isReady(pp, n)) { s.close(); doHarvest(i); return; }
        timer.textContent = `Encore ${fmtTime(G.remainingMs(pp, n))}`;
        (body.querySelector('.gd-bar-i') as HTMLElement).style.width = `${G.progress(pp, n) * 100}%`;
        const c = G.speedupCost(pp, n);
        btn.textContent = '';
        btn.append('Accélérer · ', h('img', { src: diamondUrl(32), alt: '', style: 'width:18px;height:18px;vertical-align:-3px' }), ` ${c}`);
      };
      btn.addEventListener('click', tap(() => {
        const r = G.speedup(world(), i, now(), (n) => wallet.spendDiamonds(n));
        if (!r.ok) { audio.play('invalid'); ui.toast({ title: r.reason ?? 'Impossible', sub: 'Facultatif : tu peux simplement attendre ♡', icon: 'lock' }); return; }
        commit(); audio.play('reward'); upd();
      }));
      upd();
      const iv = window.setInterval(() => { if (!body.isConnected) { clearInterval(iv); return; } upd(); }, 500);
    }

    // ------------------------------------------------------------ inventaire & fusion
    function openInventory() {
      const grid = h('div.gd-inv');
      const s = sheet('Mes fleurs', grid);
      let bumpId: string | null = null;
      const render = () => {
        grid.textContent = '';
        const w = world();
        grid.append(h('p.gd-hint', `Fusionne ${FUSION_COST} fleurs identiques pour obtenir la variété supérieure.`));
        for (const id of G.FUSION_ORDER) {
          const n = G.stock(w, id), nx = nextFlower(id);
          const can = G.canFuse(w, id);
          grid.append(h(`div.gd-inv-row${n ? '' : '.empty'}${bumpId === id ? '.bump' : ''}`,
            h('img', { src: n || G.isUnlocked(w, id) ? flowerUrl(id, 3, 56) : silUrl(id, 56), alt: '' }),
            h('div.grow', h('b', FLOWER_NAMES[id]), h('small', nx ? `${FUSION_COST} → 1 ${FLOWER_NAMES[nx].toLowerCase()}` : 'Variété suprême')),
            h('span.gd-count', `× ${n}`),
            nx ? h(`button.btn.small${can ? '.lavande' : '.secondary.locked'}`, { on: { click: tap(() => fuse(id)) } }, 'Fusionner') : h('span.gd-star', icon('star', 20))));
        }
      };
      const fuse = (id: string) => {
        const r = G.fuse(world(), id);
        if (!r.ok || !r.to) { audio.play('invalid'); ui.toast({ title: r.reason ?? 'Impossible', icon: 'lock' }); return; }
        commit(); stat('world.garden.fused');
        audio.play('combo'); window.setTimeout(() => audio.play('sparkle'), 150);
        bumpId = r.to;
        const rc = grid.getBoundingClientRect();
        burst(rc.width / 2, 60, 'spark', 10);
        ui.toast({ title: `${FLOWER_NAMES[r.to]} !`, sub: `${FUSION_COST} × ${FLOWER_NAMES[id as FlowerId]} fusionnées`, img: flowerUrl(r.to, 3, 72) });
        render();
        reactAuguste('flowers', 0.15);
        checkAchievements();
      };
      render();
      void s;
    }

    // ------------------------------------------------------------ atelier de bouquets
    function openAtelier() {
      let chosen: string[] = [];
      const preview = h('div.gd-preview');
      const slots = h('div.gd-slots');
      const info = h('div.gd-info');
      const tray = h('div.gd-tray');
      const mine = h('div.gd-mine');
      const make = h('button.btn.wide', 'Composer le bouquet');
      const body = h('div.gd-atelier', preview, slots, info, make, h('h4', 'Mes fleurs'), tray, mine);
      const s = sheet('Atelier de bouquets', body);
      const render = () => {
        const w = world();
        preview.textContent = '';
        preview.append(chosen.length ? h('img.gd-bq', { src: bouquetUrl(chosen, 150), alt: 'Aperçu du bouquet' }) : h('p.gd-hint', `Choisis ${BOUQUET_MIN} à ${BOUQUET_MAX} fleurs (plus elles sont variées, plus il vaut cher).`));
        slots.textContent = '';
        for (let k = 0; k < BOUQUET_MAX; k++) {
          const id = chosen[k] as FlowerId | undefined;
          const el = h(`button.gd-slot${id ? '.full' : ''}${k < BOUQUET_MIN ? '.need' : ''}`, { 'aria-label': id ? `Retirer ${FLOWER_NAMES[id]}` : 'Emplacement vide' }, id ? h('img', { src: flowerUrl(id, 3, 48), alt: '' }) : null);
          if (id) el.addEventListener('click', tap(() => { chosen.splice(k, 1); render(); }, { delay: 120 }));
          slots.append(el);
        }
        const v = G.bouquetValue(chosen);
        info.textContent = chosen.length ? `Valeur ≈ ${v.coins} pièces · ${v.hearts} cœurs · ${v.distinct} variété${v.distinct > 1 ? 's' : ''}` : '';
        const chk = G.checkBouquet(w, chosen);
        make.classList.toggle('locked', !chk.ok);
        tray.textContent = '';
        let any = false;
        for (const id of G.FUSION_ORDER) {
          const have = G.stock(w, id) - chosen.filter((x) => x === id).length;
          if (G.stock(w, id) <= 0) continue;
          any = true;
          const b = h(`button.gd-chip${have <= 0 ? '.off' : ''}`, h('img', { src: flowerUrl(id, 3, 44), alt: '' }), h('b', `× ${Math.max(0, have)}`), h('small', FLOWER_NAMES[id]));
          b.addEventListener('click', tap(() => { if (have > 0 && chosen.length < BOUQUET_MAX) { chosen.push(id); audio.play('pop1'); render(); } else audio.play('invalid'); }, { sound: false, delay: 100 }));
          tray.append(b);
        }
        if (!any) tray.append(h('p.gd-hint', 'Aucune fleur récoltée pour l\'instant. Plante, attends, récolte ♡'));
        mine.textContent = '';
        const keys = Object.keys(w.garden.bouquets);
        if (keys.length) mine.append(h('h4', 'Mes bouquets'));
        for (const k of keys) {
          const ids = G.keyToIds(k), v2 = G.bouquetValue(ids);
          mine.append(h('div.gd-row', h('img', { src: bouquetUrl(ids, 56), alt: '' }), h('div.grow', h('b', `Bouquet × ${w.garden.bouquets[k]}`), h('small', ids.map((x) => FLOWER_NAMES[x]).join(', '))),
            h('button.btn.small.lavande', { on: { click: tap(() => give(k, 'gift')) } }, `Offrir ♡${v2.hearts * 2}`),
            h('button.btn.small.gold', { on: { click: tap(() => give(k, 'sell')) } }, `Vendre ${v2.coins}`)));
        }
      };
      make.addEventListener('click', tap(() => {
        const r = G.makeBouquet(world(), chosen);
        if (!r.ok || !r.key) { audio.play('invalid'); ui.toast({ title: r.reason ?? 'Impossible', icon: 'lock' }); return; }
        commit(); stat('world.garden.bouquet');
        const key = r.key, first = r.first;
        chosen = [];
        audio.play('chest'); window.setTimeout(() => audio.play('reward'), 200);
        render();
        reveal(key, first === true);
      }));
      function give(key: string, mode: 'sell' | 'gift') {
        const r = G.giveBouquet(world(), key, mode);
        if (!r.ok || !r.reward) { audio.play('invalid'); return; }
        if (r.reward.hearts) addHearts(r.reward.hearts);
        commit(); audio.play(mode === 'gift' ? 'heart' : 'deliver');
        ui.toast({ title: mode === 'gift' ? 'Offert avec amour' : 'Vendu !', sub: `+${r.reward.coins} pièces · +${r.reward.hearts} cœurs`, icon: 'heart' });
        if (mode === 'gift') reactAuguste('flowers', 0.5);
        render(); checkAchievements();
      }
      function reveal(key: string, first: boolean) {
        const ids = G.keyToIds(key), v = G.bouquetValue(ids);
        const ov = h('div.gd-reveal', h('div.gd-rays'), h('img.gd-bq-big', { src: bouquetUrl(ids, 220), alt: '' }),
          h('h3', 'Un bouquet pour toi ♡'), h('p', `${v.distinct} variété${v.distinct > 1 ? 's' : ''} · vaut ${v.coins} pièces`),
          h('div.row', h('button.btn.lavande', { on: { click: tap(() => done('gift')) } }, `Offrir ♡${v.hearts * 2}`), h('button.btn.gold', { on: { click: tap(() => done('sell')) } }, `Vendre ${v.coins}`)),
          h('button.btn.small.secondary', { on: { click: tap(() => done(null)) } }, 'Garder'));
        body.parentElement!.append(ov);
        const rc = ov.getBoundingClientRect();
        burst(rc.width / 2, rc.height * 0.3, 'petal', 18); burst(rc.width / 2, rc.height * 0.3, 'spark', 10);
        const bigBq = ov.querySelector('.gd-bq-big'); if (bigBq) bloom(bigBq); // le bouquet éclot
        const done = (m: 'sell' | 'gift' | null) => {
          ov.remove();
          if (m) give(key, m);
          if (first) {
            s.close();
            window.setTimeout(() => void playLines([{ who: 'auguste', expr: 'love', text: 'J\'aurais pu t\'offrir toutes les fleurs de Paris. Mais aucune n\'aurait été aussi jolie que ton sourire.' }]), 250);
          } else reactAuguste('flowers', 0.25);
        };
      }
      render();
      void s;
    }

    function close(to: Exit) {
      if (closed) return;
      closed = true;
      cancelAnimationFrame(raf); clearInterval(tick); off(); offH();
      resolve(to);
    }

    if (firstTime('tip.garden')) window.setTimeout(() => ui.toast({ title: 'Touche une parcelle ♡', sub: 'Plante une fleur, elle poussera en temps réel', icon: 'flower', ms: 3800 }), 600);
    else reactAuguste('garden', 0.3);
    void MAX_PLOTS;
  });
}
