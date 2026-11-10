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
let f = mk(['gardien'], ['limace'], 1);
ok(!T.los(f, 3, 4, 9, 4), 'LOS blocked by wall'); ok(T.los(f, 3, 2, 9, 2), 'LOS clear');
// placement + start
const h0 = f.units.find(u => u.id === 'h0'); ok(T.cmd(f, 'h0', { t: 'place', x: 1, y: 3 }).ok, 'place'); ok(h0.x === 1 && h0.y === 3, 'placed');
ok(T.cmd(f, 'h0', { t: 'place', x: 8, y: 3 }).err, 'place outside zone refused');
T.cmd(f, 'h0', { t: 'ready' }); ok(f.phase === 'fight', 'fight started'); ok(f.order.length === 2, 'order 2');
// stat check
const cur = T.current(f); console.log('first to play', cur.name, 'PA', cur.pa, 'PM', cur.pm);
// zone & push test on custom situation
f = mk(['mystique', 'gardien'], ['limace', 'limace'], 5);
f.units.forEach(u => { if (u.kind === 'mob') u.hp = u.max = 999; });
T.cmd(f, 'h0', { t: 'ready' }); T.cmd(f, 'h1', { t: 'ready' });
const cu = T.current(f); console.log('start', cu.name);
// force turn to mystique
while (T.current(f).id !== 'h0') { const c = T.current(f); if (c.kind === 'mob') { T.cmd(f, c.id, { t: 'end' }); } else T.cmd(f, c.id, { t: 'end' }); }
const my = T.unit(f, 'h0'); my.x = 5; my.y = 2; const m0 = T.unit(f, 'm0'); m0.x = 8; m0.y = 2; m0.hp = m0.max = 999;
const before = m0.hp; my.pa = 6;
let r = T.cast(f, my, 'm_orbe', 8, 2); ok(r.ok, 'orbe cast ' + JSON.stringify(r)); ok(m0.hp < before, 'orbe damaged'); console.log('orbe dmg', before - m0.hp, 'PA left', my.pa);
r = T.cast(f, my, 'm_maree', 8, 2); ok(r.err === 'cible' || r.ok, 'maree line'); // same row, dist 3, line ok
console.log('maree', JSON.stringify(r), 'mob at', m0.x, m0.y);
// resistances: limace faible au feu (-20)
const l = T.mobUnit('limace', 5, 'tx'); ok(l.res.feu === -20, 'limace weak to fire');
// shield/heal
const gd = T.unit(f, 'h1'); gd.pa = 6; gd.x = 3; gd.y = 3; gd.hp = 10;
const sy = T.heroUnit(Object.assign(D.newProfile('sylvain', 'S', 'roux'), { lvl: 5 }), 'hs', 2); sy.x = 4; sy.y = 3; sy.pa = 6; f.units.push(sy);
f.order.push('hs'); sy.alive = true;
r = T.cast(f, sy, 's_rosee', 3, 3); ok(r.ok, 'heal cast ' + JSON.stringify(r)); ok(gd.hp > 10, 'healed'); console.log('heal ->', gd.hp);
// push into wall: mob at (5,3), wall at (6,3) pushed from caster at (3,3)... gardien bousculade
gd.pa = 6; gd.x = 3; gd.y = 3; const mb = T.unit(f, 'm1'); mb.x = 5; mb.y = 3; mb.hp = mb.max = 999;
const hp0 = mb.hp; r = T.cast(f, gd, 'g_bousculade', 5, 3); console.log('bousculade', JSON.stringify(r), 'mob at', mb.x, mb.y, 'dmg', hp0 - mb.hp);
ok(r.ok, 'bousculade ok'); ok(hp0 - mb.hp > 8, 'collision damage added');
// full AI simulation: 2 heroes vs 3 mobs
let wins = 0, losses = 0, turns = 0;
for (let n = 0; n < 40; n++) {
  const fx = mk(['gardien', 'lanceur'], ['limace', 'corbeau', 'renard'], 3);
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
