import { describe, it, expect } from 'vitest';
import { defaultWorld, defaultSave, sanitize, type World } from '../src/save/schema';
import { CAREER_IDS, CLOTH_IDS, DEFAULT_LOOK, type CareerId, type Look } from '../src/data/world/ids';
import { CLOTHES } from '../src/data/world/wardrobe';
import { CAREERS, POSES, PHOTO_DECORS } from '../src/data/world/careers';
import * as C from '../src/game/world/careers';
import * as Photo from '../src/game/world/careerGames/photo';
import * as Model from '../src/game/world/careerGames/model';
import * as Act from '../src/game/world/careerGames/actress';
import * as Sing from '../src/game/world/careerGames/singer';
import { mulberry32 } from '../src/game/world/careerGames/rng';
import { ACTIVITY, DROP_POOL, dropChance, fatigueFactor, momentFor, outfitAdvice, sessionBonus, stateLabel, stepFatigue, tierPercent, tierSteps } from '../src/ui/screens/world/career/logic';
import { onMoment, emitMoment } from '../src/apps/moments';

const look = (o: Partial<Look> = {}): Look => ({ ...DEFAULT_LOOK, acc: [], ...o });
const W = (): World => defaultWorld();

describe('page carrière : textes et étapes', () => {
  it('chaque métier a son activité, son bouton et son type de moment', () => {
    expect(ACTIVITY.model.kicker).toContain('défilé');
    expect(ACTIVITY.model.cta).toBe('Participer au défilé');
    expect(ACTIVITY.photo.cta).toBe('Participer au shooting');
    expect(ACTIVITY.actress.cta).toBe('Jouer la scène');
    expect(ACTIVITY.singer.cta).toBe('Monter sur scène');
    expect(CAREER_IDS.map((c) => ACTIVITY[c].moment).sort()).toEqual(['concert', 'runway', 'scene', 'shooting']);
  });
  it('étapes de palier : faites / en cours / à venir', () => {
    const w = W();
    C.progressOf(w, 'model').level = 2;
    const s = tierSteps(w, 'model');
    expect(s.map((x) => x.state)).toEqual(['done', 'done', 'cur', 'next', 'next']);
    C.progressOf(w, 'model').level = 5;
    expect(tierSteps(w, 'model').every((x) => x.state === 'done')).toBe(true);
  });
  it('pourcentage de palier : le plus lent de l\'objectif et de l\'expérience', () => {
    const w = W();
    expect(tierPercent(w, 'photo')).toBe(0);
    C.recordSession(w, 'photo', { score: 70 });
    const p = tierPercent(w, 'photo');
    expect(p).toBeGreaterThan(0);
    expect(p).toBeLessThan(100);
    C.progressOf(w, 'photo').level = 5;
    expect(tierPercent(w, 'photo')).toBe(100);
  });
  it('conseil de tenue : style demandé par l\'objectif', () => {
    const w = W();
    C.progressOf(w, 'model').level = 1; // « Style Chic »
    const a = outfitAdvice(w, 'model');
    expect(a.style).toBe('chic');
    expect(a.text).toContain('Chic');
    expect(outfitAdvice(W(), 'actress').style).toBeNull();
  });
  it('état affiché dans l\'onglet', () => {
    const w = W();
    expect(stateLabel(w, 'singer')).toBe('À découvrir');
    C.recordSession(w, 'singer', { score: 80 });
    expect(stateLabel(w, 'singer')).toBe('En progrès');
    C.progressOf(w, 'singer').level = 5;
    expect(stateLabel(w, 'singer')).toBe('Au sommet');
  });
});

