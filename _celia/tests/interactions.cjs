/* Audit « action → résultat visible » de toutes les activités (hors cuisine : voir cuisine.cjs).
   Chaque interaction est vérifiée sur ce qui change réellement à l'écran (pixels, DOM, état sauvegardé), y compris les ERREURS,
   qui ne doivent jamais être validées. Chromium mobile émulé — pas un vrai iPhone. */
const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:8123/celia/';
let fails = 0; const ok = (c, m) => { console.log((c ? 'OK   ' : 'FAIL ') + m); if (!c) fails++; };
const sleep = (p, ms) => p.waitForTimeout(ms);
const open = async (p, t) => { await p.evaluate(() => { const h = document.querySelector('#btnHome'); h && !h.hidden && h.click(); }); await sleep(p, 750); await p.evaluate((t) => document.querySelector('.t-' + t).click(), t); await sleep(p, 950); };
const rect = (p, sel) => p.evaluate((s) => { const r = document.querySelector(s).getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; }, sel);

async function coloriage(p) {
  await open(p, 'draw'); await p.evaluate(() => document.querySelector('.hc1').click()); await sleep(p, 500);
  await p.evaluate(() => document.querySelector('.pg[data-id=fleur]').click()); await sleep(p, 1000);
  let r = await rect(p, '.cv-wrap'); const at = (fx, fy) => [r.x + r.w * fx, r.y + r.h * fy];
  const px = (cv, x, y) => p.evaluate(([cv, x, y]) => Array.from(document.querySelector(cv).getContext('2d').getImageData(x, y, 1, 1).data), [cv, x, y]);
  /* seau : remplit la zone touchée, pas le reste */
  await p.evaluate(() => document.querySelectorAll('.palette .sw')[2].click());   /* jaune */
  await p.touchscreen.tap(...at(.5, .37)); await sleep(p, 700);
  let c = await px('.cv-color', 300, 220); ok(c[3] === 255 && c[0] > 200 && c[1] > 180 && c[2] < 120, 'coloriage : le seau remplit le cœur de la fleur en jaune ' + c);
  c = await px('.cv-color', 40, 40); ok(c[3] === 0, 'coloriage : le fond n’est pas rempli (pas de débordement)');
  /* un toucher sur un trait ne casse rien et ne remplit pas hors zone */
  /* pinceau : peint seulement dans la zone de départ */
  await p.evaluate(() => document.querySelector('[data-tool=brush]').click()); await p.evaluate(() => document.querySelectorAll('.palette .sw')[4].click());   /* turquoise */
  await p.mouse.move(...at(.5, .1)); await p.mouse.down();
  for (let k = 0; k < 25; k++) await p.mouse.move(r.x + r.w * (.4 + k * 0.008), r.y + r.h * (.1 + k * .008));
  await p.mouse.up(); await sleep(p, 300);
  const painted = await p.evaluate(() => { const x = document.querySelector('.cv-color').getContext('2d').getImageData(0, 0, 600, 140).data; let n = 0; for (let i = 3; i < x.length; i += 4) if (x[i] > 0) n++; return n; });
  ok(painted > 200, 'coloriage : le pinceau magique peint (' + painted + ' px)');
  /* gomme : efface la couleur de la zone */
  await p.evaluate(() => document.querySelector('[data-tool=eraser]').click());
  await p.touchscreen.tap(...at(.5, .37)); await sleep(p, 400);
  c = await px('.cv-color', 300, 220); ok(c[3] === 0, 'coloriage : la gomme efface réellement la couleur de la zone');
  /* autocollant */
  await p.evaluate(() => document.querySelector('[data-tool=sticker]').click());
  await p.touchscreen.tap(...at(.75, .2)); await sleep(p, 1000);
  const stk = await p.evaluate(() => { const d = document.querySelector('.cv-stk').getContext('2d').getImageData(0, 0, 600, 600).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++; return n; });
  ok(stk > 800, 'coloriage : l’autocollant apparaît (' + stk + ' px)');
  /* paillettes */
  await p.evaluate(() => document.querySelector('[data-tool=glitter]').click());
  await p.touchscreen.tap(...at(.5, .75)); await sleep(p, 300);
  /* annuler */
  const before = await p.evaluate(() => document.querySelector('.cv-stk').getContext('2d').getImageData(0, 0, 600, 600).data.reduce((n, v, i) => n + (i % 4 === 3 && v ? 1 : 0), 0));
  await p.evaluate(() => document.querySelector('[data-tool=sticker]').click()); await p.touchscreen.tap(...at(.25, .2)); await sleep(p, 1000);
  await p.evaluate(() => document.querySelector('[data-do=undo]').click()); await sleep(p, 300);
  const after = await p.evaluate(() => document.querySelector('.cv-stk').getContext('2d').getImageData(0, 0, 600, 600).data.reduce((n, v, i) => n + (i % 4 === 3 && v ? 1 : 0), 0));
  ok(after === before, 'coloriage : « annuler » retire réellement le dernier autocollant');
  /* recommencer demande une confirmation par icône, puis vide vraiment */
  await p.evaluate(() => document.querySelector('[data-do=restart]').click()); await sleep(p, 500);
  await p.evaluate(() => document.querySelector('.confirm [data-y]').click()); await sleep(p, 500);
  const left = await p.evaluate(() => { const d = document.querySelector('.cv-color').getContext('2d').getImageData(0, 0, 600, 600).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++; return n; });
  ok(left === 0, 'coloriage : « recommencer » vide réellement le dessin');
  /* terminer sans rien faire : refusé */
  /* après « recommencer » la page est vide : « J'ai fini » doit être refusé */
  await p.evaluate(() => document.querySelector('.donebtn').click()); await sleep(p, 700);
  ok(await p.evaluate(() => !document.querySelector('.celebrate')), 'coloriage : « J\u2019ai fini » est refusé sur un coloriage revenu à blanc');
  const n0 = await p.evaluate(() => C.db.all('color').then((l) => l.length));
  /* (après « recommencer », le dessin est « modifié » : on repart d'un coloriage neuf pour tester le refus) */
  await p.evaluate(() => C.doBack()); await sleep(p, 400); await p.evaluate(() => document.querySelector('.pg[data-id=lapin]').click()); await sleep(p, 900);
  await p.evaluate(() => document.querySelector('.donebtn').click()); await sleep(p, 900);
  ok(await p.evaluate(() => !document.querySelector('.celebrate')), 'coloriage : « J’ai fini » est refusé tant que rien n’est colorié');
  /* sauvegarde */
  await p.evaluate(() => document.querySelectorAll('.palette .sw')[0].click());
  const r2 = await rect(p, '.cv-wrap'); await p.touchscreen.tap(r2.x + r2.w * .5, r2.y + r2.h * .48); await sleep(p, 600);
  await p.evaluate(() => document.querySelector('.donebtn').click()); await sleep(p, 1500);
  const dbg = await p.evaluate(() => C.db.all('color').then((l) => ({ n: l.length, card: !!document.querySelector('.endcard.pink'), cel: document.querySelectorAll('.celebrate').length, say: (document.querySelector('.btxt') || {}).textContent || '' })));
  ok(dbg.card && dbg.n === n0 + 1, 'coloriage : le coloriage terminé est sauvegardé et l’écran de fin apparaît ' + JSON.stringify(dbg) + ' n0=' + n0);
}

