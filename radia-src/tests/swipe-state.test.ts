import { describe, it, expect } from 'vitest';
import { PROFILES, nodeOf, profileById } from '../src/events/tindeur/swipe/data';
import {
  SW, choicesOf, choose, currentId, currentNode, defaultSwipe, deferQueue, deliver, endingsFound, ensureDeck, ignorePing, like, markPinged, markRead,
  nextHeartIn, pass, pickPing, refillBank, removeMatch, resumeConvo, sanitizeSwipe, snoozePing, stopConvo, tickClock, unreadCount,
} from '../src/events/tindeur/swipe/state';
import { defaultFun, sanitizeFun } from '../src/save/fun';

const T0 = 1_700_000_000_000;
/** RNG déterministe (suite de Lehmer). */
const lcg = (seed = 7) => () => { seed = (seed * 48271) % 2147483647; return seed / 2147483647; };
const fresh = () => { const s = defaultSwipe(); ensureDeck(s, lcg()); return s; };

describe('Tindeur jouable : pile de cartes', () => {
  it('la première pile commence par les accroches prévues et contient tous les profils une fois', () => {
    const s = fresh();
    expect(s.order.slice(0, 3)).toEqual(['kevin', 'hugo', 'maxime']);
    expect([...s.order].sort()).toEqual(PROFILES.map((p) => p.id).sort());
    expect(currentId(s)).toBe('kevin');
  });
  it('passer est illimité, avance la pile, et la pile se renouvelle sans fin', () => {
    const s = fresh(); const r = lcg(3);
    const seen = new Set<string>();
    for (let i = 0; i < PROFILES.length * 3 + 5; i++) { const id = pass(s, r); expect(id).toBeTruthy(); seen.add(id!); expect(currentId(s)).toBeTruthy(); }
    expect(seen.size).toBe(PROFILES.length);
    expect(s.cycle).toBeGreaterThanOrEqual(3);
    expect(s.stats.passes).toBe(PROFILES.length * 3 + 5);
  });
  it('pas deux fois la même carte de suite à la jonction de deux piles', () => {
    const s = fresh(); const r = lcg(11);
    let prev = '';
    for (let i = 0; i < PROFILES.length * 4; i++) { const id = pass(s, r)!; expect(id).not.toBe(prev); prev = id; }
  });
  it('les profils en match ne reviennent pas dans la pile', () => {
    const s = fresh(); const r = lcg(5);
    like(s, T0, () => 0); // Kevin : match
    expect(s.matches).toEqual(['kevin']);
    for (let i = 0; i < PROFILES.length * 2; i++) expect(pass(s, r)).not.toBe('kevin');
  });
});

describe('Tindeur jouable : cœurs et matchs', () => {
  it('le tout premier like est toujours un match (RNG défavorable)', () => {
    const s = fresh();
    const r = like(s, T0, () => 0.999);
    expect(r).toMatchObject({ ok: true, id: 'kevin', match: true });
    expect(s.convos.kevin.log[0]).toMatchObject({ k: 'in', n: 's' });
    expect(s.convos.kevin.unread).toBe(true);
  });
  it('RNG injectable : like bas = match, haut = pas de match, et jamais plus de 2 ratés d’affilée', () => {
    const s = fresh();
    like(s, T0, () => 0);
    const out: boolean[] = [];
    for (let i = 0; i < 6; i++) { refillBank(s, T0 + 1e6 * (i + 1)); out.push(like(s, T0 + 1e6 * (i + 1), () => 0.999).match); }
    expect(out.slice(0, 3)).toEqual([false, false, true]);
    expect(s.missStreak).toBeLessThanOrEqual(SW.missCap);
  });
  it('limite douce : 12 cœurs, puis recharge automatique (45 s) sans aucun mur de paiement', () => {
    const s = fresh();
    for (let i = 0; i < SW.bankMax; i++) expect(like(s, T0, () => 0.999).ok).toBe(true);
    const blocked = like(s, T0 + 1000, () => 0.999);
    expect(blocked).toMatchObject({ ok: false, reason: 'empty-bank' });
    const before = currentId(s);
    expect(currentId(s)).toBe(before); // la carte reste : rien n'est perdu
    expect(nextHeartIn(s, T0 + 1000)).toBeGreaterThan(0);
    expect(like(s, T0 + SW.refillMs + 5000, () => 0.999).ok).toBe(true);
    // passer reste possible, sans cœur
    const s2 = fresh(); s2.bank.n = 0; s2.bank.ts = T0;
    expect(pass(s2, lcg())).toBeTruthy();
  });
  it('la réserve se remplit jusqu’au plafond après une longue pause', () => {
    const s = fresh(); s.bank = { n: 0, ts: T0 };
    refillBank(s, T0 + 3_600_000);
    expect(s.bank.n).toBe(SW.bankMax);
    expect(nextHeartIn(s, T0 + 3_600_000)).toBe(0);
  });
});

