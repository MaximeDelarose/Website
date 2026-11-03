import { describe, it, expect } from 'vitest';
import { defaultWorld, defaultSave, sanitize, sanitizeWorld, type World } from '../src/save/schema';
import { CAREER_IDS, FAN_TIERS, MAGAZINE_IDS, DEFAULT_LOOK, CLOTH_IDS, type CareerId, type Look, type StyleId } from '../src/data/world/ids';
import { CAREERS, FAN_TIER_DEFS, MAGAZINES, SCENES, SONGS, POSES, PHOTO_DECORS } from '../src/data/world/careers';
import { CLOTHES } from '../src/data/world/wardrobe';
import * as C from '../src/game/world/careers';
import * as Model from '../src/game/world/careerGames/model';
import * as Photo from '../src/game/world/careerGames/photo';
import * as Act from '../src/game/world/careerGames/actress';
import * as Sing from '../src/game/world/careerGames/singer';
import { mulberry32 } from '../src/game/world/careerGames/rng';

const look = (o: Partial<Look> = {}): Look => ({ ...DEFAULT_LOOK, acc: [], ...o });

/** Séance « parfaite » qui respecte l'objectif en cours. */
function playToLevel(w: World, id: CareerId, target: number, score = 95): number {
  let n = 0;
  while (C.levelOf(w, id) < target && n < 200) {
    const want = C.wantedTag(w, id);
    C.recordSession(w, id, { score, tags: want ? [want] : [], combo: 40 });
    n++;
  }
  return n;
}

describe('données des carrières', () => {
  it('4 carrières × 5 paliers avec objectifs et récompenses réelles', () => {
    expect(CAREER_IDS.length).toBe(4);
    for (const id of CAREER_IDS) {
      const d = CAREERS[id];
      expect(d.tiers.length).toBe(5);
      let prevXp = 0;
      for (const t of d.tiers) {
        expect(t.obj.need).toBeGreaterThan(0);
        expect(t.xpNeed).toBeGreaterThan(prevXp);
        prevXp = t.xpNeed;
        const r = t.reward;
        expect((r.coins ?? 0) + (r.diamonds ?? 0) + (r.energy ?? 0) + (r.fabric ?? 0) + (r.fans ?? 0) + (r.cloth?.length ?? 0) + (r.furniture?.length ?? 0)).toBeGreaterThan(0);
        for (const c of r.cloth ?? []) expect(CLOTH_IDS).toContain(c);
      }
    }
  });
  it('6 paliers de fans alignés sur FAN_TIERS, récompenses valides', () => {
    expect(FAN_TIER_DEFS.map((t) => t.n)).toEqual([...FAN_TIERS]);
    for (const t of FAN_TIER_DEFS) { for (const c of t.reward.cloth ?? []) expect(CLOTH_IDS).toContain(c); }
  });
});

