/** Mémoire des conversations (une par personnage, partagée par Tindeur et Snapchien) : sauvegarde nettoyée champ par champ. */
import type { BrainState, CharMem, PhotoMem, Thread, TopicId } from './types';
import { PERSONAS } from './personas';

export const emptyPhoto = (): PhotoMem => ({ asks: 0, lastAskAt: 0, noMore: false, holdUntil: 0, hers: [], his: [], pending: false, relanced: false });
export const emptyMem = (): CharMem => ({
  facts: { kids: 0, friends: 0, single: 0 }, aff: 0, turns: 0, talkedAt: 0, lastTopic: '', topics: {}, recent: [], nameUses: 0, lastNameTurn: -99, bad: 0,
  thread: null, offered: [], told: [], photo: emptyPhoto(), memories: [], faded: false, blocked: false, ask: '', said: [],
});
export const defaultBrain = (): BrainState => ({ v: 1, chars: {} });
export function memOf(b: BrainState, id: string): CharMem { return (b.chars[id] ??= emptyMem()); }

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const num = (v: unknown, d: number, lo: number, hi: number): number => (typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d);
const strs = (v: unknown, max: number, len = 200): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').map((x) => x.slice(0, len)).slice(-max) : []);
const TOPICS: TopicId[] = ['smalltalk', 'banter', 'name', 'kids', 'friend', 'single', 'photo', 'callback', 'anecdote', 'joke', 'relance', 'snapfollow', 'flame'];

export function sanitizeBrain(raw: unknown): BrainState {
  const d = defaultBrain();
  if (!isObj(raw) || !isObj(raw.chars)) return d;
  for (const p of PERSONAS) {
    const r = raw.chars[p.id]; if (!isObj(r)) continue;
    const m = emptyMem();
    if (isObj(r.facts)) m.facts = { kids: Math.round(num(r.facts.kids, 0, 0, 3)) as 0 | 1 | 2 | 3, friends: Math.round(num(r.facts.friends, 0, 0, 2)) as 0 | 1 | 2, single: Math.round(num(r.facts.single, 0, 0, 2)) as 0 | 1 | 2 };
    m.aff = num(r.aff, 0, -9, 12); m.turns = Math.floor(num(r.turns, 0, 0, 1e6)); m.talkedAt = num(r.talkedAt, 0, 0, 1e14);
    m.lastTopic = TOPICS.includes(r.lastTopic as TopicId) ? (r.lastTopic as TopicId) : '';
    if (isObj(r.topics)) for (const t of TOPICS) if (typeof r.topics[t] === 'number') m.topics[t] = Math.floor(num(r.topics[t], 0, 0, 1e5));
    m.recent = strs(r.recent, 14); m.nameUses = Math.floor(num(r.nameUses, 0, 0, 1e5)); m.lastNameTurn = Math.floor(num(r.lastNameTurn, -99, -99, 1e6)); m.bad = Math.floor(num(r.bad, 0, 0, 1e5));
    if (isObj(r.thread) && TOPICS.includes(r.thread.topic as TopicId)) m.thread = { topic: r.thread.topic as TopicId, step: Math.floor(num(r.thread.step, 0, 0, 20)), ...(typeof r.thread.data === 'string' ? { data: r.thread.data.slice(0, 40) } : {}) } as Thread;
    m.offered = strs(r.offered, 6, 20); m.told = strs(r.told, 12, 40); m.memories = strs(r.memories, 10, 30);
    if (isObj(r.photo)) {
      const q = r.photo;
      m.photo = { asks: Math.floor(num(q.asks, 0, 0, 99)), lastAskAt: num(q.lastAskAt, 0, 0, 1e14), noMore: q.noMore === true, holdUntil: num(q.holdUntil, 0, 0, 1e14), hers: strs(q.hers, 12, 20),
        his: (Array.isArray(q.his) ? q.his : []).filter(isObj).slice(-6).map((x) => ({ scene: typeof x.scene === 'string' ? x.scene.slice(0, 16) : 'selfie', at: num(x.at, 0, 0, 1e14) })), pending: q.pending === true, relanced: q.relanced === true };
    }
    m.ask = typeof r.ask === 'string' ? r.ask.slice(0, 20) : ''; m.said = strs(r.said, 8, 24);
    m.faded = r.faded === true; m.blocked = r.blocked === true;
    d.chars[p.id] = m;
  }
  return d;
}
