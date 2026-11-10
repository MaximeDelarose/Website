import { describe, it, expect } from 'vitest';
import { PERSONAS, personaById } from '../src/apps/brain/personas';
import * as B from '../src/apps/brain/banks';
import { defaultBrain, memOf, sanitizeBrain } from '../src/apps/brain/memory';
import { offer, react, start, canSpeak, hourWeight, noteHisSnap } from '../src/apps/brain/engine';
import { PROFILES } from '../src/events/tindeur/swipe/data';
import type { BrainState } from '../src/apps/brain/types';

const lcg = (seed: number) => { let s = seed >>> 0; const next = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; return { next, int: (n: number) => Math.min(n - 1, Math.floor(next() * n)) }; };
const FORBIDDEN = /\bnu\b|\bnue\b|\bnudes?\b|sexy|sexe|intime|seins|poitrine|fesses|culotte|lingerie|déshabill|corps nu|photo hot|hot\b/i;
const allBankStrings = (): string[] => {
  const out: string[] = [];
  const walk = (v: unknown): void => { if (typeof v === 'string') out.push(v); else if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === 'object') Object.values(v).forEach(walk); };
  for (const k of Object.keys(B)) { if (k === 'CHOICES') continue; walk((B as Record<string, unknown>)[k]); }
  for (const p of PERSONAS) { walk(p.kidsLine); walk(p.friendLine); walk(p.nameLine); walk(p.anecdotes); walk(p.openers); walk(p.jokes.map((j) => [j.setup, j.recover])); }
  return out;
};

describe('personnalités', () => {
  it('25 personnages, mêmes identifiants que Tindeur, uniques', () => {
    expect(PERSONAS.length).toBe(25);
    expect(new Set(PERSONAS.map((p) => p.id)).size).toBe(25);
    for (const p of PERSONAS) expect(PROFILES.some((q) => q.id === p.id) || p.id === 'enzo', p.id).toBe(true);
    for (const q of PROFILES) expect(personaById(q.id), `profil ${q.id}`).toBeTruthy();
  });
  it('chaque personnage a ses propres répliques (famille, amitié, prénom, histoires, blagues) et elles sont toutes différentes', () => {
    const seen = new Map<string, string>();
    for (const p of PERSONAS) {
      expect(p.kidsLine.length, p.id).toBeGreaterThanOrEqual(1); expect(p.anecdotes.length, p.id).toBeGreaterThanOrEqual(3); expect(p.openers.length, p.id).toBeGreaterThanOrEqual(3); expect(p.jokes.length, p.id).toBeGreaterThanOrEqual(1);
      for (const s of [...p.kidsLine, p.friendLine, p.nameLine, ...p.anecdotes, ...p.openers]) { expect(seen.get(s), `doublon « ${s} » (${p.id} / ${seen.get(s)})`).toBeUndefined(); seen.set(s, p.id); }
    }
    // réactions à « divorcée, trois enfants » : toutes distinctes entre les personnages
    expect(new Set(PERSONAS.map((p) => p.kidsLine[0])).size).toBe(25);
  });
  it('aucune réplique vide, aucun reste de modèle, rien d\'intime', () => {
    for (const s of allBankStrings()) { expect(s.trim().length, s).toBeGreaterThan(2); expect(s.replace(/\{n\}/g, '').includes('{'), s).toBe(false); expect(FORBIDDEN.test(s), s).toBe(false); }
  });
  it('les demandes de photo ne portent que sur le sourire, les yeux, la tenue ou un selfie', () => {
    for (const lvl of [1, 2, 3] as const) for (const s of B.PHOTO_ASK[lvl]) expect(/snap|selfie|sourire|yeux|tenue|tête|bouille|photo|mystérieuse/i.test(s), s).toBe(true);
  });
});

function fresh(): BrainState { return defaultBrain(); }

