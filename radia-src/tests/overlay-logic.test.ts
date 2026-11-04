import { describe, expect, it } from 'vitest';
import { classify, colorAlpha, coverage, evaluate, findCssCollisions, formatReport, layoutIssues, outsideBox, overlappingPairs, globalIssues, hasPaint, isAllowed, isFullscreen, leftovers, type OvNode } from '../scripts/overlay-lib.mjs';

const VW = 393, VH = 852;
const node = (o: Partial<OvNode> = {}): OvNode => ({
  tag: 'div', id: '', cls: 'x', sel: 'div.x', z: 'auto', rect: { left: 0, top: 0, right: VW, bottom: VH },
  display: 'block', visibility: 'visible', opacity: 1, pe: 'auto', bg: 'rgba(0, 0, 0, 0)', bgImage: 'none', backdrop: 'none', onTop: true, ...o,
});

describe('colorAlpha', () => {
  it('lit les formats CSS courants', () => {
    expect(colorAlpha('rgba(0, 0, 0, 0)')).toBe(0);
    expect(colorAlpha('transparent')).toBe(0);
    expect(colorAlpha('rgb(59, 49, 82)')).toBe(1);
    expect(colorAlpha('rgba(59, 49, 82, 0.55)')).toBeCloseTo(0.55);
    expect(colorAlpha('rgb(0 0 0 / 40%)')).toBeCloseTo(0.4);
    expect(colorAlpha('#00000000')).toBe(0);
    expect(colorAlpha('#ff000080')).toBeCloseTo(0.5, 1);
    expect(colorAlpha('color(srgb 0 0 0 / 0)')).toBe(0);
  });
  it('reste prudent sur un format inconnu', () => { expect(colorAlpha('bizarre')).toBe(1); });
});

describe('couverture et plein écran', () => {
  it('le seuil est 90 % de la largeur et 50 % de la hauteur', () => {
    expect(isFullscreen({ left: 0, top: 0, right: VW * 0.9, bottom: VH * 0.5 }, VW, VH)).toBe(true);
    expect(isFullscreen({ left: 0, top: 0, right: VW * 0.89, bottom: VH }, VW, VH)).toBe(false);
    expect(isFullscreen({ left: 0, top: 0, right: VW, bottom: VH * 0.49 }, VW, VH)).toBe(false);
  });
  it('découpe aux bords de la fenêtre', () => {
    expect(coverage({ left: -50, top: -50, right: VW + 50, bottom: VH + 50 }, VW, VH)).toEqual({ w: 1, h: 1 });
    expect(isFullscreen({ left: VW, top: 0, right: VW * 2, bottom: VH }, VW, VH)).toBe(false);
  });
});

describe('hasPaint', () => {
  it('fond coloré, dégradé ou flou = peint ; sinon transparent', () => {
    expect(hasPaint(node())).toBe(false);
    expect(hasPaint(node({ bg: 'rgba(59, 49, 82, 0.55)' }))).toBe(true);
    expect(hasPaint(node({ bgImage: 'linear-gradient(red, blue)' }))).toBe(true);
    expect(hasPaint(node({ backdrop: 'blur(3px)' }))).toBe(true);
  });
});

describe('classify', () => {
  it('modale opaque oubliée au-dessus de l\'interface = blocker', () => {
    expect(classify(node({ cls: 'modal-backdrop', bg: 'rgba(59, 49, 82, 0.55)' }), VW, VH)).toBe('blocker');
  });
  it('la même modale est acceptée quand elle est attendue', () => {
    expect(classify(node({ cls: 'modal-backdrop', bg: 'rgba(59, 49, 82, 0.55)' }), VW, VH, ['.modal-backdrop'])).toBeNull();
  });
  it('calque transparent qui laisse passer le toucher = sans problème (HUD)', () => {
    expect(classify(node({ cls: 'merge-hud', pe: 'none' }), VW, VH)).toBeNull();
  });
  it('calque plein écran à toucher traversant mais au fond non transparent = dimmer (bug .fx-layer)', () => {
    expect(classify(node({ cls: 'fx-layer', pe: 'none', bg: 'rgba(30, 20, 50, 0.6)' }), VW, VH)).toBe('dimmer');
    expect(classify(node({ cls: 'fx-layer', pe: 'none', bgImage: 'radial-gradient(circle, rgba(0,0,0,.5), transparent)' }), VW, VH)).toBe('dimmer');
  });
  it('calque invisible qui capte le toucher = ghost', () => {
    expect(classify(node({ opacity: 0 }), VW, VH)).toBe('ghost');
  });
  it('ignore les éléments masqués, petits ou non visibles', () => {
    expect(classify(node({ display: 'none', bg: 'rgba(0,0,0,.5)' }), VW, VH)).toBeNull();
    expect(classify(node({ visibility: 'hidden', bg: 'rgba(0,0,0,.5)' }), VW, VH)).toBeNull();
    expect(classify(node({ rect: { left: 10, top: 10, right: 100, bottom: 100 }, bg: 'rgba(0,0,0,.5)' }), VW, VH)).toBeNull();
    expect(classify(node({ pe: 'none', opacity: 0, bg: 'rgba(0,0,0,.5)' }), VW, VH)).toBeNull();
  });
  it('un opaque plein écran qui n\'est pas au sommet n\'est pas signalé', () => {
    expect(classify(node({ bg: 'rgb(255,255,255)', onTop: false }), VW, VH)).toBeNull();
  });
});

