import { describe, it, expect } from 'vitest';
import { defaultFun } from '../src/save/fun';
import { defaultWorld } from '../src/save/schema';
import { bump } from '../src/game/endless/ctx';
import { UPGRADES, buyUpgrade, soapBonus, soapCoins, status, owns } from '../src/game/endless/pimbeche';
import { addXp } from '../src/game/endless/xp';
import { tierCoins, PRESTIGE_PRICE, missingCoins, dupCoins, DUP_COINS_MAX } from '../src/data/world/prices';
import { CLOTHES } from '../src/data/world/wardrobe';
import { FURNITURE } from '../src/data/world/furniture';
import { PRIVILEGES, buyPrivilege, rewardExists } from '../src/casino/privileges';

const lvl = (f: ReturnType<typeof defaultFun>, l: number) => { addXp(f, 1e6); void l; };

describe('améliorations PIMBÊCHE (pièces)', () => {
  it('toutes au lait de chèvre, prix croissants par catégorie, niveaux requis', () => {
    expect(UPGRADES.filter((u) => u.kind === 'recette').every((u) => /chèvre/i.test(u.name) || u.id === 'perso')).toBe(true);
    expect(UPGRADES.find((u) => u.id === 'perso')!.blurb).toMatch(/chèvre/i);
    const atel = UPGRADES.filter((u) => u.kind === 'atelier').map((u) => u.price);
    expect([...atel].sort((a, b) => a - b)).toEqual(atel);
  });
  it('achat : débit exact une seule fois, refus si niveau / pièces / étape manquants', () => {
    const f = defaultFun(); let coins = 100000; const spend = (n: number) => { if (coins < n) return false; coins -= n; return true; };
    expect(buyUpgrade(f, 'atelier2', coins, spend)).toMatchObject({ ok: false, reason: 'level' });
    lvl(f, 50);
    expect(buyUpgrade(f, 'moulage', coins, spend)).toMatchObject({ ok: false, reason: 'after' });
    expect(buyUpgrade(f, 'atelier2', 10, spend)).toMatchObject({ ok: false, reason: 'coins' });
    expect(coins).toBe(100000);
    expect(buyUpgrade(f, 'atelier2', coins, spend).ok).toBe(true); expect(coins).toBe(100000 - 400);
    expect(buyUpgrade(f, 'atelier2', coins, spend)).toMatchObject({ ok: false, reason: 'owned' });
    expect(owns(f, 'atelier2')).toBe(true);
    expect(status(f, UPGRADES[0], 0)).toBe('owned');
  });
  it('effet réel : plus de pièces sur une commande de savon, jamais moins', () => {
    const f = defaultFun(); lvl(f, 50);
    expect(soapCoins(100, soapBonus(f))).toBe(100);
    for (const u of UPGRADES) bump(f, `pimb:${u.id}`);
    const b = soapBonus(f);
    expect(b.pct).toBeGreaterThan(0.3); expect(soapCoins(100, b)).toBeGreaterThan(130);
  });
});

describe('courbe de prix', () => {
  it('premiers achats inchangés, puis plus chers, prestige tout en haut', () => {
    expect(tierCoins('x', 60)).toBe(60); expect(tierCoins('x', 150)).toBe(150);
    expect(tierCoins('x', 200)).toBe(400); expect(tierCoins('x', 400)).toBe(1200);
    for (const id of Object.keys(PRESTIGE_PRICE)) {
      const c = ((CLOTHES as unknown as Record<string, { coins: number }>)[id] ?? (FURNITURE as unknown as Record<string, { price: number }>)[id]) as { coins?: number; price?: number };
      expect(c, id).toBeTruthy();
      expect(c.coins ?? c.price).toBe(PRESTIGE_PRICE[id]);
    }
    expect(Math.max(...Object.values(PRESTIGE_PRICE))).toBeGreaterThanOrEqual(10000);
  });
  it('message « il te manque » avec le nombre de commandes', () => {
    expect(missingCoins(900)).toMatch(/900 pièces.*10 commandes/);
    expect(missingCoins(1)).toMatch(/1 commande /);
  });
});

describe('doublons : jamais une source de pièces', () => {
  it('compensation plafonnée même pour les objets de prestige', () => {
    expect(dupCoins(60)).toBe(30); expect(dupCoins(12000)).toBe(DUP_COINS_MAX); expect(dupCoins(9000, 50)).toBe(DUP_COINS_MAX);
    for (const p of Object.values(PRESTIGE_PRICE)) expect(dupCoins(p)).toBeLessThanOrEqual(DUP_COINS_MAX);
  });
});

describe('boutique du casino (pièces)', () => {
  it('tous les objets promis existent', () => { for (const p of PRIVILEGES) expect(rewardExists(p.reward), p.id).toBe(true); });
  it('aucun ticket : tous les prix sont en pièces et sous les prix de prestige des boutiques', () => {
    for (const p of PRIVILEGES) {
      expect(p.price).toBeGreaterThan(0);
      if (p.reward.t === 'cloth' || p.reward.t === 'furn') { const pp = PRESTIGE_PRICE[p.reward.id]; if (pp) expect(p.price, p.id).toBeLessThan(pp); }
    }
  });
  it('achat : pièces débitées une fois, objet donné, jamais de solde négatif ni de doublon', () => {
    const f = defaultFun(); const w = defaultWorld();
    w.res.coins = 6000;
    expect(buyPrivilege(f.casino, w, 'cloth-tiara')).toMatchObject({ ok: true, spent: 5000 });
    expect(w.res.coins).toBe(1000); expect(w.wardrobe.owned).toContain('cr-tiara');
    expect(buyPrivilege(f.casino, w, 'cloth-tiara')).toMatchObject({ ok: false, reason: 'owned' });
    expect(w.res.coins).toBe(1000); // un doublon ne débite rien
    w.res.coins = 10;
    expect(buyPrivilege(f.casino, w, 'gift-mats')).toMatchObject({ ok: false, reason: 'coins' });
    expect(w.res.coins).toBe(10);
    expect(buyPrivilege(f.casino, w, 'inconnu')).toMatchObject({ ok: false, reason: 'unknown' });
  });
  it('coffret d\'atelier : matériaux donnés contre 400 pièces', () => {
    const f = defaultFun(); const w = defaultWorld(); w.res.coins = 500;
    expect(buyPrivilege(f.casino, w, 'gift-mats').ok).toBe(true);
    expect(w.res.coins).toBe(100); expect([w.res.flowers, w.res.fabric, w.res.cocoa]).toEqual([10, 10, 10]);
  });
});