describe('Tindeur jouable : conversations', () => {
  const play = (s: ReturnType<typeof fresh>, pid: string, pick: (n: number) => number) => {
    let guard = 0;
    while (guard++ < 30) {
      const ch = choicesOf(s, pid);
      if (!ch.length) break;
      expect(choose(s, pid, pick(ch.length), T0)).toBe(true);
      expect(deliver(s, pid, T0, false)).toBeTruthy();
    }
  };
  it('parcours complet jusqu’à une fin, enregistrée sans malus', () => {
    for (const p of PROFILES) {
      for (const pick of [() => 0, (n: number) => n - 1]) {
        const s = defaultSwipe(); ensureDeck(s, lcg());
        s.matches.push(p.id);
        s.convos[p.id] = { pid: p.id, log: [{ k: 'in', n: p.start, t: T0 }], status: 'active', end: '', queue: '', due: 0, unread: false, pingAt: 0, notified: false, at: T0 };
        play(s, p.id, pick);
        expect(s.convos[p.id].status, p.id).toBe('ended');
        expect(nodeOf(p, s.convos[p.id].end)!.end).toBeTruthy();
        expect(endingsFound(s)).toBe(1);
      }
    }
  });
  it('choisir met la réponse en file, puis la livre', () => {
    const s = fresh(); like(s, T0, () => 0);
    expect(currentNode(s, 'kevin')!.id).toBe('s');
    expect(choose(s, 'kevin', 1, T0)).toBe(true);
    expect(choicesOf(s, 'kevin')).toEqual([]); // il « écrit »
    expect(choose(s, 'kevin', 0, T0)).toBe(false);
    deliver(s, 'kevin', T0 + 2000, false);
    expect(currentNode(s, 'kevin')!.id).toBe('b');
    expect(s.convos.kevin.unread).toBe(false);
  });
  it('quitter pendant qu’il écrit : la réponse arrive plus tard, en temps de jeu ACTIF seulement', () => {
    const s = fresh(); const r = lcg(9); like(s, T0, () => 0);
    choose(s, 'kevin', 0, T0);
    deferQueue(s, 'kevin', r);
    const due = s.convos.kevin.due;
    expect(due).toBeGreaterThanOrEqual(SW.replyMinMs);
    expect(due).toBeLessThanOrEqual(SW.replyMinMs + SW.replySpanMs);
    expect(tickClock(s, 30_000, false, T0)).toEqual([]); // inactif : l'horloge ne bouge pas
    expect(s.clock).toBe(0);
    let got: string[] = [];
    for (let i = 0; i < 40 && !got.length; i++) got = tickClock(s, 10_000, true, T0 + i);
    expect(got).toEqual(['kevin']);
    expect(s.convos.kevin.unread).toBe(true);
    expect(s.convos.kevin.queue).toBe('');
  });
  it('arrêter, reprendre et supprimer le match', () => {
    const s = fresh(); like(s, T0, () => 0);
    choose(s, 'kevin', 0, T0); deliver(s, 'kevin', T0, false);
    stopConvo(s, 'kevin');
    expect(s.convos.kevin.status).toBe('stopped');
    expect(choicesOf(s, 'kevin')).toEqual([]);
    resumeConvo(s, 'kevin');
    expect(s.convos.kevin.status).toBe('active');
    expect(choicesOf(s, 'kevin').length).toBeGreaterThan(0);
    removeMatch(s, 'kevin');
    expect(s.convos.kevin).toBeUndefined();
    expect(s.matches).toEqual([]);
  });
});

describe('Tindeur jouable : notifications espacées', () => {
  const matchAt = (s: ReturnType<typeof fresh>, n: number) => { for (let i = 0; i < n; i++) like(s, T0 + i, () => 0); };
  it('rien avant le délai, jamais si ce n’est pas un moment sûr, jamais en rafale', () => {
    const s = fresh(); matchAt(s, 3);
    expect(pickPing(s, true)).toBeNull(); // trop tôt (horloge 0)
    s.clock = SW.firstPingMs + 1;
    expect(pickPing(s, false)).toBeNull(); // pas un moment sûr
    const first = pickPing(s, true);
    expect(first).toBeTruthy();
    markPinged(s, first!);
    // les deux autres messages attendent aussi, mais pas avant l'écart minimal
    expect(pickPing(s, true)).toBeNull();
    s.clock += SW.pingGapMs - 1;
    expect(pickPing(s, true)).toBeNull();
    s.clock += 2;
    const second = pickPing(s, true);
    expect(second).toBeTruthy(); expect(second).not.toBe(first);
  });
  it('lire le message annule la notification ; ignorer et « plus tard » se comportent bien', () => {
    const s = fresh(); matchAt(s, 2);
    s.clock = SW.firstPingMs + 1;
    markRead(s, 'kevin');
    expect(pickPing(s, true)).toBe('hugo'); // le 2e match (le plus récent) reste en attente
    ignorePing(s, 'hugo'); s.lastPing = -1e12;
    expect(pickPing(s, true)).toBeNull();
    const t = fresh(); matchAt(t, 1); t.clock = SW.firstPingMs + 1;
    snoozePing(t, 'kevin');
    expect(pickPing(t, true)).toBeNull();
    t.clock += SW.snoozeMs + 1;
    expect(pickPing(t, true)).toBe('kevin');
    expect(unreadCount(t)).toBe(1);
  });
  it('une conversation arrêtée ne notifie plus', () => {
    const s = fresh(); matchAt(s, 1); s.clock = SW.firstPingMs + 1;
    stopConvo(s, 'kevin');
    expect(pickPing(s, true)).toBeNull();
  });
});

