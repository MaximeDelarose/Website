import '../../styles/world-choc.css';
/**
 * Chocolaterie : vitrine des 8 chocolats, atelier (mini-jeu « Préparation » en
 * 3 étapes), coffrets, amélioration de la boutique.
 * Règles : src/game/world/chocolate.ts (pures).
 */
import { h, tap } from '../../dom';
import { ui } from '../../ui';
import { icon } from '../../icons';
import { save, audio, events, reducedFx } from '../../../core/app';
import { addHearts, checkAchievements, stat } from '../../../core/progress';
import { firstTime } from '../../../core/world';
import { fmt } from '../../../core/wallet';
import { CHOC_IDS, CHOC_NAMES, RES_NAMES, type ChocId, type ResKind } from '../../../data/world/ids';
import { BOX_SIZE, CHOCS, MAX_SHOP_LEVEL, STAR_QTY } from '../../../data/world/chocolate';
import * as K from '../../../game/world/chocolate';
import { TOPPINGS, TOPPING_NAMES, drawChocBox, drawChocShop, drawChocSilhouette, drawChocolate, drawMeltPot, drawTopping, type Topping } from '../../../game/art/world/chocolate';
import { canvasUrl, paint } from '../../../game/art/kit';
import { reactAuguste } from '../../../game/world/auguste';
import { playLines } from '../../components/Dialogue';
import { setBackdrop } from '../../../game/scenes/backdrop';

const world = () => save.data.world;
const commit = () => { save.save(); events.emit('economy', undefined); };

export const chocUrl = (id: ChocId, size = 64) => canvasUrl(`ch:c:${id}:${size}`, () => paint(size, size, 2, (c) => drawChocolate(c, id, size)));
const silUrl = (id: ChocId, size = 64) => canvasUrl(`ch:s:${id}:${size}`, () => paint(size, size, 2, (c) => drawChocSilhouette(c, id, size)));
const topUrl = (t: Topping, size = 48) => canvasUrl(`ch:t:${t}:${size}`, () => paint(size, size, 2, (c) => drawTopping(c, t, size)));
const boxUrl = (contents: string[], size = 140) => canvasUrl(`ch:b:${contents.join('+')}:${size}`, () => paint(size, size, 2, (c) => drawChocBox(c, size, contents)));

const costText = (cost: Partial<Record<ResKind, number>>) =>
  (Object.entries(cost) as [ResKind, number][]).map(([k, n]) => `${n} ${RES_NAMES[k].toLowerCase()}`).join(' + ');
const rnd = <T,>(a: readonly T[]): T => a[Math.floor(Math.random() * a.length)];
const sleep = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));

type Tab = 'vitrine' | 'atelier' | 'coffrets' | 'boutique';

