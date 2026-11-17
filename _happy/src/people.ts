// Les proches : ils ont leurs propres journées, leurs propres humeurs, et n'existent pas que pour le héros.
// Les messages sont faits de pictogrammes ; on y répond par pictogrammes.
import { Feel, Msg, State, clamp, rnd, tierOf } from "./sim";

export const PEOPLE: Record<string, { name: string; hair: number; scale: number }> = {
  lou: { name: "Mamie Lou", hair: 0xf3ece4, scale: 0.8 },
  sam: { name: "Sam", hair: 0x7a4b3a, scale: 0.92 },
  ines: { name: "Inès", hair: 0x3d3432, scale: 0.88 },
  noe: { name: "Noé", hair: 0xc98a5a, scale: 0.95 },
};
export const FEEL_COLOR: Record<Feel, number> = { joy: 0xf1c65e, ok: 0xa9c3a1, tired: 0x8fa6c7, down: 0x6e6a9e };
export const FEEL_WORD: Record<Feel, string> = { joy: "en forme", ok: "tranquille", tired: "fatigué·e", down: "pas au mieux" };

// La vie de chacun avance toute seule, par petites étapes.
const ARC: Record<string, Feel[]> = {
  lou: ["ok", "joy", "ok", "tired", "ok", "joy", "tired", "ok"],
  sam: ["ok", "joy", "ok", "down", "down", "ok", "tired", "joy"],
  ines: ["tired", "ok", "joy", "ok", "down", "ok", "joy", "tired"],
  noe: ["ok", "joy", "tired", "ok"],
};

type Tpl = { who: string; feel: Feel | "*"; kind: Msg["kind"]; text: string; good: string; mid: string; off: string };
const T: Tpl[] = [
  { who: "lou", feel: "joy", kind: "news", text: "🌷🌞📷", good: "😍🌷", mid: "👍", off: "😴" },
  { who: "lou", feel: "ok", kind: "news", text: "🧶🧣❓", good: "🥰🧣", mid: "👍", off: "🙄" },
  { who: "lou", feel: "ok", kind: "news", text: "📺🍪😊", good: "😄🍪", mid: "👋", off: "💤" },
  { who: "lou", feel: "tired", kind: "news", text: "🏥😮‍💨", good: "🤗❤️", mid: "🙏", off: "😂" },
  { who: "lou", feel: "*", kind: "out", text: "🍲🏡❓", good: "😋✅", mid: "🙏⏳", off: "🙈" },
  { who: "lou", feel: "*", kind: "care", text: "❤️☎️🧣", good: "🥹❤️", mid: "👍", off: "…" },

  { who: "sam", feel: "joy", kind: "news", text: "🎉🥳🎂", good: "🎉🤗", mid: "👍", off: "😶" },
  { who: "sam", feel: "ok", kind: "news", text: "🎬🍿👀", good: "🤩🍿", mid: "🙂", off: "🥱" },
  { who: "sam", feel: "tired", kind: "news", text: "💼😵‍💫⏰", good: "🫂☕", mid: "💪", off: "🤷" },
  { who: "sam", feel: "down", kind: "news", text: "💔😭", good: "🫂❤️", mid: "😢", off: "😂" },
  { who: "sam", feel: "*", kind: "out", text: "☕🤝❓", good: "☕✅", mid: "🙏⏳", off: "🙈" },
  { who: "sam", feel: "*", kind: "visit", text: "🚪👋❓", good: "🏠✅", mid: "🙏⏳", off: "🙈" },
  { who: "sam", feel: "*", kind: "care", text: "🫂👀❓", good: "🥹🫂", mid: "👍", off: "…" },

  { who: "ines", feel: "joy", kind: "news", text: "🎸🎶🎟️", good: "🤩🎶", mid: "👍", off: "🙉" },
  { who: "ines", feel: "ok", kind: "news", text: "📚☕🌧️", good: "😌📚", mid: "🙂", off: "🥱" },
  { who: "ines", feel: "tired", kind: "news", text: "📦🏠😵", good: "💪📦", mid: "😬", off: "😂" },
  { who: "ines", feel: "down", kind: "news", text: "🌧️😔", good: "🫂🌤️", mid: "😢", off: "🤷" },
  { who: "ines", feel: "*", kind: "out", text: "🌳🚶❓", good: "🚶✅", mid: "🙏⏳", off: "🙈" },
  { who: "ines", feel: "*", kind: "visit", text: "🚪🍰❓", good: "🏠✅", mid: "🙏⏳", off: "🙈" },
];

function pick(s: State, who: string, kind: Msg["kind"], salt: number): Tpl | null {
  const feel = s.people[who].feel;
  const list = T.filter((t) => t.who === who && t.kind === kind && (t.feel === "*" || t.feel === feel));
  return list.length ? list[Math.floor(rnd(s, salt) * list.length)] : null;
}

function send(s: State, t: Tpl): void {
  const id = s.msgId++;
  const order = rnd(s, 300 + id) < 0.34 ? [0, 1, 2] : rnd(s, 301 + id) < 0.5 ? [1, 0, 2] : [2, 1, 0];
  const all = [{ t: t.good, fit: 2 as const }, { t: t.mid, fit: 1 as const }, { t: t.off, fit: 0 as const }];
  s.inbox.push({ id, from: t.who, day: s.day, kind: t.kind, text: t.text, replies: order.map((i) => all[i]), read: false, answer: -1 });
  if (s.inbox.length > 24) s.inbox.splice(0, s.inbox.length - 24);
}

