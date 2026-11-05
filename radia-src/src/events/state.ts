/** État des invitations dans la sauvegarde : valeurs par défaut, nettoyage, accès. */
import type { EventsState, Invite, PhotoRec, ActiveRun, Msg, Sender } from './types';
import { PLACE_IDS } from './types';
import { CLOTH_SLOTS, HAIR_IDS, KID_IDS, DEFAULT_LOOK, type ClothId, type KidId, type Look } from '../data/world/ids';

export const SECRET_MIN = 20 * 60_000;
export const SECRET_MAX = 30 * 60_000;
/** Tire le seuil de déclenchement : variable, entre 20 et 30 minutes. */
export const rollSecretTarget = (r: number = Math.random()): number => Math.round(SECRET_MIN + Math.min(0.999999, Math.max(0, r)) * (SECRET_MAX - SECRET_MIN));

export const defaultEvents = (): EventsState => ({
  secret: { activeMs: 0, target: rollSecretTarget(), triggered: false, heard: 0, runId: '' },
  inbox: [], msgs: [], done: {}, current: null, photos: [], claimed: {}, playMs: 0, lastInviteAt: 0,
  bigLog: [], smallLog: [], lastEventId: '', seq: 1, counters: {},
});

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const num = (v: unknown, d: number, lo = 0, hi = Number.MAX_SAFE_INTEGER): number => (typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d);
const str = (v: unknown, d = '', max = 80): string => (typeof v === 'string' ? v.slice(0, max) : d);
const numArr = (v: unknown, max: number): number[] => (Array.isArray(v) ? v.filter((x): x is number => typeof x === 'number' && Number.isFinite(x)).slice(-max) : []);

const cloth = (v: unknown): ClothId | null => (typeof v === 'string' && Object.prototype.hasOwnProperty.call(CLOTH_SLOTS, v) ? (v as ClothId) : null);

export function sanitizeLook(raw: unknown): Look {
  const l: Look = { ...DEFAULT_LOOK, acc: [] };
  if (!isObj(raw)) return l;
  if (typeof raw.hair === 'string' && (HAIR_IDS as readonly string[]).includes(raw.hair)) l.hair = raw.hair as Look['hair'];
  for (const k of ['top', 'bottom', 'dress', 'jacket', 'shoes', 'bag', 'crown'] as const) l[k] = cloth(raw[k]);
  l.acc = Array.isArray(raw.acc) ? raw.acc.map(cloth).filter((x): x is ClothId => !!x).slice(0, 8) : [];
  return l;
}

const placeOk = (v: unknown) => (typeof v === 'string' && (PLACE_IDS as readonly string[]).includes(v) ? (v as PhotoRec['place']) : 'home');

function sanitizeData(v: unknown, depth = 0): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (!isObj(v) || depth > 3) return out;
  for (const [k, x] of Object.entries(v).slice(0, 40)) {
    if (typeof x === 'number' && Number.isFinite(x)) out[k] = x;
    else if (typeof x === 'string') out[k] = x.slice(0, 120);
    else if (typeof x === 'boolean') out[k] = x;
    else if (Array.isArray(x)) out[k] = x.filter((y) => typeof y === 'string' || typeof y === 'number' || typeof y === 'boolean').slice(0, 40);
    else if (isObj(x)) out[k] = sanitizeData(x, depth + 1);
  }
  return out;
}

export function sanitizeEvents(raw: unknown): EventsState {
  const d = defaultEvents();
  if (!isObj(raw)) return d;
  if (isObj(raw.secret)) {
    const s = raw.secret;
    const t = num(s.target, 0);
    d.secret = {
      activeMs: num(s.activeMs, 0, 0, 1e10), target: t >= SECRET_MIN && t <= SECRET_MAX ? t : d.secret.target,
      triggered: s.triggered === true, heard: Math.floor(num(s.heard, 0, 0, 9999)), runId: str(s.runId, '', 40),
    };
  }
  if (Array.isArray(raw.inbox)) {
    d.inbox = raw.inbox.filter(isObj).slice(-60).map((i): Invite => ({
      runId: str(i.runId, '', 40), eventId: str(i.eventId, '', 40), at: num(i.at, 0),
      state: i.state === 'seen' || i.state === 'later' || i.state === 'done' ? i.state : 'new',
    })).filter((i) => i.runId && i.eventId);
  }
  if (Array.isArray(raw.msgs)) {
    d.msgs = raw.msgs.filter(isObj).slice(-60).map((m): Msg => ({
      at: num(m.at, 0), from: (['auguste', 'kid1', 'kid2', 'kid3', 'agency', 'maman', 'tante', 'soeur', 'amie'].includes(m.from as string) ? m.from : 'auguste') as Sender,
      text: str(m.text, '', 200), read: m.read === true,
    })).filter((m) => m.text);
  }
  if (isObj(raw.done)) {
    for (const [k, v] of Object.entries(raw.done).slice(0, 80)) {
      if (isObj(v)) d.done[k.slice(0, 40)] = { count: Math.floor(num(v.count, 0, 0, 9999)), last: num(v.last, 0), best: num(v.best, 0, 0, 100) };
    }
  }
  if (isObj(raw.current) && raw.current.runId && raw.current.eventId) {
    const c = raw.current;
    const o = isObj(c.origin) ? c.origin : {};
    d.current = {
      runId: str(c.runId, '', 40), eventId: str(c.eventId, '', 40), step: Math.floor(num(c.step, 0, 0, 40)), data: sanitizeData(c.data),
      origin: { mode: o.mode === 'merge' || o.mode === 'world' ? o.mode : 'title', screen: typeof o.screen === 'string' ? o.screen.slice(0, 20) : undefined },
      startedAt: num(c.startedAt, 0),
    } as ActiveRun;
  }
  if (Array.isArray(raw.photos)) {
    d.photos = raw.photos.filter(isObj).slice(-80).map((p): PhotoRec => ({
      id: str(p.id, '', 40), eventId: str(p.eventId, '', 40), place: placeOk(p.place), title: str(p.title, 'Souvenir', 60), ts: num(p.ts, 0),
      look: sanitizeLook(p.look), auguste: p.auguste === true,
      kids: Array.isArray(p.kids) ? (p.kids.filter((k): k is KidId => (KID_IDS as readonly string[]).includes(k as string))) : [],
      pose: Math.floor(num(p.pose, 0, 0, 9)), frame: str(p.frame, 'rose', 20), filter: str(p.filter, 'none', 20),
    })).filter((p) => p.id);
  }
  if (isObj(raw.claimed)) for (const [k, v] of Object.entries(raw.claimed).slice(-300)) d.claimed[k.slice(0, 60)] = num(v, 0);
  d.playMs = num(raw.playMs, 0);
  d.lastInviteAt = num(raw.lastInviteAt, 0);
  d.bigLog = numArr(raw.bigLog, 20);
  d.smallLog = numArr(raw.smallLog, 20);
  d.lastEventId = str(raw.lastEventId, '', 40);
  d.seq = Math.floor(num(raw.seq, 1, 1, 1e9));
  if (isObj(raw.counters)) for (const [k, v] of Object.entries(raw.counters).slice(0, 80)) d.counters[k.slice(0, 40)] = num(v, 0);
  return d;
}
