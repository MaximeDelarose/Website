/**
 * Le chat de Radia : adoption gratuite (on choisit son nom), scène animée,
 * caresses, friandises, jeux, accessoires achetés en pièces, renommage.
 * Rien ne baisse avec l'absence ; seules les friandises reviennent doucement.
 */
import '../../styles/world-cat.css';
import { h, tap } from '../../dom';
import { ui } from '../../ui';
import { save, audio, events, reducedFx } from '../../../core/app';
import { addHearts, stat } from '../../../core/progress';
import { world, firstTime } from '../../../core/world';
import { fmt } from '../../../core/wallet';
import { reactAuguste } from '../../../game/world/auguste';
import { adoptCat, buyCatItem, catBondLevel, equipCatItem, interact, nextTreatIn, ownsCatItem, refreshTreats, setCatName, validateCatName, CAT_NAME_MAX } from '../../../game/world/cat';
import { CAT_ACTIONS, CAT_ITEMS, CAT_KINDS, CAT_TREAT_MAX, type CatKind } from '../../../data/world/family';
import { CAT_ITEM_IDS, type CatItemId } from '../../../data/world/ids';
import { drawCat, drawCatItem, type CatPose } from '../../../game/art/world/cat';
import { canvasUrl, paint, texScale, shade } from '../../../game/art/kit';

const ICONS: Record<CatKind, string> = {
  pet: '<circle cx="6.5" cy="10" r="2.1" fill="currentColor"/><circle cx="10.5" cy="6" r="2.1" fill="currentColor"/><circle cx="15" cy="6" r="2.1" fill="currentColor"/><circle cx="18.5" cy="10" r="2.1" fill="currentColor"/><path d="M12.6 11.5c3 0 5.6 3.3 5.2 5.6-.3 1.8-2.2 2.2-3.6 1.6-1-.4-1.3-.4-2.2-.4s-1.2 0-2.2.4c-1.4.6-3.3.2-3.6-1.6-.4-2.3 2.2-5.6 5.2-5.6z" fill="currentColor"/>',
  treat: '<path d="M3 12c3-5 8-6 12-3l5-3v12l-5-3c-4 3-9 2-12-3z"/><circle cx="8" cy="11" r="1.1" fill="currentColor"/>',
  play: '<circle cx="12" cy="12" r="8.5"/><path d="M5 9c4 1 8 1 14-1M5.5 15.5c4-2 8-2 13 0"/>',
  sleep: '<path d="M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z" fill="currentColor"/>',
  walk: '<ellipse cx="8" cy="8" rx="2" ry="3" fill="currentColor"/><ellipse cx="16" cy="15" rx="2" ry="3" fill="currentColor"/><path d="M5 17.5h.01M19 6.5h.01"/>',
  sit: '<path d="M5 9V4l4 3h6l4-3v5c0 6-3 10-7 10S5 15 5 9z"/><circle cx="9.5" cy="11" r="1" fill="currentColor"/><circle cx="14.5" cy="11" r="1" fill="currentColor"/>',
  purr: '<path d="M3 12c2-4 4 4 6 0s4 4 6 0 3 2 6 0"/><path d="M12 20s-4-2.4-4-5.2A2.3 2.3 0 0112 13.6a2.3 2.3 0 014 1.2c0 2.8-4 5.2-4 5.2z" fill="currentColor" stroke="none"/>',
};
const svg = (k: CatKind) => h('span', { class: 'cat-ico', html: `<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[k]}</svg>` });

const itemUrl = (id: CatItemId, size = 64) => canvasUrl(`catitem:${id}:${size}`, () => paint(size, size, texScale(), (c) => drawCatItem(c, id, size)));

