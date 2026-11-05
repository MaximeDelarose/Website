import { describe, it, expect } from 'vitest';
import { NEGATIVES, FOLLOWUPS, REACTIONS, QUESTIONS, FAN_LINES, buildThreads, hasNegatives, likesFor, VIRAL_AT, type Thread } from '../src/apps/clips/threads';
import { COMMENTS_GENERAL, commentsFor, TEMPLATES, type Topic } from '../src/apps/clips/gen';

const TOPICS: Topic[] = ['carriere', 'sortie', 'tenues', 'chat', 'fleurs', 'chocolat', 'chateau', 'humour', 'photo', 'fans'];
const clip = (i: number, over: Partial<{ topic: Topic; likes: number; mine: boolean }> = {}) => ({ id: `c${i}`, topic: over.topic ?? TOPICS[i % TOPICS.length], likes: over.likes ?? 2400, mine: over.mine });
const threads = (i: number, over = {}) => { const c = clip(i, over); return buildThreads(c, commentsFor(c.id, c.topic)); };
const BAD = /\b(connard|connasse|salope|crève|tais-toi|ferme-la|idiot|idiote|débile|moche|grosse|pute|putain|merde|con|nul à chier)\b/i;

describe('commentaires TikTak : volumes demandés', () => {
  it('au moins 40 commentaires différents (négatifs + questions + fans + compliments + drôles)', () => {
    const all = new Set<string>([...NEGATIVES.map((n) => n.text), ...QUESTIONS.map((q) => q.text), ...FAN_LINES.map((f) => f.text), ...COMMENTS_GENERAL]);
    for (let i = 0; i < 60; i++) for (const t of threads(i)) all.add(t.root.text);
    expect(all.size).toBeGreaterThanOrEqual(40);
  });
  it('au moins 14 commentaires critiques / désagréables / jaloux, avec les exemples demandés', () => {
    expect(NEGATIVES.length).toBeGreaterThanOrEqual(14);
    for (const h of ['loulou75', 'missparis', 'alexdu92', 'juliette', 'marco', 'inesstyle']) expect(NEGATIVES.some((n) => n.by === h), h).toBe(true);
    for (const k of ['critic', 'rude', 'jealous'] as const) expect(NEGATIVES.some((n) => n.kind === k), k).toBe(true);
    expect(new Set(NEGATIVES.map((n) => n.text)).size).toBe(NEGATIVES.length);
  });
  it('au moins 40 réponses différentes d\'Auguste (≥ 3 par critique), aucune formule répétée', () => {
    const replies = NEGATIVES.flatMap((n) => n.augusteReplies);
    expect(new Set(replies).size).toBeGreaterThanOrEqual(40);
    expect(replies.length).toBe(new Set(replies).size);
    for (const n of NEGATIVES) expect(new Set(n.augusteReplies).size, n.id).toBeGreaterThanOrEqual(3);
    // exemples donnés
    const all = replies.join(' | ');
    for (const s of ['elle brille déjà', 'j\'ai pas assez de batterie', 'encore sous-cotée', 'sac-poubelle', 'pris le temps de regarder et de commenter']) expect(all).toContain(s);
  });
  it('aucune formule d\'ouverture ne domine (pas toujours la même tournure)', () => {
    const starts = new Map<string, number>();
    for (const r of NEGATIVES.flatMap((n) => n.augusteReplies)) { const w = r.split(' ')[0]; starts.set(w, (starts.get(w) ?? 0) + 1); }
    expect(Math.max(...starts.values())).toBeLessThanOrEqual(8);
  });
  it('au moins 6 petites discussions (l\'auteur réagit, Auguste conclut) et 8 réactions d\'autres personnages', () => {
    expect(FOLLOWUPS.length).toBeGreaterThanOrEqual(6);
    expect(REACTIONS.length).toBeGreaterThanOrEqual(8);
    for (const s of ['Il a tout dit', 'Mais MDR la réponse', 'Meilleur commentaire', 'Heureusement qu\'il est là', 'Bien répondu']) expect(REACTIONS.some((r) => r.text.includes(s)), s).toBe(true);
  });
});

