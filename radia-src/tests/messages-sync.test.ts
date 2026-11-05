import { describe, it, expect } from 'vitest';
import { defaultMessages, deliver, syncLegacy, sanitizeMessages, unreadTotal, type LegacyMsg, type MessagesState } from '../src/apps/messages/engine';
import { CONTACT_IDS } from '../src/apps/messages/data';
import { defaultEvents, sanitizeEvents } from '../src/events/state';
import { ensureInviteTs, inviteTime, offerInvite } from '../src/events/manager';
import { eventById } from '../src/events/data';

const H = 3600e3;
const NOW = 1_800_000_000_000;
const legacy = (over: Partial<LegacyMsg> = {}): LegacyMsg => ({ at: NOW - 2 * 60e3, from: 'auguste', text: 'Un petit message pour te dire de ne pas oublier de manger. Sahha !', read: false, ...over });

describe('Messages : un seul historique par conversation', () => {
  it('le cas signalé : un message récent de l\'ancien système est à sa place chronologique, pas en haut', () => {
    const s = defaultMessages();
    for (const [i, t] of ['Coucou toi', 'Tout va bien', 'Je pense à toi'].entries()) deliver(s, 'auguste', t, NOW - (3 - i) * H, { unread: false });
    const l = [legacy()];
    expect(syncLegacy(s, l)).toBe(1);
    const texts = s.convos.auguste.msgs.map((m) => m.text);
    expect(texts[texts.length - 1]).toMatch(/ne pas oublier de manger/); // le plus récent est le DERNIER, pas le premier
    expect(s.convos.auguste.msgs.map((m) => m.at)).toEqual([...s.convos.auguste.msgs.map((m) => m.at)].sort((a, b) => a - b));
  });
  it('l\'aperçu de la liste (dernier message de la conversation) = le message présent dans l\'historique', () => {
    const s = defaultMessages(); syncLegacy(s, [legacy({ text: 'Salut !' })]);
    const c = s.convos.auguste; expect(c.msgs[c.msgs.length - 1].text).toBe('Salut !');
  });
  it('migration idempotente : rejouée, rien n\'est dupliqué ; l\'ancien historique est conservé (marqué, pas supprimé)', () => {
    const s = defaultMessages(); const l = [legacy(), legacy({ from: 'maman', text: 'Coucou ma chérie', at: NOW - 5 * 60e3 })];
    expect(syncLegacy(s, l)).toBe(2); expect(syncLegacy(s, l)).toBe(0);
    expect(s.convos.auguste.msgs.length).toBe(1); expect(s.convos.maman.msgs.length).toBe(1);
    expect(l.length).toBe(2); expect(l.every((m) => m.synced && m.read)).toBe(true);
  });
  it('les non lus restent non lus (badge) ; les messages déjà lus ne créent pas de badge', () => {
    const s = defaultMessages();
    syncLegacy(s, [legacy({ read: false }), legacy({ text: 'Déjà lu', read: true, at: NOW - 9 * 60e3 })]);
    expect(s.convos.auguste.unread).toBe(1); expect(unreadTotal(s)).toBe(1);
  });
  it('tous les contacts : Maman, les trois enfants, l\'agence, Auguste', () => {
    const s = defaultMessages(); const l = CONTACT_IDS.map((id, i) => legacy({ from: id, text: `Message de ${id}`, at: NOW - i * 60e3 }));
    expect(syncLegacy(s, l)).toBe(CONTACT_IDS.length);
    for (const id of CONTACT_IDS) { expect(s.convos[id].msgs.map((m) => m.text)).toEqual([`Message de ${id}`]); expect(s.convos[id].unread).toBe(1); }
  });
  it('un expéditeur inconnu n\'est pas attribué à quelqu\'un d\'autre : il reste en attente, intact', () => {
    const s = defaultMessages(); const l = [legacy({ from: 'inconnu' })];
    expect(syncLegacy(s, l)).toBe(0); expect(l[0].synced).toBeUndefined(); expect(CONTACT_IDS.some((id) => s.convos[id].msgs.length)).toBe(false);
  });
  it('un message envoyé deux fois à la même seconde n\'apparaît qu\'une fois (pas de doublon)', () => {
    const s = defaultMessages(); expect(deliver(s, 'maman', 'Coucou', NOW)).toBeTruthy(); expect(deliver(s, 'maman', 'Coucou', NOW + 300)).toBeNull();
    expect(s.convos.maman.msgs.length).toBe(1); expect(s.convos.maman.unread).toBe(1);
  });
  it('texte vide ou contact inconnu : rien n\'est déposé', () => {
    const s = defaultMessages(); expect(deliver(s, 'maman', '   ', NOW)).toBeNull(); expect(deliver(s, 'zzz' as never, 'x', NOW)).toBeNull();
  });
  it('un message plus ancien que les suivants s\'insère avant eux ; à égalité d\'heure l\'ordre d\'arrivée est conservé', () => {
    const s = defaultMessages(); deliver(s, 'auguste', 'B', NOW); deliver(s, 'auguste', 'C', NOW + 5000); deliver(s, 'auguste', 'A', NOW - 5000); deliver(s, 'auguste', 'B2', NOW + 2000);
    expect(s.convos.auguste.msgs.map((m) => m.text)).toEqual(['A', 'B', 'B2', 'C']);
  });
  it('plafond de 80 messages : on retire les plus anciens, jamais le nouveau', () => {
    const s = defaultMessages(); for (let i = 0; i < 95; i++) deliver(s, 'auguste', `m${i}`, NOW + i * 1000, { unread: false });
    expect(s.convos.auguste.msgs.length).toBe(80); expect(s.convos.auguste.msgs[79].text).toBe('m94'); expect(s.convos.auguste.msgs[0].text).toBe('m15');
  });
  it('sauvegarde : un fil mal ordonné est remis dans l\'ordre au chargement ; rechargement = mêmes messages', () => {
    const s = defaultMessages(); deliver(s, 'auguste', 'tard', NOW, { unread: false }); deliver(s, 'auguste', 'tôt', NOW - H, { unread: false });
    const raw = JSON.parse(JSON.stringify(s)); raw.convos.auguste.msgs.reverse(); // simule un ancien fichier désordonné
    const back = sanitizeMessages(raw) as MessagesState;
    expect(back.convos.auguste.msgs.map((m) => m.text)).toEqual(['tôt', 'tard']);
    const again = sanitizeMessages(JSON.parse(JSON.stringify(back)));
    expect(again.convos.auguste.msgs.map((m) => m.text)).toEqual(['tôt', 'tard']);
  });
});