export function openChocolaterie(): Promise<void> {
  return new Promise((resolve) => {
    setBackdrop('monde');
    let tab: Tab = 'atelier';
    let closed = false;
    const cv = h('canvas.ch-canvas');
    const chips = h('div.ch-chips');
    const seg = h('div.seg.ch-tabs');
    const body = h('div.screen-body.ch-body');
    const host = h('div.ch-host');
    const scr = h('div.bg-soft.ch-screen', ui.header('Chocolaterie', close), chips, h('div.ch-shop', cv), seg, body, host);
    ui.showScreen(scr);

    // ------------------------------------------------------------ boutique animée
    let raf = 0, last = 0;
    const t0 = performance.now();
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
      drawChocShop(ctx, w, hh, world().choc.shopLevel, reducedFx() ? 0 : (t - t0) / 1000, dpr);
    };
    raf = requestAnimationFrame(draw);

    // ------------------------------------------------------------ puces & onglets
    const refreshChips = () => {
      const w = world();
      chips.textContent = '';
      chips.append(
        h('span.chip', h('i.cocoa'), h('b', fmt(w.res.cocoa))),
        h('span.chip', icon('flower', 16), h('b', fmt(w.res.flowers))),
        h('span.chip', h('i.coin'), h('b', fmt(w.res.coins))),
        h('span.chip.lvl', icon('star', 14), h('b', `Niv. ${w.choc.shopLevel}`)),
      );
    };
    const tabs: [Tab, string][] = [['vitrine', 'Vitrine'], ['atelier', 'Atelier'], ['coffrets', 'Coffrets'], ['boutique', 'Boutique']];
    for (const [t, label] of tabs) {
      const b = h(`button${t === tab ? '.on' : ''}`, label);
      b.addEventListener('click', tap(() => { tab = t; seg.querySelectorAll('button').forEach((x) => x.classList.remove('on')); b.classList.add('on'); render(); }, { delay: 120 }));
      seg.append(b);
    }
    const off = events.on('economy', () => { refreshChips(); });

    function render() {
      refreshChips();
      body.textContent = '';
      body.scrollTop = 0;
      if (tab === 'vitrine') renderVitrine();
      else if (tab === 'atelier') renderAtelier();
      else if (tab === 'coffrets') renderBoxes();
      else renderShop();
    }

    // ------------------------------------------------------------ vitrine
    function renderVitrine() {
      const w = world();
      const grid = h('div.ch-grid');
      for (const id of CHOC_IDS) {
        const seen = w.choc.collection.includes(id);
        grid.append(h(`div.ch-cell${seen ? '' : '.locked'}`,
          h('img', { src: seen ? chocUrl(id, 64) : silUrl(id, 64), alt: '' }),
          h('b', seen ? CHOC_NAMES[id] : '???'),
          h('small', seen ? `En stock : ${K.stock(w, id)} · fabriqués : ${w.choc.made[id] ?? 0}` : K.hasRecipe(w, id) ? 'À fabriquer !' : 'Recette à apprendre')));
      }
      body.append(h('p.ch-hint', `${w.choc.collection.length} / ${CHOC_IDS.length} chocolats découverts`), grid);
    }

    // ------------------------------------------------------------ atelier
    function renderAtelier() {
      const w = world();
      const list = h('div.ch-list');
      for (const id of CHOC_IDS) {
        const d = CHOCS[id];
        const known = K.hasRecipe(w, id);
        const ok = K.canCook(w, id).ok;
        let btn: HTMLElement;
        if (known) btn = h(`button.btn.small${ok ? '' : '.locked'}`, { on: { click: tap(() => startCook(id)) } }, 'Cuisiner');
        else if (w.choc.shopLevel < d.unlockLevel) btn = h('button.btn.small.secondary.locked', { on: { click: tap(() => ui.toast({ title: `Boutique niveau ${d.unlockLevel} requis`, sub: 'Améliore ta boutique ♡', icon: 'lock' })) } }, icon('lock', 14), ` Niv. ${d.unlockLevel}`);
        else btn = h('button.btn.small.gold', { on: { click: tap(() => learn(id)) } }, icon('lock', 14), ` ${fmt(d.unlockCoins)}`);
        list.append(h(`div.ch-row${known ? '' : '.locked'}`,
          h('img', { src: known ? chocUrl(id, 56) : silUrl(id, 56), alt: '' }),
          h('div.grow', h('b', known ? CHOC_NAMES[id] : '???'), h('small', known ? `${costText(d.cost)} · vaut ${d.value}` : `Recette : ${fmt(d.unlockCoins)} pièces`)),
          btn));
      }
      body.append(h('p.ch-hint', 'Prépare chaque chocolat en 3 étapes : plus tu es précise, plus tu en obtiens (1 à 3).'), list);
    }
    function learn(id: ChocId) {
      const r = K.buyRecipe(world(), id);
      if (!r.ok) { audio.play('invalid'); ui.toast({ title: r.reason ?? 'Impossible', icon: 'lock' }); return; }
      commit(); stat('world.choc.recipe');
      audio.play('rare'); window.setTimeout(() => audio.play('sparkle'), 150);
      ui.toast({ title: `Recette apprise !`, sub: CHOC_NAMES[id], img: chocUrl(id, 72) });
      render();
    }

    // ------------------------------------------------------------ mini-jeu « Préparation »
    function startCook(id: ChocId) {
      const c = K.canCook(world(), id);
      if (!c.ok) {
        audio.play('invalid');
        const miss = (Object.entries(CHOCS[id].cost) as [ResKind, number][]).filter(([k, n]) => world().res[k] < n).map(([k, n]) => `${n - world().res[k]} ${RES_NAMES[k].toLowerCase()}`).join(', ');
        ui.toast({ title: 'Il manque des ingrédients', sub: miss ? `Encore ${miss}. Fusionne pour en gagner ♡` : c.reason, icon: 'lock' });
        return;
      }
      void playGame(id);
    }

    async function playGame(id: ChocId) {
      const scores: number[] = [];
      const overlay = h('div.ch-game');
      const title = h('h3');
      const dots = h('div.ch-dots', h('i'), h('i'), h('i'));
      const stageEl = h('div.ch-stage');
      overlay.append(h('div.ch-game-head', h('button.icon-btn', { 'aria-label': 'Abandonner', on: { click: tap(() => end()) } }, icon('close')), title, dots), stageEl);
      host.append(overlay);
      let alive = true;
      const end = () => { alive = false; overlay.classList.add('out'); window.setTimeout(() => overlay.remove(), 200); };
      const setStep = (n: number, t: string) => { title.textContent = t; dots.querySelectorAll('i').forEach((d, i) => d.className = i < n ? 'done' : i === n ? 'cur' : ''); stageEl.textContent = ''; };
      const finishPraise = async (s: number) => {
        scores.push(s);
        const label = s >= 0.95 ? 'Parfait !' : s >= 0.7 ? 'Très bien !' : 'Bien joué !';
        const p = h('div.ch-praise', label);
        stageEl.append(p); audio.play(s >= 0.7 ? 'pop3' : 'pop1');
        await sleep(900);
      };

      for (;;) {
        scores.length = 0;
        // ---------- étape 1 : fondre
        setStep(0, '1 · Fais fondre');
        if (!(await melt())) return;
        // ---------- étape 2 : verser
        setStep(1, '2 · Verse au bon moment');
        if (!(await pour())) return;
        // ---------- étape 3 : décorer
        setStep(2, '3 · Décore dans l\'ordre');
        if (!(await decorate())) return;
        const stars = K.starsFrom(scores);
        const again = await result(stars);
        if (!alive) return;
        if (!again) return;
      }

      function melt(): Promise<boolean> {
        return new Promise((res) => {
          const pot = h('canvas.ch-pot');
          const gauge = h('div.ch-gauge.v', h('div.zone'), h('i.mark'));
          const prog = h('div.bar', h('i'));
          stageEl.append(h('p.ch-hint', 'Maintiens le doigt sur la casserole : reste dans la zone verte, sans brûler !'), h('div.ch-melt', pot, gauge), prog);
          let heat = 0, held = false, inZone = 0, burns = 0, over = false, swirl = 0, lastT = performance.now(), done = false;
          const need = 2.2, lo = 0.42, hi = 0.74;
          const up = () => { held = false; };
          pot.addEventListener('pointerdown', (e) => { held = true; pot.setPointerCapture(e.pointerId); });
          pot.addEventListener('pointerup', up); pot.addEventListener('pointercancel', up); pot.addEventListener('pointerleave', up);
          const loop = (t: number) => {
            if (!alive || done) { if (!alive) res(false); return; }
            const dt = Math.min(0.05, (t - lastT) / 1000); lastT = t;
            heat = Math.max(0, Math.min(1, heat + (held ? 0.42 : -0.3) * dt));
            if (held) swirl += dt * 5;
            if (heat >= lo && heat <= hi) inZone += dt;
            if (heat > 0.9 && !over) { over = true; burns++; heat = 0.6; audio.play('invalid'); pot.classList.add('burn'); window.setTimeout(() => pot.classList.remove('burn'), 400); }
            if (heat < 0.8) over = false;
            (gauge.querySelector('.mark') as HTMLElement).style.bottom = `${heat * 100}%`;
            (gauge.querySelector('.zone') as HTMLElement).style.cssText = `bottom:${lo * 100}%;height:${(hi - lo) * 100}%`;
            (prog.firstChild as HTMLElement).style.width = `${Math.min(100, (inZone / need) * 100)}%`;
            const r = pot.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
            if (r.width && (pot.width !== Math.round(r.width * dpr))) { pot.width = Math.round(r.width * dpr); pot.height = Math.round(r.height * dpr); }
            const ctx = pot.getContext('2d')!; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, r.width, r.height);
            drawMeltPot(ctx, r.width, r.height, heat, t / 1000, swirl);
            if (inZone >= need) { done = true; void finishPraise(K.scoreMelt(burns)).then(() => res(true)); return; }
            requestAnimationFrame(loop);
          };
          requestAnimationFrame(loop);
        });
      }

      function pour(): Promise<boolean> {
        return new Promise((res) => {
          const half = 0.13;
          const centre = 0.3 + Math.random() * 0.4;
          const track = h('div.ch-track', h('div.zone', { style: `left:${(centre - half) * 100}%;width:${half * 200}%` }), h('i.mark'));
          const mould = h('div.ch-mould', h('img.sil', { src: silUrl(id, 120), alt: '' }), h('div.fill', h('img', { src: chocUrl(id, 120), alt: '' })));
          const btn = h('button.btn.wide.ch-pour', 'Verser !');
          stageEl.append(h('p.ch-hint', 'Touche « Verser » quand la bille est dans la zone dorée.'), mould, track, btn);
          let pos = 0, dir = 1, last2 = performance.now(), stopped = false;
          const loop = (t: number) => {
            if (!alive) { res(false); return; }
            if (stopped) return;
            const dt = Math.min(0.05, (t - last2) / 1000); last2 = t;
            pos += dir * 0.75 * dt;
            if (pos > 1) { pos = 1; dir = -1; } else if (pos < 0) { pos = 0; dir = 1; }
            (track.querySelector('.mark') as HTMLElement).style.left = `${pos * 100}%`;
            requestAnimationFrame(loop);
          };
          requestAnimationFrame(loop);
          btn.addEventListener('click', () => {
            if (stopped) return;
            stopped = true; audio.play('drop');
            const s = K.scorePour(pos - centre, half);
            (mould.querySelector('.fill') as HTMLElement).style.height = '100%';
            void sleep(500).then(() => finishPraise(s)).then(() => res(true));
          });
        });
      }

      function decorate(): Promise<boolean> {
        return new Promise((res) => {
          const seq = [...TOPPINGS].sort(() => Math.random() - 0.5).slice(0, 3);
          let idx = 0, mistakes = 0;
          const order = h('div.ch-order', ...seq.map((t, i) => h(`div.ch-ord${i === 0 ? '.cur' : ''}`, h('b', String(i + 1)), h('img', { src: topUrl(t, 40), alt: TOPPING_NAMES[t] }))));
          const target = h('div.ch-target', h('img.base', { src: chocUrl(id, 140), alt: '' }));
          const tray = h('div.ch-tray');
          for (const t of [...TOPPINGS].sort(() => Math.random() - 0.5)) {
            const b = h('button.ch-top', { 'aria-label': TOPPING_NAMES[t] }, h('img', { src: topUrl(t, 48), alt: '' }), h('small', TOPPING_NAMES[t]));
            b.addEventListener('click', () => {
              if (idx >= seq.length || !alive) return;
              if (t === seq[idx]) {
                audio.play('pop2', 1 + idx * 0.12);
                const spots = [[34, 28], [62, 26], [48, 48]];
                const [x, y] = spots[idx];
                target.append(h('img.top', { src: topUrl(t, 40), alt: '', style: `left:${x}%;top:${y}%` }));
                order.children[idx].classList.remove('cur'); order.children[idx].classList.add('ok');
                idx++;
                if (order.children[idx]) order.children[idx].classList.add('cur');
                if (idx >= seq.length) { void sleep(300).then(() => finishPraise(K.scoreDecor(seq.length, mistakes))).then(() => res(true)); }
              } else {
                mistakes++; audio.play('invalid');
                b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake');
              }
            });
            tray.append(b);
          }
          stageEl.append(h('p.ch-hint', 'Touche les toppings dans l\'ordre indiqué (retries illimités, aucune pénalité).'), order, target, tray);
          const iv = window.setInterval(() => { if (!alive) { clearInterval(iv); res(false); } }, 200);
        });
      }

      function result(stars: number): Promise<boolean> {
        return new Promise((res) => {
          const d = CHOCS[id];
          const qty = STAR_QTY[stars];
          title.textContent = 'Ta préparation';
          dots.querySelectorAll('i').forEach((x) => (x.className = 'done'));
          stageEl.textContent = '';
          const starsEl = h('div.ch-stars', ...[1, 2, 3].map((n) => h(`span.st${n <= stars ? '.on' : ''}`, { style: `--i:${n}` }, icon('star', 38))));
          const img = h('img.ch-res-img', { src: chocUrl(id, 150), alt: '' });
          const collect = h('button.btn.wide', `Récupérer ${qty} chocolat${qty > 1 ? 's' : ''}`);
          const retry = h('button.btn.secondary.wide', 'Refaire pour plus d\'étoiles');
          stageEl.append(h('div.ch-result', img, starsEl, h('h3', CHOC_NAMES[id]), h('p', `${qty} × (vaut ${d.value}) · ${stars === 3 ? 'Excellent !' : stars === 2 ? 'Joli travail !' : 'C\'est un début délicieux !'}`), collect, retry));
          audio.play(stars === 3 ? 'victory' : 'reward');
          if (!reducedFx()) for (let k = 0; k < 14; k++) stageEl.append(h('i.ch-confetti', { style: `left:${Math.random() * 100}%;--d:${Math.random() * 0.6}s;--c:${rnd(['#FF75A8', '#F3C86B', '#B9A5E8', '#FFFFFF'])}` }));
          collect.addEventListener('click', tap(() => {
            const r = K.cook(world(), id, stars);
            if (!r.ok) { audio.play('invalid'); ui.toast({ title: r.reason ?? 'Impossible', icon: 'lock' }); return; }
            commit(); stat('world.choc.made', r.qty ?? 1);
            audio.play('chest');
            end(); render();
            ui.toast({ title: `+${r.qty} ${CHOC_NAMES[id].toLowerCase()}`, sub: r.firstOfKind ? 'Nouveau dans la vitrine !' : undefined, img: chocUrl(id, 72) });
            if (r.firstOfKind) window.setTimeout(() => audio.play('rare'), 250);
            if (firstTime('choc.firstMade')) window.setTimeout(() => void playLines([{ who: 'auguste', expr: 'love', text: 'Je savais que les fleurs te feraient plaisir… mais j\'ai quand même prévu les chocolats.' }]), 500);
            else reactAuguste('chocolate', 0.25);
            checkAchievements();
            res(false);
          }));
          retry.addEventListener('click', tap(() => { stageEl.textContent = ''; res(true); }));
        });
      }
    }

    // ------------------------------------------------------------ coffrets
    function renderBoxes() {
      const w = world();
      let chosen: string[] = [];
      const preview = h('div.ch-preview');
      const info = h('div.ch-info');
      const tray = h('div.ch-tray2');
      const make = h('button.btn.wide', `Assembler le coffret`);
      body.append(h('p.ch-hint', `Choisis ${BOX_SIZE} chocolats. Quatre chocolats différents font un coffret décoratif (meuble offert la première fois).`), preview, info, make, h('h4', 'Mes chocolats'), tray, h('p.ch-hint', `Coffrets assemblés : ${w.choc.boxes}`));
      const upd = () => {
        const ww = world();
        preview.textContent = '';
        preview.append(h('img.ch-box', { src: boxUrl(chosen, 180), alt: 'Aperçu du coffret' }));
        const v = K.boxValue(chosen);
        info.textContent = chosen.length ? `${chosen.length}/${BOX_SIZE} · ≈ ${v.coins} pièces · ${v.hearts} cœurs${v.decorative ? ' · décoratif !' : ''}` : `0/${BOX_SIZE}`;
        make.classList.toggle('locked', !K.checkBox(ww, chosen).ok);
        tray.textContent = '';
        let any = false;
        for (const cid of CHOC_IDS) {
          const have = K.stock(ww, cid) - chosen.filter((x) => x === cid).length;
          if (K.stock(ww, cid) <= 0) continue;
          any = true;
          const b = h(`button.ch-chip${have <= 0 ? '.off' : ''}`, h('img', { src: chocUrl(cid, 44), alt: '' }), h('b', `× ${Math.max(0, have)}`), h('small', CHOC_NAMES[cid]));
          b.addEventListener('click', () => { if (have > 0 && chosen.length < BOX_SIZE) { chosen.push(cid); audio.play('pop1'); upd(); } else audio.play('invalid'); });
          tray.append(b);
        }
        for (let i = 0; i < chosen.length; i++) void i;
        if (chosen.length) tray.append(h('button.btn.small.secondary', { on: { click: tap(() => { chosen = []; upd(); }) } }, 'Vider'));
        if (!any) tray.append(h('p.ch-hint', 'Aucun chocolat en stock : va à l\'atelier ♡'));
      };
      make.addEventListener('click', tap(() => {
        const contents = [...chosen];
        const r = K.assembleBox(world(), contents);
        if (!r.ok) { audio.play('invalid'); ui.toast({ title: r.reason ?? 'Impossible', icon: 'lock' }); return; }
        if (r.hearts) addHearts(r.hearts);
        commit(); stat('world.choc.box');
        audio.play('chest'); window.setTimeout(() => audio.play('reward'), 200);
        chosen = [];
        showBox(contents, r);
        reactAuguste('chocolate', 0.3);
        checkAchievements();
        upd();
      }));
      upd();
    }
    function showBox(contents: string[], r: K.BoxResult) {
      const ov = h('div.ch-reveal', h('div.ch-rays'), h('img.ch-box-big', { src: boxUrl(contents, 240), alt: '' }),
        h('h3', r.decorative ? 'Coffret décoratif ♡' : 'Coffret prêt ♡'),
        h('p', `+${r.coins} pièces · +${r.hearts} cœurs`),
        r.furniture ? h('p.ch-furn', 'Nouveau meuble : la vitrine à chocolats est dans ton château !') : null,
        h('button.btn', { on: { click: tap(() => { ov.classList.add('out'); window.setTimeout(() => ov.remove(), 200); }) } }, 'Super !'));
      host.append(ov);
      if (r.furniture) window.setTimeout(() => audio.play('rare'), 500);
    }

    // ------------------------------------------------------------ boutique
    function renderShop() {
      const w = world();
      const lv = w.choc.shopLevel;
      const price = K.upgradePrice(w);
      const perks: Record<number, string> = {
        1: 'Lait, noir', 2: 'Truffe, chocolat blanc, vitrine plus riche', 3: 'Noisette, cœur en chocolat, nouvelle étagère',
        4: 'Coffret royal, grande vitrine', 5: 'Enseigne dorée et pluie d\'étoiles',
      };
      const rows = h('div.ch-list');
      for (let n = 1; n <= MAX_SHOP_LEVEL; n++) rows.append(h(`div.ch-row${n <= lv ? '' : '.locked'}`, h('div.ch-lv', String(n)), h('div.grow', h('b', `Niveau ${n}`), h('small', perks[n])), n <= lv ? h('span.ch-ok', icon('check', 20)) : null));
      const up = price === null ? h('p.ch-hint', 'Ta boutique est au niveau maximum ♡') : h(`button.btn.gold.wide${w.res.coins >= price ? '' : '.locked'}`, { on: { click: tap(upgrade) } }, `Améliorer la boutique · ${fmt(price)} pièces`);
      body.append(h('p.ch-hint', 'Chaque niveau ouvre de nouvelles recettes et embellit la vitrine.'), rows, up);
    }
    function upgrade() {
      const r = K.upgradeShop(world());
      if (!r.ok) { audio.play('invalid'); ui.toast({ title: r.reason ?? 'Impossible', sub: 'Les pièces viennent des fusions et des commandes ♡', icon: 'lock' }); return; }
      commit();
      audio.play('chest'); window.setTimeout(() => audio.play('victory'), 200);
      cv.parentElement!.classList.remove('pop'); void cv.parentElement!.offsetWidth; cv.parentElement!.classList.add('pop');
      ui.toast({ title: `Boutique niveau ${r.level} !`, sub: 'Plus de recettes disponibles', icon: 'star' });
      reactAuguste('chocolate', 0.4);
      render();
    }

    function close() {
      if (closed) return;
      closed = true;
      cancelAnimationFrame(raf); off();
      resolve();
    }

    render();
    if (firstTime('tip.choc')) window.setTimeout(() => ui.toast({ title: 'Bienvenue à la chocolaterie ♡', sub: 'Choisis une recette dans l\'atelier', icon: 'gift', ms: 3600 }), 500);
    else reactAuguste('chocolate', 0.3);
  });
}