describe('scores de jeu (existants, non régressés)', () => {
  it('pose : une pose assortie au décor et à la tenue vaut plus', () => {
    const pose = POSES[0];
    const good = PHOTO_DECORS.find((d) => d.styles.includes(pose.style))!;
    const bad = PHOTO_DECORS.find((d) => !d.styles.includes(pose.style))!;
    expect(Photo.choiceScore(pose.id, good.id, look()).total).toBeGreaterThanOrEqual(Photo.choiceScore(pose.id, bad.id, look()).total);
  });
  it('thème : une tenue plus assortie vaut plus', () => {
    const empty = Model.assessLook(look({ top: null, bottom: null, dress: null }), 'royal', 1).score;
    const gown = Model.assessLook(look({ dress: 'dr-royal-gown' }), 'royal', 1).score;
    expect(gown).toBeGreaterThan(empty);
  });
  it('dialogue : scène complète, la bonne émotion ≥ à la mauvaise', () => {
    const sc = Act.buildScene(2, mulberry32(3));
    const best = sc.beats.map((b) => b.options.find((o) => o.q === 2)!);
    const worst = sc.beats.map((b) => b.options.find((o) => o.q === 0) ?? b.options[0]);
    expect(Act.scoreScene(best)).toBeGreaterThan(Act.scoreScene(worst));
    expect(Act.isPerfect(best)).toBe(true);
  });
  it('rythme : notes parfaites = score élevé, aucune note = faible', () => {
    const song = Sing.songById(1);
    const chart = Sing.makeChart(song, 5);
    const eng = new Sing.RhythmEngine(chart);
    for (const n of chart) eng.hit(n.lane, n.t);
    expect(eng.score()).toBeGreaterThanOrEqual(95);
    expect(eng.maxCombo).toBe(chart.length);
    const idle = new Sing.RhythmEngine(Sing.makeChart(song, 5));
    idle.update(1e6);
    expect(idle.score()).toBeLessThan(10);
  });
});

describe('fatigue douce', () => {
  it('jamais nulle, décroissante', () => {
    expect(fatigueFactor(0)).toBe(1);
    expect(fatigueFactor(2)).toBe(1);
    expect(fatigueFactor(3)).toBeLessThan(1);
    expect(fatigueFactor(50)).toBeGreaterThan(0);
  });
  it('fenêtre glissante : repart à zéro après une pause', () => {
    const c: Record<string, number> = {};
    const t = 1_000_000;
    const fs = [0, 1, 2, 3, 4].map((i) => stepFatigue(c, t + i * 1000));
    expect(fs.slice(0, 3)).toEqual([1, 1, 1]);
    expect(fs[3]).toBeLessThan(1);
    expect(stepFatigue(c, t + 3 * 3600_000)).toBe(1);
  });
});

describe('bonus de séance', () => {
  it('la réserve de tenues n\'a que des vêtements du registre', () => {
    for (const id of CAREER_IDS) for (const c of DROP_POOL[id]) { expect(CLOTH_IDS).toContain(c); expect(CLOTHES[c]).toBeTruthy(); }
  });
  it('aucune chance sous 70, plus de chance au-dessus de 90', () => {
    expect(dropChance(50)).toBe(0);
    expect(dropChance(75)).toBeGreaterThan(0);
    expect(dropChance(95)).toBeGreaterThan(dropChance(75));
  });
  it('un vêtement obtenu est ajouté UNE fois et jamais un doublon sans compensation', () => {
    for (const id of [...CAREER_IDS] as CareerId[]) {
      const w = W();
      const owned0 = w.wardrobe.owned.length;
      let got = 0;
      for (let s = 1; s < 400; s++) {
        const b = sessionBonus(w, id, { score: 95, level: 2 }, mulberry32(s), 1);
        if (b.drop) got++;
        expect(new Set(w.wardrobe.owned).size).toBe(w.wardrobe.owned.length); // jamais de doublon dans le dressing
      }
      expect(got).toBeLessThanOrEqual(DROP_POOL[id].length);
      expect(w.wardrobe.owned.length).toBeGreaterThanOrEqual(owned0);
    }
  });
  it('doublon ⇒ pièces (moitié du prix), pas de nouvel objet', () => {
    const w = W();
    const pool = DROP_POOL.photo;
    for (const c of pool) if (!w.wardrobe.owned.includes(c)) w.wardrobe.owned.push(c);
    const n = w.wardrobe.owned.length;
    const coins0 = w.res.coins;
    let dupSeen = 0;
    for (let s = 1; s < 200; s++) {
      const b = sessionBonus(w, 'photo', { score: 100, level: 1 }, mulberry32(s), 1);
      expect(b.drop).toBeNull();
      dupSeen += b.dropCoins > 0 ? 1 : 0;
    }
    expect(w.wardrobe.owned.length).toBe(n);
    expect(dupSeen).toBeGreaterThan(0);
    expect(w.res.coins).toBeGreaterThan(coins0);
  });
  it('la fatigue réduit les pièces bonus mais ne les annule pas', () => {
    const a = sessionBonus(W(), 'model', { score: 90, level: 3 }, () => 0.99, 1);
    const b = sessionBonus(W(), 'model', { score: 90, level: 3 }, () => 0.99, 0.4);
    expect(b.coins).toBeLessThan(a.coins);
    expect(b.coins).toBeGreaterThan(0);
  });
  it('équilibre : bonus + séance restent modestes face au salaire (60 + 55 par niveau)', () => {
    const w = W();
    const out = C.recordSession(w, 'singer', { score: 90 });
    const b = sessionBonus(w, 'singer', { score: out.score, level: out.level }, () => 0.99, 1);
    expect(out.coins + b.coins).toBeLessThan(600);
    expect(b.coins).toBeLessThan(60 + 55 * 5);
  });
});