describe('Messages : sauvegarde de l\'ancien historique et des invitations', () => {
  it('le marqueur « repris » survit à la sauvegarde (aucun message n\'est repris deux fois après rechargement)', () => {
    const st = defaultEvents(); st.msgs.push({ at: NOW, from: 'auguste', text: 'Bonjour', read: false });
    const s = defaultMessages(); syncLegacy(s, st.msgs as never);
    const back = sanitizeEvents(JSON.parse(JSON.stringify(st)));
    expect(back.msgs[0].synced).toBe(true); expect(syncLegacy(s, back.msgs as never)).toBe(0); expect(s.convos.auguste.msgs.length).toBe(1);
  });
  it('invitation : heure réelle enregistrée à la réception et conservée à la sauvegarde', () => {
    const st = defaultEvents(); st.playMs = 600_000; const inv = offerInvite(st, eventById('r-restaurant')!, NOW, 'r1');
    expect(inv.ts).toBe(NOW);
    expect(sanitizeEvents(JSON.parse(JSON.stringify(st))).inbox[0].ts).toBe(NOW);
  });
  it('anciennes invitations sans heure : estimée une seule fois (jamais dans le futur), puis stable', () => {
    const st = defaultEvents(); st.playMs = 1_000_000; st.inbox.push({ runId: 'r0', eventId: 'r-restaurant', at: 700_000, state: 'seen' });
    expect(inviteTime(st, st.inbox[0], NOW)).toBe(NOW - 300_000);
    expect(ensureInviteTs(st, NOW)).toBe(1); expect(st.inbox[0].ts).toBe(NOW - 300_000);
    expect(ensureInviteTs(st, NOW + 99 * H)).toBe(0); expect(st.inbox[0].ts).toBe(NOW - 300_000);
  });
});