/** Chaque matin : la vie des proches avance, des messages arrivent, les silences laissent une trace. */
export function morningSocial(s: State): void {
  // Un message laissé sans réponse trois jours s'éteint doucement, et la relation le sent.
  for (const m of s.inbox) {
    if (m.answer < 0 && s.day - m.day >= 3) { m.answer = 3; s.people[m.from].bond = clamp(s.people[m.from].bond - 5); }
  }
  let sent = 0;
  (["lou", "sam", "ines"] as const).forEach((who, i) => {
    const p = s.people[who];
    if (rnd(s, 40 + i) < 0.28) { p.story = (p.story + 1) % ARC[who].length; p.feel = ARC[who][p.story]; }
    if (s.day - p.last >= 5) p.bond = clamp(p.bond - 1.5);
    if (sent >= 2 || s.inbox.some((m) => m.from === who && m.answer < 0)) return;
    if (rnd(s, 50 + i) > 0.2 + p.bond / 250) return;

    let kind: Msg["kind"] = "news";
    const k = rnd(s, 60 + i);
    if (s.tier <= 1 && p.bond >= 50 && k < 0.6) kind = "care";
    else if (p.bond >= 35 && k < 0.22 && !s.visit && p.feel !== "joy") kind = "visit";
    else if (p.bond >= 30 && k < 0.45 && (s.invites[who] ?? -1) < s.day) kind = "out";
    const t = pick(s, who, kind, 70 + i) ?? pick(s, who, "news", 71 + i);
    if (t) { send(s, t); sent++; }
  });
  if (rnd(s, 45) < 0.2) { const n = s.people.noe; n.story = (n.story + 1) % ARC.noe.length; n.feel = ARC.noe[n.story]; }
}

export type Echo = "good" | "mid" | "off";
export interface SocialOutcome { dMood: number; echo: Echo; tierChanged: boolean; dayOver: boolean; visit: boolean }

function finish(s: State, before: number, prevTier: number, cost: number, echo: Echo, visit = false): SocialOutcome {
  s.mood = clamp(s.mood, 8, 100);
  s.tier = tierOf(s.mood, s.tier);
  s.heavy -= Math.min(s.heavy, cost);
  s.units -= cost;
  s.today.push(cost === 2 ? "call" : "reply");
  s.lastSocial = s.day;
  return { dMood: s.mood - before, echo, tierChanged: s.tier !== prevTier, dayOver: s.units <= 0, visit };
}

/** Lire un message : un mot attentionné fait déjà du bien, avant même d'y répondre. */
export function readMsg(s: State, id: number): void {
  const m = s.inbox.find((x) => x.id === id);
  if (!m || m.read) return;
  m.read = true;
  if (m.kind === "care") { s.mood = clamp(s.mood + 2); s.tier = tierOf(s.mood, s.tier); }
}

/** Répondre par message : une unité, un effet modéré. */
export function reply(s: State, id: number, idx: number): SocialOutcome | null {
  const m = s.inbox.find((x) => x.id === id);
  if (!m || m.answer >= 0 || s.units < 1) return null;
  const before = s.mood, prevTier = s.tier, p = s.people[m.from], fit = m.replies[idx].fit;
  m.answer = idx; m.read = true;
  p.last = s.day;
  let visit = false;
  if (fit === 2) {
    p.bond = clamp(p.bond + 6); s.mood += 3;
    if (m.kind === "news" && (p.feel === "down" || p.feel === "tired") && rnd(s, 80 + id) < 0.5) p.feel = "ok";
    if (m.kind === "out") s.invites[m.from] = s.day + 1;
    if (m.kind === "visit" && !s.visit) {
      s.visit = { who: m.from, need: p.feel === "tired" ? "drink" : p.feel === "down" ? "sit" : "talk", done: 0, arrived: false };
      visit = true;
    }
  } else if (fit === 1) { p.bond = clamp(p.bond + 3); s.mood += 1.5; }
  else p.bond = clamp(p.bond - 1); // un pas de côté n'est pas un drame
  return finish(s, before, prevTier, 1, fit === 2 ? "good" : fit === 1 ? "mid" : "off", visit);
}

/** Appeler : deux unités, un engagement plus fort. Si l'autre va mal, on donne plus qu'on ne reçoit. */
export function call(s: State, who: string): SocialOutcome | null {
  const p = s.people[who];
  if (!p || s.units < 2 || p.called === s.day) return null;
  const before = s.mood, prevTier = s.tier;
  p.called = s.day; p.last = s.day;
  if (p.feel === "down" || p.feel === "tired") {
    p.bond = clamp(p.bond + 12); s.mood += 1.5; s.energy = clamp(s.energy - 4);
    p.feel = "ok";
  } else { p.bond = clamp(p.bond + 9); s.mood += 4 + (p.bond > 60 ? 1 : 0); }
  for (const m of s.inbox) if (m.from === who && m.answer < 0) { m.answer = 4; m.read = true; }
  return finish(s, before, prevTier, 2, "good");
}

export const unread = (s: State) => s.inbox.filter((m) => m.answer < 0).length;