describe('progression des 4 carrières', () => {
  for (const id of CAREER_IDS) {
    it(`${id} : de 0 à 5 en jouant, niveau jamais > 5, xp croissante`, () => {
      const w = defaultWorld();
      let xp = 0;
      for (let guard = 0; guard < 200 && C.levelOf(w, id) < 5; guard++) {
        const want = C.wantedTag(w, id);
        const before = C.levelOf(w, id);
        const o = C.recordSession(w, id, { score: 100, tags: want ? [want] : [], combo: 40 });
        expect(o.xpTotal).toBeGreaterThanOrEqual(xp);
        xp = o.xpTotal;
        expect(C.levelOf(w, id) - before).toBeLessThanOrEqual(1);
        expect(C.levelOf(w, id)).toBeLessThanOrEqual(5);
      }
      expect(C.levelOf(w, id)).toBe(5);
      expect(C.objectiveProgress(w, id).maxed).toBe(true);
      const again = C.recordSession(w, id, { score: 80 });
      expect(again.levelUp).toBeNull();
      expect(C.levelOf(w, id)).toBe(5);
    });
    it(`${id} : un palier demande ~2–8 séances de bon niveau`, () => {
      const w = defaultWorld();
      for (let lvl = 1; lvl <= 5; lvl++) {
        const n = playToLevel(w, id, lvl, 100);
        expect(n).toBeGreaterThanOrEqual(1);
        expect(n).toBeLessThanOrEqual(8);
      }
    });
  }
  it('un mauvais score ne fait jamais reculer', () => {
    const w = defaultWorld();
    playToLevel(w, 'photo', 2);
    const before = { ...C.progressOf(w, 'photo') };
    C.recordSession(w, 'photo', { score: 0 });
    expect(C.levelOf(w, 'photo')).toBe(before.level);
    expect(C.progressOf(w, 'photo').xp).toBeGreaterThan(before.xp);
    expect(C.progressOf(w, 'photo').best).toBe(before.best);
  });
  it('objectif « succès à la suite » : un échec remet la série à zéro', () => {
    const w = defaultWorld();
    playToLevel(w, 'photo', 3);
    expect(CAREERS.photo.tiers[3].obj.metric).toBe('streak');
    for (let i = 0; i < 3; i++) C.recordSession(w, 'photo', { score: 70 });
    expect(C.objectiveProgress(w, 'photo').have).toBe(3);
    C.recordSession(w, 'photo', { score: 20 });
    expect(C.objectiveProgress(w, 'photo').have).toBe(0);
  });
  it('objectif « tag » : seuls les succès comptent', () => {
    const w = defaultWorld();
    playToLevel(w, 'model', 1);
    expect(C.wantedTag(w, 'model')).toBe('chic');
    C.recordSession(w, 'model', { score: 40, tags: ['chic'] });
    expect(C.objectiveProgress(w, 'model').have).toBe(0);
    C.recordSession(w, 'model', { score: 80, tags: ['chic'] });
    expect(C.objectiveProgress(w, 'model').have).toBe(1);
  });
  it('objectif de combo : le meilleur combo est retenu', () => {
    const w = defaultWorld();
    playToLevel(w, 'singer', 1);
    C.recordSession(w, 'singer', { score: 50, combo: 7 });
    C.recordSession(w, 'singer', { score: 50, combo: 4 });
    expect(C.objectiveProgress(w, 'singer').have).toBe(7);
    expect(C.levelOf(w, 'singer')).toBe(1);
    const o = C.recordSession(w, 'singer', { score: 50, combo: 14 });
    expect(o.levelUp?.to).toBe(2);                         // combo 12 atteint → palier, compteurs remis à zéro
    expect(C.objectiveProgress(w, 'singer').have).toBe(0);
  });
});

describe('changement de carrière', () => {
  it('on change sans rien perdre', () => {
    const w = defaultWorld();
    playToLevel(w, 'photo', 2);
    playToLevel(w, 'singer', 1);
    const snap = JSON.stringify(w.careers.progress);
    expect(C.setCurrent(w, 'actress')).toBe(true);
    expect(C.setCurrent(w, 'photo')).toBe(true);
    expect(C.setCurrent(w, 'nope' as never)).toBe(false);
    expect(JSON.stringify(w.careers.progress)).toBe(snap);
    expect(C.currentCareer(w)).toBe('photo');
    expect(C.levelOf(w, 'photo')).toBe(2);
    expect(C.levelOf(w, 'singer')).toBe(1);
    // les compteurs d'une carrière n'interfèrent pas avec une autre
    C.recordSession(w, 'actress', { score: 90 });
    expect(C.levelOf(w, 'photo')).toBe(2);
  });
});

