/**
 * « La carrière de Radia ♡ » : 4 carrières fictives (Modèle photo, Mannequin,
 * Actrice, Chanteuse), 5 paliers chacune avec de vrais objectifs, un mini-jeu
 * jouable par carrière, résultat animé, fans, récompenses et magazines.
 */
import '../../styles/world-career.css';
import { h, tap } from '../../dom';
import { ui } from '../../ui';
import { icon } from '../../icons';
import { save, audio, events } from '../../../core/app';
import { stat, checkAchievements } from '../../../core/progress';
import { wallet, fmt } from '../../../core/wallet';
import { firstTime, world } from '../../../core/world';
import { reactAuguste } from '../../../game/world/auguste';
import { currentLook } from '../../../game/world/look';
import { CAREERS } from '../../../data/world/careers';
import { STYLE_NAMES } from '../../../data/world/wardrobe';
import { CAREER_IDS, MAGAZINE_IDS, type CareerId, type StyleId } from '../../../data/world/ids';
import { difficultyFor, levelOf, objectiveProgress, ownedMagazinesOf, progressOf, recordSession, setCurrent, wantedTag, currentCareer, MAX_LEVEL } from '../../../game/world/careers';
import { lookIsOwned } from '../../../game/world/careerGames/model';
import { careerIconUrl, countUp, rewardChips, showLevelUp, showMagazineReveal } from './careerFx';
import { grantFans, openFans, ownedMagazines } from './fans';
import { playPhoto } from './careerGames/photo';
import { playModel } from './careerGames/model';
import { playActress } from './careerGames/actress';
import { playSinger } from './careerGames/singer';
import type { GameCtx, GameResult } from './careerGames/shared';

export { ownedMagazines };

const PLAY: Record<CareerId, (g: GameCtx) => Promise<GameResult | null>> = { photo: playPhoto, model: playModel, actress: playActress, singer: playSinger };

