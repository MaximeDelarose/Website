import { describe, it, expect } from 'vitest';
import { PROFILES, nodeOf, profileById } from '../src/events/tindeur/swipe/data';
import { choicesOf, choose, defaultSwipe, deliver, ensureDeck, maybeRelance, sanitizeSwipe } from '../src/events/tindeur/swipe/state';
import { applyFx, hiddenExtra, prefixesOf, relanceTarget, EXTRA_TEXT } from '../src/apps/brain/tindeurNodes';
import { defaultBrain } from '../src/apps/brain/memory';

const T0 = 1_700_000_000_000; const DAY = 86_400_000;
let seed = 5; const rnd = () => { seed = (seed * 48271) % 2147483647; return seed / 2147483647; };
const open = (pid: string) => {
  const p = profileById(pid)!; const s = defaultSwipe(); ensureDeck(s, rnd);
  s.matches.push(pid); s.convos[pid] = { pid, log: [{ k: 'in', n: p.start, t: T0 }], status: 'active', end: '', queue: '', due: 0, unread: false, pingAt: 0, notified: false, at: T0 };
  return { p, s };
};
const idxEx = (s: ReturnType<typeof defaultSwipe>, pid: string, ex: string) => choicesOf(s, pid).findIndex((c) => c.ex === ex);
const say = (s: ReturnType<typeof defaultSwipe>, pid: string, i: number) => { expect(choose(s, pid, i, T0)).toBe(true); return deliver(s, pid, T0, false)!; };

describe('Tindeur : nœuds dynamiques', () => {
  it('chaque nœud dynamique est régénéré à l’identique et ne mène jamais à un nœud inconnu', () => {
    for (const p of PROFILES) {
      const seen = new Set<string>(); const go = (id: string, d: number) => {
        if (seen.has(id) || d > 40) return; seen.add(id);
        const n = nodeOf(p, id); expect(n, `${p.id}:${id}`).toBeTruthy();
        expect(JSON.stringify(nodeOf(p, id))).toBe(JSON.stringify(n));
        for (const c of n!.ch) go(c.to, d + 1);
      };
      go(p.start, 0);
      expect(seen.size).toBeGreaterThan(p.nodes.length); // les détours existent
    }
  });
  it('famille : Radia se confie, il réagit selon sa personnalité, puis la conversation reprend où elle en était', () => {
    const { s } = open('kevin'); const pid = 'kevin';
    const ik = idxEx(s, pid, 'kids'); expect(ik).toBeGreaterThanOrEqual(0);
    expect(choicesOf(s, pid)[ik].t).toBe(EXTRA_TEXT.kids);
    const n1 = say(s, pid, ik); expect(n1.id.startsWith('~k:')).toBe(true); expect(n1.say.join(' ').length).toBeGreaterThan(10);
    const n2 = say(s, pid, 0); expect(n2.id.startsWith('~kr:')).toBe(true);
    // retour : les réponses écrites à la main du nœud d'origine sont de nouveau là
    expect(choicesOf(s, pid).length).toBeGreaterThanOrEqual(2);
    const s2 = sanitizeSwipe(JSON.parse(JSON.stringify(s))); // la sauvegarde rejoue exactement
    expect(s2.convos[pid].log.map((m) => m.n)).toEqual(s.convos[pid].log.map((m) => m.n));
  });
  it('amitié : débat en plusieurs tours, peut se terminer par un éloignement sans malus', () => {
    const { s } = open('hugo'); const pid = 'hugo';
    say(s, pid, idxEx(s, pid, 'friends'));
    let guard = 0; while (choicesOf(s, pid).length && choicesOf(s, pid)[0].to.startsWith('~fr') && guard++ < 6) say(s, pid, 0);
    expect(guard).toBeLessThan(6);
  });
  it('Snapchien : seulement pour les personnages qui y sont ; réponse oui / non', () => {
    const { s } = open('hugo'); expect(idxEx(s, 'hugo', 'snap')).toBeGreaterThanOrEqual(0);
    const n = say(s, 'hugo', idxEx(s, 'hugo', 'snap')); expect(n.id.startsWith('~s:')).toBe(true);
    expect(nodeOf(profileById('hugo')!, '~s:inconnu')).toBeUndefined();
    expect(nodeOf(profileById('hugo')!, '~zzz')).toBeUndefined();
  });
  it('mémoire : une confidence est mémorisée et masque la réponse en double', () => {
    const b = defaultBrain();
    expect(hiddenExtra(b, 'kevin', 'kids')).toBe(false);
    applyFx(b, 'kevin', 'kids_all');
    expect(hiddenExtra(b, 'kevin', 'kids')).toBe(true); expect(hiddenExtra(b, 'dylan', 'kids')).toBe(false); // jamais de mélange entre personnages
    expect(b.chars.kevin.memories).toContain('kids');
  });
  it('prénom : jamais deux répliques de suite, sur une longue conversation', () => {
    for (const p of PROFILES) {
      const log = Array.from({ length: 60 }, (_, i) => ({ k: i % 2 ? 'out' : 'in', n: p.nodes[i % p.nodes.length].id }));
      const px = prefixesOf(p, log); const idx = px.map((x, i) => (x ? i : -1)).filter((i) => i >= 0);
      for (let i = 1; i < idx.length; i++) expect(idx[i] - idx[i - 1], p.id).toBeGreaterThan(2);
      expect(px.filter(Boolean).length).toBeLessThan(18);
    }
  });
  it('relance après 3 jours puis éloignement après 3 jours de plus ; rien si l’échange est récent', () => {
    const { s } = open('kevin'); const pid = 'kevin';
    expect(maybeRelance(s, pid, T0 + 2 * DAY)).toBe(false);
    expect(maybeRelance(s, pid, T0 + 3.5 * DAY)).toBe(true);
    expect(s.convos[pid].log[s.convos[pid].log.length - 1].n.startsWith('~rl:')).toBe(true);
    expect(choicesOf(s, pid).length).toBeGreaterThan(0);
    const at = s.convos[pid].log[s.convos[pid].log.length - 1].t;
    expect(maybeRelance(s, pid, at + 1 * DAY)).toBe(false);
    expect(maybeRelance(s, pid, at + 3.2 * DAY)).toBe(true);
    expect(s.convos[pid].status).toBe('ended'); expect(s.convos[pid].end).toBe('~fade');
    expect(relanceTarget('~fade', T0, T0 + 99 * DAY, false)).toBeNull();
  });
  it('anciennes sauvegardes : journaux existants inchangés, indices de réponses conservés', () => {
    const { p, s } = open('maxime');
    const before = p.nodes.find((n) => n.id === p.start)!;
    const merged = nodeOf(p, p.start)!;
    expect(merged.ch.slice(0, before.ch.length)).toEqual(before.ch);
    const s2 = sanitizeSwipe(JSON.parse(JSON.stringify(s)));
    expect(s2.convos.maxime.log[0].n).toBe(p.start);
  });
});