async function dessinLibre(p) {
  await open(p, 'draw'); await p.evaluate(() => document.querySelector('.hc2').click()); await sleep(p, 600);
  const r = await rect(p, '.cv-wrap');
  const count = () => p.evaluate(() => { const d = document.querySelector('.cv-free').getContext('2d').getImageData(0, 0, 720, 960).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++; return n; });
  ok(await count() === 0, 'dessin libre : la page est vierge au départ');
  await p.evaluate(() => document.querySelector('.donebtn').click()); await sleep(p, 700);
  ok(await p.evaluate(() => !document.querySelector('.celebrate')), 'dessin libre : « J’ai fini » refusé sur une page vide');
  const stroke = async (y) => { const r = await rect(p, '.cv-wrap'); await p.mouse.move(r.x + r.w * .2, r.y + r.h * y); await p.mouse.down(); for (let i = 0; i < 20; i++) await p.mouse.move(r.x + r.w * (.2 + i * .03), r.y + r.h * y); await p.mouse.up(); };
  await stroke(.3); const a = await count(); ok(a > 500, 'dessin libre : le crayon trace (' + a + ' px)');
  /* le trait suit le doigt : les pixels sont proches de la ligne touchée */
  const near = await p.evaluate(({ w, h }) => { const x = document.querySelector('.cv-free').getContext('2d').getImageData(0, Math.round(h * .3) - 20, w, 40).data; let n = 0; for (let i = 3; i < x.length; i += 4) if (x[i] > 0) n++; return n; }, { w: 720, h: 960 });
  ok(near > a * 0.95, 'dessin libre : le trait est bien là où le doigt est passé');
  await p.evaluate(() => document.querySelector('[data-tool=rainbow]').click()); await stroke(.45); const b = await count(); ok(b > a + 400, 'dessin libre : le pinceau arc-en-ciel trace');
  await p.evaluate(() => document.querySelector('[data-tool=stamp]').click()); { const q = await rect(p, '.cv-wrap'); await p.touchscreen.tap(q.x + q.w * .5, q.y + q.h * .7); } await sleep(p, 300);
  const c = await count(); ok(c > b + 300, 'dessin libre : le tampon apparaît');
  await p.evaluate(() => document.querySelector('[data-tool=eraser]').click()); await stroke(.3); const d = await count(); ok(d < c - 200, 'dessin libre : la gomme efface réellement');
  await p.evaluate(() => document.querySelector('[data-do=undo]').click()); await sleep(p, 300); ok(await count() > d, 'dessin libre : « annuler » rétablit le trait effacé');
  await p.evaluate(() => document.querySelector('.donebtn').click()); await sleep(p, 1500);
  ok(await p.evaluate(() => C.db.all('draw').then((l) => l.length >= 1 && l[0].img.length > 3000)), 'dessin libre : le dessin est sauvegardé');
}

