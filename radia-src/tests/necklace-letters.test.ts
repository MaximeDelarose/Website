import { describe, it, expect } from 'vitest';
import { GLYPHS, MESSAGE_LETTERS, buildMessage, heartStroke, naturalWidth, rasterize, sampleStroke } from '../src/events/necklace/letters';
import { Fireworks, type FwSfx } from '../src/events/necklace/fireworks';
import {
  DECLARATION, GIFT_LINES, MEMORY_TITLE, OBTAINED, OPEN_BOX, SKY_LINE, WEAR_NO, WEAR_QUESTION, WEAR_YES, WOW_LINES, ACHIEVEMENT_NAME, MEMORY_ID,
} from '../src/events/necklace/data';
import { ACHIEVEMENTS } from '../src/data/achievements';
import { SPECIAL_MEMORIES } from '../src/data/memories';
import { defaultSave } from '../src/save/schema';

describe('géométrie de « RADIA ❤️ »', () => {
  const m = buildMessage(340, 70, 300);
  it('six glyphes : R, A, D, I, A puis le cœur', () => {
    expect(MESSAGE_LETTERS).toEqual(['R', 'A', 'D', 'I', 'A', '♥']);
    expect(m.letters.map((l) => l.ch)).toEqual(['R', 'A', 'D', 'I', 'A', '♥']);
    expect(Object.keys(GLYPHS).sort()).toEqual(['A', 'D', 'I', 'R']);
  });
  it('chaque lettre produit des points, tous dans sa boîte (et la boîte tient dans la zone)', () => {
    let from = 0;
    for (const L of m.letters) {
      expect(L.count, L.ch).toBeGreaterThan(8);
      expect(L.from).toBe(from);
      const pts = m.points.slice(L.from, L.from + L.count);
      for (const p of pts) {
        expect(p.x).toBeGreaterThanOrEqual(L.x - 0.6); expect(p.x).toBeLessThanOrEqual(L.x + L.w + 0.6);
        expect(p.y).toBeGreaterThanOrEqual(L.y - 0.6); expect(p.y).toBeLessThanOrEqual(L.y + L.h + 0.6);
        expect(p.letter).toBe(m.letters.indexOf(L));
      }
      expect(L.x).toBeGreaterThanOrEqual(-0.5); expect(L.x + L.w).toBeLessThanOrEqual(m.width + 0.5);
      expect(L.y).toBeGreaterThanOrEqual(-0.5); expect(L.y + L.h).toBeLessThanOrEqual(m.height + 0.5);
      from += L.count;
    }
    expect(from).toBe(m.points.length);
  });
  it('les lettres se suivent de gauche à droite sans se chevaucher', () => {
    for (let i = 1; i < m.letters.length; i++) expect(m.letters[i].x).toBeGreaterThan(m.letters[i - 1].x + m.letters[i - 1].w - 0.01);
  });
  it('budget de points plafonné (≤ 300) mais assez dense pour lire les lettres', () => {
    expect(m.points.length).toBeLessThanOrEqual(300);
    expect(m.points.length).toBeGreaterThan(160);
    for (const cap of [120, 200, 300]) expect(buildMessage(340, 70, cap).points.length).toBeLessThanOrEqual(cap);
  });
  it('ordre de révélation stable : mêmes entrées → mêmes points, dans le même ordre', () => {
    const a = buildMessage(340, 70, 300), b = buildMessage(340, 70, 300);
    expect(b.points).toEqual(a.points);
    expect(b.letters).toEqual(a.letters);
    // rang des points dans un glyphe : 0, 1, 2…
    for (const L of a.letters) a.points.slice(L.from, L.from + L.count).forEach((p, i) => expect(p.i).toBe(i));
  });
  it('les points forment bien les glyphes : R (fût + panse + jambe), A (barre), D (fût + panse), I (fût + empattements)', () => {
    const bigger = buildMessage(1080, 220, 5000, 3); // haute résolution pour tester les formes
    const L = Object.fromEntries(bigger.letters.map((l, i) => [i, l]));
    const inLetter = (idx: number) => bigger.points.slice(L[idx].from, L[idx].from + L[idx].count);
    const frac = (pts: { x: number; y: number }[], box: { x: number; y: number; w: number; h: number }, fx: number, fy: number, tol = 0.07) =>
      pts.some((p) => Math.abs((p.x - box.x) / box.w - fx) < tol && Math.abs((p.y - box.y) / box.h - fy) < tol);
    // R : coin haut-gauche, bas du fût, bout de la jambe, milieu de la panse (côté droit)
    expect(frac(inLetter(0), L[0], 0, 0)).toBe(true); expect(frac(inLetter(0), L[0], 0, 1)).toBe(true); expect(frac(inLetter(0), L[0], 0.97, 1)).toBe(true);
    expect(inLetter(0).some((p) => (p.x - L[0].x) / L[0].w > 0.85 && (p.y - L[0].y) / L[0].h > 0.15 && (p.y - L[0].y) / L[0].h < 0.35)).toBe(true);
    // A : sommet, pieds, barre horizontale
    expect(frac(inLetter(1), L[1], 0.5, 0)).toBe(true); expect(frac(inLetter(1), L[1], 0, 1)).toBe(true); expect(frac(inLetter(1), L[1], 1, 1)).toBe(true);
    expect(frac(inLetter(1), L[1], 0.5, 0.64)).toBe(true);
    expect(frac(inLetter(1), L[1], 0.5, 1, 0.04)).toBe(false); // pas de trait en bas au milieu
    // D : fût, panse à droite, coins
    expect(frac(inLetter(2), L[2], 0, 0.5)).toBe(true); expect(frac(inLetter(2), L[2], 1, 0.5)).toBe(true);
    // I : fût central, empattements haut et bas
    expect(frac(inLetter(3), L[3], 0.5, 0.5)).toBe(true); expect(frac(inLetter(3), L[3], 0, 0)).toBe(true); expect(frac(inLetter(3), L[3], 1, 1)).toBe(true);
    expect(frac(inLetter(3), L[3], 0, 0.5, 0.05)).toBe(false);
    // cœur : pointe en bas, creux en haut, bords gauche/droite
    const h = inLetter(5);
    expect(frac(h, L[5], 0.5, 1, 0.08)).toBe(true);
    expect(h.some((p) => Math.abs((p.x - L[5].x) / L[5].w - 0.5) < 0.05 && (p.y - L[5].y) / L[5].h < 0.25)).toBe(true);
    expect(frac(h, L[5], 0.5, 0.5, 0.04)).toBe(false); // l'intérieur du cœur est vide (contour seulement)
  });
  it('lisibilité : la trame rasterisée n\'est ni vide ni saturée, et le « trou » de A / D / R est vide', () => {
    const big = buildMessage(340, 70, 300);
    const r = rasterize(big, 2);
    const on = r.on.reduce((a, b) => a + b, 0);
    expect(on / (r.cols * r.rows)).toBeGreaterThan(0.05);
    expect(on / (r.cols * r.rows)).toBeLessThan(0.45);
    // intérieur du D : vide
    const D = big.letters[2];
    const cx = Math.floor((D.x + D.w * 0.4) / 2), cy = Math.floor((D.y + D.h * 0.5) / 2);
    expect(r.on[cy * r.cols + cx]).toBe(0);
  });
  it('échantillonnage d\'un trait : extrémités incluses, pas régulier', () => {
    const pts = sampleStroke([{ x: 0, y: 0 }, { x: 100, y: 0 }], 10);
    expect(pts).toHaveLength(11);
    expect(pts[0]).toEqual({ x: 0, y: 0 }); expect(pts[10].x).toBeCloseTo(100, 6);
    const hs = heartStroke(0, 0, 10, 10);
    expect(hs[0].x).toBeCloseTo(hs[hs.length - 1].x, 6);
    expect(naturalWidth()).toBeGreaterThan(5);
  });
});

