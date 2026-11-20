/* =========================================================================
   QUELLE VIE ! — lecture rapide des cartes (moins de 3 secondes)
   Hiérarchie : catégorie + cible → nom → illustration → effet (gros chiffres)
   → coût / condition. Le texte drôle passe en dernier, en petit.
   QV_CARDS.html(key, { big, dim, on, reason, u, me, state })
   ========================================================================= */
(function (root) {
  "use strict";
  var D = root.QV_DATA, IC = root.QV_ICONS, E = root.QV_ENGINE;
  function esc(t) { return String(t == null ? "" : t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  var FAM_ICON = { career: "tie", love: "heart", family: "baby", home: "house", leisure: "plane", sabotage: "lightning", defense: "shield", world: "chart" };
  // l'effet principal, en une ligne courte (les gains/pertes chiffrés sont affichés à part)
  var EFF = {
    petitboulot: "Métier : livreur · +2 € par tour", diplome: "Diplôme : ouvre le travail de bureau", bureau: "Métier : bureau · +3 € par tour",
    promotion: "Monte en grade · +1 € par tour", influence: "Métier : influence · ★ ÷ 3 en € par tour", startup: "Dans 2 tours : 6 chances sur 10 de licorne",
    foudre: "Un·e partenaire arrive", mariage: "Vous vous mariez", diner: "+2 ♥ de plus si tu es en couple", bebe: "Bébé : +1 ♥ et −1 € à chaque tour",
    hamster: "Un hamster chez toi", heritage: "+2 € de plus si tu as des enfants", appart: "Tu quittes le canapé de tes parents", maison: "Maison avec jardin",
    voiture: "Voiture de sport", grattage: "Gagne de 1 à 7 €", benevolat: "Efface un scandale",
    licenciement: "Perd son métier", divorce: "Rupture · perd la moitié de sa fortune", badbuzz: "Scandale : −1 ★ par tour, 2 tours", fisc: "Perd le tiers de sa fortune",
    avocat: "Annule : divorce, fisc, squatteur, ex, procès…", syndicat: "Annule : licenciement, réunion inutile", community: "Annule : bad buzz et scandales en ligne",
    assurance: "Annule : dégât des eaux, retour chez maman", renvoi: "Renvoie n'importe quel coup bas à l'attaquant",
    crise: "Tout le monde −3 € · le plus pauvre +3 ♥", karaoke: "Tout le monde +1 ♥ · le plus célèbre −2 ★", greve: "Personne n'est payé au prochain tour",
    cdimensonge: "Métier de bureau sans diplôme · 1 risque sur 4 par tour d'être démasqué·e", fauxdiplome: "Diplôme · risque d'être vérifié à la promotion",
    reconversion: "Métier : chaman (+1 € par tour) · efface le scandale", retraite: "Quitte ton métier", mariagesponso: "Vous vous mariez",
    mariageraison: "Mariage avec un·e riche inconnu·e", ex: "Ne peut pas se marier pendant 2 tours", heritagesurprise: "2 fois sur 3 : +6 € · sinon −2 €",
    chien: "+1 € à chaque tour", bebeinflu: "+2 € et −1 ♥ à chaque tour", cousin: "Une carte de sa main passe dans la tienne",
    squatteur: "−1 ♥ par tour pendant 3 tours", voisin: "Ne peut plus déménager pendant 2 tours", retourmaman: "Perd un cran de logement",
    loto: "1 chance sur 8 : +12 € · sinon 1 sur 3 : +2 €", investissement: "3 chances sur 10 : +11 €", star: "Puis −2 ★ au tour suivant",
    nouvellevie: "Efface tes ennuis · 2 cartes au prochain tour", gourou: "Il paie 3 €, tu en gagnes 2", proces: "Le plus réputé gagne 4 €, l'autre perd 4 € et 1 ★",
    reunion: "Pas de salaire au prochain tour", karma: "Le pire saboteur : −3 ★ et −2 ♥", miracle: "Annule fisc, voisin, réunion, procès · ou efface tes ennuis",
    panne: "Chacun change une carte · tout le monde +1 ♥",
    paternite: "1 fois sur 2 : −3 ♥ −2 ★ pour la cible", after: "1 fois sur 2 : un tatouage", plancoloc: "Un·e partenaire emménage", vegas: "Mariage express",
    groupe: "S'il travaille : rétrogradé·e", doublevie: "+2 ♥ par tour · 3 risques sur 10 que tout explose", sextape: "Scandale 1 tour",
    sugar: "Un·e partenaire · puis −2 € par tour pendant 2 tours", date: "En couple : mariage bloqué 2 tours", fauxcelib: "Rupture", divorcepremium: "Rupture + grille-pain",
    retourex: "4 chances sur 10 que le couple explose", karmainfidele: "Infidèles et saboteurs : −2 ★ −2 ♥",
  };
  var REQ = {
    noJob: "Ne pas avoir de métier", hasJob: "Avoir un métier", promotable: "Avoir un métier", diploma: "Avoir un diplôme", single: "Être célibataire",
    partner: "Être en couple", notMarried: "Ne pas être marié·e", married: "Être marié·e", housing: "Avoir un logement", kids: "Avoir un enfant",
    hits: "Avoir encaissé une catastrophe",
  };
  var TREQ = { hasJob: "qui travaille", partner: "en couple", housing: "qui a un logement", kids: "qui a un enfant", minF: "qui a de l'argent", minR: "un peu connu·e", minHand: "qui a des cartes" };

  function condText(c) {
    var r = c.req || {}, t = [];
    Object.keys(REQ).forEach(function (k) { if (r[k]) t.push(REQ[k]); });
    if (r.minAge) t.push("Avoir " + r.minAge + " ans");
    if (r.minR) t.push(r.minR + " Réputation");
    if (r.minB) t.push(r.minB + " Bonheur");
    if (c.need === "saboteur") t.push("Quelqu'un a déjà saboté");
    return t.slice(0, 3).join(" · ");
  }
  function targetText(c) {
    if (c.reaction && !c.alsoPlay) return { cls: "react", label: "Réaction", long: "Se joue quand quelqu'un t'attaque" };
    if (c.target === "opponent") {
      var q = []; Object.keys(TREQ).forEach(function (k) { if (c.treq && c.treq[k]) q.push(TREQ[k]); });
      return { cls: "foe", label: "Adversaire", long: "Un adversaire" + (q.length ? " " + q[0] : "") };
    }
    if (c.target === "all") return { cls: "all", label: "Tout le monde", long: "Toute la table" };
    if (c.target === "auto") return { cls: "foe", label: "Le saboteur", long: "La personne qui a le plus saboté" };
    return { cls: "self", label: "Moi", long: "Toi" };
  }
  var WHO_ICO = {
    self: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="5" r="3.2" fill="currentColor"/><path d="M2 15 q6 -9 12 0z" fill="currentColor"/></svg>',
    foe: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="8" cy="8" r="2.4" fill="currentColor"/><path d="M8 0 v4 M8 12 v4 M0 8 h4 M12 8 h4" stroke="currentColor" stroke-width="2"/></svg>',
    all: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="4" cy="6" r="2.2" fill="currentColor"/><circle cx="12" cy="6" r="2.2" fill="currentColor"/><circle cx="8" cy="5" r="2.6" fill="currentColor"/><path d="M0 15 q4 -7 8 0 q4 -7 8 0z" fill="currentColor"/></svg>',
    react: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1 L14 3.5 V8 Q14 13 8 15 Q2 13 2 8 V3.5Z" fill="currentColor"/></svg>',
  };
  // gains et pertes chiffrés (le plus important, en gros)
  function deltas(c) {
    var out = [], add = function (o, who) { ["b", "f", "r"].forEach(function (k) { if (o[k]) out.push({ k: k, v: o[k], who: who }); }); };
    (c.fx || []).forEach(function (f) { if (f.op === "res" && !f.who) add(f, c.target === "opponent" ? "foe" : "me"); });
    return out;
  }
  function chip(d) {
    return '<span class="qc-d ' + (d.v > 0 ? "up" : "down") + '">' + IC.get(d.k, "qv-ri") + '<b>' + (d.v > 0 ? "+" : "−") + Math.abs(d.v) + '</b></span>';
  }
  function costChip(cost) {
    var o = ""; ["f", "b", "r"].forEach(function (k) { if (cost && cost[k]) o += '<span class="qc-cost">Coûte ' + cost[k] + IC.get(k, "qv-ri") + '</span>'; });
    return o;
  }

  function html(k, o) {
    o = o || {};
    var c = D.byKey[k]; if (!c) return "";
    var fam = D.FAMILIES[c.fam], tg = targetText(c), ds = deltas(c), eff = EFF[k] || "", cond = condText(c);
    var h = '<div class="qv-card fam-' + c.fam + (c.adult ? " adult" : "") + (o.big ? " big" : "") + (o.dim ? " dim" : "") + (o.on ? " on" : "") + (o.pulse ? " pulse" : "") + '"' + (o.u ? ' data-u="' + o.u + '"' : '') + '>';
    h += '<div class="qc-head"><span class="qc-cat">' + IC.get(FAM_ICON[c.fam], "qc-ci") + esc(fam.name) + '</span><span class="qc-who who-' + tg.cls + '">' + WHO_ICO[tg.cls] + esc(tg.label) + '</span></div>';
    h += '<div class="qc-name">' + esc(c.name) + (c.adult ? ' <i class="c18">18+</i>' : '') + '</div>';
    h += '<div class="qc-art">' + IC.get(c.icon) + '</div>';
    h += '<div class="qc-eff">' + (ds.length ? '<div class="qc-ds' + (tg.cls === "foe" ? " foe" : "") + '">' + (tg.cls === "foe" ? '<span class="qc-on">Cible</span>' : '') + ds.map(chip).join("") + '</div>' : '') + (eff ? '<div class="qc-txt">' + esc(eff) + '</div>' : '') + '</div>';
    var foot = costChip(c.cost) + (cond ? '<span class="qc-cond">' + LOCK + esc(cond) + '</span>' : '');
    if (foot) h += '<div class="qc-foot">' + foot + '</div>';
    if (o.big) {
      h += '<div class="qc-more">';
      h += '<div><b>Pour qui</b><span>' + esc(tg.cls === "self" && o.mine === false ? "La personne qui la joue" : tg.long) + '</span></div>';
      if (cond) h += '<div><b>Condition</b><span>' + esc(cond) + (o.reason ? ' <em class="no">✗ ' + esc(o.reason) + '</em>' : ' <em class="ok">✓</em>') + '</span></div>';
      if (c.target === "opponent" && c.counters) h += '<div><b>Parade</b><span>La cible peut l\'annuler avec ' + c.counters.map(function (x) { return "« " + D.byKey[x].name + " »"; }).join(" ou ") + '</span></div>';
      if (c.soft) h += '<div><b>Ou</b><span>Elle peut payer pour limiter les dégâts</span></div>';
      h += '</div><p class="qc-fun">' + esc(c.text) + '</p>';
    } else if (o.reason) h += '<div class="qc-lock">' + esc(o.reason) + '</div>';
    return h + '</div>';
  }
  var LOCK = '<svg class="qc-li" viewBox="0 0 12 12" aria-hidden="true"><rect x="2" y="5" width="8" height="6" rx="1.5" fill="currentColor"/><path d="M4 5 V3.5 a2 2 0 0 1 4 0 V5" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>';

  root.QV_CARDS = { html: html, target: targetText, cond: condText, EFF: EFF };
})(window);
