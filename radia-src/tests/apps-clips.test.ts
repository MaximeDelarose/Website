import { describe, it, expect } from 'vitest';
import { TEMPLATES, genClip, genId, parseGenId, commentsFor, block, SCENE_KINDS, AUTHORS, SOUNDS, FEED_CAPTIONS, COMMENTS_GENERAL } from '../src/apps/clips/gen';
import { defaultClips, sanitizeClips, grantFans, fansLeftToday, DAILY_FAN_CAP, MAX_FANS_PER_POST, MAX_MINE, publishMine, likesOf, toggleLike, toggleFav, addComment, proposalsFor, fansForMoment, isCareerKind, stateBytes, removeMine } from '../src/apps/clips/model';
import { mentionsChild, dayKey } from '../src/apps/util';
import type { MomentKind } from '../src/apps/moments';

const T0 = new Date(2026, 5, 10, 12, 0, 0).getTime();
const day = (n: number) => T0 + n * 86_400_000;

describe('Clips : générateur déterministe', () => {
  it('au moins 30 modèles de base, identifiants uniques, scènes connues', () => {
    expect(TEMPLATES.length).toBeGreaterThanOrEqual(30);
    expect(new Set(TEMPLATES.map((t) => t.id)).size).toBe(TEMPLATES.length);
    for (const t of TEMPLATES) expect(SCENE_KINDS).toContain(t.scene.k);
    expect(new Set(TEMPLATES.map((t) => t.scene.k)).size).toBeGreaterThanOrEqual(9);
  });
  it('même graine, même clip ; graines différentes, fils différents', () => {
    expect(genClip(4242, 17)).toEqual(genClip(4242, 17));
    const a = Array.from({ length: 12 }, (_, i) => genClip(1, i).tpl).join();
    const b = Array.from({ length: 12 }, (_, i) => genClip(2, i).tpl).join();
    expect(a).not.toBe(b);
  });
  it('jamais deux fois le même modèle ni la même scène d’affilée (y compris aux raccords de blocs)', () => {
    for (const seed of [1, 7, 99, 31337, 900001]) {
      let prev = genClip(seed, 0);
      for (let n = 1; n < TEMPLATES.length * 5 + 3; n++) {
        const c = genClip(seed, n);
        expect(c.tpl).not.toBe(prev.tpl);
        expect(c.scene.k).not.toBe(prev.scene.k);
        prev = c;
      }
    }
  });
  it('chaque bloc contient tous les modèles exactement une fois', () => {
    const b = block(5, 3);
    expect(b.length).toBe(TEMPLATES.length);
    expect(new Set(b.map((t) => t.id)).size).toBe(TEMPLATES.length);
  });
  it('variété : légendes, hashtags, sons, auteurs et durées de 3 à 6 s', () => {
    const clips = Array.from({ length: 200 }, (_, i) => genClip(77, i));
    expect(new Set(clips.map((c) => c.tpl)).size).toBe(TEMPLATES.length);
    expect(new Set(clips.map((c) => c.sound)).size).toBeGreaterThanOrEqual(10);
    expect(new Set(clips.map((c) => c.by)).size).toBeGreaterThanOrEqual(10);
    expect(new Set(clips.map((c) => `${c.tpl}|${c.caption}|${c.tags.join()}|${c.sound}|${c.by}`)).size).toBeGreaterThan(130);
    for (const c of clips) { expect(c.dur).toBeGreaterThanOrEqual(3); expect(c.dur).toBeLessThanOrEqual(6); expect(c.tags.length).toBeGreaterThan(2); expect(c.likes).toBeGreaterThan(0); }
  });
  it('l’identifiant d’un clip généré se relit', () => {
    const id = genId(123456, 42);
    expect(parseGenId(id)).toEqual({ seed: 123456, n: 42 });
    expect(parseGenId('m123')).toBeNull();
    expect(genClip(123456, 42).id).toBe(id);
  });
  it('commentaires fictifs : 3 à 6, déterministes, positifs, sans doublon', () => {
    const c = genClip(5, 3);
    const a = commentsFor(c.id, c.topic), b = commentsFor(c.id, c.topic);
    expect(a).toEqual(b);
    expect(a.length).toBeGreaterThanOrEqual(3); expect(a.length).toBeLessThanOrEqual(6);
    expect(new Set(a.map((x) => x.text)).size).toBe(a.length);
    expect(COMMENTS_GENERAL.length).toBeGreaterThan(12);
  });
  it('aucune donnée d’enfant dans les textes générés', () => {
    const texts: string[] = [];
    for (const t of TEMPLATES) texts.push(t.title, ...t.tags, t.scene.line ?? '');
    for (const list of Object.values(FEED_CAPTIONS)) texts.push(...list);
    texts.push(...COMMENTS_GENERAL, ...SOUNDS, ...AUTHORS.map((a) => a.name + a.handle));
    for (let i = 0; i < 80; i++) { const c = genClip(9, i); texts.push(c.caption, ...commentsFor(c.id, c.topic).map((x) => x.text)); }
    for (const s of texts) expect(mentionsChild(s), s).toBe(false);
    for (const t of TEMPLATES) expect(t.scene.items ?? '').not.toMatch(/kid/);
  });
});