describe('récompenses', () => {
  it('un passage de palier donne vraiment pièces, tenues, meubles', () => {
    const w = defaultWorld();
    const coins0 = w.res.coins;
    playToLevel(w, 'photo', 2);
    expect(w.res.coins).toBeGreaterThan(coins0 + 250);
    expect(w.wardrobe.owned).toContain('ac-sunglasses');
    playToLevel(w, 'photo', 3);
    expect(w.castle.owned['mirror-standing']).toBe(1);
  });
  it('outside : diamants / énergie / fans renvoyés à l\'appelant', () => {
    const w = defaultWorld();
    let diamonds = 0, energy = 0, fans = 0;
    for (let i = 0; i < 40 && C.levelOf(w, 'photo') < 3; i++) {
      const o = C.recordSession(w, 'photo', { score: 92, tags: C.wantedTag(w, 'photo') ? [C.wantedTag(w, 'photo')!] : [] });
      diamonds += o.outside.diamonds; energy += o.outside.energy; fans += o.outside.fans;
    }
    expect(diamonds).toBe(5);
    expect(energy).toBe(10);
    expect(fans).toBeGreaterThan(30);
  });
  it('une tenue déjà possédée est remplacée par des pièces (pas de doublon)', () => {
    const w = defaultWorld();
    w.wardrobe.owned.push('ac-sunglasses');
    const c0 = w.res.coins;
    const g = C.applyReward(w, { cloth: ['ac-sunglasses'] });
    expect(w.wardrobe.owned.filter((x) => x === 'ac-sunglasses').length).toBe(1);
    expect(g.items.dupCoins).toBe(50);
    expect(w.res.coins).toBe(c0 + 50);
  });
});

describe('fans', () => {
  it('formule : croissante avec le score et le palier, jamais négative', () => {
    for (let l = 0; l <= 5; l++) {
      let prev = -1;
      for (let s = 0; s <= 100; s += 10) { const f = C.fansForSession(s, l); expect(f).toBeGreaterThanOrEqual(prev); prev = f; }
      expect(C.fansForSession(0, l)).toBe(0);
    }
    for (let l = 0; l < 5; l++) expect(C.fansForSession(80, l + 1)).toBeGreaterThan(C.fansForSession(80, l));
    expect(C.fansForSession(NaN, 2)).toBe(0);
  });
  it('simulation : 10 → 1 000 000 fans de façon progressive sur de nombreuses séances', () => {
    const w = defaultWorld();
    const ids = ['photo', 'model', 'actress', 'singer'] as const;
    const at: number[] = [];
    let n = 0;
    const rng = mulberry32(5);
    while (w.fans < 1_000_000 && n < 2000) {
      const id = ids[n % 4];
      const want = C.wantedTag(w, id);
      const o = C.recordSession(w, id, { score: 72 + rng() * 20, tags: want ? [want] : [], combo: 30 });
      w.fans += o.fans;
      const t = C.fansTierOf(w.fans);
      while (at.length <= t) at.push(n + 1);
      n++;
    }
    expect(w.fans).toBeGreaterThanOrEqual(1_000_000);
    expect(at.length).toBe(6);
    // premier palier rapide (≤ 5 séances), dernier lointain (≥ 60 séances), toujours croissant
    expect(at[0]).toBeLessThanOrEqual(5);
    expect(at[5]).toBeGreaterThanOrEqual(60);
    expect(at[5]).toBeLessThan(400);
    for (let i = 1; i < 6; i++) expect(at[i]).toBeGreaterThan(at[i - 1]);
  });
  it('claimFanTiers : récompense réelle, une seule fois, mise à jour de fansTierSeen', () => {
    const w = defaultWorld();
    w.fans = 12;
    const a = C.claimFanTiers(w);
    expect(a.map((x) => x.tier)).toEqual([0]);
    expect(w.fansTierSeen).toBe(0);
    expect(w.wardrobe.owned).toContain('top-tee-pink');
    expect(C.claimFanTiers(w)).toEqual([]);
    w.fans = 1_200_000;
    const b = C.claimFanTiers(w);
    expect(b.map((x) => x.tier)).toEqual([1, 2, 3, 4, 5]);
    expect(w.fansTierSeen).toBe(5);
    expect(w.castle.owned['painting']).toBe(1);
    expect(w.castle.owned['red-carpet']).toBe(1);
    expect(w.wardrobe.owned).toContain('dr-redcarpet');
    expect(w.magazines).toContain('star-royaume');
    expect(b.reduce((x, c) => x + c.outside.diamonds, 0)).toBe(8 + 20 + 50);
    expect(C.claimFanTiers(w)).toEqual([]);
  });
});