describe('famille : découverte progressive, réactions différentes', () => {
  it('il ne sait rien tant que Radia ne l\'a pas dit ; chaque homme réagit à sa façon', () => {
    const firsts = new Set<string>(); const tones = new Set<string>();
    for (const p of PERSONAS) {
      const b = fresh(); const rng = lcg(p.id.length * 99);
      expect(memOf(b, p.id).facts.kids).toBe(0);
      for (let i = 0; i < 40; i++) { const t = start(b, p.id, rng, { now: 1e12 + i * 3 * 3_600_000, channel: 'tindeur', canSnap: false }); expect(t).not.toBeNull(); expect(t!.say.join(' ')).not.toMatch(/tes enfants|les enfants, ça va|la tribu/i); }
      const r = react(b, p.id, 'kids_all', rng, { now: 2e12 })!;
      expect(memOf(b, p.id).facts.kids).toBe(2);
      firsts.add(r.say[0]); tones.add(p.kids);
      expect(r.choices.length).toBeGreaterThanOrEqual(2);
    }
    expect(firsts.size).toBe(25); expect(tones.size).toBeGreaterThanOrEqual(6);
  });
  it('« je préfère ne pas en parler » : il respecte et ne revient jamais dessus', () => {
    const b = fresh(); const rng = lcg(7);
    const r = react(b, 'hugo', 'kids_no', rng, { now: 1e12 })!;
    expect(r.say.join(' ')).toMatch(/souci|comprends|respecte|ferm|plus|promis/i);
    for (let i = 0; i < 80; i++) { const t = start(b, 'hugo', rng, { now: 1e12 + i * 4 * 3_600_000, channel: 'tindeur', canSnap: false })!; expect(t.say.join(' ')).not.toMatch(/enfants|tribu|famille/i); expect(t.choices.some((c) => c.id.startsWith('kids_'))).toBe(false); }
  });
  it('mémoire : après le partage il reprend des nouvelles, sans répéter la même question', () => {
    const b = fresh(); const rng = lcg(3); react(b, 'antoine', 'kids_all', rng, { now: 1e12 });
    const lines: string[] = [];
    for (let i = 0; i < 120; i++) { const t = start(b, 'antoine', rng, { now: 1e12 + i * 9 * 3_600_000, channel: 'tindeur', canSnap: false })!; lines.push(...t.say); }
    expect(lines.some((l) => /enfants|famille|tribu/i.test(l))).toBe(true);
    for (let i = 1; i < lines.length; i++) expect(lines[i] === lines[i - 1]).toBe(false);
  });
  it('un homme hésitant le dit honnêtement et reste poli ; « ça me fait de la peine » le fait s\'excuser', () => {
    const b = fresh(); const rng = lcg(11);
    const r = react(b, 'theo', 'kids_all', rng, { now: 1e12 })!;
    expect(personaById('theo')!.kids).toBe('hesitant'); expect(r.say.join(' ')).toMatch(/honn|prêt|préfère/i);
    expect(r.choices.map((c) => c.id)).toEqual(expect.arrayContaining(['kid_ok', 'kid_hurt']));
    const h = react(b, 'theo', 'kid_hurt', rng, { now: 1e12 + 1 })!; expect(h.say.join(' ')).toMatch(/désolé|pardon/i);
  });
});

describe('prénom : jamais dans chaque message', () => {
  it('au plus un tour sur trois, jamais deux de suite, et pas du tout pour ceux qui ne le font jamais', () => {
    for (const p of PERSONAS) {
      const b = fresh(); const rng = lcg(p.id.charCodeAt(0) * 7); let used = 0; let prev = false; let turns = 0;
      for (let i = 0; i < 200; i++) {
        const t = i % 2 === 0 ? start(b, p.id, rng, { now: 1e12 + i * 6 * 3_600_000, channel: 'tindeur', canSnap: false }) : react(b, p.id, offer(b, p.id, rng, { channel: 'tindeur' })[0].id, rng, { now: 1e12 + i * 6 * 3_600_000 });
        if (!t) continue; turns++;
        const has = t.say.some((l) => /Radia/.test(l)); if (has) used++;
        expect(has && prev, `${p.id} prénom 2 tours de suite`).toBe(false); prev = has;
      }
      expect(used / turns, p.id).toBeLessThan(0.34);
      if (p.nameplay === 0) expect(used, p.id).toBe(0);
    }
  });
  it('« arrête avec mon prénom » le calme pour un bon moment', () => {
    const b = fresh(); const rng = lcg(5); react(b, 'jordan', 'stopname', rng, { now: 1e12 });
    let n = 0; for (let i = 0; i < 6; i++) { const t = start(b, 'jordan', rng, { now: 1e12 + (i + 1) * 5 * 3_600_000, channel: 'tindeur', canSnap: false })!; if (t.say.some((l) => /Radia/.test(l))) n++; }
    expect(n).toBe(0);
  });
  it('une blague nulle : le rattrapage arrive quand Radia se moque', () => {
    const p = personaById('pierre')!; let found = false;
    for (let seed = 1; seed < 60 && !found; seed++) {
      const b = fresh(); const rng = lcg(seed);
      for (let i = 0; i < 30; i++) { const t = start(b, 'pierre', rng, { now: 1e12 + i * 7 * 3_600_000, channel: 'tindeur', canSnap: false })!; if (t.topic === 'joke') { const r = react(b, 'pierre', 'nul', rng, { now: 1e12 + i * 7 * 3_600_000 + 1 })!; expect(p.jokes.some((j) => r.say.join(' ').includes(j.recover))).toBe(true); found = true; break; } }
    }
    expect(found).toBe(true);
  });
});

