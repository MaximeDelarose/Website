import { describe, it, expect } from 'vitest';
import { AUGUSTE_SPONTANEOUS, AUGUSTE_REPLIES, KID_SPONTANEOUS, MAMAN_SPONTANEOUS, CONTACT_IDS, type ContactId, type KidStyle } from '../src/apps/messages/data';
import { advance, applyReply, applyRead, defaultMessages, intentOf, lastSentStatus, markRead, planReply, produce, react, sanitizeMessages, send, theirReaction, unreadTotal, FIRST_AT_MS } from '../src/apps/messages/engine';

const rng = (seed = 1) => { let s = seed >>> 0 || 1; const next = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; return { next, int: (n: number) => Math.floor(next() * n) }; };
const styleOf = (id: ContactId): KidStyle => (id === 'kid3' ? 'small' : id === 'kid2' ? 'mid' : 'big');
const T0 = Date.UTC(2026, 10, 5, 12, 0, 0);
const MIN = 60_000;

describe('textes', () => {
  it('Auguste : au moins 40 messages spontanés variés ; « galbi » presque jamais', () => {
    expect(AUGUSTE_SPONTANEOUS.length).toBeGreaterThanOrEqual(40);
    expect(new Set(AUGUSTE_SPONTANEOUS.map((l) => l.text)).size).toBe(AUGUSTE_SPONTANEOUS.length);
    expect(new Set(AUGUSTE_SPONTANEOUS.map((l) => l.cat)).size).toBeGreaterThanOrEqual(5);
    expect(AUGUSTE_SPONTANEOUS.filter((l) => /galbi/i.test(l.text)).length).toBeLessThanOrEqual(1);
    for (const r of Object.values(AUGUSTE_REPLIES).flat()) expect(r).not.toMatch(/galbi/i);
  });
  it('Auguste : beaucoup de banal / drôle, peu de grandes déclarations', () => {
    const n = (c: string) => AUGUSTE_SPONTANEOUS.filter((l) => l.cat === c).length;
    expect(n('banal') + n('fun')).toBeGreaterThan(n('tender') + n('galbi') + n('proud'));
  });
  it('maman, enfants (3 styles) et exemples demandés présents', () => {
    expect(MAMAN_SPONTANEOUS.length).toBeGreaterThanOrEqual(8);
    expect(MAMAN_SPONTANEOUS.some((l) => l.text === 'Coucou ma fille, tu vas bien ?')).toBe(true);
    expect(MAMAN_SPONTANEOUS.some((l) => l.text === 'N\'oublie pas de m\'appeler quand tu peux.')).toBe(true);
    for (const st of ['big', 'mid', 'small'] as const) expect(KID_SPONTANEOUS[st].length).toBeGreaterThanOrEqual(5);
    expect(KID_SPONTANEOUS.small.every((l) => /adulte/.test(l.text))).toBe(true); // la plus jeune : toujours avec l'aide d'un adulte
    expect(KID_SPONTANEOUS.mid.some((l) => /regarde ce que j'ai fait|On mange quoi/.test(l.text)) || KID_SPONTANEOUS.big.some((l) => /regarde ce que j'ai fait/.test(l.text))).toBe(true);
    expect(AUGUSTE_SPONTANEOUS.some((l) => l.text === 'Bsahték, t\'as géré aujourd\'hui !')).toBe(true);
  });
});