describe('récompenses de palier uniques', () => {
  it('chaque récompense de vêtement n\'apparaît qu\'une fois par carrière et existe', () => {
    for (const id of CAREER_IDS) {
      const seen = new Set<string>();
      for (const t of CAREERS[id].tiers) for (const c of t.reward.cloth ?? []) { expect(CLOTH_IDS).toContain(c); expect(seen.has(c)).toBe(false); seen.add(c); }
    }
  });
  it('rejouer un palier déjà franchi ne redonne pas le vêtement : doublon ⇒ pièces', () => {
    const w = W();
    const r = { cloth: ['ac-sunglasses' as const] };
    const first = C.applyReward(w, r);
    expect(first.items.cloth).toEqual(['ac-sunglasses']);
    const second = C.applyReward(w, r);
    expect(second.items.cloth).toEqual([]);
    expect(second.items.dupCoins).toBe(Math.floor(CLOTHES['ac-sunglasses'].coins / 2));
    expect(w.wardrobe.owned.filter((c) => c === 'ac-sunglasses').length).toBe(1);
  });
  it('progression de palier : un palier par séance au plus, compteurs remis à zéro', () => {
    const w = W();
    for (let i = 0; i < 6; i++) C.recordSession(w, 'photo', { score: 95 });
    expect(C.levelOf(w, 'photo')).toBeGreaterThanOrEqual(1);
    const lvl = C.levelOf(w, 'photo');
    const o = C.recordSession(w, 'photo', { score: 95 });
    expect(C.levelOf(w, 'photo') - lvl).toBeLessThanOrEqual(1);
    void o;
  });
});

describe('moments annoncés', () => {
  it('chaque métier produit un moment valide et emitMoment le diffuse', () => {
    const got: string[] = [];
    const off = onMoment((m) => got.push(m.kind));
    for (const id of CAREER_IDS) { const m = momentFor(id, 80, 12); emitMoment(m); expect(m.title.length).toBeGreaterThan(3); expect(m.fans).toBe(12); }
    off();
    expect(got.sort()).toEqual(['concert', 'runway', 'scene', 'shooting']);
  });
  it('aucun prénom d\'enfant dans les légendes', () => {
    for (const id of CAREER_IDS) for (const s of [30, 75, 95]) { const m = momentFor(id, s, 1); expect(/enfant|fils|fille/i.test(m.title + m.caption)).toBe(false); }
  });
});

describe('migration de sauvegarde de carrière', () => {
  it('une sauvegarde v5 avec carrières existantes est conservée sans perte', () => {
    const s = defaultSave();
    s.world.careers = { current: 'singer', progress: { photo: { level: 3, xp: 400, best: 88 }, singer: { level: 1, xp: 90, best: 70 } } };
    s.world.extra['career.photo.p.s90'] = 1;
    s.world.fans = 5321;
    const back = sanitize(JSON.parse(JSON.stringify(s)));
    expect(back.world.careers.current).toBe('singer');
    expect(back.world.careers.progress.photo).toEqual({ level: 3, xp: 400, best: 88 });
    expect(back.world.careers.progress.singer).toEqual({ level: 1, xp: 90, best: 70 });
    expect(back.world.extra['career.photo.p.s90']).toBe(1);
    expect(back.world.fans).toBe(5321);
  });
  it('les compteurs libres fun.apps.career (fatigue, moments) survivent à la sanitisation', () => {
    const s = defaultSave();
    s.fun.apps.career = { 'fat.t': 12345, 'fat.n': 2, moments: 4, 'done.photo': 7 };
    const back = sanitize(JSON.parse(JSON.stringify(s)));
    expect(back.fun.apps.career.moments).toBe(4);
    expect(back.fun.apps.career['fat.n']).toBe(2);
    expect(back.fun.apps.career['done.photo']).toBe(7);
  });
  it('une sauvegarde sans fun.apps.career reste valide', () => {
    const raw = JSON.parse(JSON.stringify(defaultSave())) as { fun?: { apps?: unknown } };
    if (raw.fun) delete raw.fun.apps;
    const back = sanitize(raw);
    expect(back.fun.apps.career).toEqual({});
  });
});