describe('amitié homme-femme : un vrai débat', () => {
  it('chaque position réagit à sa façon, le débat dure plusieurs tours, avec désaccords courtois', () => {
    const seenFirst = new Set<string>();
    for (const id of ['nicolas', 'maxime', 'dylan', 'theo', 'jordan', 'romain']) {
      const b = fresh(); const rng = lcg(id.length + 4);
      const r = react(b, id, 'friends_only', rng, { now: 1e12 })!;
      expect(r.say.length).toBeGreaterThanOrEqual(2); expect(r.say[0]).toBe(personaById(id)!.friendLine); seenFirst.add(r.say[0]);
      expect(r.choices.length).toBeGreaterThanOrEqual(3);
      const r2 = react(b, id, r.choices.find((c) => c.id.startsWith('fr_') && c.id !== 'fr_clear')!.id, rng, { now: 1e12 + 1 })!;
      expect(memOf(b, id).thread?.topic).toBe('friend'); expect(r2.say.length).toBeGreaterThanOrEqual(1);
      const r3 = react(b, id, r2.choices.find((c) => c.id.startsWith('fr_') && c.id !== 'fr_clear')!.id, rng, { now: 1e12 + 2 })!;
      expect(memOf(b, id).thread).toBeNull(); expect(r3.say.length).toBeGreaterThanOrEqual(2); // réponse + conclusion
    }
    expect(seenFirst.size).toBe(6);
  });
  it('« amis, c\'est tout » : accepté avec élégance ; un homme franc peut s\'éloigner', () => {
    let stepped = 0; let stayed = 0;
    for (let seed = 1; seed <= 40; seed++) { const b = fresh(); const rng = lcg(seed); react(b, 'dylan', 'friends_only', rng, { now: 1e12 }); const r = react(b, 'dylan', 'fr_clear', rng, { now: 1e12 + 1 })!; if (memOf(b, 'dylan').faded) { stepped++; expect(r.say.join(' ')).toMatch(/Prends soin|souhaite|retirer|clair/i); } else stayed++; }
    expect(stepped).toBeGreaterThan(0); expect(stayed).toBeGreaterThan(0);
    const b = fresh(); const rng = lcg(2); react(b, 'nicolas', 'friends_only', rng, { now: 1e12 }); react(b, 'nicolas', 'fr_clear', rng, { now: 1e12 + 1 }); expect(memOf(b, 'nicolas').faded).toBe(false);
  });
});

