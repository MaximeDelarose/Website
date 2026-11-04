/**
 * Cadeau de démarrage : UNE seule fois par sauvegarde (flag `rw:start-gift-v1` dans `world.flags`), y compris pour les
 * sauvegardes existantes. Généreux mais cohérent avec l'économie (énergie jamais bloquante, diamants gratuits).
 * Jamais par-dessus une fenêtre ou un événement : on attend un moment sûr sur l'écran titre.
 */
import { save } from './app';
import { dbg } from './debug';
import type { GiftSpec } from '../ui/rewards';

export const START_GIFT_KEY = 'start-gift-v1';

export const startGiftSpec = (): GiftSpec => ({
  kind: 'start', rarity: 'epic', title: 'Bonus de démarrage !', subtitle: 'Un petit coup de pouce pour bien commencer ♡', key: START_GIFT_KEY,
  rewards: [
    { type: 'energy', qty: 50 },
    { type: 'diamonds', qty: 60 },
    { type: 'coins', qty: 300 },
    { type: 'tickets', qty: 100 },
    { type: 'chest', qty: 1, label: 'Coffre surprise' },
  ],
  message: 'Un petit coup de pouce de ma part, Radia. Amuse-toi bien ♡',
});

export const startGiftPending = (): boolean => !save.data.world.flags[`rw:${START_GIFT_KEY}`];

let started = false;
let busy = false;

async function tick(): Promise<void> {
  if (busy || !startGiftPending()) return;
  if (!document.querySelector('.title-screen')) return;
  const { safeToNotify } = await import('../events/scheduler');
  if (!safeToNotify()) return;
  const rw = await import('../ui/rewards');
  if (rw.giftBusy()) return;
  busy = true;
  try { await rw.openGift(startGiftSpec()); } finally { busy = false; }
}

export function startStartGift(): void {
  if (started) return;
  started = true;
  window.setInterval(() => { void tick().catch((e) => console.error('start gift', e)); }, 1800);
  dbg('rewards', {
    demo: async (kind = 'chest', rarity = 'rare', n = 0) => { const d = await import('../ui/rewards/demo'); const rw = await import('../ui/rewards'); await rw.openGift(d.demoSpec(kind as never, rarity as never, n)); return 'ok'; },
    chain: async () => { const d = await import('../ui/rewards/demo'); const rw = await import('../ui/rewards'); await rw.openGift(d.demoChain()); return 'ok'; },
    give: async (spec: GiftSpec) => { const rw = await import('../ui/rewards'); await rw.openGift(spec); return 'ok'; },
    startGift: async () => { const rw = await import('../ui/rewards'); await rw.openGift(startGiftSpec()); return 'ok'; },
    resetStart: () => { delete save.data.world.flags[`rw:${START_GIFT_KEY}`]; save.save(); return 'ok'; },
    pending: () => startGiftPending(),
    slow: (k = 1) => { (window as unknown as { __rwSlow?: number }).__rwSlow = k; return k; },
    open: () => document.querySelectorAll('[class*="rw-"]').length,
    closeAll: async () => { const rw = await import('../ui/rewards'); await rw.closeAllGifts(); return 'ok'; },
  });
}
