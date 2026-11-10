/**
 * Organiser la sortie : choisir un créneau, demander à un proche de garder les enfants (SIMULÉ, aucun vrai contact),
 * lire sa réponse, et trouver un plan B si besoin. Jamais de compte à rebours, jamais de culpabilisation : toutes les issues sont bonnes.
 * Les enfants ne sont jamais nommés ici (« les enfants »).
 */
import { h } from '../../ui/dom';
import { endCard, injectCss, introCard } from '../games/action/common';
import { relativeFaceCanvas } from '../../game/art/relatives';
import { REL_IDS, RELATIVES, SLOTS, TONES, PLAN_B, CARE_OUTCOME_TEXT, askCare, availability, confirmLater, type CareOutcome, type RelId, type SlotId, type Tone } from '../../data/family/relatives';
import type { Activity } from '../types';

import { PARTNER } from '../../config/gift';
const AV_TXT = { free: 'Disponible', maybe: 'Peut-être', busy: 'Occupé(e)' } as const;
const AV_COL = { free: '#8fd19e', maybe: '#ffd36b', busy: '#e0b0b8' } as const;

const activity: Activity = async (ctx) => {
  injectCss();
  const occasion = String(ctx.params.occasion ?? `${PARTNER} t’invite à sortir`);
  ctx.header('Organiser la sortie', 'Avec quelqu’un de confiance');
  const body = h('div', { style: 'flex:1;min-height:0;display:flex;flex-direction:column;overflow:auto;padding:4px;gap:8px' });
  ctx.root.append(body);
  await introCard(ctx, { title: 'Qui garde les enfants ?', text: `${occasion}. Demande à un proche de confiance : aucune pression, il y a toujours une solution ♡`, art: h('div', { style: 'font-size:46px' }, '👨‍👩‍👧‍👦💌') });
  if (!ctx.isAlive()) return { score: 0, ok: false };

  const seed = ctx.runId;
  let slot: SlotId = 'tonight';
  const asked = new Set<string>();
  const say = async (who: RelId, text: string): Promise<void> => { await ctx.say(who, text); };

  // ---- sélections successives (retour possible via le plan B)
  const pickSlot = (): Promise<SlotId> => new Promise((resolve) => {
    body.replaceChildren(h('div.ea-sub', { style: 'margin:0;font-size:17px' }, 'Pour quand ?'),
      ...SLOTS.map((s) => { const b = h('button.ea-opt', { type: 'button', style: 'width:100%;justify-content:center;min-height:54px;font-size:17px' }, s.label) as HTMLButtonElement; b.addEventListener('click', () => { ctx.sound('pop2'); ctx.pop(b); resolve(s.id); }); return b; }));
  });
  const pickRel = (sl: SlotId, exclude: ReadonlySet<string>): Promise<RelId> => new Promise((resolve) => {
    const cards = REL_IDS.filter((r) => !exclude.has(r)).map((r) => {
      const a = availability(r, sl, seed);
      const info = RELATIVES[r];
      const b = h('button.ea-tile', { type: 'button', style: 'display:flex;align-items:center;gap:12px;padding:10px 12px;text-align:left;width:100%', 'aria-label': `${info.label}, ${AV_TXT[a]}` },
        h('img', { src: relativeFaceCanvas(r, 96).toDataURL('image/png'), alt: '', style: 'width:56px;height:56px;border-radius:50%;flex-shrink:0' }),
        h('div', { style: 'flex:1;min-width:0' }, h('b', { style: 'display:block;font-size:17px' }, info.label), h('small', { style: 'opacity:.75' }, info.role)),
        h('span', { style: `background:${AV_COL[a]};color:#3b2a2a;border-radius:999px;padding:3px 10px;font-size:12px;font-weight:700;white-space:nowrap` }, AV_TXT[a]));
      b.addEventListener('click', () => { ctx.sound('pop2'); ctx.pop(b); resolve(r); });
      return b;
    });
    body.replaceChildren(h('div.ea-sub', { style: 'margin:0;font-size:17px' }, `À qui demander ? (${SLOTS.find((s) => s.id === sl)?.label.toLowerCase()})`), ...cards);
  });
  const pickTone = (): Promise<Tone> => new Promise((resolve) => {
    body.replaceChildren(h('div.ea-sub', { style: 'margin:0;font-size:17px' }, 'Quel message envoies-tu ?'),
      ...TONES.map((t) => { const b = h('button.ea-opt', { type: 'button', style: 'width:100%;flex-direction:column;align-items:flex-start;text-align:left;gap:4px;padding:10px 12px;min-height:72px' }, h('b', { style: 'font-size:15px' }, t.label), h('span', { style: 'font-size:14px;line-height:1.3;font-weight:400' }, t.text)) as HTMLButtonElement; b.addEventListener('click', () => { ctx.sound('pop2'); ctx.pop(b); resolve(t.id); }); return b; }));
  });
  const pickPlanB = (): Promise<string> => new Promise((resolve) => {
    body.replaceChildren(h('div.ea-sub', { style: 'margin:0;font-size:17px' }, 'Pas de souci, on trouve une autre solution ♡'),
      ...PLAN_B.map((p) => { const b = h('button.ea-opt', { type: 'button', style: 'width:100%;flex-direction:column;align-items:flex-start;gap:2px;padding:10px 12px;min-height:60px;text-align:left' }, h('b', { style: 'font-size:16px' }, p.label), h('small', { style: 'opacity:.75;font-weight:400' }, p.hint)) as HTMLButtonElement; b.addEventListener('click', () => { ctx.sound('pop2'); ctx.pop(b); resolve(p.id); }); return b; }));
  });

  let outcome: CareOutcome | null = null;
  let who: RelId | null = null;
  slot = await pickSlot();
  let step: 'rel' | 'planb' | 'slot' = 'rel';
  for (let guard = 0; guard < 12 && outcome === null; guard++) {
    if (!ctx.isAlive()) return { score: 0, ok: false };
    if (step === 'slot') { slot = await pickSlot(); asked.clear(); step = 'rel'; continue; }
    if (step === 'planb') {
      const p = await pickPlanB();
      if (p === 'family') outcome = 'family';
      else if (p === 'postpone') outcome = 'postponed';
      else if (p === 'other-slot') step = 'slot';
      else step = 'rel';
      continue;
    }
    const rel = await pickRel(slot, asked);
    asked.add(rel);
    const tone = await pickTone();
    body.replaceChildren(h('div', { style: 'text-align:center;opacity:.7;margin-top:20px' }, 'Message envoyé… ♡'));
    await ctx.wait(ctx.isAlive() ? 700 : 0);
    const reply = askCare(rel, slot, tone, seed, ctx.rng);
    await say(rel, reply.text);
    if (reply.state === 'yes') { outcome = 'arranged'; who = rel; }
    else if (reply.state === 'later') {
      body.replaceChildren(h('div', { style: 'text-align:center;opacity:.7;margin-top:20px' }, `${RELATIVES[rel].label} te confirme dans un instant…`));
      await ctx.wait(ctx.isAlive() ? 900 : 0);
      if (confirmLater(rel, slot, seed) === 'yes') { await say(rel, 'C’est bon, c’est confirmé ! Je m’en occupe avec plaisir.'); outcome = 'arranged'; who = rel; }
      else { await say(rel, 'Finalement je ne pourrai pas, je suis vraiment désolée. Un autre moment, avec joie !'); step = 'planb'; }
    } else step = 'planb';
    if (asked.size >= REL_IDS.length && outcome === null && step === 'rel') step = 'planb';
  }
  if (outcome === null) outcome = 'postponed'; // sécurité : jamais de blocage
  await endCard(ctx, {
    title: outcome === 'arranged' ? 'C’est organisé ♡' : outcome === 'family' ? 'Une sortie en famille ♡' : 'On remet ça à plus tard ♡',
    art: h('div', { style: 'font-size:44px' }, outcome === 'arranged' ? '💞' : outcome === 'family' ? '👨‍👩‍👧‍👦' : '🗓️'),
    lines: [CARE_OUTCOME_TEXT[outcome], who ? `${RELATIVES[who].label} s’occupe des enfants.` : ''].filter(Boolean),
  });
  return { score: 100, ok: true, data: { outcome, rel: who ?? '', slot } };
};
export default activity;
