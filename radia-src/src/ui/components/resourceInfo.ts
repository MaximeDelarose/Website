/**
 * Fiche d'information d'une ressource (appui long ~500 ms sur un compteur) — composant UNIQUE pour toutes les ressources.
 * Les textes viennent de `src/data/resourceInfo.ts` ; le solde est lu au moment de l'ouverture (toujours à jour).
 * L'appui court n'est pas modifié : l'appui long supprime le « clic » qui le suit, pour ne jamais déclencher les deux.
 */
import './resourceInfo.css';
import { h } from '../dom';
import { ui } from '../ui';
import { icon } from '../icons';
import { save } from '../../core/app';
import { wallet, fmt } from '../../core/wallet';
import { RES_INFO, RES_ORDER, type ResInfoId } from '../../data/resourceInfo';

export const RES_LONG_PRESS_MS = 500;
const MOVE_TOLERANCE = 10;

/** Solde actuel (pur côté données : lu dans la sauvegarde / le portefeuille). */
export async function resourceBalance(id: ResInfoId): Promise<number> {
  switch (id) {
    case 'coins': return save.data.world.res.coins;
    case 'flowers': return save.data.world.res.flowers;
    case 'fabric': return save.data.world.res.fabric;
    case 'cocoa': return save.data.world.res.cocoa;
    case 'diamonds': return wallet.diamonds();
    case 'energy': return wallet.energy();
    case 'hearts': return save.data.hearts;
    case 'tickets': { const m = await import('../../casino/store'); return m.casinoStatus().chips; }
  }
}

async function iconFor(id: ResInfoId): Promise<HTMLElement> {
  const wrap = h('span.ri-ic');
  try {
    if (id === 'hearts') { wrap.append(icon('heart')); return wrap; }
    if (id === 'tickets') { wrap.textContent = '🎟️'; return wrap; }
    if (id === 'diamonds' || id === 'energy') { const s = await import('../screens/shop'); wrap.append(h('img', { src: id === 'diamonds' ? s.diamondUrl(64) : s.energyUrl(64), alt: '' })); return wrap; }
    const a = await import('../../game/art/world/resources'); wrap.append(h('img', { src: a.resIconUrl(id, 64), alt: '' }));
  } catch { /* icône facultative */ }
  return wrap;
}

let openCard: { close: () => void } | null = null;

/** Ouvre la fiche. Résout à la fermeture ; ne touche à rien d'autre (l'écran dessous reste tel quel). */
export async function openResourceInfo(id: ResInfoId): Promise<void> {
  openCard?.close();
  const info = RES_INFO[id];
  const bal = await resourceBalance(id);
  const ic = await iconFor(id);
  return new Promise<void>((resolve) => {
    const closeBtn = h('button.ri-x', { 'aria-label': 'Fermer' }, '✕');
    const card = h('div.ri-card', { role: 'dialog', 'aria-label': info.name },
      h('div.ri-head', ic, h('div.ri-title', h('b', info.name), h('span.ri-bal', fmt(bal))), closeBtn),
      h('p.ri-use', info.use),
      h('h4', 'Comment en obtenir ?'),
      h('ul', ...info.ways.map((w) => h('li', w))),
      info.note ? h('p.ri-note', info.note) : null);
    const back = h('div.ri-back', card);
    let done = false;
    const close = () => {
      if (done) return; done = true; openCard = null;
      document.removeEventListener('keydown', onKey);
      back.classList.add('leaving');
      window.setTimeout(() => { back.remove(); resolve(); }, 160);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    closeBtn.addEventListener('click', close);
    const openedAt = Date.now();
    // le relâchement du doigt qui a ouvert la fiche génère un clic sur le fond tout juste apparu : on l'ignore un instant
    back.addEventListener('click', (e) => { if (e.target === back && Date.now() - openedAt > 800) close(); });
    openCard = { close };
    ui.root.append(back);
  });
}

// ---- appui long : un seul écouteur global « clic supprimé juste après un appui long »
let suppressUntil = 0;
let installed = false;
function installClickGuard(): void {
  if (installed) return; installed = true;
  window.addEventListener('click', (e) => { if (Date.now() < suppressUntil && (e.target as Element | null)?.closest?.('[data-res]')) { e.stopImmediatePropagation(); e.preventDefault(); } }, true);
}

/** Donne à un compteur l'appui long → fiche. `el` garde son appui court habituel. */
export function attachResourceInfo(el: HTMLElement, id: ResInfoId): void {
  installClickGuard();
  el.dataset.res = id;
  el.classList.add('ri-target');
  el.addEventListener('contextmenu', (e) => e.preventDefault());
  let timer = 0; let sx = 0; let sy = 0; let pid = -1;
  const cancel = () => { window.clearTimeout(timer); timer = 0; pid = -1; };
  el.addEventListener('pointerdown', (e) => {
    cancel(); pid = e.pointerId; sx = e.clientX; sy = e.clientY;
    timer = window.setTimeout(() => {
      timer = 0;
      suppressUntil = Date.now() + 900; // le relâchement qui suit ne doit pas déclencher l'appui court
      try { navigator.vibrate?.(12); } catch { /* ignoré */ }
      void openResourceInfo(id);
    }, RES_LONG_PRESS_MS);
  });
  el.addEventListener('pointermove', (e) => { if (timer && e.pointerId === pid && Math.hypot(e.clientX - sx, e.clientY - sy) > MOVE_TOLERANCE) cancel(); });
  for (const t of ['pointerup', 'pointercancel', 'pointerleave'] as const) el.addEventListener(t, () => { if (timer) cancel(); });
}

/** Fiche « Aide : ressources » : toutes les ressources, pour les découvrir sans appui long (accessibilité). */
export async function openResourceHelp(): Promise<void> {
  const rows = await Promise.all(RES_ORDER.slice(0, 5).map(async (id) => h('button.ri-row', { on: { click: () => void openResourceInfo(id) } }, await iconFor(id), h('b', RES_INFO[id].name), h('span.ri-bal', fmt(await resourceBalance(id))))));
  await ui.modal({ title: 'Tes ressources', body: h('div.ri-list', h('p.muted', { style: 'font-size:13px;margin:0 0 8px' }, 'Touche une ressource pour savoir à quoi elle sert. Astuce : maintiens ton doigt sur un compteur.'), ...rows), actions: [{ label: 'Fermer', value: 'ok', style: 'secondary' }] });
}
