/** Interface du mini-jeu « Mannequin » : tenue imposée, composition avec les vêtements possédés, défilé. */
import { h, tap } from '../../../dom';
import { haptic } from '../../../../core/haptics';
import { sparkleBurst } from '../../../fx/sparkle';
import { audio } from '../../../../core/app';
import { icon } from '../../../icons';
import { CLOTHES, STYLE_NAMES } from '../../../../data/world/wardrobe';
import { THEME_HINTS } from '../../../../data/world/careers';
import type { ClothId, ClothSlot, Look, StyleId } from '../../../../data/world/ids';
import { drawRunway } from '../../../../game/art/world/careers';
import { assessLook, modelTags, offerThemes } from '../../../../game/world/careerGames/model';
import { mulberry32 } from '../../../../game/world/careerGames/rng';
import { avatarInto, bigButton, gameShell, sizedCanvas, stageWidth, stars, tip, wait, type GameCtx, type GameResult } from './shared';

const SLOTS: { slot: ClothSlot; label: string }[] = [
  { slot: 'dress', label: 'Robe' }, { slot: 'top', label: 'Haut' }, { slot: 'bottom', label: 'Bas' }, { slot: 'jacket', label: 'Veste' },
  { slot: 'shoes', label: 'Chaussures' }, { slot: 'bag', label: 'Sac' }, { slot: 'acc', label: 'Bijoux' }, { slot: 'crown', label: 'Couronne' },
];
const THEME_COLOR: Record<StyleId, string> = { casual: '#A9D4F5', chic: '#D9CDF5', romantic: '#F5B5C8', royal: '#F3C86B', stage: '#FFC0A3' };

