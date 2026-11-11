/* Test du français : genre des objets, consignes générées, et recherche des fautes classiques dans tous les textes du jeu.
   Usage : node _celia/tests/french.cjs   (aucun navigateur nécessaire) */
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..', '..', 'celia', 'js');
let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log('FAIL ' + m); } else console.log('OK   ' + m); };

const win = {}; vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'fr.js'), 'utf8'), { window: win });
const Fr = win.Fr;

/* 1. chaque objet a un genre et produit le bon article */
for (const [k, o] of Object.entries(Fr.OBJ)) {
  ok(o.g === 'm' || o.g === 'f', 'genre défini pour « ' + o.n + ' »');
  const un = Fr.un(o);
  ok(un === (o.g === 'f' ? 'une ' : 'un ') + o.n, '« ' + un + ' » : article indéfini correct');
  const le = Fr.le(o);
  const elide = /^[aeiouyhéèêâîôûœ]/i.test(o.n);
  ok(le === (elide ? 'l’' + o.n : (o.g === 'f' ? 'la ' : 'le ') + o.n), '« ' + le + ' » : article défini / élision correct');
}
/* 2. cas cités par les parents */
const eq = (a, b) => ok(a === b, a + (a === b ? '' : '  (attendu : ' + b + ')'));
eq(Fr.touche(Fr.OBJ.etoile), 'Touche une étoile !');
eq(Fr.touche(Fr.OBJ.fleur), 'Touche une fleur !');
eq(Fr.touche(Fr.OBJ.chat), 'Touche un chat !');
eq(Fr.touche(Fr.OBJ.papillon), 'Touche un papillon !');
eq(Fr.touche(Fr.OBJ.licorne), 'Touche une licorne !');
eq(Fr.toucheLe(Fr.OBJ.etoile), 'Touche l’étoile !');
eq(Fr.trouveCouleur(Fr.OBJ.fleur, 'rose'), 'Trouve la fleur rose !');
eq(Fr.ou(Fr.OBJ.chat), 'Où est le chat ?');
eq(Fr.toucheCouleur(Fr.OBJ.papillon, 'jaune'), 'Touche le papillon jaune !');
eq(Fr.toucheN(2, Fr.OBJ.pomme), 'Touche deux pommes !');
eq(Fr.toucheN(1, Fr.OBJ.etoile), 'Touche une étoile !');
eq(Fr.toucheN(3, Fr.OBJ.coeur), 'Touche trois cœurs !');
eq(Fr.toucheTaille(Fr.OBJ.etoile, 'gros'), 'Touche la grosse étoile !');
eq(Fr.toucheTaille(Fr.OBJ.balle, 'petit'), 'Touche la petite balle !');
eq(Fr.toucheTaille(Fr.OBJ.coeur, 'gros'), 'Touche le gros cœur !');
eq(Fr.cest(Fr.OBJ.dragon), 'C’est le dragon !');
eq(Fr.color('vert', Fr.OBJ.fleur), 'verte');

/* 3. toutes les consignes possibles : aucun « un » devant un nom féminin, aucune « une » devant un nom masculin */
const all = Fr.allPhrases();
ok(all.length > 60, all.length + ' consignes générées');
const fem = Object.values(Fr.OBJ).filter((o) => o.g === 'f').map((o) => o.n), mas = Object.values(Fr.OBJ).filter((o) => o.g === 'm').map((o) => o.n);
function lint(text, where) {
  for (const n of fem) { if (new RegExp('\\b(un|le|ce|mon|ton)\\s+' + n + '\\b', 'i').test(text) && !new RegExp('\\b(la|une|cette)\\s+' + n, 'i').test(text)) { ok(false, where + ' : nom féminin « ' + n + ' » avec article masculin → ' + text); } }
  for (const n of mas) { if (new RegExp('\\b(une|la)\\s+' + n + '\\b', 'i').test(text)) { ok(false, where + ' : nom masculin « ' + n + ' » avec article féminin → ' + text); } }
  if (/\s{2,}/.test(text)) ok(false, where + ' : espaces doublés → ' + text);
  if (/\s[,.]/.test(text)) ok(false, where + ' : espace avant , ou . → ' + text);
  if (/[^\s(]\s*[!?]/.test(text) && /\w[!?]/.test(text)) ok(false, where + ' : il manque l’espace avant ! ou ? → ' + text);
  if (/'/.test(text)) ok(false, where + ' : apostrophe droite (utiliser ’) → ' + text);
}
const before = fails;
all.forEach((t) => lint(t, 'consigne'));
ok(fails === before, 'consignes générées : accords et typographie corrects');

/* 4. tous les textes littéraux des fichiers du jeu */
const banned = [/\bun étoile/i, /\bun fleur/i, /\bun pomme/i, /\bun balle/i, /\bun licorne/i, /\bun clé/i, /\bune chat/i, /\bune papillon/i, /\bune cœur/i, /\bune dragon/i, /\bun grosse/i, /\bune gros\b/i, /Touche un\s+étoiles/i];
const files = fs.readdirSync(ROOT).filter((f) => f.endsWith('.js'));
let strings = 0;
const before2 = fails;
for (const f of files) {
  const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
  for (const re of banned) if (re.test(src)) ok(false, f + ' : faute de genre détectée (' + re + ')');
  /* textes passés à say / sayRnd et clés say: ok: hint: des histoires */
  const re = /(?:say|sayRnd|ok|hint)\s*[:(]\s*\[?\s*'((?:[^'\\]|\\.)*)'/g; let m;
  while ((m = re.exec(src))) {
    strings++;
    const t = m[1].replace(/\\u2019/g, '’');
    lint(t, f);
  }
}
ok(strings > 80, strings + ' textes littéraux examinés');
ok(fails === before2, 'textes du jeu : aucune faute de genre ni de typographie');

/* 5. aucune consigne construite à la main à partir d'un objet (doit passer par Fr.*) */
for (const f of ['learn.js']) {
  const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
  ok(!/'Touche '\s*\+/.test(src), f + ' : aucune consigne « Touche » concaténée à la main');
}
console.log(fails ? '\n' + fails + ' ÉCHEC(S)' : '\nFRANÇAIS : TOUT EST OK');
process.exit(fails ? 1 : 0);