describe('magazines', () => {
  it('rien au départ, puis débloqués par la progression, sans doublon', () => {
    const w = defaultWorld();
    expect(C.syncMagazines(w)).toEqual([]);
    playToLevel(w, 'model', 1);
    expect(w.magazines).toEqual(['radia-mag']);
    playToLevel(w, 'model', 3);
    expect(w.magazines).toContain('radia-fashion');
    expect(w.magazines).not.toContain('radia-show');
    expect(C.syncMagazines(w)).toEqual([]);
    playToLevel(w, 'actress', 3);
    expect(w.magazines).toContain('radia-show');
    w.fans = 5000;
    expect(C.syncMagazines(w)).toEqual(['queen-paris']);
    playToLevel(w, 'singer', 5);
    expect(new Set(w.magazines).size).toBe(w.magazines.length);
    expect(C.ownedMagazinesOf(w).sort()).toEqual([...MAGAZINE_IDS].sort());
  });
  it('conditions affichables pour les 5 couvertures', () => {
    for (const id of MAGAZINE_IDS) { expect(MAGAZINES[id].how.length).toBeGreaterThan(5); expect(MAGAZINES[id].heads.length).toBe(3); }
  });
});

describe('sauvegarde', () => {
  it('sanitizeWorld conserve carrières, fans, magazines, compteurs', () => {
    const w = defaultWorld();
    playToLevel(w, 'photo', 2);
    C.setCurrent(w, 'photo');
    w.fans = 321; w.fansTierSeen = 1; w.magazines = ['radia-mag'];
    const back = sanitizeWorld(JSON.parse(JSON.stringify(w)));
    expect(back.careers.current).toBe('photo');
    expect(back.careers.progress.photo.level).toBe(2);
    expect(back.fans).toBe(321);
    expect(back.magazines).toEqual(['radia-mag']);
    expect(C.objectiveProgress(back, 'photo').have).toBe(C.objectiveProgress(w, 'photo').have);
  });
  it('niveaux absurdes et carrière inconnue → valeurs sûres, sans exception', () => {
    const w = sanitizeWorld({ careers: { current: 'nope', progress: { photo: { level: 99, xp: -4, best: 'x' } } } });
    expect(C.currentCareer(w)).toBeNull();
    expect(C.levelOf(w, 'photo')).toBe(5);
    expect(C.progressOf(w, 'photo').xp).toBe(0);
    expect(() => C.recordSession(w, 'photo', { score: 50 })).not.toThrow();
    expect(() => C.objectiveProgress(w, 'singer')).not.toThrow();
    const s = sanitize({ world: { careers: 3, fans: 'a' } });
    expect(s.world.fans).toBe(0);
  });
  it('save complet aller-retour', () => {
    const d = defaultSave();
    playToLevel(d.world, 'singer', 2);
    d.world.fans = 77;
    const back = sanitize(JSON.parse(JSON.stringify(d)));
    expect(back.world.careers.progress.singer.level).toBe(2);
    expect(back.world.fans).toBe(77);
  });
});