export function playModel(g: GameCtx): Promise<GameResult | null> {
  return new Promise((resolve) => {
    let finished = false;
    let raf = 0;
    const end = (r: GameResult | null) => { if (finished) return; finished = true; cancelAnimationFrame(raf); resolve(r); };
    const sh = gameShell('Défilé', 'Choisis ton contrat de défilé.', () => end(null));
    sh.onQuit(() => cancelAnimationFrame(raf));
    tip('model', 'Défilé', 'Compose une tenue qui correspond au thème avec les vêtements que tu possèdes. Plus elle est assortie, mieux c\'est !');

    const rng = mulberry32((Date.now() & 0xffff) + 3);
    const themes = offerThemes(g.difficulty, rng, g.wanted && g.wanted in THEME_COLOR ? (g.wanted as StyleId) : null);
    const owned = g.owned as ClothId[];

    // ------------------------------------------------ contrat
    const cards = themes.map((t) => {
      const b = h('button.md-theme', { style: `--c:${THEME_COLOR[t]}` }, h('b', STYLE_NAMES[t]), h('small', THEME_HINTS[t]));
      b.addEventListener('click', tap(() => dress(t)));
      return b;
    });
    sh.body.append(h('div.md-contracts', ...cards), h('small.cg-note', 'Tu peux gérer tes vêtements dans le dressing.'));

    // ------------------------------------------------ composition
    function dress(theme: StyleId) {
      sh.sub.textContent = `Thème : ${STYLE_NAMES[theme]} — ${THEME_HINTS[theme]}`;
      const look: Look = { ...g.look, acc: [...g.look.acc] };
      for (const k of ['top', 'bottom', 'dress', 'jacket', 'shoes', 'bag', 'crown'] as const) if (look[k] && !owned.includes(look[k]!)) look[k] = null;
      look.acc = look.acc.filter((a) => owned.includes(a));
      let slot: ClothSlot = look.dress ? 'dress' : 'top';
      const W = stageWidth(), H = 300;
      const { cv, ctx } = sizedCanvas(W, H, 'cg-stage-cv');
      const meter = h('div.md-meter', h('div.md-bar', h('i')), h('div.md-meter-txt'));
      const tabs = h('div.md-tabs');
      const list = h('div.md-items');
      const redraw = () => {
        ctx.clearRect(0, 0, W, H);
        const gr = ctx.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#FFE4EE'); gr.addColorStop(1, THEME_COLOR[theme]);
        ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.beginPath(); ctx.ellipse(W / 2, H - 14, 70, 12, 0, 0, Math.PI * 2); ctx.fill();
        avatarInto(ctx, look, H * 0.42, H - 4, { expr: 'smile' }, (W - H * 0.42) / 2, 2);
        const a = assessLook(look, theme, g.difficulty);
        (meter.querySelector('.md-bar i') as HTMLElement).style.width = `${a.score}%`;
        (meter.querySelector('.md-bar i') as HTMLElement).className = a.score >= 70 ? 'good' : a.score >= 40 ? 'mid' : '';
        meter.querySelector('.md-meter-txt')!.textContent = `Harmonie avec le thème : ${a.score} %`;
        return a;
      };
      const fillItems = () => {
        list.replaceChildren();
        const items = owned.filter((id) => CLOTHES[id]?.slot === slot);
        const isOn = (id: ClothId) => (slot === 'acc' ? look.acc.includes(id) : look[slot as 'top'] === id);
        const none = h('button.md-item.none', { class: (slot === 'acc' ? look.acc.length === 0 : !look[slot as 'top']) ? 'on' : '' }, 'Aucun');
        none.addEventListener('click', tap(() => { if (slot === 'acc') look.acc = []; else (look as unknown as Record<string, unknown>)[slot] = null; fillItems(); redraw(); }, { sound: false }));
        list.append(none);
        for (const id of items) {
          const def = CLOTHES[id];
          const match = def.styles.includes(theme);
          const b = h(`button.md-item${isOn(id) ? '.on' : ''}${match ? '.match' : ''}`, h('b', def.name), h('small', def.styles.map((s) => STYLE_NAMES[s]).join(' · ')), match ? h('i.md-ok', icon('check', 14)) : null);
          b.addEventListener('click', tap(() => {
            if (slot === 'acc') look.acc = isOn(id) ? look.acc.filter((x) => x !== id) : [...look.acc, id].slice(-3);
            else (look as unknown as Record<string, unknown>)[slot] = isOn(id) ? null : id;
            audio.play('pickup'); fillItems(); redraw();
          }, { sound: false }));
          list.append(b);
        }
        if (!items.length) list.append(h('small.cg-note', 'Aucun vêtement de ce type pour le moment : va voir le dressing !'));
      };
      for (const s of SLOTS) {
        const b = h(`button.md-tab${s.slot === slot ? '.on' : ''}`, s.label);
        b.addEventListener('click', tap(() => { slot = s.slot; tabs.querySelectorAll('button').forEach((x) => x.classList.remove('on')); b.classList.add('on'); fillItems(); }, { sound: false }));
        tabs.append(b);
      }
      const go = bigButton('Défiler !', () => void runway(theme, look));
      sh.body.replaceChildren(h('div.cg-stage', cv), meter, tabs, list, go);
      fillItems(); redraw();
    }

    // ------------------------------------------------ défilé
    async function runway(theme: StyleId, look: Look) {
      const a = assessLook(look, theme, g.difficulty);
      sh.sub.textContent = 'Le défilé commence…';
      const W = stageWidth(), H = Math.min(470, Math.round((ui_h() - 190)));
      const { cv, ctx } = sizedCanvas(W, H, 'cg-stage-cv');
      sh.body.replaceChildren(h('div.cg-stage.md-runway', cv));
      audio.play('whoosh');
      const t0 = performance.now();
      const DUR = 4200;
      let last = 0;
      await new Promise<void>((done) => {
        const frame = (now: number) => {
          if (finished) { done(); return; }
          const t = now - t0;
          if (now - last > 50) {
            last = now;
            const k = Math.min(1, t / DUR);
            drawRunway(ctx, W, H, t / 1000);
            const sc = 0.42 + 0.56 * k;
            const ah = H * 0.95 * sc, aw = ah * 0.4;
            const y = H * 0.18 + (H * 0.97 - ah - H * 0.18) * Math.pow(k, 0.8);
            const sway = Math.sin(t / 220) * 5 * sc;
            avatarInto(ctx, look, aw, ah, { expr: k > 0.8 ? 'love' : 'smile', step: Math.sin(t / 260) > 0 ? 1 : -1, arms: k > 0.9 ? 'heart' : 'down' }, W / 2 - aw / 2 + sway, y);
          }
          if (t >= DUR) { done(); return; }
          raf = requestAnimationFrame(frame);
        };
        raf = requestAnimationFrame(frame);
      });
      if (finished) return;
      audio.play(a.stars >= 2 ? 'victory' : 'reward');
      haptic('reward');
      if (a.stars >= 2) sparkleBurst(innerWidth / 2, innerHeight * 0.4, { rarity: 'epic' });
      const verdict = a.score >= 90 ? 'Le jury est conquis !' : a.score >= 70 ? 'Très beau passage !' : a.score >= 40 ? 'Joli, avec quelques ajustements.' : 'Une autre tenue ira mieux au thème, retente ♡';
      sh.body.append(h('div.md-verdict', stars(a.stars), h('b', verdict), h('small', `Thème ${STYLE_NAMES[theme]} · harmonie ${a.score} %`), bigButton('Continuer', () => end({
        score: a.score, tags: a.score >= 60 ? modelTags(theme) : [],
        lines: [`Thème ${STYLE_NAMES[theme]}`, `Harmonie ${a.score} %`, a.pieces.filter((p) => p.match).length + ' pièce(s) assortie(s) sur ' + a.pieces.length],
      }))));
      await wait(0);
    }
  });
}
const ui_h = (): number => document.getElementById('ui')?.clientHeight || 852;