describe('commentaires TikTak : modération et mesure', () => {
  it('aucun message violent, injurieux ou harcelant', () => {
    const texts = [...NEGATIVES.flatMap((n) => [n.text, ...n.augusteReplies]), ...FOLLOWUPS.flatMap((f) => [f.author, f.auguste]), ...REACTIONS.map((r) => r.text)];
    for (const t of texts) expect(t, t).not.toMatch(BAD);
  });
  it('pas sous tous les clips : environ un tiers des clips reçoivent des critiques, jamais plus de 2 par clip', () => {
    let withNeg = 0; const N = 600;
    for (let i = 0; i < N; i++) { const th = threads(i); const neg = th.filter((t) => ['critic', 'rude', 'jealous'].includes(t.root.kind)); if (neg.length) withNeg++; expect(neg.length).toBeLessThanOrEqual(2); }
    expect(withNeg / N).toBeGreaterThan(0.22); expect(withNeg / N).toBeLessThan(0.5);
  });
  it('les critiques correspondent au contenu : « tenue » seulement sous des vidéos de tenues / photos / sorties', () => {
    for (let i = 0; i < 400; i++) { const c = clip(i); for (const t of buildThreads(c, commentsFor(c.id, c.topic))) if (t.root.id.endsWith(':n4') || t.root.id.endsWith(':n8')) expect(['tenues', 'sortie', 'photo', 'carriere']).toContain(c.topic); }
  });
  it('Auguste répond à environ 70 % des critiques, uniquement avec ses propres phrases, et jamais à la place de Radia', () => {
    let neg = 0, answered = 0;
    for (let i = 0; i < 800; i++) for (const t of threads(i)) {
      if (!['critic', 'rude', 'jealous'].includes(t.root.kind)) continue;
      neg++;
      const a = t.replies.find((m) => m.kind === 'auguste' && m.id.endsWith(':a'));
      if (a) { answered++; const def = NEGATIVES.find((n) => n.id === t.root.id.split(':').pop()!)!; expect(def.augusteReplies).toContain(a.text); }
      for (const m of t.replies) { if (m.by === 'auguste') expect(m.kind).toBe('auguste'); expect(m.by).not.toBe('radia'); }
    }
    expect(answered / neg).toBeGreaterThan(0.58); expect(answered / neg).toBeLessThan(0.82);
  });
  it('vrais fils : quand l\'auteur se radoucit, Auguste lui répond juste après (réplique cohérente)', () => {
    let seen = 0;
    for (let i = 0; i < 1000; i++) for (const t of threads(i)) {
      const k = t.replies.findIndex((m) => m.kind === 'followup');
      if (k >= 0) { seen++; expect(t.replies[k].by).toBe(t.root.by); expect(t.replies[k + 1]?.by).toBe('auguste'); const f = FOLLOWUPS.find((x) => x.author === t.replies[k].text)!; expect(t.replies[k + 1].text).toBe(f.auguste); }
    }
    expect(seen).toBeGreaterThan(8);
  });
  it('au moins 4 fils par vidéo, jamais plus de 10', () => {
    for (let i = 0; i < 800; i++) { const n = threads(i).length; expect(n).toBeGreaterThanOrEqual(4); expect(n).toBeLessThanOrEqual(10); }
  });
  it('un fil est stable : mêmes entrées, mêmes commentaires et mêmes likes', () => {
    expect(JSON.stringify(threads(7))).toBe(JSON.stringify(threads(7)));
    expect(JSON.stringify(threads(7))).not.toBe(JSON.stringify(threads(8)));
  });
  it('identifiants uniques dans un clip (pour les likes et réponses de Radia)', () => {
    for (let i = 0; i < 200; i++) { const ids = threads(i).flatMap((t) => [t.root, ...t.replies]).map((m) => m.id); expect(new Set(ids).size).toBe(ids.length); }
  });
});

describe('likes fictifs d\'Auguste', () => {
  it('paliers possibles : ≈ 120, ≈ 480, ≈ 1 200 et ≈ 3 500 selon la popularité', () => {
    const seen = { low: 0, mid: 0, v1: 0, v2: 0 };
    let s = 1; const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    for (let i = 0; i < 4000; i++) { const x = likesFor('auguste', 20000, r); if (x.likes >= 3000) seen.v2++; else if (x.likes >= VIRAL_AT - 200) seen.v1++; else if (x.likes >= 250) seen.mid++; else seen.low++; }
    expect(seen.low).toBeGreaterThan(0); expect(seen.mid).toBeGreaterThan(0); expect(seen.v1).toBeGreaterThan(0); expect(seen.v2).toBeGreaterThan(0);
  });
  it('rares réponses virales : elles dépendent de la popularité de la publication', () => {
    const rate = (pop: number) => { let s = 9; const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; let v = 0; for (let i = 0; i < 6000; i++) if (likesFor('auguste', pop, r).viral) v++; return v / 6000; };
    expect(rate(30)).toBeLessThan(rate(20000));
    expect(rate(20000)).toBeLessThan(0.25); expect(rate(20000)).toBeGreaterThan(0.04);
  });
  it('les réponses d\'Auguste ne sont pas systématiquement les plus populaires du fil', () => {
    let aboveRoot = 0, total = 0, topOfThread = 0, threadsWithA = 0;
    for (let i = 0; i < 1500; i++) for (const t of threads(i)) {
      const a = t.replies.find((m) => m.kind === 'auguste'); if (!a) continue;
      total++; threadsWithA++; if (a.likes > t.root.likes) aboveRoot++;
      const best = Math.max(...threads(i).flatMap((x) => [x.root, ...x.replies]).map((m) => m.likes)); if (a.likes === best) topOfThread++;
    }
    expect(aboveRoot / total).toBeGreaterThan(0.4); expect(aboveRoot / total).toBeLessThan(0.97);
    expect(topOfThread / threadsWithA).toBeLessThan(0.5);
  });
  it('le contenu populaire reçoit plus de likes (échelle) et les nombres restent raisonnables', () => {
    const avg = (pop: number) => { let s = 3; const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; let t = 0; for (let i = 0; i < 3000; i++) t += likesFor('praise', pop, r).likes; return t / 3000; };
    expect(avg(40)).toBeLessThan(avg(20000));
    expect(likesFor('auguste', 1e9, () => 0.999).likes).toBeLessThan(5000);
  });
});

describe('cohérence avec les clips existants', () => {
  it('chaque modèle de clip produit un fil valide', () => {
    for (const t of TEMPLATES) { const c = { id: `t:${t.id}`, topic: t.topic, likes: 900 }; const th: Thread[] = buildThreads(c, commentsFor(c.id, c.topic)); expect(th.length).toBeGreaterThanOrEqual(4); expect(th.length).toBeLessThanOrEqual(10); }
    expect(typeof hasNegatives('x')).toBe('boolean');
  });
});