// ------------------------------------------------------------------ mini-jeux
describe('mini-jeu Mannequin', () => {
  const owned = defaultWorld().wardrobe.owned;
  it('score 0 sans vêtement, 100 pour une tenue casual complète', () => {
    expect(Model.assessLook(look({ top: null, bottom: null, shoes: null, bag: null }), 'casual').score).toBe(0);
    const casual = look({ top: 'top-tee-white', bottom: 'bot-jeans', shoes: 'sh-sneakers-white', bag: null });
    expect(Model.assessLook(casual, 'casual', 1).score).toBe(100);
    expect(Model.assessLook(casual, 'royal', 1).score).toBe(0);
  });
  it('une robe remplace haut + bas ; incomplet = pénalisé', () => {
    const dress = look({ dress: 'dr-royal-gown', top: 'top-tee-white', bottom: 'bot-jeans', shoes: 'sh-heels', bag: null, crown: 'cr-gold' });
    const a = Model.assessLook(dress, 'royal', 3);
    expect(a.pieces.some((p) => p.id === 'top-tee-white')).toBe(false);
    expect(a.score).toBeGreaterThanOrEqual(90);
    const half = look({ top: 'top-tee-white', bottom: null, shoes: 'sh-sneakers-white', bag: null });
    expect(Model.assessLook(half, 'casual').score).toBeLessThan(70);
  });
  it('la difficulté exige des tenues plus riches', () => {
    const casual = look({ top: 'top-tee-white', bottom: 'bot-jeans', shoes: 'sh-sneakers-white', bag: null });
    expect(Model.assessLook(casual, 'casual', 5).score).toBeLessThan(Model.assessLook(casual, 'casual', 1).score);
  });
  it('avec les vêtements de départ : Casual faisable, Royal impossible', () => {
    expect(Model.assessLook(Model.bestLook(owned, 'casual', 1), 'casual', 1).score).toBeGreaterThanOrEqual(90);
    expect(Model.assessLook(Model.bestLook(owned, 'royal', 1), 'royal', 1).score).toBeLessThan(40);
  });
  it('avec tout le catalogue : chaque thème dépasse 80 en difficulté 3', () => {
    for (const st of ['casual', 'chic', 'romantic', 'royal', 'stage'] as StyleId[]) {
      const l = Model.bestLook(CLOTH_IDS, st, 3);
      expect(Model.assessLook(l, st, 3).score).toBeGreaterThanOrEqual(80);
      expect(Model.lookIsOwned(l, CLOTH_IDS)).toBe(true);
    }
  });
  it('lookIsOwned refuse un vêtement non possédé ; offerThemes contient le thème voulu', () => {
    expect(Model.lookIsOwned(look({ crown: 'cr-gold' }), owned)).toBe(false);
    for (let s = 1; s < 40; s++) {
      const th = Model.offerThemes(2, mulberry32(s), 'chic');
      expect(th.length).toBe(3);
      expect(th).toContain('chic');
      expect(th).not.toContain('royal');
    }
    expect(Model.offerThemes(5, mulberry32(1)).length).toBe(3);
  });
  it('le catalogue ne contient que des styles connus', () => {
    for (const id of CLOTH_IDS) expect(CLOTHES[id].styles.length).toBeGreaterThan(0);
  });
});

describe('mini-jeu Modèle photo', () => {
  it('viseur : va-et-vient entre 0 et 1', () => {
    for (let t = 0; t < 10; t += 0.07) { const p = Photo.sweep(t, 0.8); expect(p).toBeGreaterThanOrEqual(0); expect(p).toBeLessThanOrEqual(1); }
    expect(Photo.sweep(0, 1)).toBe(0);
    expect(Photo.sweep(0.5, 1)).toBe(1);
    expect(Photo.sweep(1, 1)).toBeCloseTo(0, 5);
  });
  it('score de cliché : parfait au centre, nul loin, monotone', () => {
    const hw = 0.12;
    expect(Photo.shotScore(0.5, 0.5, hw)).toBe(100);
    expect(Photo.shotScore(0.5 + hw, 0.5, hw)).toBe(70);
    expect(Photo.shotScore(0.95, 0.5, hw)).toBe(0);
    let prev = 101;
    for (let e = 0; e <= 0.3; e += 0.01) { const s = Photo.shotScore(0.5 + e, 0.5, hw); expect(s).toBeLessThanOrEqual(prev); prev = s; }
  });
  it('la difficulté resserre la zone et accélère', () => {
    for (let d = 1; d < 5; d++) { expect(Photo.photoParams(d + 1).halfWidth).toBeLessThan(Photo.photoParams(d).halfWidth); expect(Photo.photoParams(d + 1).speed).toBeGreaterThan(Photo.photoParams(d).speed); }
    expect(Photo.photoParams(99).halfWidth).toBe(Photo.photoParams(5).halfWidth);
  });
  it('cibles espacées, dans la zone visible', () => {
    for (let s = 1; s < 30; s++) {
      const t = Photo.pickTargets(mulberry32(s), 3);
      expect(t.length).toBe(3);
      for (const x of t) { expect(x).toBeGreaterThan(0.1); expect(x).toBeLessThan(0.9); }
    }
  });
  it('6 poses, score total borné 0–100 et dépend de la pose/du décor', () => {
    expect(POSES.length).toBeGreaterThanOrEqual(4);
    expect(POSES.length).toBeLessThanOrEqual(6);
    const l = look();
    const good = Photo.photoScore('wave', 'city', l, [100, 100, 100]);
    const bad = Photo.photoScore('wave', 'stage', l, [100, 100, 100]);
    expect(good).toBeGreaterThan(bad);
    expect(Photo.photoScore('wave', 'city', l, [0, 0, 0])).toBeLessThan(45);
    expect(Photo.photoScore('heart', 'garden', look({ top: 'top-tee-pink', bottom: 'bot-skirt-pleated' }), [100, 100, 100])).toBeLessThanOrEqual(100);
    expect(Photo.photoScore('x', 'y', l, [])).toBeGreaterThanOrEqual(0);
    expect(PHOTO_DECORS.length).toBeGreaterThanOrEqual(3);
    expect(Photo.photoTags('walk')).toEqual(['chic']);
  });
});