describe('Clips : fans fictifs plafonnés, publications, sauvegarde', () => {
  it('plafond quotidien et par publication ; remise à zéro le lendemain', () => {
    const s = defaultClips(T0);
    let got = 0;
    for (let i = 0; i < 20; i++) got += grantFans(s, 120, T0 + i * 1000);
    expect(got).toBe(DAILY_FAN_CAP);
    expect(grantFans(s, 50, T0 + 60_000)).toBe(0);
    expect(fansLeftToday(s, T0)).toBe(0);
    expect(fansLeftToday(s, day(1))).toBe(DAILY_FAN_CAP);
    expect(grantFans(s, 9999, day(1))).toBe(MAX_FANS_PER_POST);
    expect(s.fansTotal).toBe(DAILY_FAN_CAP + MAX_FANS_PER_POST);
    expect(dayKey(T0)).toBe('2026-06-10');
  });
  it('fansForMoment : déterministe, borné, plus pour la carrière', () => {
    expect(fansForMoment('runway', 3)).toBe(fansForMoment('runway', 3));
    for (const k of ['shooting', 'runway', 'scene', 'concert', 'garden', 'casino']) { const f = fansForMoment(k, 11); expect(f).toBeGreaterThan(0); expect(f).toBeLessThanOrEqual(MAX_FANS_PER_POST); }
    expect(fansForMoment('concert', 1)).toBeGreaterThan(fansForMoment('garden', 1));
  });
  it('publier un moment : publication ajoutée au profil, fans comptés, plafond respecté', () => {
    const s = defaultClips(T0);
    const prop = proposalsFor({ kind: 'runway', title: 'Défilé terminé' }, T0)[0];
    const r = publishMine(s, { kind: 'runway', title: prop.title, caption: prop.caption, tags: prop.tags, scene: prop.scene }, T0);
    expect(s.mine).toHaveLength(1);
    expect(r.fans).toBeGreaterThan(0);
    expect(s.fansTotal).toBe(r.fans);
    for (let i = 0; i < 12; i++) publishMine(s, { kind: 'concert', title: 'c', caption: '', tags: [], scene: { k: 'show' } }, T0 + i + 1);
    expect(s.fansToday.n).toBeLessThanOrEqual(DAILY_FAN_CAP);
    expect(s.mine[s.mine.length - 1].fans).toBe(0);
  });
  it('élagage à 200 publications ; likes cohérents avec les fans et croissants', () => {
    const s = defaultClips(T0);
    for (let i = 0; i < MAX_MINE + 30; i++) publishMine(s, { kind: 'cat', title: `p${i}`, caption: '', tags: [], scene: { k: 'cat' } }, day(i % 30) + i);
    expect(s.mine.length).toBe(MAX_MINE);
    expect(s.mine[s.mine.length - 1].title).toBe(`p${MAX_MINE + 29}`);
    const p = s.mine[0];
    expect(likesOf(p, p.at + 10 * 3_600_000, false)).toBeGreaterThanOrEqual(likesOf(p, p.at, false));
    expect(likesOf(p, p.at, true)).toBe(likesOf(p, p.at, false) + 1);
    expect(likesOf(p, p.at + 1e12, false)).toBeLessThan(5000);
    expect(removeMine(s, p.id)).toBe(true);
    expect(s.mine.length).toBe(MAX_MINE - 1);
  });
  it('like, favori, commentaire', () => {
    const s = defaultClips(T0);
    expect(toggleLike(s, 'g1.2')).toBe(true); expect(toggleLike(s, 'g1.2')).toBe(false);
    expect(toggleFav(s, 'g1.2')).toBe(true); expect(s.faved).toEqual(['g1.2']);
    expect(addComment(s, 'g1.2', '  Merci   à tous ♡ ')).toBe(true);
    expect(s.comments['g1.2']).toEqual(['Merci à tous ♡']);
    expect(addComment(s, 'g1.2', '   ')).toBe(false);
    expect(addComment(s, 'g1.2', 'ma petite fille')).toBe(false);
    for (let i = 0; i < 10; i++) addComment(s, 'g1.2', `c${i}`);
    expect(s.comments['g1.2'].length).toBe(6);
  });
  it('propositions : trois variantes pour chaque type de moment, scènes valides', () => {
    const kinds: MomentKind[] = ['shooting', 'runway', 'scene', 'concert', 'restaurant', 'fireworks', 'castle', 'outfit', 'garden', 'chocolate', 'cat', 'casino', 'necklace'];
    for (const k of kinds) {
      const p = proposalsFor({ kind: k, title: 'Test' }, T0);
      expect(p).toHaveLength(3);
      for (const x of p) { expect(SCENE_KINDS).toContain(x.scene.k); expect(x.title.length).toBeGreaterThan(2); expect(x.tags).toContain('radia'); }
    }
    expect(isCareerKind('runway')).toBe(true); expect(isCareerKind('garden')).toBe(false);
  });
  it('sanitisation tolérante : n’importe quoi en entrée donne un état valide', () => {
    for (const raw of [null, undefined, 42, 'x', [], { mine: 5, liked: { a: 1 }, seed: 'abc', fansToday: 7, comments: [] }, { mine: [null, 3, { id: '' }, { id: 'ok', title: 'X', scene: { k: 'zzz', items: '<script>' } }] }]) {
      const s = sanitizeClips(raw, T0);
      expect(s.v).toBe(1); expect(Array.isArray(s.mine)).toBe(true); expect(s.seed).toBeGreaterThan(0);
      for (const p of s.mine) { expect(SCENE_KINDS).toContain(p.scene.k); expect(p.scene.items ?? '').not.toMatch(/[<>]/); }
    }
  });
  it('aller-retour JSON stable, bornes (< 400 Ko avec 200 publications), enfants filtrés', () => {
    const s = defaultClips(T0);
    for (let i = 0; i < 260; i++) { publishMine(s, { kind: 'runway', title: `Défilé ${i}`, caption: 'Une belle soirée sous les projecteurs, merci à tous ♡', tags: ['radia', 'défilé', 'podium', 'merci'], scene: { k: 'show', place: 'stage', mode: 'catwalk', pal: 1 } }, day(i % 5) + i); toggleLike(s, `g1.${i}`); toggleFav(s, `g1.${i}`); }
    s.mine.push({ id: 'bad', at: 1, kind: 'photo', title: 'Ma petite fille', caption: '', tags: [], sound: 'x', scene: { k: 'twirl' }, dur: 4, l0: 1, fans: 0 });
    const back = sanitizeClips(JSON.parse(JSON.stringify(s)), T0);
    expect(back.mine.length).toBe(MAX_MINE);
    expect(back.mine.some((p) => p.id === 'bad')).toBe(false);
    expect(back.liked.length).toBeLessThanOrEqual(400);
    expect(stateBytes(back)).toBeLessThan(300_000);
    expect(sanitizeClips(JSON.parse(JSON.stringify(back)), T0)).toEqual(back);
  });
});