describe('arrivée des messages', () => {
  it('rien avant ~3 min de jeu actif, puis un premier message', () => {
    const s = defaultMessages(); const r = rng(3);
    expect(advance(s, FIRST_AT_MS - 1000, T0, r, styleOf)).toBeNull();
    expect(advance(s, 2000, T0, r, styleOf)).toBeTruthy();
    expect(unreadTotal(s)).toBe(1);
  });
  it('jamais plus de 2 non lus par contact ni 4 au total (aucun harcèlement)', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const s = defaultMessages(); const r = rng(seed); let t = T0;
      for (let i = 0; i < 400; i++) {
        t += 9 * MIN; advance(s, 9 * MIN, t, r, styleOf);
        expect(unreadTotal(s)).toBeLessThanOrEqual(4);
        for (const id of CONTACT_IDS) expect(s.convos[id].unread).toBeLessThanOrEqual(2);
      }
    }
  });
  it('jamais deux fois le même texte d\'affilée pour un contact ; thèmes alternés', () => {
    const s = defaultMessages(); const r = rng(9); let t = T0; const seen: Record<string, string[]> = {}; const cats: string[] = [];
    for (let i = 0; i < 300; i++) {
      t += 9 * MIN; const got = advance(s, 9 * MIN, t, r, styleOf);
      if (got) { const l = (seen[got.contactId] ??= []); expect(l[l.length - 1]).not.toBe(got.msg.text); l.push(got.msg.text); if (got.contactId === 'auguste') cats.push(s.convos.auguste.lastCat); }
      for (const id of CONTACT_IDS) s.convos[id].unread = 0; // la joueuse lit tout
    }
    let same = 0; for (let i = 1; i < cats.length; i++) if (cats[i] === cats[i - 1]) same++;
    expect(same).toBe(0);
  });
  it('Auguste écrit le plus souvent ; tous les autres contacts écrivent aussi', () => {
    const s = defaultMessages(); const r = rng(5); let t = T0; const n: Record<string, number> = {};
    for (let i = 0; i < 1500; i++) { t += 9 * MIN; const g = advance(s, 9 * MIN, t, r, styleOf); if (g) n[g.contactId] = (n[g.contactId] ?? 0) + 1; for (const id of CONTACT_IDS) s.convos[id].unread = 0; }
    for (const id of CONTACT_IDS) expect(n[id] ?? 0).toBeGreaterThan(0);
    expect(n.auguste).toBeGreaterThan(n.maman);
  });
  it('produce ne renvoie rien si trop de messages non lus', () => {
    const s = defaultMessages(); const r = rng(2);
    let got = 0; for (let i = 0; i < 20; i++) if (produce(s, T0, r, styleOf)) got++;
    expect(got).toBe(4);
  });
});