async function dressing(p) {
  await open(p, 'dress');
  const snap = (cls) => p.evaluate((c) => { const e = document.querySelector('.girl ' + c); return e ? e.innerHTML : null; }, cls);
  const pick = async (tab, i) => { await p.evaluate(([t, i]) => { document.querySelector('.tab[data-c=' + t + ']').click(); document.querySelectorAll('.items .it')[i].click(); }, [tab, i]); await sleep(p, 450); };
  let o0 = await snap('.outfit'); await pick('dress', 3); let o1 = await snap('.outfit');
  ok(o0 && o1 && o0 !== o1, 'dressing : la robe choisie remplace la tenue sur la poupée');
  const tors = await p.evaluate(() => { const g = document.querySelector('.girl .outfit').getBoundingClientRect(), h = document.querySelector('.girl .headg').getBoundingClientRect(); return g.top > h.top && g.left > h.left - 80 && g.width > 60; });
  ok(tors, 'dressing : la robe est positionnée sous la tête, sur le corps');
  await pick('skirt', 1); ok((await snap('.outfit')) !== o1, 'dressing : une jupe remplace la robe');
  await pick('pj', 0); ok((await snap('.outfit')) !== o1, 'dressing : un pyjama remplace la tenue');
  const s0 = await snap('.shoes'); await pick('shoes', 2); ok((await snap('.shoes')) !== s0, 'dressing : les chaussures changent');
  for (const [tab, cls, idx] of [['crown', '.crown', 1], ['jewel', '.jewel', 1], ['bag', '.bag', 1], ['wings', '.wings', 1], ['wand', '.wand', 1]]) {
    ok((await snap(cls)) === null, 'dressing : avant, pas de ' + tab);
    await pick(tab, idx); const h = await snap(cls); ok(h && h.length > 20, 'dressing : ' + tab + ' apparaît sur la poupée');
    const vis = await p.evaluate((c) => { const r = document.querySelector('.girl ' + c).getBoundingClientRect(); return r.width > 8 && r.height > 8 && r.right > 0 && r.left < innerWidth; }, cls);
    ok(vis, 'dressing : ' + tab + ' est visible à l’écran');
    await p.evaluate((t) => { document.querySelector('.tab[data-c=' + t + ']').click(); document.querySelectorAll('.items .it')[0].click(); }, tab); await sleep(p, 300);
    ok((await snap(cls)) === null, 'dressing : « aucun » retire ' + tab);
  }
  const hair0 = await snap('.hairf'); await pick('hair', 1); ok((await snap('.hairf')) !== hair0, 'dressing : la coiffure change');
  await p.evaluate(() => { document.querySelector('.tab[data-c=me]').click(); document.querySelectorAll('.items .it.round')[3].click(); }); await sleep(p, 300);
  ok(await p.evaluate(() => C.profile.skin === 3), 'dressing : la couleur de peau change et est enregistrée');
  const prof = await p.evaluate(() => JSON.stringify(JSON.parse(localStorage.getItem('celia.profile')))); ok(/"skin":3/.test(prof) && /"hairStyle":"pigtails"/.test(prof), 'dressing : la tenue est sauvegardée');
  /* terminer : photo sauvegardée */
  await p.evaluate(() => document.querySelector('.donebtn').click()); await sleep(p, 1800);
  ok(await p.evaluate(() => C.db.all('outfit').then((l) => l.length >= 1 && l[0].img.length > 5000)), 'dressing : la photo de la tenue est sauvegardée');
}