describe('moteur de feux d\'artifice : budget et message', () => {
  it('particules plafonnées (normal comme réduit), même avec beaucoup d\'explosions', () => {
    for (const reduced of [false, true]) {
      const sounds: FwSfx[] = [];
      const fw = new Fireworks({ reduced, sfx: (n) => sounds.push(n) });
      const cap = reduced ? 90 : 420;
      for (let i = 0; i < 60; i++) fw.explode(100, 100, { kind: 'peony', color: '#fff', n: 60, speed: 100 });
      expect(fw.sparkCount).toBeLessThanOrEqual(cap);
      for (let i = 0; i < 200; i++) fw.update(1 / 30);
      expect(fw.sparkCount).toBeLessThanOrEqual(cap);
      expect(sounds).toContain('fwBurst');
    }
  });
  it('le message est écrit progressivement (lettre par lettre) puis maintenu', () => {
    const fw = new Fireworks({ reduced: false });
    const m = buildMessage(340, 70, 300);
    fw.writeMessage(m, 0, 0, 400);
    expect(fw.starCount).toBe(m.points.length);
    let last = -1, half = 0;
    for (let t = 0; t < 14; t += 1 / 30) {
      fw.update(1 / 30);
      const p = fw.messageProgress();
      expect(p).toBeGreaterThanOrEqual(last - 1e-9); // jamais de recul
      if (!half && p >= 0.5) half = t;
      last = p;
    }
    expect(half).toBeGreaterThan(2); // pas instantané : le tracé est progressif
    expect(last).toBeGreaterThan(0.999);
    // le message reste (≥ 8 s) : toujours là longtemps après
    for (let t = 0; t < 12; t += 1 / 30) fw.update(1 / 30);
    expect(fw.messageProgress()).toBeGreaterThan(0.999);
    expect(fw.starCount).toBe(m.points.length);
    expect(fw.stats.peakSparks).toBeLessThanOrEqual(420);
  });
  it('effets réduits : le message apparaît sans vol ni traînée, vite, et reste complet', () => {
    const fw = new Fireworks({ reduced: true });
    const m = buildMessage(340, 70, 150);
    fw.writeMessage(m, 0, 0, 400, { letterGap: 0.5 });
    for (let t = 0; t < 6; t += 1 / 30) fw.update(1 / 30);
    expect(fw.messageProgress()).toBeGreaterThan(0.999);
  });
});

