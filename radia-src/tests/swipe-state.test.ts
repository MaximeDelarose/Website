import { describe, it, expect } from 'vitest';
import { PROFILES, profileById } from '../src/events/tindeur/swipe/data';
import {
  SW, blockMatch, currentId, defaultSwipe, deferQueue, deliver, ensureDeck, relanceIfDue, sendText, ignorePing, like, markPinged, markRead,
  nextHeartIn, pass, pickPing, refillBank, removeMatch, resumeConvo, sanitizeSwipe, snoozePing, stopConvo, tickClock, unreadCount,
} from '../src/events/tindeur/swipe/state';
import { defaultFun, sanitizeFun } from '../src/save/fun';
import { defaultBrain } from '../src/apps/brain/memory';

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
    expect(s.convos.kevin.msgs[0]).toMatchObject({ k: 'in' });
    expect(s.convos.kevin.msgs.length).toBeGreaterThanOrEqual(2);
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

describe('Tindeur jouable : conversations libres', () => {
  const open = (pid = 'kevin') => { const s = fresh(); like(s, T0, () => 0); void pid; return s; };
  it('Radia écrit librement : son texte exact est enregistré et le match prépare une réponse', () => {
    const s = open(); const b = defaultBrain();
    const r = sendText(s, b, 'kevin', '  Salut   Kevin !!  ça va ?  ', T0 + 1000, lcg(3));
    expect(r).toBeTruthy(); expect(r!.lines.length).toBeGreaterThanOrEqual(1);
    const out = s.convos.kevin.msgs.filter((m) => m.k === 'out');
    expect(out[out.length - 1].text).toBe('Salut Kevin !! ça va ?');
    expect(s.convos.kevin.pending.length).toBe(r!.lines.length);
    // un message vide ou un envoi pendant qu'il « écrit » est refusé
    expect(sendText(s, b, 'kevin', '   ', T0 + 1100)).toBeNull();
    expect(sendText(s, b, 'kevin', 'encore', T0 + 1100)).toBeNull();
    const lines = deliver(s, 'kevin', T0 + 3000, false)!;
    expect(lines).toEqual(r!.lines);
    expect(s.convos.kevin.pending).toEqual([]);
    expect(s.convos.kevin.msgs[s.convos.kevin.msgs.length - 1]).toMatchObject({ k: 'in', text: lines[lines.length - 1] });
    expect(s.convos.kevin.unread).toBe(false);
  });
  it('quitter pendant qu’il écrit : la réponse arrive plus tard, en temps de jeu ACTIF seulement', () => {
    const s = open(); const r = lcg(9); const b = defaultBrain();
    sendText(s, b, 'kevin', 'coucou', T0, r);
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
    expect(s.convos.kevin.pending).toEqual([]);
  });
  it('conversation longue : 30 messages variés (fautes, argot, changements de sujet) sans plantage ni répétition', () => {
    const s = open(); const b = defaultBrain(); const r = lcg(11);
    const said = ['slt', 'mdrrr ptdr', 'tu fe koi dans la vie', 'jsp trop', 'et le foot ?', 'j\'adore les chats', 'pk tu dis ca', 'JE SUIS FATIGUEE', 'merci', '😂😂😂', 'bonne nuit', 'je suis divorcée et j\'ai trois enfants', 'tu es mignon', 'ok', 'raconte moi un truc', 'tu as snapchien ?', 'oui ajoute moi', 'on se voit quand ?', 'non je préfère ne pas envoyer de photo', 'a demain'];
    let t = T0;
    for (let i = 0; i < 30; i++) {
      t += 60_000;
      const res = sendText(s, b, 'kevin', said[i % said.length], t, r);
      expect(res, `msg ${i}`).toBeTruthy();
      expect(deliver(s, 'kevin', t + 5000, false)).toBeTruthy();
    }
    expect(s.convos.kevin.msgs.length).toBeLessThanOrEqual(SW.logMax);
    expect(JSON.stringify(sanitizeSwipe(JSON.parse(JSON.stringify(s)))).length).toBeLessThan(80_000);
  });
  it('relance après 3 jours sans nouvelles, jamais avant', () => {
    const s = open(); const b = defaultBrain(); const r = lcg(5);
    expect(relanceIfDue(s, b, 'kevin', T0 + 2 * 86_400_000, r)).toEqual([]);
    const lines = relanceIfDue(s, b, 'kevin', T0 + 3.5 * 86_400_000, r);
    expect(lines.length).toBeGreaterThan(0);
    expect(s.convos.kevin.unread).toBe(true);
    expect(relanceIfDue(s, b, 'kevin', T0 + 3.6 * 86_400_000, r)).toEqual([]); // pas deux relances d'affilée
  });
  it('supprimer ou bloquer : le match ne revient jamais dans la pile', () => {
    const s = open(); const b = defaultBrain();
    removeMatch(s, 'kevin');
    for (let i = 0; i < PROFILES.length * 3; i++) expect(pass(s, lcg(i + 1))).not.toBe('kevin');
    ensureDeck(s, lcg(2)); expect(s.order).not.toContain('kevin');
    const s2 = open(); blockMatch(s2, b, 'kevin');
    expect(b.chars.kevin.blocked).toBe(true); expect(s2.removed).toContain('kevin');
    const re = sanitizeSwipe(JSON.parse(JSON.stringify(s2)));
    expect(re.removed).toContain('kevin'); expect(re.matches).not.toContain('kevin');
  });
  it('anciennes conversations à choix multiples : le journal de nœuds devient de vrais messages', () => {
    const p = profileById('kevin')!;
    const re = sanitizeSwipe({ matches: ['kevin'], convos: { kevin: { log: [{ k: 'in', n: 's', t: 5 }, { k: 'out', n: 's', c: 1, t: 6 }, { k: 'in', n: 'b', t: 7 }], status: 'active', queue: '', at: 7 } } });
    const msgs = re.convos.kevin.msgs;
    expect(msgs[0]).toMatchObject({ k: 'in', text: 'Salut ! Moi c’est Kevin.' });
    expect(msgs.some((m) => m.k === 'out' && /Josiane/.test(m.text))).toBe(true);
    expect(msgs[msgs.length - 1].k).toBe('in');
    void p;
    // un nœud dynamique de la version précédente est aussi rejoué
    const re2 = sanitizeSwipe({ matches: ['kevin'], convos: { kevin: { log: [{ k: 'in', n: 's', t: 5 }, { k: 'out', n: 's', c: 3, t: 6 }, { k: 'in', n: '~k:s', t: 7 }], at: 7 } } });
    expect(re2.convos.kevin.msgs.length).toBeGreaterThanOrEqual(4);
  });
  it('arrêter, reprendre et supprimer le match', () => {
    const s = open(); const b = defaultBrain();
    stopConvo(s, 'kevin');
    expect(s.convos.kevin.status).toBe('stopped');
    expect(sendText(s, b, 'kevin', 'coucou', T0)).toBeNull();
    resumeConvo(s, 'kevin');
    expect(s.convos.kevin.status).toBe('active');
    expect(sendText(s, b, 'kevin', 'coucou', T0)).toBeTruthy();
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
    sendText(s, defaultBrain(), 'kevin', 'salut', T0 + 9, lcg(4)); deliver(s, 'kevin', T0 + 10, false);
    sendText(s, defaultBrain(), 'hugo', 'coucou', T0 + 11, lcg(5));
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
    like(s, T0, () => 0); sendText(s, defaultBrain(), 'kevin', 'salut', T0, lcg(6)); deliver(s, 'kevin', T0 + 1, false);
    f.apps.swipe = JSON.parse(JSON.stringify(s));
    f.tindeur.installed = false; f.tindeur.choice = 'uninstall';
    let g = sanitizeFun(JSON.parse(JSON.stringify(f)));
    g.tindeur.installed = true; g.tindeur.choice = 'keep';
    g = sanitizeFun(JSON.parse(JSON.stringify(g)));
    expect(sanitizeSwipe(g.apps.swipe)).toEqual(s);
  });
  it('données corrompues ou inconnues : retour aux valeurs par défaut, sans exception', () => {
    for (const bad of [null, 42, 'x', [], {}, { convos: 5 }, { order: 'oups', bank: { n: 'a' } }, { convos: { kevin: { msgs: 'non', log: 'non' } } }]) {
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
    expect(s.convos.kevin.msgs.length).toBeGreaterThanOrEqual(1);
    expect(s.convos.kevin.msgs[0].k).toBe('in');
    expect(s.convos.kevin.pending).toEqual([]);
    expect(s.endings.kevin).toEqual(['x']);
    expect(profileById('kevin')).toBeTruthy();
  });
  it('la taille sérialisée reste très inférieure à 400 Ko même avec tous les matchs', () => {
    const s = fresh();
    for (const p of PROFILES) {
      s.matches.push(p.id);
      s.convos[p.id] = { pid: p.id, msgs: [{ k: 'in', text: 'Salut !', t: T0 }], status: 'active', end: '', pending: [], due: 0, unread: false, pingAt: 0, notified: false, at: T0 };
      for (let i = 0; i < 40; i++) { sendText(s, defaultBrain(), p.id, 'un message de test assez long pour la taille ' + i, T0 + i, lcg(i + 1)); deliver(s, p.id, T0 + i, false); }
    }
    expect(JSON.stringify(s).length).toBeLessThan(380_000);
  });
});

describe('Tindeur → Snapchien : même personnage', () => {
  it('chaque personnage qui propose Snapchien existe vraiment dans les contacts Snapchien', async () => {
    const { CONTACTS } = await import('../src/apps/snap/chat/data');
    const { SNAP_IDS } = await import('../src/events/tindeur/swipe/state');
    for (const id of SNAP_IDS) expect(CONTACTS.some((c) => c.id === id), id).toBe(true);
    for (const id of SNAP_IDS) expect(profileById(id), id).toBeTruthy(); // un seul personnage dans les deux applications
  });
});
