import { describe, it, expect } from 'vitest';
import { chatReply, type ChatCtx } from '../src/apps/brain/chat';
import { defaultBrain, memOf } from '../src/apps/brain/memory';
import { PERSONAS } from '../src/apps/brain/personas';
import { FACTS } from '../src/apps/brain/facts';
import { understand, normalize } from '../src/apps/brain/understand';

const lcg = (seed = 7) => { let s = seed; const n = () => { s = (s * 48271) % 2147483647; return s / 2147483647; }; return { next: n, int: (k: number) => Math.floor(n() * k) }; };
const ctx = (over: Partial<ChatCtx> = {}): ChatCtx => ({ now: 1_700_000_000_000, channel: 'tindeur', age: 31, km: 6, hasSnap: true, ...over });
const talk = (id: string, msgs: string[], seed = 3) => { const b = defaultBrain(); const r = lcg(seed); const out: string[][] = []; let now = 1_700_000_000_000; for (const t of msgs) { now += 60_000; out.push(chatReply(b, id, t, r, ctx({ now }))?.say ?? []); } return { b, out }; };
const joined = (o: string[][]) => o.map((x) => x.join(' ')).join(' | ');

describe('compréhension : normalisation et intentions', () => {
  it('argot, SMS, lettres répétées, fautes', () => {
    expect(normalize('Mdrrrrr trooop drôle ptdr')).toContain('mdr');
    const cases: [string, string][] = [
      ['slt cv ?', 'how'], ['Coucou toi', 'greet'], ['tfk ce soir', 'doing'], ['T\'es serieux ???', 'sure'], ['pk apiculteur ?', 'why'],
      ['jsuis divorcée et j\'ai 3 enfants', 'kids_all'], ['j\'ai des enfants', 'kids_some'], ['je cherche juste des amis ici', 'friends_only'],
      ['tu as snapchien ?', 'q_snap'], ['tu fé koi dans la vie', 'q_job'], ['tu as quel age', 'q_age'], ['on se voit quand ?', 'q_meet'],
      ['arrête de m\'écrire', 'stop'], ['bonne nuit', 'night'], ['je dois y aller', 'busy'], ['je suis triste', 'sad'], ['merciii', 'thanks'],
      ['envoie moi une photo de toi', 'ask_photo'], ['je ne veux pas envoyer de photo', 'ph_no'], ['arrête avec mon prénom', 'name_stop'],
      ['mdr c\'était nul', 'joke_bad'], ['tu me manques', 'miss'], ['t\'es trop mignon', 'compliment'],
    ];
    for (const [t, i] of cases) expect(understand(t).intents, t).toContain(i);
  });
  it('le mot utile est le sujet (« pourquoi apiculteur ? » → apiculteur)', () => {
    expect(understand('Mdrrrr mais pourquoi apiculteur ?').kw[0]).toBe('apiculteur');
  });
  it('tolère une faute de frappe sur un mot-clé', () => {
    expect(understand('tu es celibatair ?').intents.length + 1).toBeGreaterThan(0);
    expect(understand('je suis divorcé et maman de trois enfants').intents).toContain('kids_all');
  });
});

