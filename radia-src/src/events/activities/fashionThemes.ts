/** Séance mode : trois thèmes de style, Radia compose chaque tenue avec SES vêtements (+ prêts temporaires). */
import { h } from '../../ui/dom';
import { save } from '../../core/app';
import { avatarCanvas } from '../../game/art/world/avatar';
import { thumbUrl } from '../../ui/screens/world/dressing';
import { CLOTHES, STYLE_NAMES } from '../../data/world/wardrobe';
import { cloneLook, ensureWardrobe, previewLook, removeItem, styleOf, wornIds } from '../../game/world/wardrobe';
import { endCard, injectCss, introCard, pick } from '../games/action/common';
import { DEFAULT_THEMES, THEME_HINTS, THEME_NAMES, loanersFor, scoreLook, verdict } from '../games/action/themes';
import type { ClothId, ClothSlot, Look, StyleId } from '../../data/world/ids';
import type { Activity } from '../types';

const SHELVES: Array<{ key: string; label: string; slots: ClothSlot[] }> = [
  { key: 'dress', label: 'Robes', slots: ['dress'] }, { key: 'top', label: 'Hauts', slots: ['top'] }, { key: 'bottom', label: 'Bas', slots: ['bottom'] },
  { key: 'jacket', label: 'Vestes', slots: ['jacket'] }, { key: 'shoes', label: 'Chaussures', slots: ['shoes'] }, { key: 'bag', label: 'Sacs', slots: ['bag'] },
  { key: 'acc', label: 'Bijoux', slots: ['acc', 'crown'] },
];
const VALID: StyleId[] = ['casual', 'chic', 'romantic', 'royal', 'stage'];
const GOOD_R = ['Radia : « Cette tenue me ressemble ! »', 'Radia : « Je me sens vraiment bien dedans. »', 'Radia : « Oh, j’adore l’ensemble ! »'];
const MID_R = ['Radia : « Pas mal, avec un accessoire ce serait parfait. »', 'Radia : « Jolie base, j’aime bien. »'];
const LOW_R = ['Radia : « Original ! J’ai envie d’essayer autre chose un jour. »', 'Radia : « Une audace ! On n’est pas obligée de tout réussir. »'];
const AUG = ['Auguste : « Ma reine, tout te va. »', 'Auguste : « Je ne suis pas objectif, mais… waouh. »', 'Auguste : « Je te suivrais partout dans cette tenue, galbi. »'];

