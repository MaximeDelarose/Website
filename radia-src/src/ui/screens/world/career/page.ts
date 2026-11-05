/**
 * Page « La carrière de Radia ♡ » : portrait + fans + salaire en haut, GRANDE carte
 * illustrée de l'activité du métier choisi au centre, quatre onglets compacts en
 * dessous, puis le chemin des cinq paliers. Changer de métier est libre.
 */
import '../../../styles/world-career.css';
import { h, tap } from '../../../dom';
import { ui } from '../../../ui';
import { icon } from '../../../icons';
import { save, audio, events, reducedFx } from '../../../../core/app';
import { haptic } from '../../../../core/haptics';
import { stat } from '../../../../core/progress';
import { fmt } from '../../../../core/wallet';
import { firstTime, world } from '../../../../core/world';
import { reactAuguste } from '../../../../game/world/auguste';
import { currentLook } from '../../../../game/world/look';
import { radiaBustCanvas } from '../../../../game/art/world/radiaNow';
import { drawCareerScene } from '../../../../game/art/world/careers';
import { CAREERS } from '../../../../data/world/careers';
import { CAREER_IDS, MAGAZINE_IDS, type CareerId } from '../../../../data/world/ids';
import { assessLook } from '../../../../game/world/careerGames/model';
import { claimSalary, currentCareer, levelOf, objectiveProgress, ownedMagazinesOf, progressOf, salaryInfo, setCurrent, MAX_LEVEL } from '../../../../game/world/careers';
import { clearCareerFx, careerIconUrl, rewardChips } from '../careerFx';
import { openFans } from '../fans';
import { sizedCanvas } from '../careerGames/shared';
import { ACTIVITY, outfitAdvice, stateLabel, tierPercent, tierSteps } from './logic';
import { runSession } from './session';
import { showResult } from './result';
import { waitLabel } from '../hub/state';
import { augusteSays } from '../../../components/augusteSays';

const SHORT: Record<CareerId, string> = { photo: 'Modèle photo', model: 'Mannequin', actress: 'Actrice', singer: 'Chanteuse' };

