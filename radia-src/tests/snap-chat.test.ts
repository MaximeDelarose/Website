import { describe, it, expect } from 'vitest';
import { CONTACTS, ANSWERS, REPLIES, SNAP_BACK, BARE_SCENES } from '../src/apps/snap/chat/data';
import { advance, defaultChat, dayKey, deleteContact, flameCount, openSnap, prevDay, produce, readText, refreshFlames, replyChoices, reply, rowStatus, sanitizeChat, sendSnap, unopenedSnaps, unreadTotal, updateFlame } from '../src/apps/snap/chat/engine';
import { Rng } from '../src/utils/rng';
import { profileById } from '../src/events/tindeur/swipe/data';

const T0 = new Date(2026, 10, 5, 12, 0).getTime();
const DAY = 86_400_000;
const rng = (s = 1) => new Rng(s);

describe('contacts Snapchien', () => {
  it('les 10 garçons demandés, avec au moins 5 messages spontanés chacun et des relances', () => {
    for (const n of ['Dylan', 'Maxime', 'Kevin', 'Thomas', 'Nicolas', 'Jordan', 'Alexandre', 'Lucas', 'Enzo', 'Hugo']) expect(CONTACTS.some((c) => c.name === n), n).toBe(true);
    for (const c of CONTACTS) { expect(c.openers.length, c.id).toBeGreaterThanOrEqual(5); expect(c.relances.length, c.id).toBeGreaterThanOrEqual(3); expect(new Set(c.openers).size).toBe(c.openers.length); }
  });
  it('messages d\'exemple fournis présents', () => {
    const all = CONTACTS.flatMap((c) => c.openers).join('|');
    for (const s of ['Tu dors ?', 'T\'es réveillée ?', 'Wsh t\'es où ?', 'Tu fais quoi là ?', 'Bonne nuit ou t\'es encore debout ?', 'T\'as disparu ou quoi ?', 'T\'es occupée ?', 'Je peux t\'envoyer un truc ?', 'T\'es là ?', 'Ça fait longtemps, tu deviens quoi ?']) expect(all).toContain(s);
  });
  it('même identité que Tindeur : les identifiants existent dans les profils (sauf Enzo, qui a son apparence)', () => {
    for (const c of CONTACTS) { if (c.look) expect(c.id).toBe('enzo'); else expect(profileById(c.id), c.id).toBeTruthy(); }
  });
  it('8 réponses de Radia ; chaque style répond à chacune avec ≥ 3 variantes ; réponses après un snap', () => {
    expect(REPLIES.map((r) => r.text)).toEqual(['Mdr t\'as pas de t-shirt ?', 'Tu dors jamais toi ?', 'Mais pourquoi tu m\'envoies ça ?', 'Ah ouais carrément.', 'Tu voulais me montrer quoi exactement ?', 'Je vais dormir là.', 'Bonne nuit !', 'Vu.']);
    for (const style of ['joker', 'sport', 'cool', 'sweet'] as const) { for (const r of REPLIES) expect(new Set(ANSWERS[style][r.id]).size, `${style}/${r.id}`).toBeGreaterThanOrEqual(3); expect(SNAP_BACK[style].length).toBeGreaterThanOrEqual(3); }
  });
  it('« t-shirt » seulement pour les scènes torse nu', () => {
    expect(replyChoices('selfie').some((r) => r.id === 'tshirt')).toBe(false);
    expect(replyChoices('mirror').some((r) => r.id === 'tshirt')).toBe(true);
    for (const sc of BARE_SCENES) expect(replyChoices(sc).length).toBe(REPLIES.length);
  });
  it('humour non explicite : aucun terme cru dans les textes', () => {
    const bad = /\b(sexe|sexy|bite|seins?|cul|baise|porno|nude|érotique|sexuel)\b/i; // « torse nu » est voulu (humour) : seuls les termes crus sont interdits
    const all = [...CONTACTS.flatMap((c) => [...c.openers, ...c.relances, ...Object.values(c.captions).flat()]), ...Object.values(ANSWERS).flatMap((b) => Object.values(b).flat())];
    for (const t of all) expect(t, t).not.toMatch(bad);
  });
});

