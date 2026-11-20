import { describe, it, expect } from 'vitest';
import { defaultSave, migrate } from '../src/save/schema';
import { COINS_PER_TICKET, mergeTickets, defaultFun, sanitizeFun } from '../src/save/fun';
import { validLock } from '../src/game/merge/locks';

/** Une sauvegarde « d'avant » : portefeuille de tickets du casino (poche + table), tickets d'événement, compteurs de tickets, pièces grises = emoji (rien en sauvegarde). */
function oldSave(tickets: { chips: number; bring: number; event: number }) {
  const s = JSON.parse(JSON.stringify(defaultSave())) as Record<string, any>;
  s.world.res.coins = 1234; s.economy.diamonds = 77; s.economy.energy = 42;
  s.world.wardrobe.owned.push('ac-pearls'); s.world.castle.owned.fireplace = 1;
  const f = s.fun;
  delete f.economy;
  f.casino = { chips: tickets.chips, bring: tickets.bring, refillTs: 5, welcomed: true, missions: ['first-visit'], history: [{ g: 'slots', bet: 100, win: 0, at: 1 }],
    stats: { 'cap.day': 20261104, 'cap.endless': 30, 'src.wheel': 600, 'priv.spent': 150, 'ach.first_spark': 1, 'total.parties': 12, 'dq.day': 20261104 } };
  f.endless2.tickets = tickets.event;
  f.wheel = { lastKey: '2026-11-04', spins: 9, last: 'chips600' };
  return s;
}