export function openCareer(): Promise<void> {
  return new Promise((resolve) => {
    let alive = true;
    let selected: CareerId = currentCareer(world()) ?? 'model';
    let tierSel = -1;
    const leave = () => { alive = false; clearCareerFx(); ui.closeScreen(); resolve(); };

    function build() {
      if (!alive) return;
      clearCareerFx();
      const salaryBox = h('section.car-salary');
      const top = h('section.car-top');
      const stage = h('section.car-stage');
      const tabs = h('nav.car-tabs', { role: 'tablist', 'aria-label': 'Carrières' });
      const path = h('section.car-path');
      const links = h('div.car-links');
      const body = h('div.screen-body.car-body', salaryBox, top, stage, h('p.car-free', 'Choisis ta voie quand tu veux : rien n\'est perdu ♡'), tabs, path, links);
      const screen = h('div.screen.bg-soft.car-screen', ui.header('La carrière de Radia ♡', leave), body);
      ui.showScreen(screen);

      // ---------------------------------------------------------- salaire : récupération immédiate, sans défiler
      let claiming = false;
      /** Verse le salaire RÉEL (montant calculé par le jeu) ; refuse un second versement (délai de 4 h dans claimSalary). */
      function claim(from: HTMLElement) {
        if (claiming) return;
        claiming = true;
        const got = claimSalary(world(), Date.now());
        if (!got) { claiming = false; renderTop(); return; }
        events.emit('economy', undefined);
        stat('world.career.salary');
        save.save();
        audio.play('reward'); haptic('reward');
        const r = from.getBoundingClientRect();
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        void import('../../../fx/sparkle').then((m) => m.sparkleBurst(cx, cy, { rarity: 'rare' }));
        if (!reducedFx()) {
          // pièces qui s'envolent vers le haut (là où se trouvent les compteurs), puis petit « pop »
          for (let i = 0; i < 9; i++) {
            const c = h('span.car-coin', '🪙');
            c.style.cssText = `left:${cx}px;top:${cy}px;--dx:${Math.round((i - 4) * 14)}px;--dy:${-Math.round(180 + (i % 3) * 40)}px;animation-delay:${i * 40}ms`;
            ui.root.append(c);
            window.setTimeout(() => c.remove(), 1100);
          }
        }
        salaryBox.classList.add('claimed');
        ui.toast({ title: `Salaire : +${fmt(got)} pièces`, sub: 'Tout ce que tu construis, tu le construis toi-même ♡', icon: 'star', ms: 3000 });
        augusteSays('Bsahték, tu l\'as mérité !', 3600);
        claiming = false;
        renderTop(); // le bandeau et le badge disparaissent tout de suite
      }
      function renderSalaryBox(sal: ReturnType<typeof salaryInfo>) {
        salaryBox.classList.remove('claimed');
        salaryBox.classList.toggle('ready', sal.ready);
        if (sal.ready) {
          const btn = h('button.btn.gold.car-sal-big', `Récupérer mes ${fmt(sal.amount)} pièces`);
          btn.addEventListener('click', tap(() => claim(btn), { sound: false }));
          salaryBox.replaceChildren(h('b.car-sal-title', 'Ton salaire est prêt ♡'), h('p', `Tu as gagné ${fmt(sal.amount)} pièces grâce à ton travail !`), btn);
        } else {
          // le salaire revient avec le temps : on affiche le vrai délai, rien d'autre
          salaryBox.replaceChildren(h('small.car-sal-next', `Prochain salaire dans ${waitLabel(sal.nextInMs)}`));
        }
      }

      // ---------------------------------------------------------- en-tête : portrait, palier, fans, salaire
      function renderTop() {
        const w = world();
        const def = CAREERS[selected];
        const lvl = levelOf(w, selected);
        const ov = objectiveProgress(w, selected);
        const portrait = radiaBustCanvas('smile', 112);
        portrait.className = 'car-portrait-cv';
        const sal = salaryInfo(w, Date.now());
        const mins = Math.ceil(sal.nextInMs / 60_000);
        const salBtn = h('button.btn.gold.small.car-sal-btn', sal.ready ? 'Toucher' : (mins >= 60 ? `${Math.floor(mins / 60)} h ${mins % 60}` : `${mins} min`));
        if (!sal.ready) salBtn.setAttribute('disabled', '');
        salBtn.addEventListener('click', tap(() => claim(salBtn), { sound: false }));
        renderSalaryBox(sal);
        const fansEl = h('b', fmt(w.fans));
        const chips = ov.tier ? rewardChips(ov.tier.reward).slice(0, 3) : [];
        top.replaceChildren(
          h('div.car-portrait', { style: `--c:${def.color};--c2:${def.color2}` }, portrait),
          h('div.car-id',
            h('small.car-who', 'Radia · ta carrière'),
            h('b.car-job', def.name),
            h('span.car-lvl', lvl >= MAX_LEVEL ? 'Palier maximum ♡' : `Palier ${lvl} sur ${MAX_LEVEL}${ov.tier ? ' · ' + ov.tier.title : ''}`),
            h('span.car-fans', icon('heart', 16), fansEl, ' fans')),
          // salaire prêt : le grand bouton du bandeau suffit (pas de doublon) ; sinon, la petite pastille « à venir »
          ...(sal.ready ? [] : [h('div.car-sal', h('small', `+${fmt(sal.amount)} à venir`), salBtn)]),
          h('div.car-next', h('small', 'Prochaine récompense'), h('div.rc-row.small', ...(chips.length ? chips : [h('span.rc', 'Tout est débloqué ♡')]))));
      }

      // ---------------------------------------------------------- grande carte illustrée
      function renderStage(animate: boolean) {
        const w = world();
        const def = CAREERS[selected];
        const act = ACTIVITY[selected];
        const ov = objectiveProgress(w, selected);
        const adv = outfitAdvice(w, selected);
        const W = Math.max(280, Math.min(440, (ui.root.clientWidth || 393) - 32));
        const H = Math.round(Math.min(176, Math.max(140, (ui.root.clientHeight || 700) * 0.21)));
        const { cv, ctx } = sizedCanvas(W, H, 'car-scene-cv');
        const look = currentLook();
        const draw = (t: number) => drawCareerScene(ctx, selected, W, H, t, look);
        draw(0.6);
        if (!reducedFx()) {
          let last = 0;
          const tick = (now: number) => {
            if (!cv.isConnected || !alive) return;
            if (now - last > 50) { last = now; draw(now / 1000); }
            requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
        const matchTxt = (() => {
          if (selected !== 'model') return null;
          const s = adv.style;
          if (!s) return null;
          const a = assessLook(look, s, 1);
          return `Ta tenue du moment : ${a.score} % assortie`;
        })();
        const pct = ov.maxed ? 100 : Math.round((ov.have / Math.max(1, ov.need)) * 100);
        const xpPct = ov.maxed ? 100 : Math.round((ov.xpHave / Math.max(1, ov.xpNeed)) * 100);
        const go = h('button.btn.wide.car-go', icon('play', 22), ` ${act.cta}`);
        go.addEventListener('click', tap(() => void play(selected), { sound: false }));
        const card = h(`div.car-card${animate && !reducedFx() ? '.car-swap' : ''}`, { style: `--c:${def.color};--c2:${def.color2}` },
          h('div.car-scene', cv, h('span.car-ribbon', act.kicker), h('span.car-place', act.place)),
          h('div.car-info',
            h('h3', act.title, h('small', act.mood)),
            h('div.car-adv', icon('sparkle', 16), h('span', adv.text), matchTxt ? h('small', matchTxt) : null),
            ov.maxed
              ? h('p.car-goal', 'Palier maximum : continue pour le plaisir et les fans ♡')
              : h('div.car-goal',
                h('b', 'Prochain objectif'), h('span', ov.tier!.goal),
                h('div.car-bar', h('i', { style: `width:${pct}%` }), h('em', `${ov.have} / ${ov.need} ${ov.label}`)),
                h('div.car-bar.xp', h('i', { style: `width:${xpPct}%` }), h('em', `Expérience ${ov.xpHave} / ${ov.xpNeed}`))),
            go));
        stage.replaceChildren(card);
      }

      // ---------------------------------------------------------- onglets
      function renderTabs() {
        const w = world();
        tabs.replaceChildren(...CAREER_IDS.map((id) => {
          const lvl = levelOf(w, id);
          const b = h(`button.car-tab${id === selected ? '.on' : ''}`, { role: 'tab', 'aria-selected': String(id === selected), style: `--c:${CAREERS[id].color};--c2:${CAREERS[id].color2}` },
            h('img', { src: careerIconUrl(id, 64), alt: '' }),
            h('b', SHORT[id]),
            h('div.car-pips', ...Array.from({ length: MAX_LEVEL }, (_, k) => h(`i${k < lvl ? '.on' : ''}`))),
            h('small', stateLabel(w, id)));
          b.addEventListener('click', tap(() => {
            if (id === selected) return;
            selected = id; tierSel = -1;
            setCurrent(world(), id); save.save();
            haptic('select');
            audio.play('pop1');
            renderAll(true);
            const tb = tabs.querySelector('.car-tab.on') as HTMLElement | null;
            if (tb && !reducedFx()) { tb.classList.add('bounce'); window.setTimeout(() => tb.classList.remove('bounce'), 500); }
          }, { sound: false }));
          return b;
        }));
      }

      // ---------------------------------------------------------- chemin des paliers
      function renderPath() {
        const w = world();
        const def = CAREERS[selected];
        const steps = tierSteps(w, selected);
        const pct = tierPercent(w, selected);
        const sel = tierSel >= 0 ? tierSel : Math.min(MAX_LEVEL - 1, levelOf(w, selected));
        const t = def.tiers[sel];
        const nodes = steps.map((s, i) => {
          const n = h(`button.car-node.${s.state}${i === sel ? '.sel' : ''}`, { 'aria-label': `Palier ${s.n} : ${s.title}` },
            s.state === 'done' ? icon('check', 18) : h('b', String(s.n)),
            s.state === 'cur' ? h('span.car-ring', h('i', { style: `--p:${pct}` })) : null);
          n.addEventListener('click', tap(() => { tierSel = i; haptic('select'); renderPath(); }, { sound: false }));
          return n;
        });
        path.replaceChildren(
          h('h3.car-h', `Les cinq paliers · ${def.name}`),
          h('div.car-track', h('div.car-line', h('i', { style: `width:${Math.min(100, (levelOf(w, selected) / (MAX_LEVEL - 1)) * 100)}%` })), ...nodes),
          h('div.car-tier-info',
            h('b', `Palier ${sel + 1} · ${t.title}`), h('span', t.goal),
            h('div.rc-row.small', ...rewardChips(t.reward))),
          h('small.car-best', `Meilleur score : ${progressOf(w, selected).best}`));
      }

      function renderLinks() {
        const w = world();
        const fans = h('button.btn.lavande.car-link', icon('heart', 18), ' Fans ', h('b', fmt(w.fans)));
        fans.addEventListener('click', tap(async () => { await openFans(); build(); }));
        const mags = h('button.btn.secondary.car-link', icon('album', 18), ' Couvertures ', h('b', `${ownedMagazinesOf(w).length}/${MAGAZINE_IDS.length}`));
        mags.addEventListener('click', tap(async () => { await openFans({ album: true }); build(); }));
        links.replaceChildren(fans, mags);
      }

      function renderAll(animate: boolean) { renderTop(); renderStage(animate); renderTabs(); renderPath(); renderLinks(); }
      renderAll(false);
      // le conseil d'accueil ne doit jamais masquer « Ton salaire est prêt » : il attend la prochaine visite (non consommé)
      if (!salaryInfo(world(), Date.now()).ready && firstTime('tip.career.intro')) ui.toast({ title: 'Quatre carrières', sub: 'Chaque séance est un petit jeu : plus tu progresses, plus c\'est difficile… et plus tu as de fans.', icon: 'sparkle', ms: 3200 });
      reactAuguste('career', 0.25);
    }

    // ------------------------------------------------------------ une séance
    async function play(id: CareerId) {
      setCurrent(world(), id); save.save();
      const done = await runSession(id);
      if (!alive) return;
      if (!done) { build(); return; }
      await showResult(done, {
        again: () => void play(id),
        back: () => build(),
        isAlive: () => alive,
      });
    }

    build();
  });
}

export { ACTIVITY };