describe('textes exacts de la scène', () => {
  it('Auguste : arrivée, ciel, déclaration, écrin, collier', () => {
    expect([...WOW_LINES]).toEqual(['Ah ouais… t’es vraiment magnifique comme ça.', 'Allez, viens. J’ai quelque chose à te montrer.']);
    expect(SKY_LINE).toBe('Regarde le ciel, j’ai préparé quelque chose pour toi.');
    expect([...DECLARATION]).toEqual([
      'Tu sais… j’avais envie de faire quelque chose que tu n’oublierais pas.',
      'Alors j’ai passé du temps à imaginer tout ce petit monde pour toi.',
      'Les détails, les souvenirs, les fleurs, les chocolats… Je voulais que tu retrouves ici des petites choses qui te ressemblent.',
      'Et j’ai encore une dernière surprise.',
    ]);
    expect(OPEN_BOX).toBe('Ouvrir l’écrin ♡');
    expect([...GIFT_LINES]).toEqual([
      'Ce collier, tu ne pouvais pas l’acheter dans le jeu.',
      'Parce que je voulais être celui qui te l’offre, un jour, au moment que j’aurais choisi.',
      'Et je voulais qu’il représente quelque chose de plus précieux que les diamants.',
      'Tout le temps, toute l’attention et tout le cœur que j’ai mis dans ce monde pour toi.',
      'Je ne sais pas ce que demain nous réserve… Mais je veux que tu saches à quel point ce que je fais pour toi est sincère.',
      'Ce collier, c’est juste un petit éclat de tout ce que j’avais envie de t’offrir.',
    ]);
  });
  it('aucun engagement demandé à Radia en retour, au plus un « galbi » (ici aucun)', () => {
    const all = [...WOW_LINES, SKY_LINE, ...DECLARATION, ...GIFT_LINES].join(' ').toLowerCase();
    expect((all.match(/galbi/g) ?? []).length).toBeLessThanOrEqual(1);
    for (const w of ['promets', 'promesse', 'épouse', 'marie', 'dis-moi oui', 'réponds']) expect(all).not.toContain(w);
  });
  it('fin : obtention, question, boutons', () => {
    expect(OBTAINED).toBe('L’Éclat Éternel ♡ obtenu !');
    expect(WEAR_QUESTION).toBe('Veux-tu porter ton collier ?');
    expect(WEAR_YES).toBe('Le porter ♡');
    expect(WEAR_NO).toBe('Le garder dans mon dressing');
  });
  it('souvenir « Le ciel portait ton prénom ♡ » et succès « Un éclat rien que pour toi »', () => {
    expect(MEMORY_TITLE).toBe('Le ciel portait ton prénom ♡');
    expect(SPECIAL_MEMORIES[0].id).toBe(MEMORY_ID);
    expect(SPECIAL_MEMORIES[0].title).toBe(MEMORY_TITLE);
    expect(SPECIAL_MEMORIES[0].lines.map((l) => l.text)).toEqual([...DECLARATION, ...GIFT_LINES]);
    const a = ACHIEVEMENTS.find((x) => x.id === 'ev_eclat')!;
    expect(a.name).toBe('Un éclat rien que pour toi');
    expect(a.name).toBe(ACHIEVEMENT_NAME);
    const s = defaultSave();
    expect(a.check(s)).toBe(false);
    s.fun.necklace.owned = true;
    expect(a.check(s)).toBe(true);
  });
});
