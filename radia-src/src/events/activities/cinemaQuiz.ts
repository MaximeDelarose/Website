/** Cinéma privé : film fictif, plateau de snacks, puis quiz de 5 questions sur le monde de RADIA. */
import { h } from '../../ui/dom';
import { posterUrl, snackUrl } from '../games/action/art';
import { endCard, injectCss, introCard, pick } from '../games/action/common';
import { FILMS, MAX_SNACKS, SNACKS, drawQuestions, quizScore, type Film, type Snack } from '../games/action/quiz';
import type { Activity } from '../types';

const GOOD = ['Bravo !', 'Exact ♡', 'Bien vu, ma reine !', 'Parfait !', 'Quelle culture !'];
const OOPS = ['Presque !', 'Pas tout à fait…', 'Oh, c’était piégeux !', 'Une autre fois !'];
const AUG_GOOD = ['Auguste : « Tu m’impressionnes, galbi. »', 'Auguste : « Ma reine sait tout. »', 'Auguste : « Je te donne une bouchée de pop-corn. »'];
const AUG_OOPS = ['Auguste : « Même moi j’hésitais. »', 'Auguste : « On se rattrape à la prochaine. »', 'Auguste : « Un câlin de consolation ? »'];

const activity: Activity = async (ctx) => {
  injectCss();
  const wide = (b: HTMLButtonElement): HTMLButtonElement => { b.style.width = '100%'; return b; };
  ctx.header('Cinéma privé', 'Rien que nous deux');
  const body = h('div', { style: 'flex:1;min-height:0;display:flex;flex-direction:column;overflow:auto;padding:4px' });
  ctx.root.append(body);
  await introCard(ctx, { title: 'Séance privée', text: 'Choisis ton film, prépare les snacks, puis réponds au quiz du cinéma !', art: h('div', { style: 'font-size:46px' }, '🎬🍿') });
  if (!ctx.isAlive()) return { score: 0, ok: false };

  // ---------------------------------------------- 1) film
  let film: Film = FILMS[0];
  await new Promise<void>((resolve) => {
    const grid = h('div.ea-grid', { style: 'grid-template-columns:repeat(2,1fr);gap:10px' });
    const tiles = new Map<string, HTMLElement>();
    for (const f of FILMS) {
      const t = h('button.ea-tile', { type: 'button', style: 'padding:6px' }, h('img', { src: posterUrl(f), alt: '', style: 'width:100%;max-width:108px;aspect-ratio:150/210;border-radius:8px' }), h('b', f.title));
      if (f === film) t.classList.add('on');
      t.addEventListener('click', () => { film = f; tiles.forEach((el, k) => el.classList.toggle('on', k === f.id)); ctx.sound('pop2'); ctx.pop(t); });
      tiles.set(f.id, t); grid.append(t);
    }
    body.append(h('div.ea-sub', 'Quel film ce soir ?'), grid, h('div', { style: 'height:8px' }), wide(ctx.button('On regarde celui-là ♡', () => { body.replaceChildren(); resolve(); }, 'gold')));
  });
  if (!ctx.isAlive()) return { score: 0, ok: false };

  // ---------------------------------------------- 2) snacks
  const chosen: Snack[] = [];
  await new Promise<void>((resolve) => {
    const tray = h('div', { style: 'display:flex;gap:8px;justify-content:center;background:linear-gradient(#e6c3a2,#cf9f78);border-radius:18px;padding:10px;box-shadow:0 0 0 3px #58433f,0 4px 0 rgba(88,67,63,.3);margin:4px 0 8px' });
    const go = wide(ctx.button('Au cinéma ! ♡', () => { body.replaceChildren(); resolve(); }, 'gold'));
    const refresh = (): void => {
      tray.replaceChildren();
      for (let i = 0; i < MAX_SNACKS; i++) {
        const s = chosen[i];
        const slot = h('button', { type: 'button', style: 'width:74px;height:74px;border-radius:14px;border:0;background:rgba(255,255,255,.45);box-shadow:inset 0 0 0 2px rgba(88,67,63,.3);display:flex;align-items:center;justify-content:center;padding:0' }, s ? h('img', { src: snackUrl(s.id), alt: s.name, style: 'width:68px;height:68px' }) : h('span', { style: 'color:rgba(88,67,63,.4);font-size:26px' }, '+'));
        if (s) { slot.addEventListener('click', () => { chosen.splice(i, 1); ctx.sound('drop'); refresh(); }); }
        tray.append(slot);
      }
      go.disabled = chosen.length < MAX_SNACKS; go.style.opacity = go.disabled ? '0.5' : '1';
      hint.textContent = chosen.length < MAX_SNACKS ? `Choisis ${MAX_SNACKS - chosen.length} gourmandise${MAX_SNACKS - chosen.length > 1 ? 's' : ''} pour le plateau` : 'Plateau prêt, quelle gourmande !';
    };
    const hint = h('div.ea-sub', '');
    const grid = h('div.ea-grid', { style: 'grid-template-columns:repeat(4,1fr);gap:6px' });
    for (const s of SNACKS) {
      const t = h('button.ea-tile', { type: 'button', style: 'padding:4px 2px' }, h('img', { src: snackUrl(s.id), alt: '', style: 'width:100%;max-width:58px' }), h('small', { style: 'font-size:11px' }, s.name));
      t.addEventListener('click', () => {
        if (chosen.includes(s)) { chosen.splice(chosen.indexOf(s), 1); ctx.sound('drop'); }
        else if (chosen.length < MAX_SNACKS) { chosen.push(s); ctx.sound('pickup'); ctx.pop(t); }
        else { ctx.sound('invalid'); return; }
        t.classList.toggle('on', chosen.includes(s));
        refresh();
      });
      grid.append(t);
    }
    body.append(h('div.ea-sub', { style: 'margin:0' }, 'Prépare le plateau de snacks'), tray, hint, grid, h('div', { style: 'height:8px;flex:1' }), go);
    refresh();
  });
  if (!ctx.isAlive()) return { score: 0, ok: false };

  // ---------------------------------------------- 3) quiz
  const qs = drawQuestions(ctx.rng, 5);
  let correct = 0;
  const banner = h('div', { style: 'display:flex;align-items:center;gap:10px;background:linear-gradient(#8e2a47,#5c1b34);border-radius:16px;padding:8px 12px;color:#fff;box-shadow:0 0 0 2.5px #58433f;flex-shrink:0;margin-bottom:8px' },
    h('img', { src: posterUrl(film), alt: '', style: 'width:42px;border-radius:5px' }),
    h('div', { style: 'flex:1;min-width:0' }, h('b', { style: 'display:block;font-size:16px' }, film.title), h('small', { style: 'opacity:.85' }, 'Quiz du cinéma · pendant la bande-annonce')),
    h('div', { style: 'display:flex' }, ...chosen.map((s) => h('img', { src: snackUrl(s.id), alt: '', style: 'width:30px;height:30px;margin-left:-6px' }))));
  const dots = h('div.ev-dots', ...qs.map(() => h('i')));
  body.append(banner, dots);
  const qBox = h('div', { style: 'flex:1;display:flex;flex-direction:column;gap:8px;min-height:0' });
  body.append(qBox);
  for (let i = 0; i < qs.length; i++) {
    if (!ctx.isAlive()) return { score: 0, ok: false };
    const q = qs[i];
    Array.from(dots.children).forEach((d, k) => d.className = k < i ? 'on' : k === i ? 'cur' : '');
    await new Promise<void>((resolve) => {
      const card = h('div', { style: 'background:#fffaf5;border-radius:18px;padding:12px 14px;font-size:18px;line-height:1.3;color:var(--choco);box-shadow:0 0 0 2.5px #f5a0bb;animation:evPop .35s var(--ease-pop)' }, h('small', { style: 'display:block;color:var(--rose-deep);font-weight:700;font-size:12px' }, `Question ${i + 1} / ${qs.length}`), q.q);
      const answers = h('div', { style: 'display:grid;gap:8px' });
      const fb = h('div', { style: 'min-height:56px;font-size:15px;text-align:center;color:var(--choco)' });
      let done = false;
      const btns = q.choices.map((c, k) => {
        const b = h('button.ea-opt', { type: 'button', style: 'width:100%;justify-content:center;min-height:50px;font-size:16px' }, c) as HTMLButtonElement;
        b.addEventListener('click', () => {
          if (done) return; done = true;
          const ok = k === q.a;
          if (ok) correct++;
          b.style.background = ok ? '#8fd19e' : '#ffb3b3'; b.style.color = '#2c4a33';
          btns[q.a].style.background = '#8fd19e'; btns[q.a].style.color = '#2c4a33';
          ctx.sound(ok ? 'pop3' : 'pop1'); ctx.pop(b); if (ok) ctx.confetti(10);
          fb.replaceChildren(h('b', { style: `color:${ok ? '#2f8a4a' : 'var(--rose-deep)'}` }, pick(ok ? GOOD : OOPS, ctx.rng)), h('div', q.fun), h('small', { style: 'color:var(--choco-soft)' }, pick(ok ? AUG_GOOD : AUG_OOPS, ctx.rng)));
          const next = wide(ctx.button(i === qs.length - 1 ? 'Voir mon résultat ♡' : 'Question suivante', () => { qBox.replaceChildren(); resolve(); }, 'gold'));
          qBox.append(next);
        });
        answers.append(b); return b;
      });
      qBox.append(card, answers, fb);
    });
  }
  Array.from(dots.children).forEach((d) => d.className = 'on');
  const score = quizScore(correct, qs.length);
  await endCard(ctx, {
    title: correct === qs.length ? 'Sans faute, quelle star !' : correct >= 3 ? 'Joli score, cinéphile !' : 'Un super moment de cinéma ♡',
    art: h('img', { src: posterUrl(film), alt: '', style: 'width:78px;border-radius:8px;box-shadow:0 0 0 2px #58433f' }),
    lines: [`${correct} bonne${correct > 1 ? 's' : ''} réponse${correct > 1 ? 's' : ''} sur ${qs.length}`, `« ${film.title} » avec ${chosen.map((s) => s.name.toLowerCase()).join(', ')}.`],
  });
  return { score, ok: correct >= 2, data: { film: film.id, snacks: chosen.map((s) => s.id), correct } };
};
export default activity;