const ROOM_BG = (w: number, hh: number): HTMLCanvasElement => {
  const c = document.createElement('canvas'); c.width = w; c.height = hh;
  const x = c.getContext('2d')!;
  const fy = hh * 0.7;
  const g = x.createLinearGradient(0, 0, 0, fy); g.addColorStop(0, '#FFE4EE'); g.addColorStop(1, '#F8C9DA');
  x.fillStyle = g; x.fillRect(0, 0, w, fy);
  x.fillStyle = 'rgba(255,255,255,0.35)';
  for (let i = 0; i < 9; i++) x.fillRect(i * (w / 8) - 3, 0, 6, fy);
  const f = x.createLinearGradient(0, fy, 0, hh); f.addColorStop(0, '#F3D3AE'); f.addColorStop(1, '#DDB48A');
  x.fillStyle = f; x.fillRect(0, fy, w, hh - fy);
  x.strokeStyle = 'rgba(88,67,63,0.18)'; x.lineWidth = 2;
  for (let i = 0; i < 6; i++) { x.beginPath(); x.moveTo(0, fy + (i + 1) * ((hh - fy) / 6)); x.lineTo(w, fy + (i + 1) * ((hh - fy) / 6)); x.stroke(); }
  x.fillStyle = '#FFF4E8'; x.fillRect(0, fy - 6, w, 8); x.strokeStyle = '#58433F'; x.lineWidth = 2.5; x.strokeRect(-2, fy - 6, w + 4, 8);
  // fenêtre
  const wx = w * 0.62; const wy = hh * 0.1; const ww = w * 0.28; const wh = hh * 0.36;
  const sky = x.createLinearGradient(0, wy, 0, wy + wh); sky.addColorStop(0, '#CBE7FB'); sky.addColorStop(1, '#F6E8FF');
  x.fillStyle = sky; x.fillRect(wx, wy, ww, wh); x.lineWidth = 4; x.strokeStyle = '#58433F'; x.strokeRect(wx, wy, ww, wh);
  x.beginPath(); x.moveTo(wx + ww / 2, wy); x.lineTo(wx + ww / 2, wy + wh); x.moveTo(wx, wy + wh / 2); x.lineTo(wx + ww, wy + wh / 2); x.lineWidth = 3; x.stroke();
  x.fillStyle = 'rgba(255,255,255,0.85)'; x.beginPath(); x.ellipse(wx + ww * 0.3, wy + wh * 0.3, 14, 7, 0, 0, 7); x.ellipse(wx + ww * 0.42, wy + wh * 0.26, 10, 6, 0, 0, 7); x.fill();
  // tapis rond
  x.fillStyle = shade('#F5B5C8', 0.1); x.beginPath(); x.ellipse(w * 0.45, hh * 0.9, w * 0.34, hh * 0.07, 0, 0, 7); x.fill(); x.lineWidth = 3; x.strokeStyle = '#58433F'; x.stroke();
  return c;
};

interface Fx { el: HTMLElement }
const float = (stage: HTMLElement, text: string, cls: string, xPct = 50, yPct = 42): Fx => {
  const el = h('span', { class: `cat-fx ${cls}`, style: `left:${xPct + (Math.random() - 0.5) * 22}%;top:${yPct}%` }, text);
  stage.append(el);
  window.setTimeout(() => el.remove(), 1500);
  return { el };
};

