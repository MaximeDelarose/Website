/**
 * Fenêtre « Un petit cadeau pour toi ♡ » : 7 cartes (aperçus dessinés), jour du jour mis en avant, jours déjà
 * obtenus cochés, animation de réclamation (paquet qui s'ouvre, rubans, étoiles, objet qui apparaît).
 * Le jour 7 est spectaculaire. « Plus tard » ne perd rien : le cadeau reste réclamable (badge sur l'écran titre).
 */
import { h, tap } from '../ui/dom';
import { ui } from '../ui/ui';
import { audio, reducedFx, save } from '../core/app';
import { haptic } from '../core/haptics';
import { revealItem, sparkleBurst, confetti, bloom, RARITY_COLOR, type FxKind, type Rarity } from '../ui/fx/sparkle';
import { DAYS, dayDef, describe, resolveDay, themeOf, type Resolved } from './calendar';
import { ownershipOf } from './grant';
import { peek } from './logic';
import { canClaimToday, claimToday, dailyState, type Claimed } from './state';
import { giftBoxUrl, partUrl, raysUrl, setClothThumb } from '../game/art/world/giftArt';

let openNow: Promise<void> | null = null;

const NONE = { cloth: () => false, furn: () => 0 };
const kindOf = (r: Resolved): FxKind => (r.t === 'furn' ? 'furniture' : r.t === 'cloth' ? 'dress' : r.t === 'bouquet' ? 'flower' : 'item');

async function loadThumbs(): Promise<void> {
  try {
    const m = await import('../ui/screens/world/dressing');
    setClothThumb((id) => m.thumbUrl(id as never));
  } catch { /* sans vignette dessinée : repli sur le paquet */ }
}

function dayCard(theme: ReturnType<typeof themeOf>, cycle: number, day: number, state: ReturnType<typeof dailyState>, canClaim: boolean): HTMLElement {
  const done = state.claimed.includes(day) && peek(state).cycle === cycle;
  const isCur = !done && day === peek(state).day;
  // un jour déjà obtenu montre le premier candidat (ce qui a été offert) ; les autres, ce qui serait offert maintenant
  const parts = resolveDay(cycle, day, done ? NONE : ownershipOf(save.data.world));
  const def = dayDef(cycle, day);
  const cls = ['dy-day', done ? 'done' : '', isCur ? 'cur' : '', isCur && canClaim ? 'ready' : '', day === DAYS - 1 ? 'big' : '', `r-${def.rarity}`].filter(Boolean).join('.');
  const imgs = parts.slice(0, 2).map((p) => h('img', { src: partUrl(p, 64), alt: '', draggable: false }));
  return h(`div.${cls}`, { 'data-day': String(day + 1), style: `--ac:${theme.accent};--rc:${RARITY_COLOR[def.rarity]}` },
    h('span.dy-n', isCur && !canClaim ? 'Demain ♡' : day === DAYS - 1 ? 'Jour 7 ♛' : `Jour ${day + 1}`),
    h('div.dy-ico', ...imgs),
    h('span.dy-cap', def.name),
    done ? h('span.dy-check', '✓') : null);
}