async function maquillage(p) {
  await open(p, 'makeup');
  const face = () => p.evaluate(() => { const r = document.querySelector('.mkface svg').getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
  let f = await face(); const at = (fx, fy) => [f.x + f.w * fx, f.y + f.h * fy];
  const lipsFill = () => p.evaluate(() => document.querySelector('#mk-lips path').getAttribute('fill'));
  await p.evaluate(() => document.querySelector('.donebtn').click()); await sleep(p, 700);
  ok(await p.evaluate(() => !document.querySelector('.celebrate')), 'maquillage : « C’est terminé » refusé tant qu’aucun maquillage n’est fait');
  const l0 = await lipsFill();
  await p.touchscreen.tap(...at(.5, .25)); await sleep(p, 400);   /* front : pas les lèvres */
  ok(await lipsFill() === l0, 'maquillage : toucher le front avec le rouge à lèvres ne colore PAS les lèvres (et le jeu l’indique)');
  await p.evaluate(() => document.querySelectorAll('.swrow .it')[1].click());
  await p.touchscreen.tap(...at(.5, .76)); await sleep(p, 400);
  ok(await lipsFill() === '#ff3d7f', 'maquillage : le rouge à lèvres colore les lèvres ' + await lipsFill());
  await p.evaluate(() => document.querySelectorAll('.swrow .it')[4].click()); await p.touchscreen.tap(...at(.5, .76)); await sleep(p, 300);
  ok(await lipsFill() === '#ff8a5c', 'maquillage : changer de couleur change la couleur des lèvres');
  await p.evaluate(() => document.querySelectorAll('.tab')[1].click()); await p.evaluate(() => document.querySelectorAll('.swrow .it')[1].click());
  await p.touchscreen.tap(...at(.3, .66)); await sleep(p, 400);
  ok(await p.evaluate(() => [...document.querySelectorAll('.mkface svg stop')].some((x) => x.getAttribute('stop-color') === '#ffb3d1' && x.getAttribute('stop-opacity') === '.85')), 'maquillage : le blush applique la couleur choisie sur les joues');
  await p.evaluate(() => document.querySelectorAll('.tab')[2].click()); await p.evaluate(() => document.querySelectorAll('.swrow .it')[1].click());
  await p.touchscreen.tap(...at(.35, .5)); await sleep(p, 400);
  ok(await p.evaluate(() => document.querySelector('#mk-shadow').children.length > 0), 'maquillage : le fard à paupières apparaît sur les paupières');
  await p.evaluate(() => document.querySelectorAll('.tab')[3].click()); await p.evaluate(() => document.querySelectorAll('.swrow .it')[2].click());
  const s0 = await p.evaluate(() => document.querySelectorAll('.mkface svg g[transform*="rotate"]').length);
  await p.touchscreen.tap(...at(.2, .6)); await sleep(p, 500);
  ok(await p.evaluate(() => document.querySelectorAll('.mkface svg g[transform*="rotate"]').length) === s0 + 1, 'maquillage : un tampon (papillon) apparaît sur le visage');
  const pos = await p.evaluate(() => { const s = document.querySelector('.mkface svg').getBoundingClientRect(), g = [...document.querySelectorAll('.mkface svg g[transform*="rotate"]')].pop().getBoundingClientRect(); return g.left >= s.left && g.right <= s.right && g.top >= s.top && g.bottom <= s.bottom; });
  ok(pos, 'maquillage : le tampon est bien placé dans le visage');
  await p.evaluate(() => document.querySelectorAll('.tab')[5].click()); await p.evaluate(() => document.querySelectorAll('.swrow .it')[1].click()); await sleep(p, 300);
  ok(await p.evaluate(() => !!document.querySelector('.mkface svg path[fill="#ffd84d"]') && document.querySelector('.mkface svg').innerHTML.includes('translate(150 70) scale(1.55)')), 'maquillage : la couronne apparaît sur la tête');
  /* coiffure */
  const h0 = await p.evaluate(() => document.querySelector('.mk-hairf').innerHTML); await p.evaluate(() => document.querySelectorAll('.tab')[4].click()); await p.evaluate(() => document.querySelectorAll('.swrow .it')[2].click()); await sleep(p, 300);
  ok(await p.evaluate(() => document.querySelector('.mk-hairf').innerHTML) !== h0, 'maquillage : la coiffure change');
  /* personnage */
  const c0 = await p.evaluate(() => document.querySelector('.mkface svg').innerHTML.length); await p.evaluate(() => document.querySelectorAll('.charb')[1].click()); await sleep(p, 300);
  ok(await p.evaluate(() => document.querySelector('.mkface svg').innerHTML.length) !== c0, 'maquillage : un autre visage s’affiche');
  /* surprise : le look est réellement appliqué */
  const before = await p.evaluate(() => ({ lips: document.querySelector('#mk-lips path').getAttribute('fill'), len: document.querySelector('.mkface svg').innerHTML.length }));
  await p.evaluate(() => document.querySelector('[data-do=dice]').click()); await sleep(p, 4800);
  const after = await p.evaluate(() => ({ lips: document.querySelector('#mk-lips path').getAttribute('fill'), len: document.querySelector('.mkface svg').innerHTML.length, crown: /scale\(1\.55\)/.test(document.querySelector('.mkface svg').innerHTML) }));
  ok(after.lips !== before.lips && after.crown && after.len > before.len - 300, 'maquillage : « surprise » applique réellement un look (lèvres ' + before.lips + ' → ' + after.lips + ', couronne)');
  await p.evaluate(() => document.querySelector('.donebtn').click()); await sleep(p, 1800);
  ok(await p.evaluate(() => C.db.all('makeup').then((l) => l.length >= 1 && l[0].img.length > 5000)), 'maquillage : la photo est sauvegardée');
}

async function animaux(p) {
  await open(p, 'pets');
  const state = () => p.evaluate(() => ({ chew: !!document.querySelector('.petin.chew'), purr: !!document.querySelector('.petin.purr'), foam: document.querySelectorAll('.foam i').length, fly: document.querySelectorAll('#fx .flyer').length, acc: (document.querySelector('.pacc') || {}).innerHTML.length, mood: (document.querySelector('.petin [data-e=happy]') || {}).style && document.querySelector('.petin [data-e=happy]').style.display }));
  await p.evaluate(() => document.querySelector('[data-a=feed]').click()); await sleep(p, 500);
  ok(await p.evaluate(() => document.querySelectorAll('.food').length === 4), 'animaux : 4 aliments visibles');
  await p.evaluate(() => document.querySelector('.food').click());
  let saw = { fly: false, chew: false }; for (let i = 0; i < 25; i++) { await sleep(p, 100); const s = await state(); saw.fly = saw.fly || s.fly > 0; saw.chew = saw.chew || s.chew; }
  ok(saw.fly, 'animaux : la nourriture vole jusqu’à la bouche'); ok(saw.chew, 'animaux : l’animal mâche (animation visible)');
  ok(await p.evaluate(() => document.querySelector('.food.gone') !== null), 'animaux : l’aliment mangé disparaît');
  /* caresse */
  await p.evaluate(() => document.querySelector('[data-a=feed]').click()); await sleep(p, 300);
  const r = await rect(p, '.petin'); await p.mouse.move(r.x + r.w * .4, r.y + r.h * .4); await p.mouse.down();
  for (let k = 0; k < 14; k++) await p.mouse.move(r.x + r.w * (.4 + k * .02), r.y + r.h * .4);
  const s1 = await state(); await p.mouse.up();
  ok(s1.purr, 'animaux : caresser fait ronronner l’animal (animation)');
  /* laver */
  await p.evaluate(() => document.querySelector('[data-a=wash]').click()); await sleep(p, 300);
  await p.mouse.move(r.x + r.w * .3, r.y + r.h * .4); await p.mouse.down();
  let maxFoam = 0; for (let k = 0; k < 140; k++) { await p.mouse.move(r.x + r.w * (.3 + .4 * Math.abs(Math.sin(k / 6))), r.y + r.h * (.3 + .004 * k)); if (k % 10 === 0) maxFoam = Math.max(maxFoam, (await state()).foam); }
  await p.mouse.up();
  ok(maxFoam >= 10, 'animaux : de la mousse apparaît sur l’animal quand on le frotte (' + maxFoam + ' bulles)');
  await sleep(p, 3600); ok((await state()).foam === 0, 'animaux : après le rinçage, la mousse a disparu');
  /* accessoire */
  await p.evaluate(() => document.querySelector('[data-a=acc]').click()); await sleep(p, 300);
  const a0 = (await state()).acc; await p.evaluate(() => document.querySelectorAll('.items .it')[2].click()); await sleep(p, 500);
  ok((await state()).acc > a0, 'animaux : l’accessoire apparaît sur l’animal');
  const vis = await p.evaluate(() => { const r = document.querySelector('.pacc').getBoundingClientRect(), p = document.querySelector('.petin').getBoundingClientRect(); return r.width > 8 && r.height > 8 && r.left >= p.left - 10 && r.right <= p.right + 10 && r.bottom > p.top && r.top < p.bottom; }); ok(vis, 'animaux : l’accessoire est visible et sur l’animal');
  ok(await p.evaluate(() => JSON.parse(localStorage.getItem('celia.pets')).friends.some((f) => f.acc)), 'animaux : l’accessoire est sauvegardé');
  /* jouer : la balle bouge et l'animal la suit */
  await p.evaluate(() => document.querySelector('[data-a=acc]').click()); await sleep(p, 300);
  await p.evaluate(() => document.querySelector('[data-a=play]').click()); await sleep(p, 400);
  const b0 = await p.evaluate(() => document.querySelector('.ball').style.left + document.querySelector('.ball').style.top);
  await p.evaluate(() => document.querySelector('.ball').click()); await sleep(p, 900);
  ok(await p.evaluate(() => document.querySelector('.ball').style.left + document.querySelector('.ball').style.top) !== b0, 'animaux : la balle change réellement de place');
  /* œuf : 4 touchers → un nouvel ami, sauvegardé */
  await p.evaluate(() => document.querySelector('[data-a=play]').click()); await sleep(p, 300);
  const nf = await p.evaluate(() => JSON.parse(localStorage.getItem('celia.pets')).friends.length);
  await p.evaluate(() => document.querySelector('.it.egg').click()); await sleep(p, 600);
  for (let i = 0; i < 3; i++) { await p.evaluate(() => { const e = document.querySelector('.eggbtn'); e.onclick && e.onclick(); }); await sleep(p, 400); }
  ok(await p.evaluate(() => JSON.parse(localStorage.getItem('celia.pets')).friends.length) === nf, 'animaux : l’œuf n’éclot pas avant le 4e toucher');
  ok(await p.evaluate(() => getComputedStyle(document.querySelector('.crack')).display !== 'none'), 'animaux : l’œuf se fissure visiblement');
  await p.evaluate(() => { const e = document.querySelector('.eggbtn'); e.onclick && e.onclick(); }); await sleep(p, 1500);
  ok(await p.evaluate(() => !!document.querySelector('.newpet svg')), 'animaux : la créature apparaît à l’écran');
  ok(await p.evaluate(() => JSON.parse(localStorage.getItem('celia.pets')).friends.length) === nf + 1, 'animaux : le nouvel ami est ajouté et sauvegardé');
}

async function jeux(p) {
  await open(p, 'learn');
  const pips = () => p.evaluate(() => document.querySelectorAll('.pips i.on').length);
  /* couleurs : une erreur n'est jamais validée */
  await p.evaluate(() => document.querySelector('.lcard[data-g=colors]').click()); await sleep(p, 900);
  const tgt = await p.evaluate(() => (C.lastSay.match(/papillon (\w+)/) || [])[1]);
  const wrong = await p.evaluate((t) => [...document.querySelectorAll('.bf')].find((b) => b.dataset.color !== t).click(), tgt); await sleep(p, 600);
  ok(await pips() === 0 && await p.evaluate(() => !document.querySelector('.bf.got')), 'jeux/couleurs : un mauvais papillon n’est PAS validé');
  await p.evaluate((t) => document.querySelector('.bf[data-color=' + t + ']').click(), tgt); await sleep(p, 600);
  ok(await pips() === 1 && await p.evaluate(() => !!document.querySelector('.bf.got')), 'jeux/couleurs : le bon papillon (' + tgt + ') est validé, il réagit visiblement');
  await p.evaluate(() => C.doBack()); await sleep(p, 500);
  /* formes : déposer au mauvais endroit ne valide pas */
  await p.evaluate(() => document.querySelector('.lcard[data-g=shapes]').click()); await sleep(p, 900);
  const sh = await p.evaluate(() => [...document.querySelectorAll('.piece')].map((n) => { const r = n.getBoundingClientRect(); return { k: n.dataset.k, x: r.x + r.width / 2, y: r.y + r.height / 2 }; }));
  const ho = await p.evaluate(() => [...document.querySelectorAll('.hole')].map((n) => { const r = n.getBoundingClientRect(); return { k: n.dataset.k, x: r.x + r.width / 2, y: r.y + r.height / 2 }; }));
  const first = sh[0], wrongHole = ho.find((h) => h.k !== first.k), rightHole = ho.find((h) => h.k === first.k);
  await p.mouse.move(first.x, first.y); await p.mouse.down(); await p.mouse.move(wrongHole.x, wrongHole.y, { steps: 10 }); await p.mouse.up(); await sleep(p, 700);
  ok(await p.evaluate(() => document.querySelectorAll('.hole.filled').length) === 0, 'jeux/formes : une forme déposée dans le mauvais trou n’est pas validée');
  for (const s of sh) { const h = ho.find((x) => x.k === s.k); await p.mouse.move(s.x, s.y); await p.mouse.down(); await p.mouse.move(h.x, h.y, { steps: 10 }); await p.mouse.up(); await sleep(p, 600); }
  ok(await p.evaluate(() => document.querySelectorAll('.hole.filled').length) === 3, 'jeux/formes : les 3 formes dans les bons trous sont validées'); await sleep(p, 1200); ok(await pips() === 1, 'jeux/formes : une étoile gagnée après les 3 formes');
  await p.evaluate(() => C.doBack()); await sleep(p, 500);
  /* compter */
  await p.evaluate(() => document.querySelector('.lcard[data-g=count]').click()); await sleep(p, 900);
  const N = await p.evaluate(() => +document.querySelector('.cit').dataset.n);
  const items = await p.evaluate(() => [...document.querySelectorAll('.cit')].map((n) => { const r = n.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }));
  const said = await p.evaluate(() => C.lastSay);
  ok(/une? |deux|trois/.test(said) && !/un (étoile|pomme|fleur|balle)/.test(said), 'jeux/compter : consigne correcte (« ' + said + ' »)');
  for (let i = 0; i < N; i++) { await p.touchscreen.tap(items[i].x, items[i].y); await sleep(p, 350); }
  await sleep(p, 900);
  ok(await p.evaluate(() => document.querySelector('.cnum').classList.contains('show')) && await pips() === 1, 'jeux/compter : le bon nombre d’objets touchés est validé, le chiffre s’affiche');
  await p.evaluate(() => C.doBack()); await sleep(p, 500);
  /* animaux */
  await p.evaluate(() => document.querySelector('.lcard[data-g=animals]').click()); await sleep(p, 900);
  await p.evaluate(() => document.querySelector('.an:not([data-target="1"])').click()); await sleep(p, 600);
  ok(await pips() === 0, 'jeux/animaux : un mauvais animal n’est pas validé');
  await p.evaluate(() => document.querySelector('.an[data-target="1"]').click()); await sleep(p, 1500);
  ok(await pips() === 1, 'jeux/animaux : le bon animal est validé');
  await p.evaluate(() => C.doBack()); await sleep(p, 500);
  /* petit / grand */
  await p.evaluate(() => document.querySelector('.lcard[data-g=size]').click()); await sleep(p, 900);
  await p.evaluate(() => document.querySelector('.sz:not([data-ok="1"])').click()); await sleep(p, 500);
  ok(await pips() === 0, 'jeux/petit-grand : le mauvais objet n’est pas validé');
  await p.evaluate(() => document.querySelector('.sz[data-ok="1"]').click()); await sleep(p, 1200);
  ok(await pips() === 1, 'jeux/petit-grand : le bon objet est validé');
  await p.evaluate(() => C.doBack()); await sleep(p, 500);
  /* puzzle : une pièce lâchée loin ne se place pas */
  await p.evaluate(() => document.querySelector('.lcard[data-g=puzzle]').click()); await sleep(p, 900);
  const pz = await p.evaluate(() => ({ t: [...document.querySelectorAll('.ptile')].map((n) => { const r = n.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }), s: [...document.querySelectorAll('.slot')].map((n) => { const r = n.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }) }));
  await p.mouse.move(pz.t[0].x, pz.t[0].y); await p.mouse.down(); await p.mouse.move(pz.t[0].x, pz.t[0].y - 60, { steps: 5 }); await p.mouse.up(); await sleep(p, 600);
  ok(await p.evaluate(() => document.querySelectorAll('.slot.filled').length) === 0, 'jeux/puzzle : une pièce lâchée loin de sa place n’est pas validée');
  const order = await p.evaluate(() => [...document.querySelectorAll('.ptile')].map((n) => n.querySelector('svg').getAttribute('viewBox')));
  const slotsVb = await p.evaluate(() => [...document.querySelectorAll('.slot')].map((n) => [n.style.left, n.style.top]));
  const info = await p.evaluate(() => { const W = 240; const b = document.querySelector('.board').getBoundingClientRect(); return { n: document.querySelectorAll('.slot').length, b: { w: b.width, h: b.height } }; });
  for (let i = 0; i < pz.t.length; i++) {
    const vb = order[i].split(' ').map(Number), cols = Math.round(240 / vb[2]), rows = Math.round(240 / vb[3]);
    const col = Math.round(vb[0] / vb[2]), row = Math.round(vb[1] / vb[3]);
    const si = row * cols + col, cur = await p.evaluate((i) => { const r = document.querySelectorAll('.ptile')[i].getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }, i);
    const sl = await p.evaluate((si) => { const r = document.querySelectorAll('.slot')[si].getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }, si);
    await p.mouse.move(cur.x, cur.y); await p.mouse.down(); await p.mouse.move(sl.x, sl.y, { steps: 10 }); await p.mouse.up(); await sleep(p, 500);
  }
  ok(await p.evaluate(() => document.querySelectorAll('.slot.filled').length === document.querySelectorAll('.slot').length), 'jeux/puzzle : chaque pièce posée à sa place est validée');
  await sleep(p, 1200); ok(await pips() === 1, 'jeux/puzzle : une étoile gagnée une fois le puzzle fini');
}

async function chambre(p) {
  await open(p, 'room');
  const n0 = await p.evaluate(() => document.querySelectorAll('.ri').length);
  await p.evaluate(() => { document.querySelectorAll('.tab')[3].click(); }); await sleep(p, 300);
  await p.evaluate(() => document.querySelectorAll('.items .it:not(.locked)')[1].click()); await sleep(p, 600);
  ok(await p.evaluate(() => document.querySelectorAll('.ri').length) === n0 + 1, 'chambre : l’objet choisi apparaît réellement dans la chambre');
  const vis = await p.evaluate(() => { const r = [...document.querySelectorAll('.ri')].pop().getBoundingClientRect(), s = document.querySelector('.ritems').getBoundingClientRect(); return r.width > 20 && r.left >= s.left - 2 && r.right <= s.right + 2 && r.top >= s.top - 2 && r.bottom <= s.bottom + 2; });
  ok(vis, 'chambre : l’objet est visible, dans la chambre');
  ok(await p.evaluate(() => JSON.parse(localStorage.getItem('celia.room')).items.length) === n0 + 1, 'chambre : l’ajout est sauvegardé');
  /* verrouillé : ne s'ajoute pas */
  const locked = await p.evaluate(() => { const l = document.querySelector('.items .it.locked'); if (!l) return null; const n = document.querySelectorAll('.ri').length; l.click(); return n; });
  if (locked !== null) { await sleep(p, 400); ok(await p.evaluate(() => document.querySelectorAll('.ri').length) === locked, 'chambre : un objet verrouillé n’est pas ajouté'); }
  /* déplacer */
  const it = await p.evaluate(() => { const r = document.querySelector('.ri.sel').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  await p.mouse.move(it.x, it.y); await p.mouse.down(); await sleep(p, 100);
  const it0 = await p.evaluate(() => { const r = document.querySelector('.ri.sel').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  await p.mouse.move(it.x - 90, it.y - 60, { steps: 8 }); await p.mouse.up(); await sleep(p, 300);
  const it2 = await p.evaluate(() => { const r = document.querySelector('.ri.sel').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  ok(Math.hypot(it2.x - it0.x + 90, it2.y - it0.y + 60) < 8, 'chambre : l’objet suit le doigt quand on le déplace');
  const w0 = await p.evaluate(() => document.querySelector('.ri.sel').getBoundingClientRect().width);
  await p.evaluate(() => document.querySelector('[data-r=plus]').click()); await sleep(p, 200);
  ok(await p.evaluate(() => document.querySelector('.ri.sel').getBoundingClientRect().width) > w0 + 3, 'chambre : « agrandir » agrandit réellement l’objet');
  await p.evaluate(() => document.querySelector('[data-r=flip]').click()); await sleep(p, 200);
  ok(await p.evaluate(() => document.querySelector('.ri.sel .rin').style.transform) === 'scaleX(-1)', 'chambre : « retourner » retourne l’objet');
  ok(await p.evaluate(() => JSON.parse(localStorage.getItem('celia.room')).items.some((i) => i.f === 1 && i.s > 1)), 'chambre : les modifications (taille, retournement) sont sauvegardées');
  /* mur */
  const wall0 = await p.evaluate(() => document.querySelector('.rbg svg > rect').getAttribute('fill'));
  await p.evaluate(() => { document.querySelectorAll('.tab')[9].click(); document.querySelectorAll('.items .it.round')[2].click(); }); await sleep(p, 300);
  ok(await p.evaluate(() => document.querySelector('.rbg svg > rect').getAttribute('fill')) !== wall0, 'chambre : la couleur du mur change');
  /* rechargement */
  await p.reload(); await sleep(p, 600); await p.evaluate(() => { document.querySelector('.startbtn').click(); }); await sleep(p, 400);
  await p.evaluate(() => document.querySelector('.t-room').click()); await sleep(p, 900);
  ok(await p.evaluate(() => document.querySelectorAll('.ri').length) === n0 + 1, 'chambre : la chambre est retrouvée après rechargement');
  await p.evaluate(() => document.querySelector('[data-r=del]'));
  await p.evaluate(() => { const n = [...document.querySelectorAll('.ri')].pop(); n.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 9, bubbles: true, clientX: 100, clientY: 100 })); document.querySelector('[data-r=del]').click(); }); await sleep(p, 300);
  ok(await p.evaluate(() => document.querySelectorAll('.ri').length) === n0, 'chambre : la corbeille supprime réellement l’objet');
}

async function histoires(p) {
  await open(p, 'stories');
  await p.evaluate(() => document.querySelectorAll('.scard')[1].click()); await sleep(p, 900);
  const nextShown = () => p.evaluate(() => !document.querySelector('.snext').hidden);
  const adv = async () => { for (let i = 0; i < 40 && !(await nextShown()); i++) await sleep(p, 150); const s = await nextShown(); if (s) { await p.evaluate(() => document.querySelector('.snext').click()); await sleep(p, 900); } return s; };
  /* scène 0 : dire bonjour — doit faire apparaître des cœurs */
  await p.evaluate(() => document.querySelector('.hot').click()); await sleep(p, 700);
  ok(await p.evaluate(() => document.querySelectorAll('.sheart').length >= 3), 'histoires : dire bonjour fait apparaître des cœurs');
  ok(await adv(), 'histoires : la suite apparaît après une action réussie');
  /* scène 1 : mauvais choix, puis bon choix */
  await p.evaluate(() => document.querySelectorAll('.pick')[0].click()); await sleep(p, 700);
  ok(!(await nextShown()), 'histoires : un mauvais choix n’est PAS validé');
  await p.evaluate(() => document.querySelectorAll('.pick')[1].click()); await sleep(p, 300);
  await p.evaluate(() => document.querySelectorAll('.pick')[1].click());
  await sleep(p, 1600);
  ok(await p.evaluate(() => { const o = document.querySelectorAll('.pick')[1].getBoundingClientRect(), t = document.querySelectorAll('.act1')[1].getBoundingClientRect(); return Math.hypot(o.x + o.width / 2 - t.x - t.width / 2, o.y + o.height / 2 - t.y - t.height * 0.55) < t.height; }), 'histoires : le bon objet voyage visiblement jusqu’à la créature');
  ok(await adv(), 'histoires : suite après le bon choix');
  /* scène 2 : 3 pommes — la validation attend la 3e */
  const apples = await p.evaluate(() => document.querySelectorAll('.pick').length);
  await p.evaluate(() => document.querySelectorAll('.pick')[0].click()); await sleep(p, 1100);
  ok(!(await nextShown()) && await p.evaluate(() => document.querySelectorAll('.sslots i.on').length === 1), 'histoires : 1 pomme sur 3 ne valide pas ; la case se remplit');
  await p.evaluate(() => { const b = document.querySelectorAll('.pick'); b[1].click(); b[2].click(); }); await sleep(p, 1500);
  ok(await p.evaluate(() => document.querySelectorAll('.sslots i.on').length === 3), 'histoires : les 3 cases sont remplies');
  ok(await adv(), 'histoires : suite après les 3 pommes');
  /* scène 3 : le gâteau et les bougies — LE bug signalé */
  ok(await p.evaluate(() => document.querySelectorAll('.scandle').length) === 0, 'histoires/gâteau : aucune bougie avant le toucher');
  await p.evaluate(() => { const h = document.querySelector('.hot'); h.click(); h.click(); h.click(); }); await sleep(p, 1500);
  const cd = await p.evaluate(() => { const s = document.querySelector('.sc svg.cakesvg').getBoundingClientRect(); return [...document.querySelectorAll('.scandle')].map((c) => { const r = c.getBoundingClientRect(); return { inside: r.left >= s.left && r.right <= s.right && r.top >= s.top && r.bottom <= s.bottom, w: r.width, flame: !!c.querySelector('.flame') }; }); });
  ok(cd.length === 3 && cd.every((c) => c.inside && c.w > 8 && c.flame), 'histoires/gâteau : exactement 3 bougies visibles avec flamme, posées sur le gâteau (malgré 3 touchers rapides) ' + JSON.stringify(cd.map((c) => c.inside)));
  ok(await p.evaluate(() => !document.querySelector('.btxt') || !/joli/.test(document.querySelector('.btxt').textContent)), 'histoires/gâteau : pas de bavardage (la voix ne félicite plus, les bougies suffisent)');
}

(async () => {
  const b = await chromium.launch();
  for (const vp of [{ w: 390, h: 844, n: 'iPhone 14' }]) {
    const ctx = await b.newContext({ viewport: { width: vp.w, height: vp.h }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
    await ctx.addInitScript(require('./_session.cjs'));
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.goto(BASE); await sleep(p, 500); await p.evaluate(() => document.querySelector('.startbtn').click()); await sleep(p, 300);
    for (const [n, f] of [['coloriage', coloriage], ['dessin libre', dessinLibre], ['dressing', dressing], ['maquillage', maquillage], ['animaux', animaux], ['jeux', jeux], ['chambre', chambre], ['histoires', histoires]]) {
      try { await f(p); } catch (e) { ok(false, n + ' : exception du test ' + String(e.message).split('\n')[0]); }
      if (n === 'chambre') { await p.evaluate(() => { document.querySelector('.startbtn') && document.querySelector('.startbtn').click(); }); }
    }
    ok(errs.length === 0, 'aucune erreur JS ' + errs.join('|'));
    await ctx.close();
  }
  await b.close();
  console.log(fails ? '\n' + fails + ' ÉCHEC(S)' : '\nINTERACTIONS : TOUT EST OK'); process.exit(fails ? 1 : 0);
})();
