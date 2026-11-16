/* =========================================================================
   Arcane Tactics — Familles d'équipement, bonus de panoplie et marchands par zone
   • 6 familles visuelles/tactiques : Voyageur, Sylvestre, Prismatique, Ombres, Royal, Légendaire.
   • Bonus de panoplie à 2 et 4 pièces d'une même famille (choix tactiques, pas seulement des chiffres).
   • Un marchand par zone, avec son catalogue (types d'objets, raretés, prix) — stock côté hôte (moteur).
   • Vente de matériaux au marchand.
   Aucune mécanique du moteur n'est réécrite : tout passe par EXT (onItem, heroStats, shopStock, cmds).
   ========================================================================= */
(function (root) {
  "use strict";
  var A = root.AT_CORE; if (!A || !A.EXT) return;
  var EXT = A.EXT, I = A.I;

  var FAMILIES = {
    voyage: { name: "Voyageur", ico: "🎒", col: "#c9a062", blurb: "Équipement solide de ceux qui prennent la route.", set2: { txt: "+15 Vitalité", st: { vit: 15 } }, set4: { txt: "+1 PM", st: { pm: 1 } } },
    sylvestre: { name: "Sylvestre", ico: "🌿", col: "#5fc76b", blurb: "Cuir, bois et sève : mobilité et résistance.", set2: { txt: "+8 % résistance", st: { res: 8 } }, set4: { txt: "+1 PM et +10 Sagesse", st: { pm: 1, sag: 10 } } },
    prismatique: { name: "Prismatique", ico: "💎", col: "#7ff6ff", blurb: "Cristaux taillés : portée et puissance.", set2: { txt: "+1 portée", st: { po: 1 } }, set4: { txt: "+1 PA", st: { pa: 1 } } },
    ombres: { name: "Ombres", ico: "🌑", col: "#b07dff", blurb: "Tissé dans la nuit : frappe et siphonne.", set2: { txt: "+12 dommages", st: { dom: 12 } }, set4: { txt: "Vol de vie", power: "vamp" } },
    royal: { name: "Royal", ico: "👑", col: "#ffd257", blurb: "Parures de cour : l'équilibre parfait.", set2: { txt: "+25 Vitalité, +5 initiative", st: { vit: 25, ini: 5 } }, set4: { txt: "+15 dommages, +6 % résistance", st: { dom: 15, res: 6 } } },
    legendaire: { name: "Légendaire", ico: "🔥", col: "#ff9a3c", blurb: "Reliques à pouvoir unique (pas de panoplie).", set2: null, set4: null }
  };
  var ZONE_FAM = { village: "voyage", prairie: "sylvestre", bois: "sylvestre", marais: "sylvestre", falaises: "prismatique", nuages: "prismatique", cendres: "ombres" };

  // un marchand par zone : spécialités, raretés vendues, nombre d'objets, coefficient de prix
  var MERCHANTS = {
    village: { id: "tobin", name: "Marchand du voyageur", fam: "voyage", greet: "« Du solide, du fiable, et pas cher. Bon voyage ! »", slots: ["arme", "coiffe", "cape", "amulette", "anneau", "bottes"], rar: [0, 0, 1, 1, 2], n: 8, mul: 0.9 },
    prairie: { id: "hv-prairie", name: "Artisan sylvestre", fam: "sylvestre", greet: "« Tout est tanné, tressé et cousu à la main dans la prairie. »", slots: ["arme", "cape", "bottes", "coiffe"], rar: [0, 1, 1, 2, 2], n: 8, mul: 1 },
    bois: { id: "hv-bois", name: "Artisan sylvestre", fam: "sylvestre", greet: "« Le bois chante quand on sait l'écouter. »", slots: ["arme", "cape", "bottes", "coiffe"], rar: [1, 1, 2, 2, 3], n: 8, mul: 1.05 },
    marais: { id: "hv-marais", name: "Herboriste du marais", fam: "sylvestre", greet: "« Des trésors, des champignons… les deux se mangent. »", slots: ["amulette", "anneau", "bottes", "cape"], rar: [1, 2, 2, 3], n: 8, mul: 1.1 },
    falaises: { id: "hv-falaises", name: "Joaillier arcanique", fam: "prismatique", greet: "« Chaque facette capte un sort. Regarde-moi ça. »", slots: ["amulette", "anneau", "coiffe", "arme"], rar: [2, 2, 3, 3, 4], n: 8, mul: 1.25 },
    nuages: { id: "hv-nuages", name: "Colporteur des nuées", fam: "prismatique", greet: "« Léger comme un nuage, solide comme un pacte. »", slots: ["arme", "cape", "bottes", "amulette", "anneau", "coiffe"], rar: [2, 3, 3, 4], n: 8, mul: 1.3 },
    cendres: { id: "hv-cendres", name: "Marchand des Ombres", fam: "ombres", greet: "« Ici, tout se paie. Si ce n'est pas en or, c'est autrement. »", slots: ["arme", "coiffe", "cape", "amulette", "anneau", "bottes"], rar: [3, 3, 3, 4], n: 8, mul: 1.6 }
  };

  /* ---------- attribution de la famille à chaque objet ---------- */
  EXT.onItem = (function (prev) { return function (it, p, L, rarityIdx) {
    if (prev) prev(it, p, L, rarityIdx);
    if (it.fam) return;
    var w = I.cur ? I.cur() : null, zf = w && ZONE_FAM[w.zone];
    var lf = L <= 4 ? "voyage" : L <= 8 ? "sylvestre" : L <= 12 ? "prismatique" : "ombres";
    it.fam = rarityIdx >= 4 ? "legendaire" : rarityIdx === 3 && Math.random() < 0.6 ? "royal" : (zf && Math.random() < 0.7 ? zf : lf);
  }; })(EXT.onItem);

  /* ---------- bonus de panoplie ---------- */
  function counts(p) { var c = {}; A.SLOTS.forEach(function (sl) { var it = p.equip && p.equip[sl]; if (it && it.fam) c[it.fam] = (c[it.fam] || 0) + 1; }); return c; }
  EXT.heroStats = (function (prev) { return function (p, s) {
    if (prev) prev(p, s);
    var c = counts(p);
    Object.keys(c).forEach(function (f) {
      var F = FAMILIES[f]; if (!F) return;
      [[2, F.set2], [4, F.set4]].forEach(function (pr) {
        if (c[f] < pr[0] || !pr[1]) return;
        for (var k in (pr[1].st || {})) s[k] = (s[k] || 0) + pr[1].st[k];
        if (pr[1].power && s.powers.indexOf(pr[1].power) < 0) s.powers.push(pr[1].power);
      });
    });
  }; })(EXT.heroStats);

  /* ---------- catalogue d'un marchand ---------- */
  function priceOf(it, M) { return Math.round((it.value * 4 + it.lvl * 10 + (it.r >= 4 ? 400 : it.r === 3 ? 150 : 0)) * M.mul); }
  EXT.shopStock = function (w, zone, lvl, fake) {
    var M = MERCHANTS[zone]; if (!M) return null;
    var items = [], used = {}, CL = Object.keys(A.CLASSES);
    for (var i = 0; i < M.n; i++) {
      fake.cls = CL[Math.floor(Math.random() * CL.length)];
      var slot = M.slots[i % M.slots.length], ri = M.rar[Math.floor(Math.random() * M.rar.length)];
      var it = A.makeItem(fake, lvl + Math.floor(Math.random() * 3), ri, slot);
      it.fam = ri >= 4 ? "legendaire" : M.fam; it.uid = w.packId++; it.price = priceOf(it, M); it.forCls = fake.cls; it.merchant = M.id;
      items.push(it);
    }
    // les articles spécialisés du marchand sont une famille entière : on les trie par type puis rareté
    items.sort(function (a, b) { return A.SLOTS.indexOf(a.slot) - A.SLOTS.indexOf(b.slot) || a.r - b.r; });
    return items;
  };

  /* ---------- noms des PNJ ---------- */
  Object.keys(MERCHANTS).forEach(function (z) {
    var list = A.NPCS[z] || [], M = MERCHANTS[z];
    list.forEach(function (n) { if (n.role === "shop") { n.name = M.name; n.fam = M.fam; n.greet = M.greet; } });
  });

  /* ---------- vente de matériaux ---------- */
  EXT.cmds.sellmat = function (w, pi, c) {
    var pl = w.players[pi]; if (!pl || w.mode !== "explore" || w.combat) return false;
    var T = A.TRADE && A.TRADE.MATS, k = c.k; if (!T || !T[k]) return false;
    var p = pl.profile, have = (p.mats || {})[k] || 0, n = Math.max(0, Math.min(have, c.n === "all" ? have : (c.n | 0) || 1)); if (!n) return false;
    p.mats[k] -= n; if (p.mats[k] <= 0) delete p.mats[k];
    p.gold += n * T[k].value; p.rev++; I.ev(w, { k: "sell", pi: pi, v: n * T[k].value }); w.rev++; return true;
  };

  A.MERCH = { FAMILIES: FAMILIES, MERCHANTS: MERCHANTS, ZONE_FAM: ZONE_FAM, counts: counts };
})(typeof window !== "undefined" ? window : globalThis);