export function openCareer(): Promise<void> {
  return new Promise((resolve) => {
    let alive = true;
    const leave = () => { alive = false; ui.closeScreen(); resolve(); };

    // ------------------------------------------------------------ choix de la carrière
    function showSelect() {
      const w = world();
      const cards = CAREER_IDS.map((id, i) => {
        const def = CAREERS[id];
        const lvl = levelOf(w, id);
        const b = h(`button.cr-card${currentCareer(w) === id ? '.cur' : ''}`, { style: `--c:${def.color};--c2:${def.color2};--i:${i}` },
          h('img', { src: careerIconUrl(id, 96), alt: '' }),
          h('b', def.name),
          h('small', lvl >= MAX_LEVEL ? 'Palier maximum' : `Palier ${lvl} sur ${MAX_LEVEL}`),
          h('div.cr-pips', ...Array.from({ length: MAX_LEVEL }, (_, k) => h(`i${k < lvl ? '.on' : ''}`))),
          currentCareer(w) === id ? h('span.cr-cur', 'En cours') : null);
        b.addEventListener('click', tap(() => { setCurrent(world(), id); save.save(); showSheet(id); }));
        return b;
      });
      const fans = h('button.btn.lavande.cr-link', icon('heart', 18), ' Fans ', h('b', fmt(w.fans)));
      fans.addEventListener('click', tap(async () => { await openFans(); if (alive) showSelect(); }));
      const mags = h('button.btn.secondary.cr-link', icon('album', 18), ' Couvertures ', h('b', `${ownedMagazinesOf(w).length}/${MAGAZINE_IDS.length}`));
      mags.addEventListener('click', tap(async () => { await openFans({ album: true }); if (alive) showSelect(); }));
      const body = h('div.screen-body.cr-body',
        h('p.cr-lead', 'Choisis ta voie, Radia. Tu peux changer quand tu veux : rien n\'est perdu.'),
        h('div.cr-grid', ...cards),
        h('div.cr-links', fans, mags),
        h('small.cr-fict', 'Chaque carrière se gagne en jouant ♡'));
      ui.showScreen(h('div.screen.bg-soft.cr-screen', ui.header('La carrière de Radia ♡', leave), body));
      if (firstTime('tip.career.intro')) ui.toast({ title: 'Quatre carrières', sub: 'Chaque séance est un petit jeu : plus tu progresses, plus c\'est difficile… et plus tu as de fans.', icon: 'sparkle', ms: 3200 });
      reactAuguste('career', 0.25);
    }

    // ------------------------------------------------------------ fiche d'une carrière
    function showSheet(id: CareerId) {
      const w = world();
      const def = CAREERS[id];
      const p = progressOf(w, id);
      const ov = objectiveProgress(w, id);
      const tiers = def.tiers.map((t, k) => {
        const done = k < p.level, cur = k === p.level;
        return h(`div.cr-tier${done ? '.done' : cur ? '.cur' : ''}`,
          h('div.cr-t-n', done ? icon('check', 18) : h('b', String(k + 1))),
          h('div.cr-t-body', h('b', t.title), h('small', t.goal),
            cur && ov.tier ? h('div.cr-prog', h('i', { style: `width:${Math.round((ov.have / ov.need) * 100)}%` }), h('span', `${ov.have} / ${ov.need} ${ov.label}`)) : null,
            h('div.rc-row.small', ...rewardChips(t.reward))));
      });
      const want = wantedTag(w, id);
      const xpPct = ov.tier ? Math.round((ov.xpHave / ov.xpNeed) * 100) : 100;
      const go = h('button.btn.wide.cr-go', icon('play', 22), ` ${def.session}`);
      go.addEventListener('click', tap(() => void session(id)));
      const body = h('div.screen-body.cr-body',
        h('section.panel.cr-hero', { style: `--c:${def.color};--c2:${def.color2}` },
          h('img', { src: careerIconUrl(id, 96), alt: '' }),
          h('div', h('h3', def.name), h('p', def.tagline), h('small', p.level >= MAX_LEVEL ? 'Palier maximum atteint ♡' : `Palier ${p.level} sur ${MAX_LEVEL}`)),
          h('div.cr-xp', h('i', { style: `width:${xpPct}%` }), h('span', ov.tier ? `Expérience ${ov.xpHave} / ${ov.xpNeed}` : `Expérience ${p.xp}`))),
        go,
        want && want in STYLE_NAMES ? h('small.cr-want', `Objectif en cours : style ${STYLE_NAMES[want as StyleId]}`) : null,
        h('h3.cr-h', 'Les cinq paliers'), h('div.cr-tiers', ...tiers),
        h('small.cr-fict', `Meilleur score : ${p.best}`));
      ui.showScreen(h('div.screen.bg-soft.cr-screen', ui.header(def.name, () => showSelect()), body));
    }

    // ------------------------------------------------------------ une séance
    async function session(id: CareerId) {
      const w = world();
      const level = levelOf(w, id);
      const owned = w.wardrobe.owned.slice();
      let look = currentLook();
      if (!lookIsOwned(look, owned)) look = { ...look, top: null, bottom: null, dress: null, jacket: null, shoes: null, bag: null, acc: [], crown: null };
      const gctx: GameCtx = { career: id, difficulty: difficultyFor(level), look, owned, wanted: wantedTag(w, id) };
      const res = await PLAY[id](gctx);
      if (!alive) return;
      if (!res) { showSheet(id); return; }
      const prevObj = objectiveProgress(w, id);
      const out = recordSession(w, id, { score: res.score, tags: res.tags, combo: res.combo });
      // effets hors World
      if (out.outside.diamonds) wallet.giveDiamonds(out.outside.diamonds);
      if (out.outside.energy) wallet.giveEnergy(out.outside.energy);
      stat('world.career.session');
      if (out.levelUp) stat('world.career.levelUp');
      for (let i = 0; i < out.newMagazines.length; i++) stat('world.career.magazine');
      const fanRes = grantFans(out.outside.fans);
      save.save();
      events.emit('economy', undefined);
      showResult(id, res, out, prevObj.have, fanRes);
      checkAchievements();
    }

    function showResult(id: CareerId, res: GameResult, out: ReturnType<typeof recordSession>, haveBefore: number, fanRes: ReturnType<typeof grantFans>) {
      const def = CAREERS[id];
      const w = world();
      const verdict = out.score >= 90 ? 'Éblouissant !' : out.score >= 75 ? 'Magnifique !' : out.score >= 60 ? 'Très bien joué !' : out.score >= 40 ? 'Belle tentative !' : 'On s\'entraîne, ça viendra ♡';
      const num = h('b.cr-score-n', '0');
      const ring = h('div.cr-ring', { style: `--c:${def.color2}` }, num, h('small', '/ 100'));
      const fansEl = h('b', '0');
      const ov = objectiveProgress(w, id);
      const bar = out.levelUp ? null : ov.tier ? h('div.cr-prog', h('i', { style: `width:${Math.round((haveBefore / ov.need) * 100)}%` }), h('span', `${ov.have} / ${ov.need} ${ov.label}`)) : null;
      const chips = h('div.rc-row',
        h('span.rc.rc-fans', icon('heart', 16), '+', fansEl, ' fans'),
        h('span.rc.rc-coins', icon('star', 16), `+${fmt(out.coins)} pièces`),
        h('span.rc.rc-xp', icon('sparkle', 16), `+${out.xp} exp.`),
        out.best ? h('span.rc.rc-best', 'Record !') : null);
      const again = h('button.btn.wide', icon('refresh', 20), ' Rejouer');
      again.addEventListener('click', tap(() => void session(id)));
      const back = h('button.btn.secondary.wide', 'Retour');
      back.addEventListener('click', tap(() => showSheet(id)));
      const body = h('div.screen-body.cr-body.cr-result',
        h('img.cr-res-icon', { src: careerIconUrl(id, 96), alt: '' }),
        h('h3', verdict), ring,
        h('div.cr-lines', ...res.lines.map((l) => h('div', l))),
        chips, bar,
        out.levelUp ? h('div.cr-up', icon('trophy', 22), h('b', ` Palier ${out.levelUp.to} : ${out.levelUp.tier.title}`)) : null,
        h('small.cr-fict', `Fans : ${fmt(w.fans)}`),
        again, back);
      ui.showScreen(h('div.screen.bg-soft.cr-screen', ui.header(def.session, () => showSheet(id)), body));
      audio.play(out.score >= 60 ? 'reward' : 'pickup');
      countUp(num, 0, out.score, 1000, (n) => { ring.style.setProperty('--p', String(n)); return String(n); });
      window.setTimeout(() => countUp(fansEl, 0, out.outside.fans, 900), 500);
      // célébrations en file
      window.setTimeout(() => void (async () => {
        if (!alive) return;
        if (out.levelUp) { await showLevelUp(id, out.levelUp.to, out.levelUp.tier, out.levelUp.granted); reactAuguste('careerUp', 0.7, true); }
        for (const m of out.newMagazines) { await showMagazineReveal(m); reactAuguste('magazine', 0.6); }
        await fanRes.celebrate();
        if (!out.levelUp && !fanRes.claims.length) { reactAuguste('career', 0.3); }
      })(), 1600);
    }

    showSelect();
  });
}