export function openCat(): Promise<void> {
  return new Promise((resolve) => {
    let raf = 0;
    let alive = true;
    let refresh: () => void = () => {};
    const off = events.on('economy', () => { if (alive) refresh(); });
    const finish = () => { alive = false; cancelAnimationFrame(raf); off(); resolve(); };
    const commit = () => { save.save(); events.emit('economy', undefined); };

    const scr = h('div.bg-soft.cat-screen');
    ui.showScreen(scr);

    if (!world().cat.adopted) showAdoption(); else showScene();

    // ------------------------------------------------------------- adoption
    function nameForm(opts: { initial: string; cta: string; onValid: (name: string) => void; onCancel?: () => void }): HTMLElement {
      const input = h('input.cat-input', { type: 'text', maxLength: CAT_NAME_MAX + 5, placeholder: 'Son prénom…', value: opts.initial, autocomplete: 'off', autocapitalize: 'words', enterKeyHint: 'done', 'aria-label': 'Nom du chat' }) as HTMLInputElement;
      const msg = h('div.cat-msg', { 'aria-live': 'polite' });
      const go = () => {
        const v = validateCatName(input.value);
        if (!v.ok) { msg.textContent = v.reason; input.classList.remove('shake'); void input.offsetWidth; input.classList.add('shake'); audio.play('invalid'); return; }
        opts.onValid(v.name);
      };
      input.addEventListener('keydown', (e) => { if ((e as KeyboardEvent).key === 'Enter') { e.preventDefault(); go(); } });
      input.addEventListener('input', () => { msg.textContent = ''; });
      const ok = h('button.btn.wide.cat-ok', { on: { click: tap(go) } }, opts.cta);
      return h('div.cat-form', input, msg, ok, opts.onCancel ? h('button.btn.secondary.small.cat-cancel', { on: { click: tap(opts.onCancel) } }, 'Annuler') : null);
    }

    function showAdoption(): void {
      const cv = h('canvas.cat-adopt-cv');
      const body = h('div.screen-body.cat-adopt',
        h('div.cat-adopt-card',
          h('p.cat-script', 'Un petit chat t\'attend…'),
          h('div.cat-adopt-stage', cv),
          h('h3', 'Comment veux-tu l\'appeler ?'),
          h('p.cat-sub', 'C\'est gratuit, et tu pourras toujours changer son nom.'),
          nameForm({
            initial: '', cta: 'Valider',
            onValid: (name) => {
              const r = adoptCat(world(), name, Date.now());
              if (!r.ok) { ui.toast({ title: r.reason, icon: 'info' }); return; }
              commit();
              stat('world.cat.adopted');
              audio.play('heart'); window.setTimeout(() => audio.play('sparkle'), 160);
              reactAuguste('cat', 1, true);
              cancelAnimationFrame(raf);
              showScene(true);
            },
          }),
        ),
      );
      scr.replaceChildren(ui.header('Adopter un chat', finish), body);
      animateAdopt(cv);
    }

    function animateAdopt(cv: HTMLCanvasElement): void {
      let last = 0;
      const loop = (t: number) => {
        if (!alive) return;
        raf = requestAnimationFrame(loop);
        if (t - last < 50) return;
        last = t;
        const r = cv.getBoundingClientRect();
        if (!r.width) return;
        const dpr = Math.min(2, texScale());
        const w = Math.round(r.width); const hh = Math.round(r.height);
        if (cv.width !== w * dpr) { cv.width = w * dpr; cv.height = hh * dpr; }
        const x = cv.getContext('2d')!;
        x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, w, hh);
        drawCat(x, 'sit', w, hh, t / 1000);
      };
      raf = requestAnimationFrame(loop);
    }

    // ------------------------------------------------------------- scène
    function showScene(justAdopted = false): void {
      const cat = world().cat;
      refreshTreats(world(), Date.now());
      let pose: CatPose = 'sit';
      let poseUntil = 0;
      let nextIdle = performance.now() + 14000;
      const cv = h('canvas.cat-cv');
      const stage = h('div.cat-stage', cv);
      const nameEl = h('div.cat-name');
      const bondEl = h('div.cat-bond');
      const treatEl = h('span.chip.cat-treats');
      const coinEl = h('span.chip.cat-coins');
      const bar = h('div.cat-actions');
      const sheetHost = h('div');
      const renameBtn = h('button.btn.small.secondary.cat-rename', { on: { click: tap(() => openRename()) } }, 'Renommer');
      const shopBtn = h('button.btn.small.lavande', { on: { click: tap(() => openShop()) } }, 'Boutique');

      const btns = new Map<CatKind, HTMLButtonElement>();
      for (const k of CAT_KINDS) {
        const b = h('button.cat-act', { 'aria-label': CAT_ACTIONS[k].label, on: { click: tap(() => act(k), { sound: false, delay: 120 }) } }, svg(k), h('small', CAT_ACTIONS[k].label)) as HTMLButtonElement;
        btns.set(k, b);
        bar.append(b);
      }
      const body = h('div.screen-body.cat-body',
        nameEl, stage, bondEl,
        h('div.row.cat-chips', treatEl, coinEl),
        bar,
        h('div.row.cat-tools', renameBtn, shopBtn),
      );
      scr.replaceChildren(ui.header('Mon chat', finish), body, sheetHost);
      refresh = renderStats;
      renderStats();

      if (justAdopted) {
        window.setTimeout(() => { for (let i = 0; i < 6; i++) window.setTimeout(() => float(stage, '♥', 'heart', 50, 30), i * 120); }, 250);
        pose = 'purr'; poseUntil = performance.now() + 3500;
      }
      if (firstTime('tip.cat')) window.setTimeout(() => ui.toast({ title: 'Touche ton chat !', sub: 'Caresse-le, joue avec lui, offre-lui une friandise.', icon: 'heart' }), 700);

      cv.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        const r = cv.getBoundingClientRect();
        act('pet', ((e.clientX - r.left) / r.width) * 100, ((e.clientY - r.top) / r.height) * 100);
      });

      const bg = { c: null as HTMLCanvasElement | null, w: 0, h: 0 };
      let last = 0;
      const loop = (t: number) => {
        if (!alive) return;
        raf = requestAnimationFrame(loop);
        if (t - last < 50) return; // ≤ 20 images/s
        last = t;
        const r = cv.getBoundingClientRect();
        if (!r.width) return;
        const dpr = Math.min(2, texScale());
        const w = Math.round(r.width); const hh = Math.round(r.height);
        if (cv.width !== w * dpr || cv.height !== hh * dpr) { cv.width = w * dpr; cv.height = hh * dpr; }
        if (!bg.c || bg.w !== w || bg.h !== hh) { bg.c = ROOM_BG(w * dpr, hh * dpr); bg.w = w; bg.h = hh; }
        if (pose !== 'sit' && t > poseUntil) pose = 'sit';
        if (pose === 'sit' && t > nextIdle && !reducedFx()) { pose = 'stretch'; poseUntil = t + 3200; nextIdle = t + 16000 + Math.random() * 8000; }
        const x = cv.getContext('2d')!;
        x.setTransform(1, 0, 0, 1, 0, 0);
        x.drawImage(bg.c, 0, 0);
        x.setTransform(dpr, 0, 0, dpr, 0, 0);
        const wk = pose === 'walk' ? Math.sin(t / 900) * w * 0.2 : 0;
        x.save(); x.translate(wk, 0);
        if (pose === 'walk' && Math.cos(t / 900) < 0) { x.translate(w, 0); x.scale(-1, 1); x.translate(-2 * wk, 0); }
        drawCat(x, pose, w, hh * 1.02, t / 1000, { collar: cat.equipped.collar, bed: cat.equipped.bed, toy: ownsCatItem(world(), 'toy-ball') });
        x.restore();
      };
      raf = requestAnimationFrame(loop);

      function renderStats(): void {
        if (!alive) return;
        const c = world().cat;
        nameEl.replaceChildren(h('span.cat-script', c.name || 'Mon chat'));
        const b = catBondLevel(c.bond);
        bondEl.replaceChildren(
          h('div.cat-bond-top', h('b', `Affection · niveau ${b.level + 1}`), h('span', b.next ? `${c.bond}/${b.next}` : 'Au maximum ♡')),
          h('div.cat-bar', h('i', { style: `width:${Math.round(b.frac * 100)}%` })),
        );
        const wait = nextTreatIn(world(), Date.now());
        treatEl.replaceChildren(svg('treat'), h('b', `${c.treats}/${CAT_TREAT_MAX}`), ...(c.treats < CAT_TREAT_MAX ? [h('small', ` · +1 dans ${Math.max(1, Math.ceil(wait / 60000))} min`)] : []));
        coinEl.replaceChildren(h('b', fmt(world().res.coins)), ' pièces');
        btns.get('treat')?.classList.toggle('empty', c.treats < 1);
      }

      function act(kind: CatKind, px = 50, py = 40): void {
        const res = interact(world(), kind, Date.now());
        if (!res.ok) {
          if (res.reason === 'noTreats') ui.toast({ title: 'Plus de friandise pour l\'instant', sub: 'Elles reviennent doucement, ou en jouant avec lui.', icon: 'info' });
          else if (res.reason === 'cooldown') btns.get(kind)?.classList.add('nope'), window.setTimeout(() => btns.get(kind)?.classList.remove('nope'), 400);
          return;
        }
        pose = res.pose ?? 'sit';
        poseUntil = performance.now() + (kind === 'sleep' ? 6000 : kind === 'walk' ? 5000 : kind === 'play' ? 4500 : 3200);
        nextIdle = poseUntil + 14000;
        if (res.hearts) addHearts(res.hearts);
        commit();
        audio.play(kind === 'play' ? 'pop1' : kind === 'treat' ? 'sparkle' : 'heart', kind === 'sleep' ? 0.8 : 1);
        if (kind === 'pet') stat('world.cat.pet');
        if (kind === 'play') stat('world.cat.play');
        if (kind === 'treat') stat('world.cat.treat');
        if (!reducedFx() || kind === 'pet') {
          float(stage, '♥', 'heart', px, py);
          if (kind === 'treat' || kind === 'play') float(stage, '✦', 'spark', px, py);
        }
        if (res.coins) float(stage, `+${res.coins}`, 'coin', 70, 22);
        if (res.hearts) float(stage, '+1 ♡', 'hearts', 30, 22);
        if (res.treatsGiven) float(stage, '+1 friandise', 'treat', 50, 12);
        if (res.levelUp) { audio.play('reward'); ui.toast({ title: 'Votre complicité grandit !', sub: `${world().cat.name} t'aime de plus en plus`, icon: 'heart' }); }
        if (kind === 'pet') reactAuguste('catPet', 0.16);
        if (kind === 'play') reactAuguste('catPlay', 0.28);
        renderStats();
      }

      // ------------------------------------------------------- renommer
      function openRename(): void {
        const layer = h('div.cat-layer');
        const close = () => { layer.classList.add('out'); window.setTimeout(() => layer.remove(), 200); };
        const form = nameForm({
          initial: world().cat.name, cta: 'Valider', onCancel: close,
          onValid: (name) => {
            const r = setCatName(world(), name);
            if (!r.ok) { ui.toast({ title: r.reason, icon: 'info' }); return; }
            commit();
            stat('world.cat.renamed');
            audio.play('sparkle');
            close();
            renderStats();
            float(stage, '✦', 'spark', 50, 30);
            reactAuguste('catName', 0.6);
          },
        });
        layer.append(h('div.panel.cat-modal', h('h2', 'Renommer ton chat'), h('p.cat-sub', 'Comment veux-tu l\'appeler ?'), form));
        scr.append(layer);
        window.setTimeout(() => (layer.querySelector('input') as HTMLInputElement | null)?.select(), 300);
      }

      // ------------------------------------------------------- boutique
      function openShop(): void {
        sheetHost.replaceChildren();
        const layer = h('div.cat-layer.sheet');
        const close = () => { layer.classList.add('out'); window.setTimeout(() => layer.remove(), 220); };
        const list = h('div.cat-shop-list');
        const coins = h('b');
        const render = () => {
          coins.textContent = `${fmt(world().res.coins)} pièces`;
          list.replaceChildren(...CAT_ITEM_IDS.map((id) => {
            const def = CAT_ITEMS[id];
            const owned = ownsCatItem(world(), id);
            const equipped = world().cat.equipped.bed === id || world().cat.equipped.collar === id;
            const canBuy = world().res.coins >= def.price;
            const btn = owned
              ? (def.slot === 'toy' ? h('span.cat-owned', 'Dans la pièce') : h(`button.btn.small${equipped ? '.secondary' : ''}`, { on: { click: tap(() => { equipCatItem(world(), id); commit(); audio.play('pop2'); render(); }) } }, equipped ? 'Retirer' : 'Mettre'))
              : h(`button.btn.small.gold${canBuy ? '' : '.locked'}`, { on: { click: tap(() => buy(id)) } }, `${def.price} pièces`);
            return h('div.cat-item', h('img', { src: itemUrl(id), alt: '' }), h('div.cat-item-t', h('b', def.name), h('small', def.desc)), btn);
          }));
        };
        const buy = (id: CatItemId) => {
          const r = buyCatItem(world(), id);
          if (!r.ok) {
            audio.play('invalid');
            ui.toast({ title: r.reason === 'coins' ? 'Pas assez de pièces' : 'Impossible', sub: r.reason === 'coins' ? 'Fusionne ou joue avec ton chat pour en gagner.' : undefined, icon: 'info' });
            return;
          }
          commit();
          audio.play('reward');
          if (!reducedFx()) { for (let i = 0; i < 5; i++) window.setTimeout(() => float(stage, '✦', 'spark', 50, 35), i * 90); }
          render();
        };
        layer.append(h('div.cat-sheet',
          h('div.cat-grab'),
          h('div.cat-sheet-head', h('h2', 'Boutique du chat'), coins),
          list,
          h('button.btn.wide.secondary', { on: { click: tap(close) } }, 'Fermer'),
        ));
        layer.addEventListener('pointerdown', (e) => { if (e.target === layer) close(); });
        scr.append(layer);
        render();
      }
    }
  });
}