describe('Tindeur jouable : sauvegarde', () => {
  it('aller-retour JSON puis sanitisation : tout est conservé', () => {
    const s = fresh(); const r = lcg(2);
    like(s, T0, () => 0); pass(s, r); like(s, T0 + 5, () => 0);
    choose(s, 'kevin', 1, T0 + 9); deliver(s, 'kevin', T0 + 10, false);
    choose(s, 'hugo', 0, T0 + 11);
    const back = sanitizeSwipe(JSON.parse(JSON.stringify(s)));
    expect(back).toEqual(s);
  });
  it('passe aussi par sanitizeFun (fun.apps.swipe) sans toucher à fun.tindeur', () => {
    const f = defaultFun();
    f.tindeur.installed = false; f.tindeur.choice = 'uninstall'; f.tindeur.shown = true;
    const s = fresh(); like(s, T0, () => 0);
    f.apps.swipe = JSON.parse(JSON.stringify(s));
    const g = sanitizeFun(JSON.parse(JSON.stringify(f)));
    expect(g.tindeur).toMatchObject({ installed: false, choice: 'uninstall', shown: true });
    expect(sanitizeSwipe(g.apps.swipe).matches).toEqual(['kevin']);
  });
  it('désinstaller puis réinstaller conserve profils, matchs et conversations', () => {
    const f = defaultFun(); const s = fresh();
    like(s, T0, () => 0); choose(s, 'kevin', 0, T0); deliver(s, 'kevin', T0 + 1, false);
    f.apps.swipe = JSON.parse(JSON.stringify(s));
    f.tindeur.installed = false; f.tindeur.choice = 'uninstall';
    let g = sanitizeFun(JSON.parse(JSON.stringify(f)));
    g.tindeur.installed = true; g.tindeur.choice = 'keep';
    g = sanitizeFun(JSON.parse(JSON.stringify(g)));
    expect(sanitizeSwipe(g.apps.swipe)).toEqual(s);
  });
  it('données corrompues ou inconnues : retour aux valeurs par défaut, sans exception', () => {
    for (const bad of [null, 42, 'x', [], {}, { convos: 5 }, { order: 'oups', bank: { n: 'a' } }, { convos: { kevin: { log: 'non' } } }]) {
      const s = sanitizeSwipe(bad);
      expect(s.v).toBe(1);
      expect(s.bank.n).toBeLessThanOrEqual(SW.bankMax);
    }
    const s = sanitizeSwipe({
      order: ['kevin', 'fantome', 7], pos: 99, matches: ['fantome', 'kevin'], liked: ['inconnu'], bank: { n: 9999, ts: -5 },
      convos: { kevin: { log: [{ k: 'in', n: 'zzz', t: 1 }, { k: 'out', n: 's', c: 77, t: 2 }], status: 'ended', queue: 'nope' }, fantome: { log: [] } },
      endings: { kevin: ['x', 's', 'zzz'] },
    });
    expect(s.order).toEqual(['kevin']);
    expect(s.pos).toBeLessThanOrEqual(1);
    expect(s.matches).toEqual(['kevin']);
    expect(s.liked).toEqual([]);
    expect(s.bank.n).toBe(SW.bankMax);
    expect(s.convos.fantome).toBeUndefined();
    expect(s.convos.kevin.log).toEqual([expect.objectContaining({ k: 'in', n: 's' })]);
    expect(s.convos.kevin.queue).toBe('');
    expect(s.endings.kevin).toEqual(['x']);
    expect(currentNode(s, 'kevin')!.id).toBe('s');
    expect(profileById('kevin')).toBeTruthy();
  });
  it('la taille sérialisée reste très inférieure à 400 Ko même avec tous les matchs', () => {
    const s = fresh();
    for (const p of PROFILES) {
      s.matches.push(p.id);
      const log = [{ k: 'in' as const, n: p.start, t: T0 }];
      s.convos[p.id] = { pid: p.id, log, status: 'active', end: '', queue: '', due: 0, unread: false, pingAt: 0, notified: false, at: T0 };
      for (let i = 0; i < 4; i++) { const ch = choicesOf(s, p.id); if (!ch.length) break; choose(s, p.id, 0, T0); deliver(s, p.id, T0, false); }
    }
    expect(JSON.stringify(s).length).toBeLessThan(60_000);
  });
});
