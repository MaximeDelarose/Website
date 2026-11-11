/* Grammaire française des consignes : chaque objet est stocké avec son genre, ses accords et ses articles.
   Les consignes sont construites ici (jamais par concaténation « un + nom ») pour rester correctes quand on ajoute des objets. */
(function () {
  'use strict';
  var Fr = window.Fr = {};

  /* g = genre (m/f), p = pluriel irrégulier si besoin */
  Fr.OBJ = {
    pomme: { n: 'pomme', g: 'f' }, etoile: { n: 'étoile', g: 'f' }, coeur: { n: 'cœur', g: 'm' }, fleur: { n: 'fleur', g: 'f' }, balle: { n: 'balle', g: 'f' },
    papillon: { n: 'papillon', g: 'm' }, chat: { n: 'chat', g: 'm' }, chien: { n: 'chien', g: 'm' }, lapin: { n: 'lapin', g: 'm' }, panda: { n: 'panda', g: 'm' },
    licorne: { n: 'licorne', g: 'f' }, dragon: { n: 'dragon', g: 'm' }, cle: { n: 'clé', g: 'f' }, gateau: { n: 'gâteau', g: 'm', p: 'gâteaux' }, ballon: { n: 'ballon', g: 'm' }
  };
  /* couleurs : [masculin, féminin] */
  Fr.COLORS = { rouge: ['rouge', 'rouge'], jaune: ['jaune', 'jaune'], bleu: ['bleu', 'bleue'], vert: ['vert', 'verte'], rose: ['rose', 'rose'], violet: ['violet', 'violette'], orange: ['orange', 'orange'] };
  /* adjectifs placés avant le nom */
  Fr.ADJ = { gros: ['gros', 'grosse'], petit: ['petit', 'petite'] };
  Fr.NUM = ['', 'un', 'deux', 'trois'];

  var VOW = /^[aeiouyhâàêéèëîïôûùœ]/i;
  var col = function (o) { return o.g === 'f' ? 1 : 0; };
  Fr.un = function (o) { return (o.g === 'f' ? 'une ' : 'un ') + o.n; };
  Fr.le = function (o) { return VOW.test(o.n) ? 'l’' + o.n : (o.g === 'f' ? 'la ' : 'le ') + o.n; };
  Fr.pl = function (o) { return o.p || (/[sxz]$/.test(o.n) ? o.n : o.n + 's'); };
  Fr.num = function (n, o) { return n === 1 ? Fr.un(o) : Fr.NUM[n] + ' ' + Fr.pl(o); };
  Fr.color = function (c, o) { return Fr.COLORS[c][col(o)]; };
  Fr.adj = function (a, o) { return Fr.ADJ[a][col(o)]; };
  /* article défini sans élision (devant un adjectif : « la grosse étoile ») */
  Fr.art = function (o) { return o.g === 'f' ? 'la' : 'le'; };
  Fr.cap = function (s) { return s.charAt(0).toUpperCase() + s.slice(1); };

  /* consignes complètes */
  Fr.touche = function (o) { return 'Touche ' + Fr.un(o) + ' !'; };
  Fr.toucheLe = function (o) { return 'Touche ' + Fr.le(o) + ' !'; };
  Fr.toucheN = function (n, o) { return 'Touche ' + Fr.num(n, o) + ' !'; };
  Fr.toucheCouleur = function (o, c) { return 'Touche ' + Fr.le(o) + ' ' + Fr.color(c, o) + ' !'; };
  Fr.trouveCouleur = function (o, c) { return 'Trouve ' + Fr.le(o) + ' ' + Fr.color(c, o) + ' !'; };
  Fr.cherche = function (o, c) { return 'Cherche ' + Fr.le(o) + (c ? ' ' + Fr.color(c, o) : '') + ' !'; };
  Fr.ou = function (o) { return 'Où est ' + Fr.le(o) + ' ?'; };
  Fr.cest = function (o) { return 'C’est ' + Fr.le(o) + ' !'; };
  Fr.toucheTaille = function (o, a) { return 'Touche ' + Fr.art(o) + ' ' + Fr.adj(a, o) + ' ' + o.n + ' !'; };
  Fr.oui = function (n, o) { return 'Oui, ' + Fr.num(n, o) + ' !'; };

  /* toutes les consignes possibles (pour générer les fichiers vocaux et pour les tests) */
  Fr.allPhrases = function () {
    var out = [], push = function (s) { if (out.indexOf(s) < 0) out.push(s); };
    ['pomme', 'etoile', 'coeur', 'fleur', 'balle'].forEach(function (k) {
      var o = Fr.OBJ[k]; push(Fr.touche(o));
      [1, 2, 3].forEach(function (n) { push(Fr.toucheN(n, o)); push(Fr.oui(n, o)); });
      push(Fr.toucheTaille(o, 'gros')); push(Fr.toucheTaille(o, 'petit'));
    });
    Object.keys(Fr.COLORS).forEach(function (c) { push(Fr.toucheCouleur(Fr.OBJ.papillon, c)); push(Fr.trouveCouleur(Fr.OBJ.fleur, c)); push(Fr.cherche(Fr.OBJ.papillon, c)); });
    ['chat', 'chien', 'lapin', 'panda', 'licorne', 'dragon'].forEach(function (k) { var o = Fr.OBJ[k]; push(Fr.ou(o)); push(Fr.cest(o)); push(Fr.cherche(o)); });
    return out;
  };
})();