/** Ouvre la fenêtre. `auto` : déclenchée toute seule au lancement (même rendu, juste pour les statistiques de debug). */
export function openDaily(_opts: { auto?: boolean } = {}): Promise<void> {
  if (openNow) return openNow;
  openNow = (async () => {
    await loadThumbs();
    await new Promise<void>((resolve) => {
      const timers: number[] = [];
      const later = (fn: () => void, ms: number) => { timers.push(window.setTimeout(fn, ms)); };
      let busy = false;
      let closed = false;
      const soft = reducedFx();

      const card = h('div.modal.panel.dy-card', { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Un petit cadeau pour toi' });
      const back = h('div.modal-backdrop.dy-back', card);
      const close = () => {
        if (closed) return;
        closed = true;
        timers.forEach((t) => window.clearTimeout(t));
        back.classList.add('leaving');
        window.setTimeout(() => back.remove(), 180);
        resolve();
      };
      back.addEventListener('click', (e) => { if (e.target === back && !busy) close(); });

      const render = () => {
        const st = dailyState();
        const can = canClaimToday();
        const { cycle } = peek(st);
        const theme = themeOf(cycle);
        const actions = h('div.actions');
        if (can) {
          const b = h('button.btn.gold.dy-claim', { 'aria-label': 'Réclamer mon cadeau' }, 'Réclamer mon cadeau ♡');
          b.addEventListener('click', tap(() => void doClaim(b), { sound: false, delay: 1200 }));
          actions.append(b, h('button.btn.secondary.small.dy-later', { on: { click: tap(close) } }, 'Plus tard'));
        } else {
          actions.append(h('p.dy-wait', 'Ton cadeau du jour est déjà dans ton monde ♡ Reviens demain pour la suite !'), h('button.btn.secondary.dy-later', { on: { click: tap(close) } }, 'Fermer'));
        }
        const grid = h('div.dy-grid', ...Array.from({ length: DAYS }, (_, d) => dayCard(theme, cycle, d, st, can)));
        card.replaceChildren(
          h('h2', 'Un petit cadeau pour toi ♡'),
          h('p.dy-sub', 'Chaque visite dans ton petit monde mérite une surprise.'),
          h('div.dy-theme', h('b', theme.name), h('small', `Série ${cycle + 1} · ${theme.blurb}`)),
          grid, actions);
      };

      async function doClaim(btn: HTMLButtonElement): Promise<void> {
        if (busy) return;
        busy = true;
        btn.disabled = true;
        const got = claimToday(); // marque d'abord, attribue ensuite : jamais deux fois
        if (!got) { busy = false; render(); return; }
        haptic('daily');
        await celebrate(got);
        busy = false;
        render();
        const stamp = card.querySelector('.dy-day.done:last-of-type, .dy-day.done');
        stamp?.classList.add('stamp');
      }

      // ---------------------------------------------------------------- animation de réclamation
      function celebrate(got: Claimed): Promise<void> {
        return new Promise((done) => {
          const theme = themeOf(got.ticket.cycle);
          const def = dayDef(got.ticket.cycle, got.ticket.day);
          const big = got.ticket.day === DAYS - 1;
          const color = theme.accent;
          const stage = h(`div.dy-stage${big ? '.big' : ''}${soft ? '.soft' : ''}`);
          const rays = h('img.dy-rays', { src: raysUrl(big ? '#FFE9A8' : '#FFFFFF'), alt: '' });
          const lid = h('img.dy-lid', { src: giftBoxUrl('lid', color, '#FFFFFF', 190), alt: '' });
          const body = h('img.dy-body', { src: giftBoxUrl('body', color, '#FFFFFF', 190), alt: '' });
          const box = h('div.dy-box', body, lid, h('i.dy-rib.l'), h('i.dy-rib.r'));
          const items = h('div.dy-items');
          const label = h('div.dy-label');
          const thanks = h('button.btn.gold.dy-thanks', { style: 'visibility:hidden' }, big ? 'Magnifique ♡' : 'Merci ♡');
          stage.append(rays, box, items, label, thanks);
          back.append(stage);
          card.classList.add('claiming');
          const center = () => { const r = box.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height * 0.4 }; };
          audio.play('pop1');

          const t0 = soft ? 120 : 520;      // le paquet arrive
          const t1 = soft ? 350 : 1250;     // il s'ouvre
          later(() => { box.classList.add('shake'); haptic('select'); }, t0);
          later(() => {
            box.classList.add('open'); stage.classList.add('opened');
            audio.play('reward'); later(() => audio.play('pop2', 1.1), 140);
            haptic('daily');
            const c = center();
            sparkleBurst(c.x, c.y, { rarity: def.rarity, count: big ? 26 : 14 });
            if (!soft && big) { later(() => confetti(c.x, c.y), 150); later(() => confetti(c.x - 70, c.y + 10), 450); later(() => confetti(c.x + 70, c.y + 10), 750); }
          }, t1);
          later(() => {
            got.parts.forEach((p, i) => {
              const d = describe(p);
              const it = h('div.dy-item', { style: `--i:${i};--n:${got.parts.length}` }, h('img', { src: partUrl(p, 120), alt: '' }));
              items.append(it);
              const rar: Rarity = p.t === 'coins' || p.t === 'res' || p.t === 'dup' ? (big ? 'epic' : 'common') : def.rarity;
              later(() => { if (p.t === 'bouquet') bloom(it); void revealItem(it, { rarity: rar, kind: kindOf(p) }); audio.play(i === 0 ? 'sparkle' : 'pop3'); }, (soft ? 120 : 600) + i * (soft ? 100 : 380));
              label.append(h('div.dy-line', h('b', d.title), d.sub ? h('small', d.sub) : null));
            });
            label.classList.add('on');
            if (big) label.append(h('div.dy-line.cycle', h('small', `Série terminée ! Prochain thème : ${themeOf(got.ticket.cycle + 1).name} ♡`)));
          }, t1 + (soft ? 150 : 520));
          later(() => {
            thanks.style.visibility = 'visible';
            thanks.classList.add('in');
            thanks.addEventListener('click', tap(() => {
              stage.classList.add('out');
              card.classList.remove('claiming');
              later(() => { stage.remove(); done(); }, 220);
            }, { delay: 600 }));
          }, t1 + (soft ? 500 : 1700));
        });
      }

      render();
      ui.root.append(back);
    });
  })().finally(() => { openNow = null; });
  return openNow;
}
