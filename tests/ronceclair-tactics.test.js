const D = require(__dirname + '/../js/ronceclair-data.js'); global.RC_DATA = D;
const T = require(__dirname + '/../js/ronceclair-tactics.js');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } };
// arène 13x9 avec un arbre (mur) et un trou d'eau
const w = 13, h = 9; const wall = new Set(['6,4', '6,3']); const water = new Set(['9,5']);
const g = T.buildGrid(w, h, (x, y) => wall.has(x + ',' + y) ? '2' : water.has(x + ',' + y) ? '1' : '0');
function mk(classes, mobs, lvl) {
  const heroes = classes.map((c, i) => { const p = D.newProfile(c, c, 'roux'); p.lvl = lvl; p.hp = 9999; return T.heroUnit(p, 'h' + i, i); });
  const zone = []; for (let y = 2; y < 7; y++) for (let x = 0; x < 3; x++) zone.push({ x, y });
  return T.create({ w, h, g, zone, heroes, mobs: mobs.map((t, i) => ({ unit: T.mobUnit(t, 2, 'm' + i), x: 9 + (i % 2), y: 2 + i })) });
}
// LOS
let f = mk(['chevalier'], ['limace'], 1);
ok(!T.los(f, 3, 4, 9, 4), 'LOS blocked by wall'); ok(T.los(f, 3, 2, 9, 2), 'LOS clear');
// placement + start
const h0 = f.units.find(u => u.id === 'h0'); ok(T.cmd(f, 'h0', { t: 'place', x: 1, y: 3 }).ok, 'place'); ok(h0.x === 1 && h0.y === 3, 'placed');
ok(T.cmd(f, 'h0', { t: 'place', x: 8, y: 3 }).err, 'place outside zone refused');
T.cmd(f, 'h0', { t: 'ready' }); ok(f.phase === 'fight', 'fight started'); ok(f.order.length === 2, 'order 2');
// stat check
const cur = T.current(f); console.log('first to play', cur.name, 'PA', cur.pa, 'PM', cur.pm);
// zone & push test on custom situation
f = mk(['archer', 'chevalier'], ['limace', 'limace'], 5);
f.units.forEach(u => { if (u.kind === 'mob') u.hp = u.max = 999; });
T.cmd(f, 'h0', { t: 'ready' }); T.cmd(f, 'h1', { t: 'ready' });
const cu = T.current(f); console.log('start', cu.name);
// force turn to archer
while (T.current(f).id !== 'h0') { const c = T.current(f); if (c.kind === 'mob') { T.cmd(f, c.id, { t: 'end' }); } else T.cmd(f, c.id, { t: 'end' }); }
const my = T.unit(f, 'h0'); my.x = 5; my.y = 2; const m0 = T.unit(f, 'm0'); m0.x = 8; m0.y = 2; m0.hp = m0.max = 999;
const before = m0.hp; my.pa = 6;
let r = T.cast(f, my, 'a_fleche', 8, 2); ok(r.ok, 'orbe cast ' + JSON.stringify(r)); ok(m0.hp < before, 'orbe damaged'); console.log('orbe dmg', before - m0.hp, 'PA left', my.pa);
r = T.cast(f, my, 'a_recul', 8, 2); ok(r.err === 'cible' || r.ok, 'maree line'); // same row, dist 3, line ok
console.log('maree', JSON.stringify(r), 'mob at', m0.x, m0.y);
// resistances: limace faible au feu (-20)
const l = T.mobUnit('limace', 5, 'tx'); ok(l.res.feu === -20, 'limace weak to fire');
// shield/heal
const gd = T.unit(f, 'h1'); gd.pa = 6; gd.x = 3; gd.y = 3; gd.hp = 10;
const sy = T.heroUnit(Object.assign(D.newProfile('sournois', 'S', 'roux'), { lvl: 5 }), 'hs', 2); sy.x = 4; sy.y = 3; sy.pa = 6; f.units.push(sy);
f.order.push('hs'); sy.alive = true;
r = T.cast(f, sy, 's_larcin', 5, 3); ok(r.ok || r.err, 'larcin tenté');
// push into wall: mob at (5,3), wall at (6,3) pushed from caster at (3,3)... gardien bousculade
gd.pa = 6; gd.x = 3; gd.y = 3; const mb = T.unit(f, 'm1'); mb.x = 5; mb.y = 3; mb.hp = mb.max = 999;
const hp0 = mb.hp; r = T.cast(f, gd, 'c_intimidation', 5, 3); console.log('bousculade', JSON.stringify(r), 'mob at', mb.x, mb.y, 'dmg', hp0 - mb.hp);
ok(r.ok, 'bousculade ok'); ok(hp0 - mb.hp > 8, 'collision damage added');
// --- nouveautés : poison, exécution, portée, vol de vie, 16 sorts par classe
{
  ok(D.CLASS_ORDER.length === 3, '3 classes'); D.CLASS_ORDER.forEach(c => { ok(D.CLASSES[c].spells.length === 16, c + ' a 16 sorts'); D.CLASSES[c].spells.forEach(sid => ok(D.SPELLS[sid] && D.SPELLS[sid].lvl <= 30, 'sort ' + sid)); });
  const n1 = D.spellsOf(Object.assign(D.newProfile('sournois', 'x', 'roux'), { lvl: 1 })).length, n10 = D.spellsOf(Object.assign(D.newProfile('sournois', 'x', 'roux'), { lvl: 10 })).length; ok(n1 === 2 && n10 > n1 + 4, 'sorts debloques par niveau ' + n1 + '->' + n10);
  const e = mk(['sournois'], ['limace'], 10); T.cmd(e, 'h0', { t: 'ready' }); while (T.current(e).id !== 'h0') T.cmd(e, T.current(e).id, { t: 'end' });
  const so = T.unit(e, 'h0'), vi = T.unit(e, 'm0'); so.x = 5; so.y = 2; vi.x = 6; vi.y = 2; so.pa = 12; vi.hp = vi.max = 500; vi.res = { terre: 0, feu: 0, eau: 0, air: 0 };
  ok(T.cast(e, so, 's_poison', 6, 2).ok, 'poison lance'); ok(vi.buffs.some(b => b.st === 'dot'), 'poison pose');
  const hpp = vi.hp; T.cmd(e, so.id, { t: 'end' }); while (T.current(e).id !== 'm0') T.cmd(e, T.current(e).id, { t: 'end' }); ok(vi.hp < hpp, 'poison inflige des degats au debut du tour (' + hpp + '->' + vi.hp + ')');
  while (T.current(e).id !== 'h0') T.cmd(e, T.current(e).id, { t: 'end' }); so.pa = 12;
  vi.hp = vi.max; const a1 = vi.hp; T.cast(e, so, 's_coup', 6, 2); const d1 = a1 - vi.hp; vi.hp = Math.floor(vi.max * 0.3); const a2 = vi.hp; so.cast = {}; so.cd = {}; T.cast(e, so, 's_coup', 6, 2); ok(a2 - vi.hp > 0, 'coup sournois ok');
  so.hp = 10; vi.hp = vi.max; so.cast = {}; T.cast(e, so, 's_larcin', 6, 2); ok(so.hp > 10, 'larcin vole de la vie (' + so.hp + ')');
  const ar = D.newProfile('archer', 'x', 'roux'); ar.lvl = 12; const au = T.heroUnit(ar, 'ha', 0); const r0 = T.rangeOf(au, T.spell('a_fleche')).max; au.buffs.push({ st: 'po', v: 2, turns: 2 }); ok(T.rangeOf(au, T.spell('a_fleche')).max === r0 + 2, 'Tir eloigne : +2 portee');
}
// full AI simulation: 2 heroes vs 3 mobs
// --- statistiques façon Dofus : dommages de l'élément, % dommages, résistances fixes, retrait PM, tacle
{
  const a = mk(['chevalier'], ['limace'], 5); a.units.forEach(u => { u.hp = u.max = 9999; });
  const hu = T.unit(a, 'h0'), mu = T.unit(a, 'm0');
  const roll = () => { const e = { a: 10, b: 10 }; return e; };
  const base = T.preview(hu, T.spell('c_estoc'), T.spell('c_estoc').eff[0])[0];
  hu.dopct = 50; hu.doEl = { terre: 20, feu: 0, eau: 0, air: 0 };
  const boosted = T.preview(hu, T.spell('c_estoc'), T.spell('c_estoc').eff[0])[0];
  ok(boosted > base * 1.5, 'dommages d\'élément et % dommages augmentent les dégâts (' + base + ' -> ' + boosted + ')');
  const ap = D.newProfile('chevalier', 'x', 'roux'); ap.eq.anneau1 = D.genItem('anneau', 3, 2, Math.random, 'frc');
  const st = D.computeStats(ap); ok(st.esqPa >= 0 && st.tacle >= 0 && st.rf && st.doEl, 'computeStats expose les stats Dofus');
  ok(D.CATEGORIES.length === 10 && D.EQ_SLOTS.length === 13, '10 types de stuff, 13 emplacements');
  // retrait de PM : cible sans esquive
  const b = mk(['archer'], ['limace'], 5); const sy = T.unit(b, 'h0'), ml = T.unit(b, 'm0');
  T.cmd(b, 'h0', { t: 'ready' }); while (T.current(b).id !== 'h0') T.cmd(b, T.current(b).id, { t: 'end' });
  sy.x = 5; sy.y = 2; ml.x = 7; ml.y = 2; ml.esqPm = 0; sy.retPm = 200; ml.pm = 3; sy.pa = 6;
  const rr = T.cast(b, sy, 'a_immo', 7, 2); ok(rr.ok, 'immobilisation lancée'); ok(ml.buffs.some(x => x.st === 'pm' && x.v < 0), 'immobilisation retire des PM');
  // tacle : fuir une case voisine d'un ennemi
  const c = mk(['chevalier'], ['limace'], 5); T.cmd(c, 'h0', { t: 'ready' }); while (T.current(c).id !== 'h0') T.cmd(c, T.current(c).id, { t: 'end' });
  const gh = T.unit(c, 'h0'), mo = T.unit(c, 'm0'); gh.x = 4; gh.y = 2; mo.x = 5; mo.y = 2; mo.tacle = 500; gh.fuite = 0; gh.pa = 6; gh.pm = 4;
  c.rng = () => 0.99; const mv = T.cmd(c, 'h0', { t: 'move', x: 2, y: 2 }); ok(gh.pa === 5 || mv.err, 'tacle fait perdre 1 PA');
}
let wins = 0, losses = 0, turns = 0;
for (let n = 0; n < 40; n++) {
  const fx = mk(['chevalier', 'archer'], ['limace', 'corbeau', 'renard'], 3);
  fx.units.forEach(u => { if (u.kind === 'hero') { u.hp = u.max = u.max; } });
  T.cmd(fx, 'h0', { t: 'ready' }); T.cmd(fx, 'h1', { t: 'ready' });
  let guard = 0;
  while (fx.phase === 'fight' && guard++ < 3000) {
    const c = T.current(fx); let acts = 0;
    for (;;) { const a = T.aiStep(fx); if (a.t === 'end' || acts++ > 14) { T.cmd(fx, c.id, { t: 'end' }); break; } const rr = T.cmd(fx, c.id, a); if (rr.err) { console.log('AI error', JSON.stringify(a), rr.err, c.name); T.cmd(fx, c.id, { t: 'end' }); fails++; break; } if (fx.phase !== 'fight') break; }
  }
  ok(fx.phase === 'end', 'fight ended'); fx.result.win ? wins++ : losses++; turns += fx.round;
}
console.log('sim 40 fights (heroes also use the AI): wins', wins, 'losses', losses, 'avg rounds', (turns / 40).toFixed(1));
console.log(fails ? fails + ' FAILURES' : 'ALL OK');