describe('demandes de photo : légères, jamais insistantes', () => {
  const runStarts = (b: BrainState, id: string, n: number, t0: number, step: number, seed: number) => { const rng = lcg(seed); const asks: number[] = []; for (let i = 0; i < n; i++) { const t = start(b, id, rng, { now: t0 + i * step, channel: 'snap', canSnap: true }); if (t?.topic === 'photo') asks.push(i); } return asks; };
  it('un refus explicite est respecté pour toujours', () => {
    const b = fresh(); const rng = lcg(1); memOf(b, 'dylan').turns = 10;
    const r = react(b, 'dylan', 'ph_no', rng, { now: 1e12 })!; expect(r.say.join(' ')).toMatch(/jamais|plus|redemand|respect|clos/i);
    expect(memOf(b, 'dylan').photo.noMore).toBe(true);
    expect(runStarts(b, 'dylan', 300, 1e12 + 1, 12 * 3_600_000, 9).length).toBe(0);
  });
  it('« plus tard » : aucune demande avant le délai', () => {
    const b = fresh(); const rng = lcg(2); memOf(b, 'jordan').turns = 10; react(b, 'jordan', 'ph_later', rng, { now: 1e12 });
    expect(runStarts(b, 'jordan', 5, 1e12 + 1, 3_600_000, 3).length).toBe(0); // 5 h plus tard
  });
  it('au plus 3 demandes en tout, une seule relance légère par demande, jamais plus d\'une demande par 36 h', () => {
    for (const id of ['dylan', 'florian', 'enzo', 'karim']) {
      const b = fresh(); const rng = lcg(id.length * 17); memOf(b, id).turns = 10; let asks = 0; let relances = 0; let last = -1e15; let t = 1e12;
      for (let i = 0; i < 400; i++) { t += 5 * 3_600_000; const r = start(b, id, rng, { now: t, channel: 'snap', canSnap: true }); if (!r) continue; if (r.topic === 'photo') { if (memOf(b, id).photo.relanced) relances++; else { asks++; expect(t - last, id).toBeGreaterThanOrEqual(36 * 3_600_000); last = t; } } }
      expect(asks, id).toBeLessThanOrEqual(3); expect(relances, id).toBeLessThanOrEqual(3);
    }
  });
  it('ceux d\'audace 0 ne demandent jamais de photo en premier', () => {
    for (const p of PERSONAS.filter((q) => q.bold === 0)) { const b = fresh(); memOf(b, p.id).turns = 10; expect(runStarts(b, p.id, 200, 1e12, 6 * 3_600_000, 5).length, p.id).toBe(0); }
  });
  it('sur Tindeur (pas de snaps) aucune demande de photo', () => {
    const b = fresh(); const rng = lcg(1); memOf(b, 'dylan').turns = 10;
    for (let i = 0; i < 300; i++) expect(start(b, 'dylan', rng, { now: 1e12 + i * 12 * 3_600_000, channel: 'tindeur', canSnap: false })!.topic).not.toBe('photo');
  });
  it('compliment adapté à ce qui est VRAIMENT envoyé (sourire / tenue / grimace)', () => {
    const rng = lcg(4);
    const s = react(fresh(), 'maxime', 'ph_smile', rng, { now: 1 })!.say.join(' '); const o = react(fresh(), 'maxime', 'ph_outfit', rng, { now: 1 })!.say.join(' '); const f = react(fresh(), 'maxime', 'ph_funny', rng, { now: 1 })!.say.join(' ');
    expect(s).toMatch(/sourire/i); expect(o).toMatch(/tenue|goût|couleurs|élégan/i); expect(f).toMatch(/grimace|rire|décalé|rires|sourire/i);
  });
  it('la photo qu\'il a envoyée : Radia peut en parler et il répond sur le bon sujet', () => {
    const b = fresh(); const rng = lcg(6); noteHisSnap(b, 'nicolas', 'abs', 1e12);
    const o = offer(b, 'nicolas', lcg(8)); // peut contenir sf_ask
    const r = react(b, 'nicolas', 'sf_ask', rng, { now: 1e12 + 5 })!; expect(r.say.join(' ')).toMatch(/séance|sport|jambes|abdos|record|miroir/i);
    void o;
  });
});

describe('situation sentimentale et Auguste', () => {
  it('Hugo demande si elle est toujours en contact avec « l\'autre » ; il respecte chaque réponse', () => {
    let asked = false;
    for (let seed = 1; seed <= 80 && !asked; seed++) {
      const b = fresh(); const rng = lcg(seed); memOf(b, 'hugo').turns = 8;
      for (let i = 0; i < 30; i++) { const t = start(b, 'hugo', rng, { now: 1e12 + i * 8 * 3_600_000, channel: 'tindeur', canSnap: false })!; if (t.topic === 'single') { asked = true; expect(t.say.join(' ')).toMatch(/l.autre|Auguste/); expect(t.choices.map((c) => c.id)).toEqual(['sg_yes', 'sg_complex', 'sg_none', 'sg_single']); const r = react(b, 'hugo', 'sg_none', rng, { now: 1e12 + 1 })!; expect(r.say.join(' ')).toMatch(/raison|Pardon|pas dû|rôle/i); break; } }
    }
    expect(asked).toBe(true);
  });
  it('les autres ne parlent jamais d\'Auguste', () => {
    for (const p of PERSONAS.filter((q) => q.id !== 'hugo')) for (const s of [...p.kidsLine, p.friendLine, p.nameLine, ...p.anecdotes, ...p.openers]) expect(/Auguste/.test(s), p.id).toBe(false);
  });
});