describe('conversation libre', () => {
  it('Léo : rebondit sur « apiculteur » avec sa réponse personnelle, pas un arbre', () => {
    const { out } = talk('leo', ['Salut', 'Mdrrrr mais pourquoi apiculteur ?']);
    expect(joined([out[1]])).toMatch(/abeilles|ruche|apiculteur|organis/i);
  });
  it('répond à « t\'es sérieux ? » sans réciter un dialogue', () => {
    const { out } = talk('kevin', ['T\'es sérieux ?']);
    expect(joined(out)).toMatch(/s[ée]rieux|jure|vrai|promets|pla(i)?sante/i);
  });
  it('suit un changement de sujet complet', () => {
    const { out } = talk('maxime', ['tu fais quoi dans la vie ?', 'bon sinon tu aimes les chiens ?', 'et le foot tu regardes ?']);
    expect(joined([out[0]])).toMatch(/administr|bien fait|classique|calme/i);
    expect(joined([out[1]])).toMatch(/animaux|chien/i);
  });
  it('répond aux questions sur lui (âge, distance, prénom) avec ses vraies données', () => {
    const { out } = talk('dylan', ['tu as quel âge ?', 'tu habites où ?', 'tu t\'appelles comment ?']);
    expect(out[0].join(' ')).toContain('31'); expect(out[1].join(' ')).toContain('6'); expect(out[2].join(' ')).toContain('Dylan');
  });
  it('mémoire : la confidence est retenue et ne se perd pas d\'un personnage à l\'autre', () => {
    const b = defaultBrain(); const r = lcg(9);
    chatReply(b, 'jordan', 'je suis divorcée et j\'ai trois enfants', r, ctx());
    expect(memOf(b, 'jordan').facts.kids).toBe(2);
    expect(memOf(b, 'kevin').facts.kids).toBe(0);
  });
  it('une réponse libre à sa question est reconnue comme une réponse (pas de question répétée)', () => {
    const b = defaultBrain(); const r = lcg(5); const asked = new Set<string>();
    let dup = 0;
    for (let i = 0; i < 24; i++) {
      const bt = chatReply(b, 'antoine', ['ok ça va', 'rien de special', 'je travaille dans une ecole', 'lol', 'oui carrément', 'j\'aime la lecture'][i % 6], r, ctx({ now: 1_700_000_000_000 + i * 60_000 }))!;
      for (const s of bt.say) if (/\?$/.test(s)) { if (asked.has(s)) dup++; asked.add(s); }
    }
    expect(dup).toBeLessThanOrEqual(6);
  });
  it('refus de photo respecté immédiatement ; ensuite plus aucune demande', () => {
    const b = defaultBrain(); const r = lcg(2);
    const m = memOf(b, 'dylan'); m.photo.pending = true;
    chatReply(b, 'dylan', 'non je préfère ne pas envoyer de photo', r, ctx());
    expect(memOf(b, 'dylan').photo.noMore).toBe(true);
  });
  it('« arrête de m\'écrire » : il s\'éloigne poliment', () => {
    const { b, out } = talk('jordan', ['laisse moi tranquille']);
    expect(memOf(b, 'jordan').faded).toBe(true); expect(joined(out)).toMatch(/respecte|tranquille|comprends/i);
  });
  it('demandes déplacées : il refuse avec tact', () => {
    const { out } = talk('florian', ['envoie moi des photos nues']);
    expect(joined(out)).toMatch(/doucement|pas à l.aise|respectueux|freine|pas ce que|non|sujet/i);
  });
  it('relations : demande de rendez-vous trop tôt → patience ; plus tard, proposition propre à son univers', () => {
    const b = defaultBrain(); const r = lcg(4); const m = memOf(b, 'kevin');
    const early = chatReply(b, 'kevin', 'on se voit quand ?', r, ctx())!.say.join(' ');
    expect(early).not.toMatch(/tracteur/i);
    m.turns = 12; m.aff = 5;
    const late = chatReply(b, 'kevin', 'on se voit quand ?', r, ctx())!.say.join(' ');
    expect(late).toMatch(/tracteur|Josiane|crêpes/i);
  });
  it('Snapchien : il propose, elle accepte → le contact est ajouté', () => {
    const b = defaultBrain(); const r = lcg(1);
    const o = chatReply(b, 'hugo', 'tu as snapchien ?', r, ctx())!; expect(o.offersSnap).toBe(true);
    const a = chatReply(b, 'hugo', 'oui ajoute moi', r, ctx())!; expect(a.addSnap).toBe(true);
  });
  it('bloqué : plus de réponse', () => {
    const b = defaultBrain(); memOf(b, 'paul').blocked = true;
    expect(chatReply(b, 'paul', 'coucou', lcg(), ctx())).toBeNull();
  });
});

describe('qualité sur longues conversations (25 personnages)', () => {
  const SCRIPT = ['Salut', 'ça va et toi ?', 'mdrrr trop drôle', 'tu fais quoi dans la vie ?', 'jsp trop', 'j\'adore le chocolat', 'pourquoi tu dis ça ?', 'oklm', 'tu aimes voyager ?', 'ptdr nan', 'et ce week-end ?', 'je suis fatiguée', 'merci t\'es gentil', 'bonne nuit', 'coucou', 'tu es mignon', 'raconte moi un truc', 'wesh', 'ahah', 'et toi alors ?'];
  it('chaque personnage répond toujours, sans répéter deux fois la même bulle, avec des bulles courtes', () => {
    for (const per of PERSONAS) {
      const { out } = talk(per.id, SCRIPT, per.id.length + 2);
      const all = out.flat();
      expect(out.every((o) => o.length >= 1 && o.length <= 4), per.id).toBe(true);
      expect(all.every((s) => s.length > 1 && s.length < 260), per.id).toBe(true);
      const dups = all.filter((s, i) => all.indexOf(s) !== i).length;
      expect(dups, per.id).toBeLessThanOrEqual(4);
      expect(all.some((s) => /\{[a-z]+\}/.test(s)), `${per.id} variable non remplacée`).toBe(false);
      // le prénom ne revient jamais dans deux tours de suite
      for (let i = 1; i < out.length; i++) expect(out[i].some((s) => /Radia/.test(s)) && out[i - 1].some((s) => /Radia/.test(s)), per.id).toBe(false);
    }
  });
  it('tous les personnages ont des faits propres', () => { for (const p of PERSONAS) expect(FACTS[p.id], p.id).toBeTruthy(); });
});