describe('migration des tickets en pièces (1 ticket = 10 pièces)', () => {
  it('le taux est celui de l\'ancienne caisse d\'échange : 100 pièces = 10 tickets', () => { expect(COINS_PER_TICKET).toBe(10); });

  it('ancienne sauvegarde avec beaucoup de tickets : tout est converti, rien d\'autre ne bouge', () => {
    const raw = oldSave({ chips: 4200, bring: 800, event: 55 });
    const { data } = migrate(raw);
    const tickets = 4200 + 800 + 55;
    expect(data.world.res.coins).toBe(1234 + tickets * 10);
    expect(data.fun.economy).toMatchObject({ merged: true, tickets, coins: tickets * 10, seen: false });
    // progression, diamants, énergie, objets : intacts
    expect(data.economy.diamonds).toBe(77); expect(data.economy.energy).toBe(42);
    expect(data.world.wardrobe.owned).toContain('ac-pearls'); expect(data.world.castle.owned.fireplace).toBe(1);
    // il n'existe plus aucun champ de ticket
    expect('chips' in data.fun.casino).toBe(false); expect('bring' in data.fun.casino).toBe(false); expect('refillTs' in data.fun.casino).toBe(false);
    expect('tickets' in data.fun.endless2).toBe(false);
    // statistiques utiles conservées (succès déjà récompensés, parties jouées, missions), compteurs de tickets écartés
    expect(data.fun.casino.stats['ach.first_spark']).toBe(1); expect(data.fun.casino.stats['total.parties']).toBe(12);
    expect(data.fun.casino.missions).toEqual(['first-visit']); expect(data.fun.casino.welcomed).toBe(true);
    expect(Object.keys(data.fun.casino.stats).some((k) => k.startsWith('src.') || k.startsWith('priv.'))).toBe(false);
  });

  it('une seule fois : recharger, réenregistrer ou réimporter la sauvegarde convertie ne duplique rien', () => {
    const { data } = migrate(oldSave({ chips: 1000, bring: 0, event: 0 }));
    const coins = data.world.res.coins;
    expect(coins).toBe(1234 + 10_000);
    let cur = JSON.parse(JSON.stringify(data));
    for (let i = 0; i < 5; i++) { cur = JSON.parse(JSON.stringify(migrate(cur).data)); expect(cur.world.res.coins).toBe(coins); }
    expect(cur.fun.economy.merged).toBe(true);
    expect(cur.fun.economy.coins).toBe(10_000);
  });

  it('une sauvegarde déjà convertie, dont le joueur a dépensé ses pièces, ne reçoit rien de plus', () => {
    const { data } = migrate(oldSave({ chips: 500, bring: 0, event: 0 }));
    data.world.res.coins = 3; // il a tout dépensé
    const again = migrate(JSON.parse(JSON.stringify(data))).data;
    expect(again.world.res.coins).toBe(3);
  });

  it('sans aucun ticket (ou sans section « fun ») : aucune pièce versée, message inutile', () => {
    const a = migrate(oldSave({ chips: 0, bring: 0, event: 0 })).data;
    expect(a.world.res.coins).toBe(1234); expect(a.fun.economy).toMatchObject({ merged: true, tickets: 0, coins: 0, seen: true });
    const raw = oldSave({ chips: 9, bring: 9, event: 9 }); delete raw.fun;
    const b = migrate(raw).data;
    expect(b.world.res.coins).toBe(1234); expect(b.fun.economy.seen).toBe(true);
  });

  it('énorme solde : jamais au-delà du plafond de pièces du jeu, jamais négatif ni NaN', () => {
    const a = migrate(oldSave({ chips: 999_999_999, bring: 999_999_999, event: 99999 })).data;
    expect(a.world.res.coins).toBe(999_999_999);
    expect(Number.isFinite(a.world.res.coins)).toBe(true);
    const r = { coins: 999_999_990 }; const f = defaultFun(); f.economy = { merged: false, tickets: 5, coins: 0, at: 0, seen: false };
    expect(mergeTickets(f, r)).toBe(9); expect(r.coins).toBe(999_999_999);
  });

  it('valeurs corrompues : traitées comme zéro', () => {
    const raw = oldSave({ chips: 0, bring: 0, event: 0 });
    raw.fun.casino.chips = 'beaucoup'; raw.fun.casino.bring = -50; raw.fun.endless2.tickets = NaN;
    const d = migrate(raw).data;
    expect(d.world.res.coins).toBe(1234);
  });

  it('sanitizeFun seul lit les anciens tickets sans les créditer (le crédit se fait avec le monde)', () => {
    const f = sanitizeFun({ casino: { chips: 30, bring: 5 }, endless2: { tickets: 5 } });
    expect(f.economy).toMatchObject({ merged: false, tickets: 40 });
    const res = { coins: 0 }; expect(mergeTickets(f, res)).toBe(400); expect(res.coins).toBe(400);
    expect(mergeTickets(f, res)).toBe(0); expect(res.coins).toBe(400);
  });

  it('récompenses visibles en tickets sur le plateau : converties en pièces (même taux)', () => {
    const lock = validLock({ kind: 'reward', need: { t: 'goal', n: 3, base: 0 }, price: 1, reward: { kind: 'ticket', n: 2 } });
    expect(lock?.reward).toMatchObject({ kind: 'coins', n: 20 });
    const ok = validLock({ kind: 'reward', need: { t: 'goal', n: 3, base: 0 }, price: 1, reward: { kind: 'coins', n: 40 } });
    expect(ok?.reward).toMatchObject({ kind: 'coins', n: 40 });
  });

  it('roue : le dernier lot d\'un ancien tirage (tickets) ne fait rien planter', () => {
    const d = migrate(oldSave({ chips: 1, bring: 0, event: 0 })).data;
    expect(d.fun.wheel).toEqual({ lastKey: '2026-11-04', spins: 9, last: 'chips600' }); // texte libre conservé, ignoré à l'affichage
  });

  it('compteurs de plafond du jour (cap.*) : conservés, pour que le plafond ne se réinitialise pas à chaque chargement', () => {
    const d = migrate(oldSave({ chips: 1, bring: 0, event: 0 })).data;
    expect(d.fun.casino.stats['cap.endless']).toBe(30);
  });
});
