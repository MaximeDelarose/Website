/** Interface du mini-jeu « Modèle photo » : choix de pose + décor, puis défi de timing. */
import { h, tap } from '../../../dom';
import { audio, reducedFx } from '../../../../core/app';
import { icon } from '../../../icons';
import { drawPhotoDecor } from '../../../../game/art/world/careers';
import { PHOTO_DECORS, POSES } from '../../../../data/world/careers';
import { STYLE_NAMES } from '../../../../data/world/wardrobe';
import { choiceScore, decorById, photoParams, photoScore, photoTags, pickTargets, poseById, shotScore, sweep } from '../../../../game/world/careerGames/photo';
import { mulberry32 } from '../../../../game/world/careerGames/rng';
import { avatarInto, bigButton, gameShell, sizedCanvas, stageWidth, tip, wait, type GameCtx, type GameResult } from './shared';

export function playPhoto(g: GameCtx): Promise<GameResult | null> {
  return new Promise((resolve) => {
    let finished = false;
    const end = (r: GameResult | null) => { if (finished) return; finished = true; cancelAnimationFrame(raf); resolve(r); };
    let raf = 0;
    const sh = gameShell('Séance photo', 'Choisis ta pose et ton décor.', () => end(null));
    sh.onQuit(() => cancelAnimationFrame(raf));
    tip('photo', 'Séance photo', 'Choisis une pose et un décor, puis appuie au bon moment quand le viseur est dans la zone dorée.');

    let poseId = (g.wanted && POSES.find((p) => p.style === g.wanted)?.id) || POSES[0].id;
    let decorId = PHOTO_DECORS[0].id;
    const W = stageWidth(), H = Math.min(330, Math.round(W * 0.95));
    const { cv, ctx } = sizedCanvas(W, H, 'cg-stage-cv');
    const stage = h('div.cg-stage.ph-stage', cv, h('div.ph-flash'), h('div.ph-pop'));
    const info = h('div.ph-info');
    const draw = (t = 0) => {
      const pose = poseById(poseId);
      drawPhotoDecor(ctx, decorId, W, H, t);
      avatarInto(ctx, g.look, H * 0.4, H * 0.98, { expr: pose.expr, arms: pose.arms, step: pose.step }, (W - H * 0.4) / 2, H * 0.02);
    };

    // ------------------------------------------------ phase 1 : choix
    const poseRow = h('div.ph-poses');
    const decorRow = h('div.ph-decors');
    const refresh = () => {
      draw();
      poseRow.querySelectorAll('button').forEach((b) => b.classList.toggle('on', (b as HTMLElement).dataset.id === poseId));
      decorRow.querySelectorAll('button').forEach((b) => b.classList.toggle('on', (b as HTMLElement).dataset.id === decorId));
      const c = choiceScore(poseId, decorId, g.look);
      const pose = poseById(poseId);
      const match = decorById(decorId).styles.includes(pose.style);
      info.replaceChildren(
        h('b', `Pose ${STYLE_NAMES[pose.style]}`), ' · ', match ? h('span.ok', 'décor assorti ♡') : h('span.meh', 'décor moins adapté'),
        h('small', ` Ta tenue apporte +${c.outfit} (plus elle colle à la pose, mieux c\'est)`));
    };
    for (const p of POSES) {
      const t = sizedCanvas(46, 92);
      avatarInto(t.ctx, g.look, 42, 90, { expr: p.expr, arms: p.arms, step: p.step }, 2, 1);
      const b = h('button.ph-pose', { 'data-id': p.id, 'aria-label': p.name }, t.cv, h('small', p.name));
      b.addEventListener('click', tap(() => { poseId = p.id; refresh(); audio.play('pickup'); }, { sound: false }));
      poseRow.append(b);
    }
    for (const d of PHOTO_DECORS) {
      const b = h('button.chip.ph-decor', { 'data-id': d.id }, d.name);
      b.addEventListener('click', tap(() => { decorId = d.id; refresh(); audio.play('pickup'); }, { sound: false }));
      decorRow.append(b);
    }
    const go = bigButton('En scène !', () => startTiming());
    sh.body.append(stage, h('div.ph-ctl', info, poseRow, decorRow, go));
    refresh();

    // ------------------------------------------------ phase 2 : timing
    const params = photoParams(g.difficulty);
    const rng = mulberry32((Date.now() & 0xffff) + 7);
    const targets = pickTargets(rng, params.shots);
    const scores: number[] = [];
    async function startTiming() {
      sh.sub.textContent = `Cliché 1 sur ${params.shots} : appuie quand le viseur est dans la zone dorée.`;
      const zone = h('div.ph-zone');
      const needle = h('div.ph-needle');
      const gauge = h('div.ph-gauge', zone, needle);
      const shot = h('button.ph-shutter', { 'aria-label': 'Déclencher' }, icon('eye', 34), h('span', 'Clic !'));
      const dots = h('div.ph-dots', ...targets.map(() => h('i')));
      sh.body.querySelector('.ph-ctl')!.replaceWith(h('div.ph-ctl.timing', dots, gauge, shot));
      let idx = 0;
      const place = () => { zone.style.left = `${(targets[idx] - params.halfWidth) * 100}%`; zone.style.width = `${params.halfWidth * 200}%`; zone.classList.remove('pop'); void zone.offsetWidth; zone.classList.add('pop'); };
      place();
      const t0 = performance.now();
      let busy = false;
      const loop = (now: number) => {
        needle.style.left = `${sweep((now - t0) / 1000, params.speed) * 100}%`;
        if (!finished) raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
      shot.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        if (busy || finished) return;
        busy = true;
        const pos = sweep((performance.now() - t0) / 1000, params.speed);
        const sc = shotScore(pos, targets[idx], params.halfWidth);
        scores.push(sc);
        const label = sc >= 95 ? 'Parfait !' : sc >= 70 ? 'Joli !' : sc >= 30 ? 'Presque…' : 'Raté, doucement !';
        const pop = stage.querySelector('.ph-pop') as HTMLElement;
        pop.textContent = label; pop.className = `ph-pop show ${sc >= 70 ? 'good' : 'soft'}`;
        const fl = stage.querySelector('.ph-flash') as HTMLElement;
        if (!reducedFx()) { fl.classList.remove('go'); void fl.offsetWidth; fl.classList.add('go'); }
        audio.play(sc >= 95 ? 'sparkle' : sc >= 70 ? 'pop2' : 'pop1', 1 + idx * 0.1);
        dots.children[idx].classList.add(sc >= 70 ? 'good' : 'soft');
        idx++;
        void (async () => {
          await wait(900);
          pop.className = 'ph-pop';
          if (idx >= params.shots) { await finish(); return; }
          sh.sub.textContent = `Cliché ${idx + 1} sur ${params.shots}`;
          place(); busy = false;
        })();
      });
    }
    async function finish() {
      cancelAnimationFrame(raf);
      const score = photoScore(poseId, decorId, g.look, scores);
      const pose = poseById(poseId);
      end({
        score, tags: photoTags(poseId),
        lines: [`Pose ${pose.name} · ${decorById(decorId).name}`, `Clichés : ${scores.join(' / ')}`],
      });
    }
    void tap;
  });
}
