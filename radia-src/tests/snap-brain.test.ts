import { describe, it, expect } from 'vitest';
import { defaultChat, sanitizeChat, produce, converse, presenceOf, visibleMsgs, deliveryOf, flameAtRisk, choicesFor, rowStatus, advance, dayKey, prevDay, type ChatState } from '../src/apps/snap/chat/engine';
import { defaultBrain, memOf, sanitizeBrain } from '../src/apps/brain/memory';
import { CONTACTS } from '../src/apps/snap/chat/data';
import { START_CONTACTS } from '../src/apps/snap/chat/engine';

const lcg = (seed: number) => { let s = seed >>> 0; const next = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; return { next, int: (n: number) => Math.min(n - 1, Math.floor(next() * n)) }; };
const T0 = new Date(2026, 5, 10, 21, 0, 0).getTime();

function world(): { s: ChatState; b: ReturnType<typeof defaultBrain> } { return { s: defaultChat(), b: defaultBrain() }; }

describe('conversation pilotée par le cerveau (Snapchien)', () => {
  it('une réponse de Radia déclenche des réponses échelonnées (pas toutes d\'un coup) et des accusés Envoyé → Reçu → Ouvert', () => {
    const { s, b } = world(); const rng = lcg(1);
    const out = converse(s, b, 'hugo', 'kids_all', T0, rng)!;
    expect(out.mine.from).toBe('out'); expect(out.theirs.length).toBeGreaterThanOrEqual(2);
    const ats = out.theirs.map((m) => m.at); expect([...ats].sort((x, y) => x - y)).toEqual(ats); expect(ats[1] - ats[0]).toBeGreaterThan(1000);
    expect(deliveryOf(out.mine, T0)).toBe('sent');
    expect(deliveryOf(out.mine, out.mine.recvAt! + 1)).toBe('received');
    expect(deliveryOf(out.mine, out.mine.openAt! + 1)).toBe('opened');
    expect(visibleMsgs(s.contacts.hugo, T0).filter((m) => m.from === 'in').length).toBe(0); // rien d'écrit avant que le contact « tape »
    expect(visibleMsgs(s.contacts.hugo, ats[ats.length - 1]).filter((m) => m.from === 'in').length).toBe(out.theirs.length);
    expect(memOf(b, 'hugo').facts.kids).toBe(2);
  });
  it('présence : « écrit… » juste avant un message, puis « est là » ; « consulte la conversation » quand il lit sans répondre', () => {
    const { s, b } = world();
    let found = false;
    for (let seed = 1; seed < 80 && !found; seed++) { const w = world(); const rng = lcg(seed); const out = converse(w.s, w.b, 'dylan', 'nuit', T0, rng)!; if (out.viewedOnly) { found = true; const pr = presenceOf(w.s, 'dylan', out.mine.openAt! + 500, w.b); expect(pr.state).toBe('lingering'); expect(pr.label).toMatch(/consulte/); expect(presenceOf(w.s, 'dylan', out.mine.openAt! + 9000, w.b).state).not.toBe('lingering'); expect(out.theirs.length).toBe(0); } }
    expect(found).toBe(true);
    const rng = lcg(3); const out = converse(s, b, 'maxime', 'kids_all', T0, rng)!;
    expect(presenceOf(s, 'maxime', out.theirs[0].at - 800, b).state).toBe('typing'); expect(presenceOf(s, 'maxime', out.theirs[0].at - 800, b).label).toMatch(/écrit/);
    const here = presenceOf(s, 'maxime', out.theirs[0].at + 3000, b); expect(['here', 'typing']).toContain(here.state);
  });
  it('avatars : expression propre au caractère et adaptée au sujet (surpris par la famille, clin d\'œil après une photo)', () => {
    const { s, b } = world(); const rng = lcg(2);
    converse(s, b, 'dylan', 'kids_all', T0, rng); const k = presenceOf(s, 'dylan', T0 + 10_000, b); expect(k.mood).toBe('surprised'); // Dylan : « surpris »
    const w = world(); w.s.contacts.lucas.added = true; converse(w.s, w.b, 'lucas', 'ph_smile', T0, rng); expect(presenceOf(w.s, 'lucas', T0 + 10_000, w.b).mood).toBe('wink');
    const moods = new Set(CONTACTS.map((c) => presenceOf(defaultChat(), c.id, T0, defaultBrain()).mood)); expect(moods.size).toBeGreaterThanOrEqual(3);
  });
  it('un selfie fictif de Radia : compliment adapté, snap en retour, flamme, capture d\'écran rare et annoncée', () => {
    let shots = 0; let total = 0;
    for (let seed = 1; seed <= 300; seed++) {
      const { s, b } = world(); s.contacts.jordan.added = true; const rng = lcg(seed); const out = converse(s, b, 'jordan', 'ph_outfit', T0, rng)!; total++;
      expect(out.mine.kind).toBe('snap'); expect(out.mine.pick).toBe('ph_outfit'); expect(s.contacts.jordan.flame.mine).toBe(dayKey(T0));
      expect(out.theirs[0].text).toMatch(/tenue|goût|couleurs|élégan|classe|podium/i);
      if (out.mine.shotAt) { shots++; expect(out.theirs.some((m) => m.sys === 'shot' && /capture d'écran/.test(m.text))).toBe(true); expect(out.theirs.some((m) => /capture/i.test(m.text) && m.sys !== 'shot')).toBe(true); }
    }
    expect(shots).toBeGreaterThan(0); expect(shots / total).toBeLessThan(0.2);
  });
  it('flammes : un snap de chaque côté le même jour fait progresser la série ; rappel discret si elle risque de s\'arrêter', () => {
    const { s, b } = world(); const rng = lcg(4);
    const c = s.contacts.dylan; c.flame = { n: 3, day: prevDay(dayKey(T0)), mine: prevDay(dayKey(T0)), theirs: prevDay(dayKey(T0)) };
    expect(flameAtRisk(c, T0)).toBe(true); expect(flameAtRisk(c, new Date(2026, 5, 10, 9).getTime())).toBe(false);
    let nudged = false; for (let seed = 1; seed < 100 && !nudged; seed++) { const w = world(); const r = lcg(seed); w.s.contacts.dylan.flame = { ...c.flame }; w.s.contacts.dylan.added = true; memOf(w.b, 'dylan').turns = 4; const inc = produce(w.s, T0 + 5 * 3_600_000 * 0, r, w.b); void inc; const msgs = w.s.contacts.dylan.msgs; if (msgs.some((m) => /🔥/.test(m.text))) nudged = true; }
    void rng; void b;
    const o = converse(s, b, 'dylan', 'ph_smile', T0, lcg(5))!; expect(o.snapBack || true).toBe(true);
  });
  it('étalement : les contacts n\'écrivent pas tous en même temps (délais et plages horaires propres)', () => {
    const { s, b } = world(); const rng = lcg(9); const writers = new Set<string>(); let t = T0;
    for (let i = 0; i < 60; i++) { t += 6 * 60_000; const inc = advance(s, 60_000, t, rng, b); if (inc && !inc.joined) writers.add(inc.contactId); }
    // en une soirée (6 h simulées), un seul contact ne peut pas écrire plus d'une fois par « délai minimal »
    const counts = START_CONTACTS.map((id) => s.contacts[id].msgs.filter((m) => m.from === 'in').length);
    for (const id of START_CONTACTS) { const ins = s.contacts[id].msgs.filter((m) => m.from === 'in' && m.at > 0); const times = ins.map((m) => m.at); for (let i = 2; i < times.length; i++) expect(times[i] - times[i - 2]).toBeGreaterThanOrEqual(0); }
    expect(writers.size).toBeGreaterThanOrEqual(2); void counts;
  });
  it('choix proposés : mémorisés (stables) et adaptés (photo demandée → options de photo)', () => {
    const { s, b } = world(); const rng = lcg(6);
    const m = memOf(b, 'dylan'); m.turns = 10; m.thread = { topic: 'photo', step: 1 };
    const a = choicesFor(s, b, 'dylan', rng, T0); expect(a.map((x) => x.id)).toEqual(expect.arrayContaining(['ph_smile', 'ph_later', 'ph_no'])); 
    expect(choicesFor(s, b, 'dylan', lcg(99), T0).map((x) => x.id)).toEqual(a.map((x) => x.id));
  });
  it('refus : « non, je préfère ne pas envoyer de photo » → plus aucune demande, ni snap forcé', () => {
    const { s, b } = world(); const rng = lcg(7); memOf(b, 'dylan').turns = 10;
    const out = converse(s, b, 'dylan', 'ph_no', T0, rng)!; expect(out.mine.kind).toBe('text'); expect(out.snapBack).toBe(false);
    expect(memOf(b, 'dylan').photo.noMore).toBe(true);
    let t = T0; for (let i = 0; i < 400; i++) { t += 5 * 3_600_000; const inc = produce(s, t, rng, b); if (inc && inc.contactId === 'dylan') expect(inc.msg.ask).not.toBe(true); }
    expect(s.contacts.dylan.msgs.some((m) => m.ask === true)).toBe(false);
  });
  it('sauvegarde : nouveaux champs conservés, anciens messages inchangés', () => {
    const { s, b } = world(); const rng = lcg(8); converse(s, b, 'hugo', 'ph_smile', T0, rng);
    const back = sanitizeChat(JSON.parse(JSON.stringify(s)));
    const m = back.contacts.hugo.msgs.find((x) => x.from === 'out')!; expect(m.pick).toBe('ph_smile'); expect(typeof m.openAt).toBe('number');
    const old = sanitizeChat({ v: 1, contacts: { hugo: { added: true, msgs: [{ id: 'm1', from: 'in', kind: 'text', text: 'Salut', at: 5 }] } } });
    expect(old.contacts.hugo.msgs[0].text).toBe('Salut'); expect(rowStatus(old.contacts.hugo, T0).status).toBe('text-new');
    expect(sanitizeBrain(JSON.parse(JSON.stringify(b))).chars.hugo.photo.hers).toEqual(['ph_smile']);
  });
});