describe('mini-jeu Actrice', () => {
  it('scènes de 5 répliques, bonne réponse toujours présente, 3 puis 4 choix', () => {
    for (let d = 1; d <= 5; d++) {
      for (let s = 1; s < 25; s++) {
        const sc = Act.buildScene(d, mulberry32(s * 31 + d));
        expect(sc.beats.length).toBe(5);
        for (const b of sc.beats) {
          expect(b.options.length).toBe(Act.optionCount(d));
          expect(b.options.filter((o) => o.q === 2).length).toBe(1);
          expect(new Set(b.options.map((o) => o.expr)).size).toBe(b.options.length);
        }
      }
    }
    expect(Act.optionCount(1)).toBe(3);
    expect(Act.optionCount(4)).toBe(4);
  });
  it('toutes les scènes ont 5 répliques avec une meilleure prise', () => {
    for (const s of SCENES) { expect(s.beats.length).toBe(5); for (const b of s.beats) expect(b.takes.filter((t) => t.q === 2).length).toBe(1); }
  });
  it('score : 100 si tout juste, 0 si tout faux', () => {
    const sc = Act.buildScene(3, mulberry32(9));
    const best = sc.beats.map((b) => b.options.find((o) => o.q === 2)!);
    const worst = sc.beats.map((b) => b.options.find((o) => o.q === 0) ?? b.options[0]);
    expect(Act.scoreScene(best)).toBe(100);
    expect(Act.isPerfect(best)).toBe(true);
    expect(Act.scoreScene(worst)).toBeLessThan(100);
    expect(Act.scoreScene(sc.beats.map((b) => b.options.find((o) => o.q === 1) ?? b.options[0]))).toBeLessThanOrEqual(100);
  });
  it('les scènes plus subtiles s\'ouvrent avec la difficulté et on évite de répéter la précédente', () => {
    const d1 = new Set<string>();
    for (let s = 0; s < 40; s++) d1.add(Act.buildScene(1, mulberry32(s)).id);
    expect(d1.has('premiere')).toBe(false);
    const d5 = new Set<string>();
    for (let s = 0; s < 80; s++) d5.add(Act.buildScene(5, mulberry32(s)).id);
    expect(d5.size).toBe(SCENES.length);
    for (let s = 0; s < 20; s++) expect(Act.buildScene(3, mulberry32(s), 'theatre').id).not.toBe('theatre');
  });
});