describe('échanges, accusés simulés, réactions', () => {
  it('envoyer : texte nettoyé, vide refusé, 500 caractères max', () => {
    const s = defaultMessages();
    expect(send(s, 'auguste', '   ', T0)).toBeNull();
    expect(send(s, 'auguste', '  Coucou   toi  ', T0)!.text).toBe('Coucou toi');
    expect(send(s, 'auguste', 'x'.repeat(900), T0)!.text.length).toBe(500);
  });
  it('« Distribué » dès l\'envoi ; « Lu » SEULEMENT quand la lecture a été simulée', () => {
    const s = defaultMessages(); const m = send(s, 'auguste', 'Salut', T0)!;
    const time = () => '12:05';
    expect(lastSentStatus(s.convos.auguste, time)).toEqual({ msgId: m.id, label: 'Distribué' });
    expect(s.convos.auguste.msgs[0].readAt).toBeUndefined();
    applyRead(s, 'auguste', m.id, T0 + 5 * MIN);
    expect(lastSentStatus(s.convos.auguste, time)!.label).toBe('Lu 12:05');
  });
  it('le statut est sous le dernier message ENVOYÉ, pas sous un message reçu', () => {
    const s = defaultMessages(); send(s, 'maman', 'a', T0); const m2 = send(s, 'maman', 'b', T0 + 1)!; applyReply(s, 'maman', 'ok', T0 + 2);
    expect(lastSentStatus(s.convos.maman, () => '')!.msgId).toBe(m2.id);
  });
  it('intentions : merci, je t\'aime, bonne nuit, mdr, question', () => {
    expect(intentOf('Merci beaucoup !')).toBe('thanks');
    expect(intentOf('Je t\'aime')).toBe('love');
    expect(intentOf('Bonne nuit')).toBe('goodnight');
    expect(intentOf('mdr trop drôle')).toBe('laugh');
    expect(intentOf('On fait quoi ?')).toBe('question');
    expect(intentOf('Bsahtek')).toBe('thanks');
    expect(intentOf('blabla')).toBe('generic');
  });
  it('la réponse vient de la bonne banque et reste cohérente avec le message', () => {
    const r = rng(4);
    const p = planReply('auguste', 'Merci', r, styleOf);
    expect(AUGUSTE_REPLIES.thanks).toContain(p.text);
    const k = planReply('kid3', 'Coucou', r, styleOf);
    expect(k.text).toMatch(/adulte/);
    expect(p.typingMs).toBeGreaterThan(800);
  });
  it('pas deux fois la même réponse d\'affilée', () => {
    const s = defaultMessages(); const r = rng(11); let last = '';
    for (let i = 0; i < 40; i++) { const p = planReply('auguste', 'Merci', r, styleOf, s.convos.auguste); expect(p.text).not.toBe(last); last = p.text; applyReply(s, 'auguste', p.text, T0 + i); }
  });
  it('réactions : on réagit à un message reçu, la même réaction la retire, elles se sauvegardent', () => {
    const s = defaultMessages(); const r = rng(1); produce(s, T0, r, styleOf);
    const id = CONTACT_IDS.find((c) => s.convos[c].msgs.length)!; const m = s.convos[id].msgs[0];
    expect(react(s, id, m.id, 'heart')).toBe('heart');
    expect(s.convos[id].msgs[0].myReaction).toBe('heart');
    const back = sanitizeMessages(JSON.parse(JSON.stringify(s)));
    expect(back.convos[id].msgs[0].myReaction).toBe('heart');
    expect(react(s, id, m.id, 'heart')).toBeNull();
    expect(s.convos[id].msgs[0].myReaction).toBeUndefined();
    const mine = send(s, id, 'coucou', T0)!; theirReaction(s, id, mine.id, 'laugh');
    expect(s.convos[id].msgs.find((x) => x.id === mine.id)!.reaction).toBe('laugh');
    expect(react(s, id, mine.id, 'heart')).toBeNull(); // on ne réagit pas à son propre message
  });
  it('lire une conversation remet son compteur à zéro', () => {
    const s = defaultMessages(); produce(s, T0, rng(1), styleOf); const id = CONTACT_IDS.find((c) => s.convos[c].unread)!;
    markRead(s, id); expect(s.convos[id].unread).toBe(0);
  });
});

describe('sauvegarde', () => {
  it('une donnée absente ou corrompue redonne un état propre, sans exception', () => {
    for (const raw of [undefined, null, 5, 'x', [], { convos: 7 }, { convos: { auguste: { msgs: 'oops' } } }]) expect(() => sanitizeMessages(raw)).not.toThrow();
    expect(unreadTotal(sanitizeMessages(null))).toBe(0);
  });
  it('conserve les messages valides, borne les tailles, écarte les réactions inconnues', () => {
    const raw = { clock: 5, nextAt: 99, seq: 3, muted: true, convos: { auguste: { unread: 2, msgs: [{ id: 'a1', from: 'me', text: 'Salut', at: 1, readAt: 5 }, { id: 'a2', from: 'them', text: 'y'.repeat(900), at: 2, reaction: 'bidon', myReaction: 'heart' }] } } };
    const s = sanitizeMessages(JSON.parse(JSON.stringify(raw)));
    expect(s.muted).toBe(true); expect(s.convos.auguste.unread).toBe(2);
    expect(s.convos.auguste.msgs[0]).toMatchObject({ from: 'me', readAt: 5 });
    expect(s.convos.auguste.msgs[1].text.length).toBe(500);
    expect(s.convos.auguste.msgs[1].reaction).toBeUndefined();
    expect(s.convos.auguste.msgs[1].myReaction).toBe('heart');
  });
  it('aller-retour JSON identique', () => {
    const s = defaultMessages(); const r = rng(8); let t = T0;
    for (let i = 0; i < 30; i++) { t += 9 * MIN; advance(s, 9 * MIN, t, r, styleOf); }
    send(s, 'auguste', 'Coucou', t);
    expect(sanitizeMessages(JSON.parse(JSON.stringify(s)))).toEqual(s);
  });
});