const activity: Activity = async (ctx) => {
  injectCss();
  ensureWardrobe();
  const asked = Array.isArray(ctx.params.themes) ? (ctx.params.themes as unknown[]).filter((t): t is StyleId => VALID.includes(t as StyleId)) : [];
  const themes: StyleId[] = [...new Set(asked)].slice(0, 3);
  for (const t of DEFAULT_THEMES) if (themes.length < 3 && !themes.includes(t)) themes.push(t);
  const owned = new Set<string>(save.data.world.wardrobe.owned);
  const base: Look = cloneLook(ctx.look);
  const dpr = Math.min(2, window.devicePixelRatio || 1);

  ctx.header('Séance mode', 'Trois thèmes, trois looks');
  await introCard(ctx, { title: 'Séance mode', text: 'Compose la tenue qui correspond au thème, avec tes vêtements !', art: h('div', { style: 'font-size:46px' }, '👗✨') });
  if (!ctx.isAlive()) return { score: 0, ok: false };

  const results: Array<{ theme: StyleId; score: number; style: StyleId; look: Look; pieces: ClothId[] }> = [];
  const body = h('div', { style: 'flex:1;min-height:0;display:flex;flex-direction:column;gap:6px' });
  ctx.root.append(body);

  for (let ti = 0; ti < themes.length; ti++) {
    if (!ctx.isAlive()) return { score: 0, ok: false };
    const theme = themes[ti];
    const loans = new Set<ClothId>(loanersFor(theme, owned));
    let look: Look = cloneLook(base);
    const allIds = [...new Set<ClothId>([...(Object.keys(CLOTHES) as ClothId[]).filter((id) => owned.has(id)), ...loans])];
    const shelves = SHELVES.map((s) => ({ ...s, ids: allIds.filter((id) => (s.slots as string[]).includes(CLOTHES[id].slot)).map((id) => ({ id, k: ctx.rng() })).sort((a, b) => a.k - b.k).map((x) => x.id) })).filter((s) => s.ids.length);
    let shelf = shelves.find((s) => s.key === 'dress' && s.ids.some((i) => CLOTHES[i].styles.includes(theme))) ?? shelves[0];

    const dots = h('div.ev-dots', ...themes.map((_, k) => h('i', { class: k < ti ? 'on' : k === ti ? 'cur' : '' })));
    const hearts = h('span', { style: 'font-size:20px;letter-spacing:1px;color:#ff75a8' });
    const band = h('div', { style: 'display:flex;align-items:center;gap:8px;background:#fffaf5;border-radius:16px;padding:6px 12px;box-shadow:0 0 0 2.5px #f5a0bb;flex-shrink:0' },
      h('div', { style: 'flex:1;min-width:0' }, h('b', { style: 'display:block;color:var(--rose-deep);font-size:17px' }, `Thème : ${THEME_NAMES[theme]}`), h('small', { style: 'color:var(--choco-soft);line-height:1.2;display:block' }, THEME_HINTS[theme])), hearts);
    const stage = h('div', { style: 'flex:1;min-height:150px;position:relative;display:flex;align-items:flex-end;justify-content:center;border-radius:18px;background:linear-gradient(#fff4fa,#ecdcf7);box-shadow:0 0 0 2.5px rgba(88,67,63,.2);overflow:hidden' });
    const tabs = h('div', { style: 'display:flex;gap:6px;overflow-x:auto;flex-shrink:0;padding:2px 2px 4px;scrollbar-width:none' });
    const row = h('div', { style: 'display:flex;gap:8px;overflow-x:auto;flex-shrink:0;padding:4px 2px 6px;min-height:92px;scrollbar-width:none' });
    const loanNote = loans.size ? h('small', { style: 'color:var(--choco-soft);text-align:center;flex-shrink:0' }, 'Les pièces « Prêt » sont prêtées pour la séance.') : null;
    const done = h('button.btn.ev-btn.gold', { type: 'button', style: 'width:100%;flex-shrink:0' }, 'Valider ma tenue ♡') as HTMLButtonElement;
    body.replaceChildren(...[dots, band, stage, tabs, row, loanNote, done].filter((x): x is HTMLElement => !!x));

    const drawPreview = (): void => {
      const hh = Math.max(150, stage.clientHeight - 6);
      const w = Math.round(hh * 0.42);
      const src = avatarCanvas(look, Math.round(w * dpr), Math.round(hh * dpr), { expr: 'smile', arms: 'open' });
      const c = document.createElement('canvas'); c.width = src.width; c.height = src.height; c.style.cssText = `width:${w}px;height:${hh}px`;
      c.getContext('2d')!.drawImage(src, 0, 0);
      stage.replaceChildren(c);
      const sc = scoreLook(look, theme);
      hearts.textContent = '♥'.repeat(Math.round(sc / 20)) + '♡'.repeat(5 - Math.round(sc / 20));
    };
    const renderTabs = (): void => {
      tabs.replaceChildren(...shelves.map((s) => {
        const b = h('button.ea-opt', { type: 'button', style: 'flex-shrink:0;min-height:40px;padding:4px 12px' }, s.label) as HTMLButtonElement;
        if (s === shelf) b.classList.add('on');
        b.addEventListener('click', () => { shelf = s; ctx.sound('page'); renderTabs(); renderRow(); });
        return b;
      }));
    };
    let token = 0;
    const renderRow = (): void => {
      const my = ++token; const worn = new Set(wornIds(look));
      row.replaceChildren(); row.scrollLeft = 0;
      const ids = shelf.ids;
      let i = 0;
      const chunk = (): void => {
        if (my !== token || !ctx.isAlive()) return;
        for (let n = 0; n < 6 && i < ids.length; n++, i++) {
          const id = ids[i];
          const t = h('button.ea-tile', { type: 'button', style: 'flex-shrink:0;width:76px;padding:4px', 'aria-label': CLOTHES[id].name }, h('img', { src: thumbUrl(id), alt: '', style: 'width:62px;height:62px' }), h('small', { style: 'font-size:10.5px;line-height:1.1;height:24px;overflow:hidden' }, CLOTHES[id].name));
          if (worn.has(id)) t.classList.add('on');
          if (loans.has(id)) t.append(h('i', { style: 'position:absolute;top:2px;right:2px;font-style:normal;font-size:10px;background:#b9a5e8;color:#fff;border-radius:8px;padding:1px 6px' }, 'Prêt'));
          t.addEventListener('click', () => {
            if (wornIds(look).includes(id)) { look = removeItem(look, id); ctx.sound('drop'); }
            else { look = previewLook(look, id); ctx.sound('pickup'); }
            drawPreview(); ctx.pop(stage.firstElementChild as HTMLElement);
            const w2 = new Set(wornIds(look));
            Array.from(row.children).forEach((el, k) => el.classList.toggle('on', w2.has(ids[k])));
          });
          row.append(t);
        }
        if (i < ids.length) ctx.later(chunk, 16);
      };
      chunk();
    };
    renderTabs(); renderRow();
    await ctx.wait(30);
    drawPreview();
    if (typeof ResizeObserver !== 'undefined') { const ro = new ResizeObserver(() => { if (stage.clientHeight > 80) drawPreview(); }); ro.observe(stage); ctx.onDispose(() => ro.disconnect()); }

    await new Promise<void>((resolve) => done.addEventListener('click', () => { ctx.sound('button'); resolve(); }, { once: true }));
    if (!ctx.isAlive()) return { score: 0, ok: false };
    const score = scoreLook(look, theme);
    results.push({ theme, score, style: styleOf(look), look: cloneLook(look), pieces: wornIds(look) });
    // verdict de ce thème
    await new Promise<void>((resolve) => {
      const tier = score >= 70 ? GOOD_R : score >= 40 ? MID_R : LOW_R;
      const card = h('div.ea-card', h('div.ea-box', h('h3', verdict(score)), h('p', { style: 'font-size:34px;margin:0;color:var(--nuit)' }, `${score} / 100`),
        h('p', `Style de la tenue : ${STYLE_NAMES[styleOf(look)]}.`), h('p', pick(tier, ctx.rng)), h('p', { style: 'font-size:14px;color:var(--choco-soft)' }, pick(AUG, ctx.rng))));
      const next = ctx.button(ti === themes.length - 1 ? 'Voir mon défilé ♡' : 'Thème suivant ♡', () => { card.remove(); resolve(); }, 'gold');
      card.firstElementChild!.append(next);
      ctx.root.append(card); ctx.onDispose(() => card.remove());
      ctx.sound(score >= 70 ? 'victory' : 'reward'); if (score >= 70) ctx.confetti(24);
    });
  }

  const avg = Math.round(results.reduce((a, r) => a + r.score, 0) / results.length);
  const parade = h('div', { style: 'display:flex;gap:4px;justify-content:center;align-items:flex-end' }, ...results.map((r) => {
    const src = avatarCanvas(r.look, Math.round(52 * dpr), Math.round(130 * dpr), { expr: 'smile' });
    const c = document.createElement('canvas'); c.width = src.width; c.height = src.height; c.style.cssText = 'width:52px;height:130px;display:block;margin:0 auto';
    c.getContext('2d')!.drawImage(src, 0, 0);
    return h('div', { style: 'text-align:center;font-size:11px;color:var(--choco)' }, c, h('div', { style: 'font-weight:700' }, THEME_NAMES[r.theme]), h('div', `${r.score}`));
  }));
  await endCard(ctx, { title: avg >= 70 ? 'Un défilé de star !' : 'Un joli défilé ♡', art: parade, lines: [`Moyenne : ${avg} / 100`, 'Chaque thème a son charme, et tu as le tien.'] });
  return { score: avg, ok: true, data: { looks: results.map((r) => ({ theme: r.theme, score: r.score, style: r.style, pieces: r.pieces, look: r.look })) } };
};
export default activity;