describe('arrivée des messages', () => {
  it('au départ : 4 contacts, aucun message ; le premier message arrive après environ 75 s de jeu actif', () => {
    const s = defaultChat();
    expect(Object.values(s.contacts).filter((c) => c.added).length).toBe(4);
    expect(advance(s, 30_000, T0, rng())).toBeNull();
    const got = advance(s, 60_000, T0, rng());
    expect(got).toBeTruthy();
    expect(unreadTotal(s)).toBe(1);
  });
  it('jamais plus de 2 non lus par contact ni 6 au total (aucun harcèlement)', () => {
    const s = defaultChat(); const r = rng(4); let t = T0;
    for (let i = 0; i < 600; i++) { t += 30_000; advance(s, 30_000, t, r); for (const c of Object.values(s.contacts)) expect(c.unread).toBeLessThanOrEqual(2); expect(unreadTotal(s)).toBeLessThanOrEqual(6); }
  });
  it('variété : un contact ne répète jamais le même message d\'affilée ; des snaps ET des messages arrivent', () => {
    const s = defaultChat(); const r = rng(9); let t = T0; const seen: Record<string, string[]> = {}; let snaps = 0, texts = 0, videos = 0;
    for (let i = 0; i < 400; i++) {
      t += 120_000; const m = advance(s, 120_000, t, r);
      if (m && !m.joined) { (seen[m.contactId] ??= []).push(m.msg.text); if (m.msg.kind === 'snap') snaps++; else if (m.msg.kind === 'video') videos++; else texts++; }
      for (const c of Object.values(s.contacts)) { c.unread = 0; for (const x of c.msgs) if (x.from === 'in') x.opened = true; } // la joueuse lit tout
    }
    expect(snaps).toBeGreaterThan(10); expect(texts).toBeGreaterThan(20); expect(videos).toBeGreaterThan(0);
    for (const list of Object.values(seen)) for (let i = 1; i < list.length; i++) expect(list[i]).not.toBe(list[i - 1]);
  });
  it('relances : après plusieurs jours sans nouvelles, le contact revient avec un message de relance', () => {
    let checked = 0;
    for (let seed = 1; seed <= 60 && checked < 5; seed++) {
      const s = defaultChat(); const r = rng(seed);
      for (const id of ['maxime', 'kevin', 'thomas']) s.contacts[id].added = false;
      s.contacts.dylan.lastIn = T0 - 6 * DAY; s.clock = s.nextAt;
      const got = produce(s, T0, r);
      if (got?.msg.kind !== 'text') continue; // premier message = texte : c'est une relance
      checked++; expect(CONTACTS.find((c) => c.id === 'dylan')!.relances).toContain(got.msg.text);
    }
    expect(checked).toBeGreaterThanOrEqual(3);
  });
  it('de nouveaux garçons s\'ajoutent peu à peu (« t\'es enfin sur Snapchien »), jamais un contact supprimé', () => {
    const s = defaultChat(); const r = rng(6); let t = T0; deleteContact(s, 'enzo');
    for (let i = 0; i < 600; i++) { t += 60_000; advance(s, 60_000, t, r); for (const c of Object.values(s.contacts)) { c.unread = 0; for (const x of c.msgs) if (x.from === 'in') x.opened = true; } }
    expect(Object.values(s.contacts).filter((c) => c.added).length).toBe(9);
    expect(s.contacts.enzo.added).toBe(false); expect(s.contacts.enzo.msgs.length).toBe(0);
  });
  it('un contact supprimé n\'écrit plus et son historique reste', () => {
    const s = defaultChat(); const r = rng(3); let t = T0;
    for (let i = 0; i < 40; i++) { t += 300_000; advance(s, 300_000, t, r); }
    const before = s.contacts.dylan.msgs.length; deleteContact(s, 'dylan');
    for (let i = 0; i < 200; i++) { t += 300_000; advance(s, 300_000, t, r); }
    expect(s.contacts.dylan.msgs.length).toBe(before); expect(s.contacts.dylan.deleted).toBe(true);
  });
});

describe('snaps rouges', () => {
  const withSnap = () => { const s = defaultChat(); const r = rng(5); let t = T0; let got = null; while (!got || got.msg.kind === 'text') { t += 240_000; got = advance(s, 240_000, t, r); } return { s, got: got!, t }; };
  it('une photo arrive « non ouverte » (rouge) ; une vidéo est un indicateur à part', () => {
    const { s, got } = withSnap();
    const st = rowStatus(s.contacts[got.contactId]);
    expect(st.status).toBe(got.msg.kind === 'video' ? 'video' : 'snap-red');
    expect(unopenedSnaps(s)).toBeGreaterThanOrEqual(1);
  });
  it('l\'ouverture passe le statut à « Ouvert » et décompte le non lu', () => {
    const { s, got } = withSnap();
    const before = unreadTotal(s);
    const m = openSnap(s, got.contactId, got.msg.id)!;
    expect(m.opened).toBe(true); expect(rowStatus(s.contacts[got.contactId]).status).toBe('opened');
    expect(unreadTotal(s)).toBe(before - 1);
    expect(openSnap(s, got.contactId, got.msg.id)!.opened).toBe(true); expect(unreadTotal(s)).toBe(before - 1); // idempotent
  });
  it('les messages texte ne sont pas des snaps ; lire les textes ne marque pas les snaps comme ouverts', () => {
    const s = defaultChat(); const c = s.contacts.dylan;
    c.msgs.push({ id: 'a', from: 'in', kind: 'text', text: 'Tu dors ?', at: T0 }, { id: 'b', from: 'in', kind: 'snap', text: 'x', scene: 'mirror', opened: false, at: T0 }); c.unread = 2;
    readText(s, 'dylan');
    expect(c.msgs[0].opened).toBe(true); expect(c.msgs[1].opened).toBe(false); expect(c.unread).toBe(1);
  });
  it('répondre : le contact répond selon sa personnalité, jamais deux fois la même phrase de suite', () => {
    const s = defaultChat(); const r = rng(8); const seen: string[] = [];
    for (let i = 0; i < 40; i++) { const out = reply(s, 'kevin', 'tshirt', T0 + i, r)!; expect(out.mine.text).toBe('Mdr t\'as pas de t-shirt ?'); expect(ANSWERS.joker.tshirt).toContain(out.theirs.text); seen.push(out.theirs.text); }
    for (let i = 1; i < seen.length; i++) expect(seen[i]).not.toBe(seen[i - 1]);
    expect(reply(s, 'kevin', 'inconnu', T0, r)).toBeNull();
  });
});