describe('isAllowed', () => {
  it('compare par jeton de classe, id ou balise', () => {
    expect(isAllowed(node({ cls: 'screen title-screen' }), ['.title-screen'])).toBe(true);
    expect(isAllowed(node({ cls: 'screens' }), ['.screen'])).toBe(false);
    expect(isAllowed(node({ cls: 'dy-card', anc: 'dy-back x' } as Partial<OvNode>), ['.dy-back'])).toBe(true);
    expect(isAllowed(node({ id: 'ui', cls: '' }), ['#ui'])).toBe(true);
    expect(isAllowed(node({ tag: 'canvas' }), ['canvas'])).toBe(true);
    expect(isAllowed(node(), [])).toBe(false);
  });
});

describe('globalIssues et leftovers', () => {
  it('signale luminosité, filtre, défilement bloqué et classes de masquage oubliées', () => {
    expect(globalIssues({ roots: [{ name: '#app', opacity: 1, filter: 'none' }] })).toEqual([]);
    expect(globalIssues({ roots: [{ name: '#app', opacity: 0.6, filter: 'brightness(0.5)' }] }).length).toBe(2);
    expect(globalIssues({ bodyStyle: 'overflow: hidden;' })).toHaveLength(1);
    expect(globalIssues({ rootClass: 'ev-active', underCount: 1 })).toHaveLength(2);
    expect(globalIssues({ rootClass: 'ev-active', underCount: 1, eventExpected: true })).toEqual([]);
  });
  it('repère les éléments leaving/out restés', () => {
    expect(leftovers([node({ cls: 'modal-backdrop leaving', sel: 'div.modal-backdrop.leaving' }), node({ cls: 'screen', sel: 'div.screen' })])).toEqual(['div.modal-backdrop.leaving']);
  });
});

describe('evaluate / rapport', () => {
  it('assemble les problèmes et le rapport est lisible', () => {
    const f = evaluate({ vw: VW, vh: VH, allow: ['.title-screen'], nodes: [node({ cls: 'title-screen', bg: 'rgb(1,1,1)' }), node({ cls: 'fx-layer', pe: 'none', bg: 'rgba(0,0,0,.4)' }), node({ cls: 'modal-backdrop leaving', bg: 'rgba(0,0,0,.4)', sel: 'div.modal-backdrop.leaving' })] });
    expect(f.length).toBe(3);
    expect(f[0]).toContain('assombrissement résiduel');
    const rep = formatReport('titre', f);
    expect(rep.startsWith('KO  titre')).toBe(true);
    expect(formatReport('titre', [])).toBe('OK  titre');
  });
});

describe('findCssCollisions', () => {
  it('repère une classe simple déclarée dans deux feuilles (ex. .fx-layer)', () => {
    const r = findCssCollisions([
      { path: 'a.css', css: '.fx-layer { position: fixed; inset: 0; } .ok { color: red; }' },
      { path: 'b.css', css: '/* x */ .fx-layer { position: absolute; background: #000; } .ok2 { color: blue; }' },
    ]);
    expect(r.map((c) => c.cls)).toEqual(['fx-layer']);
    expect(r[0].defs).toHaveLength(2);
  });
  it('ignore les états composés, les @media et les classes uniques', () => {
    const r = findCssCollisions([
      { path: 'a.css', css: '.a { x: 1 } .a.on { y: 1 } @media (max-height: 700px) { .a { x: 2 } }' },
      { path: 'b.css', css: '.b .a { z: 1 } .a:hover { z: 2 } @keyframes k { from { opacity: 0 } to { opacity: 1 } }' },
    ]);
    expect(r).toEqual([]);
  });
  it('une même classe redéclarée dans la même feuille n\'est pas une collision', () => {
    expect(findCssCollisions([{ path: 'a.css', css: '.a { x: 1 } .a { y: 2 }' }])).toEqual([]);
  });
});

describe('chevauchements de boutons et zones tactiles', () => {
  const R = (l: number, t: number, r: number, b: number) => ({ left: l, top: t, right: r, bottom: b });
  it('détecte un bouton flottant posé sur un autre', () => {
    const p = overlappingPairs([{ name: 'souffle', rect: R(0, 0, 60, 60) }, { name: 'boutique', rect: R(50, 5, 110, 65) }]);
    expect(p).toEqual([['souffle', 'boutique', 10, 55]]);
  });
  it('ignore les contacts de bord et les éléments côte à côte', () => {
    expect(overlappingPairs([{ name: 'a', rect: R(0, 0, 60, 60) }, { name: 'b', rect: R(60, 0, 120, 60) }, { name: 'c', rect: R(59, 0, 61, 60) }], 2)).toEqual([]);
  });
  it('signale ce qui sort de l\'écran et les zones tactiles < 44 px', () => {
    const f = layoutIssues([{ name: 'a', rect: R(0, 800, 60, 870), touch: true }, { name: 'b', rect: R(0, 0, 40, 40), touch: true }, { name: 'c', rect: R(0, 0, 30, 30), touch: true, hit: { w: 44, h: 44 } }], 393, 852);
    expect(f.some((x) => x.startsWith('hors de l\'écran : a'))).toBe(true);
    expect(f.filter((x) => x.includes(' b ')).length).toBe(2);
    expect(f.some((x) => x.includes(' c '))).toBe(false);
  });
});

describe('outsideBox', () => {
  it('repère le texte qui dépasse à droite de la feuille', () => {
    const r = (l: number, rr: number) => ({ left: l, top: 0, right: rr, bottom: 10 });
    expect(outsideBox([{ name: 'ok', rect: r(10, 380) }, { name: 'coupé', rect: r(10, 420) }], { left: 0, right: 393 })).toHaveLength(1);
    expect(outsideBox([{ name: 'ok', rect: r(0, 393) }], { left: 0, right: 393 })).toEqual([]);
  });
});
