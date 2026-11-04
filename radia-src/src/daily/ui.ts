/**
 * Fenêtre « Un petit cadeau pour toi ♡ » : 7 cartes (aperçus dessinés), jour du jour mis en avant, jours déjà
 * obtenus cochés, animation de réclamation (paquet qui s'ouvre, rubans, étoiles, objet qui apparaît).
 * Le jour 7 est spectaculaire. « Plus tard » ne perd rien : le cadeau reste réclamable (badge sur l'écran titre).
 */
import { h, tap } from '../ui/dom';
import { ui } from '../ui/ui';
import { save } from '../core/app';
import { RARITY_COLOR } from '../ui/fx/sparkle';
import { openGift, whenGiftIdle, type GiftSpec, type Reward } from '../ui/rewards';
import { DAYS, dayDef, describe, resolveDay, themeOf, type Resolved } from './calendar';
import { ownershipOf } from './grant';
import { peek } from './logic';
import { canClaimToday, claimToday, dailyState } from './state';
import { partUrl, setClothThumb } from '../game/art/world/giftArt';

let openNow: Promise<void> | null = null;

const NONE = { cloth: () => false, furn: () => 0 };
/** Lots du jour → récompenses du cadeau (déjà versées par `claimToday` : affichage seulement). */
function toRewards(parts: Resolved[]): Reward[] {
  return parts.map((p): Reward => {
    switch (p.t) {
      case 'coins': return { type: 'coins', qty: p.n, granted: true };
      case 'diamonds': return { type: 'diamonds', qty: p.n, granted: true };
      case 'tickets': return { type: 'tickets', qty: p.n, granted: true };
      case 'res': return { type: 'res', id: p.k, qty: p.n, granted: true };
      case 'cloth': return { type: 'cloth', id: p.id, qty: 1, granted: true };
      case 'furn': return { type: 'furniture', id: p.id, qty: 1, granted: true };
      case 'bouquet': return { type: 'bouquet', id: p.key, qty: 1, label: 'Bouquet rare', granted: true };
      case 'dup': return { type: 'coins', qty: p.n, label: `${p.name} : déjà à toi`, granted: true };
    }
  });
}

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
    await whenGiftIdle(); // jamais par-dessus une autre ouverture de cadeau
    await loadThumbs();
    await new Promise<void>((resolve) => {
      const timers: number[] = [];
      let busy = false;
      let closed = false;

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
        const theme = themeOf(got.ticket.cycle);
        const def = dayDef(got.ticket.cycle, got.ticket.day);
        const big = got.ticket.day === DAYS - 1;
        const cl = got.parts.find((p) => p.t === 'cloth'), fu = got.parts.find((p) => p.t === 'furn'), tk = got.parts.find((p) => p.t === 'tickets');
        // « Équiper / Placer / Utiliser » seulement quand c'est pertinent ; la fenêtre du calendrier se ferme alors
        const leave = (fn: () => void) => () => { close(); fn(); };
        const actions: { label: string; run: () => void }[] = [];
        if (cl && cl.t === 'cloth') actions.push({ label: 'Équiper', run: leave(() => { void import('../game/world/wardrobe').then((m) => { const r = m.equip(cl.id); if (r.ok) ui.toast({ title: 'Équipé ♡', sub: describe(cl).title, icon: 'star', ms: 2600 }); }); }) });
        if (fu && fu.t === 'furn') actions.push({ label: 'Placer au château', run: leave(() => { void import('../ui/screens/world/castle').then((m) => m.openCastle()); }) });
        if (tk && actions.length < 2) actions.push({ label: 'Utiliser au casino', run: leave(() => { void import('../casino').then((m) => m.openCasino()); }) });
        const spec: GiftSpec = {
          kind: 'daily', rarity: def.rarity, title: big ? 'Cadeau spécial !' : 'Cadeau du jour !',
          subtitle: big ? `Série terminée ! Prochain thème : ${themeOf(got.ticket.cycle + 1).name} ♡` : `${theme.name} · ${def.name}`,
          rewards: toRewards(got.parts), day: { n: got.ticket.day + 1, of: DAYS },
        };
        card.classList.add('claiming');
        back.style.visibility = 'hidden'; // la fenêtre du calendrier s'efface pendant la mise en scène
        try { await openGift(spec, { actions }); } finally { back.style.visibility = ''; card.classList.remove('claiming'); }
        busy = false;
        if (closed) return;
        render();
        const stamp = card.querySelector('.dy-day.done:last-of-type, .dy-day.done');
        stamp?.classList.add('stamp');
      }

      render();
      ui.root.append(back);
    });
  })().finally(() => { openNow = null; });
  return openNow;
}