describe('flammes', () => {
  it('rien au départ ; un seul côté ne suffit pas ; les messages texte ne comptent pas', () => {
    const s = defaultChat(); const r = rng(1);
    expect(flameCount(s.contacts.dylan.flame, dayKey(T0))).toBe(0);
    reply(s, 'dylan', 'vu', T0, r); reply(s, 'dylan', 'nuit', T0 + 1, r);
    expect(s.contacts.dylan.flame.n).toBe(0);
    s.contacts.dylan.flame.mine = dayKey(T0); updateFlame(s.contacts.dylan.flame, dayKey(T0));
    expect(s.contacts.dylan.flame.n).toBe(0);
  });
  it('échange réciproque de snaps : la flamme démarre à 1, puis monte chaque jour consécutif, une seule fois par jour', () => {
    const s = defaultChat(); const r = rng(2);
    for (let d = 0; d < 5; d++) { const t = T0 + d * DAY; sendSnap(s, 'kevin', t, r); sendSnap(s, 'kevin', t + 60_000, r); expect(s.contacts.kevin.flame.n).toBe(d + 1); expect(flameCount(s.contacts.kevin.flame, dayKey(t))).toBe(d + 1); }
  });
  it('une journée manquée interrompt la série : elle repart de zéro (sans pénalité ni paiement)', () => {
    const s = defaultChat(); const r = rng(3);
    for (let d = 0; d < 3; d++) sendSnap(s, 'kevin', T0 + d * DAY, r);
    expect(s.contacts.kevin.flame.n).toBe(3);
    refreshFlames(s, T0 + 5 * DAY);
    expect(s.contacts.kevin.flame.n).toBe(0);
    sendSnap(s, 'kevin', T0 + 5 * DAY, r);
    expect(s.contacts.kevin.flame.n).toBe(1);
  });
  it('un snap reçu spontanément + un snap de Radia le même jour = flamme', () => {
    const s = defaultChat(); const r = rng(4);
    s.contacts.thomas.flame.theirs = dayKey(T0);
    sendSnap(s, 'thomas', T0, r);
    expect(s.contacts.thomas.flame.n).toBe(1);
  });
  it('contact supprimé : aucun snap possible', () => { const s = defaultChat(); deleteContact(s, 'kevin'); expect(sendSnap(s, 'kevin', T0, rng())).toBeNull(); });
  it('jour précédent (calendrier) : fin de mois et d\'année', () => { expect(prevDay('2026-03-01')).toBe('2026-02-28'); expect(prevDay('2026-01-01')).toBe('2025-12-31'); });
});

describe('sauvegarde Snapchien', () => {
  it('aller-retour : messages, flammes, contacts supprimés, notifications coupées', () => {
    const s = defaultChat(); const r = rng(7);
    sendSnap(s, 'kevin', T0, r); reply(s, 'dylan', 'vu', T0, r); deleteContact(s, 'thomas'); s.muted = true;
    const back = sanitizeChat(JSON.parse(JSON.stringify(s)));
    expect(back.contacts.kevin.flame.n).toBe(1); expect(back.contacts.thomas.deleted).toBe(true); expect(back.contacts.thomas.added).toBe(false);
    expect(back.contacts.dylan.msgs.length).toBe(s.contacts.dylan.msgs.length); expect(back.muted).toBe(true);
  });
  it('données abîmées : jamais d\'exception, valeurs bornées', () => {
    expect(sanitizeChat(null)).toEqual(defaultChat());
    const b = sanitizeChat({ clock: -5, contacts: { kevin: { unread: 9999, msgs: 'x', flame: { n: -3, day: 'zz' }, scenes: ['inconnu'] }, evil: {} } });
    expect(b.clock).toBe(0); expect(b.contacts.kevin.unread).toBeLessThanOrEqual(99); expect(b.contacts.kevin.flame.n).toBe(0); expect((b.contacts as Record<string, unknown>).evil).toBeUndefined();
  });
});