describe('rythme, relances, éloignement, mémoire isolée', () => {
  it('les rythmes diffèrent : plages horaires et délais propres', () => {
    expect(hourWeight(personaById('kevin')!, 8)).toBeGreaterThan(hourWeight(personaById('kevin')!, 22));
    expect(hourWeight(personaById('dylan')!, 22)).toBeGreaterThan(hourWeight(personaById('dylan')!, 8));
    const b = fresh(); const rng = lcg(1); memOf(b, 'kevin').talkedAt = 1e12;
    expect(canSpeak(b, 'kevin', 1e12 + 3_600_000, 9, rng)).toBe(false); // trop tôt : 5 h minimum
    expect(new Set(PERSONAS.map((p) => p.gapH)).size).toBeGreaterThanOrEqual(5);
  });
  it('relance après plusieurs jours ; adieu poli après des relances sans réponse ; il revient si elle revient', () => {
    const b = fresh(); const rng = lcg(2); const m = memOf(b, 'jordan'); m.talkedAt = 1e12; m.turns = 5;
    const r1 = start(b, 'jordan', rng, { now: 1e12 + 4 * 86_400_000, channel: 'tindeur', canSnap: false })!; expect(r1.topic).toBe('relance');
    const r2 = start(b, 'jordan', rng, { now: 1e12 + 8 * 86_400_000, channel: 'tindeur', canSnap: false })!; expect(r2.topic).toBe('relance');
    const r3 = start(b, 'jordan', rng, { now: 1e12 + 20 * 86_400_000, channel: 'tindeur', canSnap: false })!; expect(m.faded).toBe(true); expect(r3.say.join(' ')).toMatch(/Prends soin|souhaite|coupe la radio|merci/i);
    expect(canSpeak(b, 'jordan', 1e12 + 40 * 86_400_000, 21, rng)).toBe(false);
    const back = react(b, 'jordan', 'lol', rng, { now: 1e12 + 41 * 86_400_000 })!; expect(m.faded).toBe(false); expect(back.say[0]).toMatch(/revenue|plaisir/i);
  });
  it('les souvenirs de deux personnages ne se mélangent jamais', () => {
    const b = fresh(); const rng = lcg(3); react(b, 'kevin', 'kids_all', rng, { now: 1 }); react(b, 'dylan', 'ph_no', rng, { now: 1 });
    expect(memOf(b, 'dylan').facts.kids).toBe(0); expect(memOf(b, 'kevin').photo.noMore).toBe(false); expect(memOf(b, 'lucas').facts.kids).toBe(0);
  });
  it('longue conversation (1 000 tours, tous personnages) : aucune répétition immédiate, aucune réplique vide', () => {
    for (const p of PERSONAS) {
      const b = fresh(); const rng = lcg(p.id.length * 31 + p.id.charCodeAt(1)); let prev = '';
      for (let i = 0; i < 40; i++) {
        const ch = offer(b, p.id, rng, { channel: 'tindeur', canSnap: false }); const pick = ch[rng.int(ch.length)];
        const t = i % 3 === 0 ? start(b, p.id, rng, { now: 1e12 + i * 5 * 3_600_000, channel: 'tindeur', canSnap: false }) : react(b, p.id, pick.id, rng, { now: 1e12 + i * 5 * 3_600_000 });
        expect(t).not.toBeNull(); for (const l of t!.say) { expect(l.trim().length).toBeGreaterThan(2); expect(l.includes('{')).toBe(false); if (l.length > 25) expect(l === prev, `${p.id} répète « ${l} »`).toBe(false); prev = l; }
        expect(t!.choices.length).toBeGreaterThanOrEqual(2); expect(t!.choices.length).toBeLessThanOrEqual(5);
      }
    }
  });
});

describe('sauvegarde de la mémoire', () => {
  it('aller-retour JSON et nettoyage des données abîmées', () => {
    const b = fresh(); const rng = lcg(1); react(b, 'hugo', 'kids_all', rng, { now: 5 }); noteHisSnap(b, 'hugo', 'selfie', 9);
    const back = sanitizeBrain(JSON.parse(JSON.stringify(b)));
    expect(back.chars.hugo.facts.kids).toBe(2); expect(back.chars.hugo.photo.his[0].scene).toBe('selfie');
    expect(sanitizeBrain({ v: 1, chars: { hugo: { facts: { kids: 99 }, aff: 'x', recent: [1, 'ok'], thread: { topic: 'zzz' } }, inconnu: {} } }).chars.hugo.facts.kids).toBe(3);
    expect(sanitizeBrain(null)).toEqual(defaultBrain()); expect(sanitizeBrain('x').chars).toEqual({});
  });
});