describe('mini-jeu Chanteuse', () => {
  it('4 chansons, 3 puis 4 pistes, partitions générées par motif et reproductibles', () => {
    expect(SONGS.length).toBe(4);
    for (const song of SONGS) {
      const a = Sing.makeChart(song, 42);
      const b = Sing.makeChart(song, 42);
      expect(a.map((n) => [n.t, n.lane])).toEqual(b.map((n) => [n.t, n.lane]));
      expect(a.length).toBeGreaterThan(15);
      for (let i = 1; i < a.length; i++) expect(a[i].t).toBeGreaterThanOrEqual(a[i - 1].t);
      for (const n of a) { expect(n.lane).toBeGreaterThanOrEqual(0); expect(n.lane).toBeLessThan(song.lanes); }
      expect(a[0].t).toBeGreaterThanOrEqual(Sing.LEAD_IN);
      expect(Sing.makeChart(song, 43).map((n) => n.lane)).not.toEqual(a.map((n) => n.lane));
      expect(song.motifs.every((m) => m.length === 8)).toBe(true);
    }
    expect(SONGS.map((s) => s.lanes)).toEqual([3, 3, 4, 4]);
    expect(Sing.makeChart(SONGS[3], 1).length).toBeGreaterThan(Sing.makeChart(SONGS[0], 1).length);
  });
  it('déblocage des chansons avec la difficulté', () => {
    expect(Sing.unlockedSongs(1).map((s) => s.id)).toEqual([1]);
    expect(Sing.unlockedSongs(3).map((s) => s.id)).toEqual([1, 2, 3]);
    expect(Sing.unlockedSongs(5).length).toBe(4);
  });
  it('jugement Parfait / Bien / Raté, combo, toucher à vide sans pénalité', () => {
    const e = new Sing.RhythmEngine([{ id: 0, t: 1, lane: 0, judged: null }, { id: 1, t: 2, lane: 1, judged: null }, { id: 2, t: 3, lane: 0, judged: null }, { id: 3, t: 4, lane: 2, judged: null }]);
    expect(e.hit(1, 1)).toBeNull();                       // mauvaise piste
    expect(e.hit(0, 1.02)?.judgement).toBe('perfect');
    expect(e.combo).toBe(1);
    expect(e.hit(0, 1.02)).toBeNull();                    // déjà jugée
    expect(e.hit(1, 2.12)?.judgement).toBe('good');
    expect(e.combo).toBe(2);
    expect(e.hit(0, 3.5)).toBeNull();                     // trop tôt/tard
    expect(e.combo).toBe(2);
    expect(e.update(3.5).map((n) => n.id)).toEqual([2]);  // note 2 ratée
    expect(e.combo).toBe(0);
    expect(e.maxCombo).toBe(2);
    expect(e.finished(4.1)).toBe(false);
    expect(e.finished(4.4)).toBe(true);
    expect(e.perfect).toBe(1); expect(e.good).toBe(1); expect(e.miss).toBe(2);
    expect(e.score()).toBe(41);
  });
  it('score : 100 si tout parfait, 0 si tout raté ; une chanson jouée parfaitement', () => {
    for (const song of SONGS) {
      const ch = Sing.makeChart(song, 7);
      const e = new Sing.RhythmEngine(ch);
      for (const n of ch) e.hit(n.lane, n.t + 0.01);
      expect(e.finished(1e6)).toBe(true);
      expect(e.score()).toBe(100);
      expect(e.maxCombo).toBe(ch.length);
      const e2 = new Sing.RhythmEngine(Sing.makeChart(song, 7));
      e2.update(1e6);
      expect(e2.score()).toBe(0);
      expect(e2.maxCombo).toBe(0);
    }
  });
  it('étiquettes de chanson pour les objectifs', () => {
    expect(Sing.singerTags(SONGS[3], 80)).toEqual(['song4', 'song4s']);
    expect(Sing.singerTags(SONGS[2], 70)).toEqual(['song3']);
  });
});

import { salaryAmount, salaryInfo, claimSalary, SALARY_COOLDOWN_MS } from '../src/game/world/careers';

describe('salaire de Radia', () => {
  it('se touche une fois, puis attend, et croît avec les paliers', () => {
    const w = defaultWorld();
    const base = salaryAmount(w);
    expect(base).toBeGreaterThanOrEqual(60);
    const t0 = 1_000_000_000_000;
    expect(salaryInfo(w, t0).ready).toBe(true);
    const c0 = w.res.coins;
    expect(claimSalary(w, t0)).toBe(base);
    expect(w.res.coins).toBe(c0 + base);
    expect(claimSalary(w, t0 + 1000)).toBe(0);
    expect(salaryInfo(w, t0 + SALARY_COOLDOWN_MS).ready).toBe(true);
    w.careers.progress.photo = { level: 3, xp: 0, best: 0 } as never;
    expect(salaryAmount(w)).toBeGreaterThan(base);
  });
});
