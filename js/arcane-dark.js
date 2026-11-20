/* =========================================================================
   Arcane Tactics — Forêt des Cendres (DarkWorldZoneManager) : zone, donjon, PNJ, décor et palette
   Données pures + enregistrements : aucun fichier du moteur n'est réécrit.
   ========================================================================= */
(function (root) {
  "use strict";
  var A = root.AT_CORE; if (!A || !A.EXT) return;
  var EXT = A.EXT, ART = root.AT_ART;

  /* ---------- zone ---------- */
  A.ZONES.cendres = {
    name: "Forêt des Cendres", sub: "Niv. 12 à 16 · araignées, spectres et chats masqués", w: 28, h: 24, lvl: [12, 16], theme: "cendres", seed: 707, packs: 8, size: [2, 4], elite: 0.3,
    mobs: ["araignee", "chatmasque", "spectre", "tisseur", "siphonneur", "traqueur", "colosse"],
    portals: [{ x: 0, y: 12, to: "nuages", label: "Îles Cotonneuses" }, { x: 14, y: 0, to: "dungeon:antre", req: 14, label: "Antre de Tisse-Nuit (donjon)" }]
  };
  A.ZONE_IDS.push("cendres");
  // la forêt s'ouvre depuis les Îles Cotonneuses une fois la Tour des Horloges vaincue
  A.ZONES.nuages.portals.push({ x: 25, y: 11, to: "cendres", req: 12, dng: "horloge", label: "Forêt des Cendres" });
  A.NPCS.cendres = [
    { id: "hv-cendres", name: "Marchand des Ombres", x: 13, y: 13, role: "shop", col: "#b07dff" },
    { id: "source-cendres", name: "Brasier de mana", x: 12, y: 11, role: "heal", col: "#7ff6ff", obj: true }
  ];
  A.DUNGEONS.antre = {
    name: "Antre de Tisse-Nuit", sub: "Niv. 14 à 16 · 3 salles", exit: "cendres", req: 14, theme: "cendres", mul: 1.45,
    rooms: [
      { name: "Boyaux de soie", lvl: 14, comp: [["tisseur", 0], ["araignee", 0], ["chatmasque", 0]], duo: [["siphonneur", 0]] },
      { name: "Nid des guetteurs", lvl: 15, comp: [["spectre", 0], ["araignee", 0, "elite"], ["traqueur", 0], ["chatmasque", 0]], duo: [["colosse", 0]] },
      { name: "Salle de Tisse-Nuit", lvl: 16, boss: true, mobs: ["reinetisse"], comp: [["araignelet", -1], ["araignelet", -1]], duo: [["chatmasque", -1]] }
    ]
  };
  A.QUESTS.push(
    { id: "qc1", name: "Cendres et poussière", desc: "Atteindre la Forêt des Cendres.", kind: "zone", zone: "cendres", req: "q7", xp: 900, gold: 400, item: "epique" },
    { id: "qc2", name: "Chasseur d'araignées", desc: "Vaincre 6 Araignées des cendres.", kind: "kill", mob: "araignee", n: 6, req: "qc1", xp: 1100, gold: 450, item: "epique" }
  );

  /* ---------- décor (exploration, bordures, obstacles d'arène) ---------- */
  EXT.dens.cendres = 0.15;
  EXT.deco.cendres = function (kind, r) {
    var v = r();
    if (kind === "border") return { t: v < 0.7 ? "deadtree" : "darkcrystal", s: 0.95 + r() * 0.45, v: r() };
    if (kind === "arena") return { t: v < 0.4 ? "deadtree" : v < 0.7 ? "ruin" : "darkcrystal", s: 1 + r() * 0.3, v: r() };
    return { t: v < 0.38 ? "deadtree" : v < 0.58 ? "ruin" : v < 0.78 ? "darkcrystal" : v < 0.9 ? "bones" : "ashmound", s: 0.85 + r() * 0.5, v: r() };
  };

  /* ---------- palette + dessin du décor ---------- */
  if (ART && ART.THEMES) {
    ART.THEMES.cendres = { top: ["#5a5668", "#524e61", "#625d72"], path: ["#7a7080", "#706678"], side: "#2f2b3c", side2: "#221f2e", water: "#6b3fa8", line: "rgba(255,255,255,.07)", fog: "rgba(150,120,200,.14)" };
    var D = ART.decoExt = ART.decoExt || {};
    var poly = ART.poly, ell = ART.ell, circ = ART.circ, glow = ART.glow, shade = ART.shade;
    D.deadtree = function (g, d, t) {
      var v = d.v || 0, sw = Math.sin(t * 0.8 + v * 9) * 1.2;
      ell(g, 0, 2, 20, 8, "rgba(0,0,0,.28)");
      g.strokeStyle = "#1f1a26"; g.lineCap = "round"; g.lineWidth = 9; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(-3 + sw, -30, 1, -54); g.stroke();
      g.strokeStyle = "#3a3043"; g.lineWidth = 6; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(-3 + sw, -30, 1, -54); g.stroke();
      [[-1, -34, -22, -52], [1, -42, 20, -60], [0, -50, -10, -72], [1, -26, 16, -40]].forEach(function (b, i) { g.strokeStyle = "#2a2233"; g.lineWidth = 3.2 - i * 0.4; g.beginPath(); g.moveTo(b[0], b[1]); g.quadraticCurveTo(b[0] + b[2] * 0.4, b[1] - 4, b[2] + sw, b[3]); g.stroke(); });
      g.strokeStyle = "rgba(176,125,255,.25)"; g.lineWidth = 1; g.beginPath(); g.moveTo(-1, -6); g.lineTo(0, -48); g.stroke();
    };
    D.ruin = function (g, d, t) {
      var v = d.v || 0;
      ell(g, 0, 2, 24, 10, "rgba(0,0,0,.28)");
      poly(g, [-18, 0, -18, -34, -10, -40, -4, -30, 0, -44, 8, -46, 14, -30, 18, -24, 18, 0], "#4a4458", "#1c1724", 1.6);
      poly(g, [0, -44, 8, -46, 14, -30, 18, -24, 18, 0, 6, 0], "#5d566e");
      g.strokeStyle = "rgba(10,6,20,.55)"; g.lineWidth = 1.2; g.beginPath(); g.moveTo(-12, -30); g.lineTo(-8, -18); g.lineTo(-13, -6); g.moveTo(6, -36); g.lineTo(10, -22); g.stroke();
      g.fillStyle = "#4a4458"; g.fillRect(-26, -8, 12, 8); g.fillRect(14, -6, 14, 6);
      g.strokeStyle = "rgba(120,200,170,.5)"; g.lineWidth = 1.2; g.beginPath(); g.moveTo(-18, -24); g.quadraticCurveTo(-24, -14, -20, -4); g.stroke();
    };
    D.darkcrystal = function (g, d, t) {
      var v = d.v || 0, p = 0.6 + Math.sin(t * 2 + v * 8) * 0.25;
      ell(g, 0, 2, 18, 8, "rgba(0,0,0,.3)"); glow(g, 0, -22, 40, "rgba(140,70,230," + (0.22 * p) + ")", 1);
      poly(g, [-14, 0, -8, -30, -3, -34, 2, 0], "#3b2470", "#150c2b", 1.5); poly(g, [-4, 0, 2, -52, 8, -56, 13, -14, 14, 0], "#5a34a8", "#150c2b", 1.5);
      poly(g, [2, -52, 8, -56, 9, -30, 4, -34], "#8f66e0"); poly(g, [-8, -30, -3, -34, -4, -14, -9, -10], "#6a42c0");
      g.fillStyle = "rgba(255,255,255," + 0.45 * p + ")"; g.beginPath(); g.arc(6, -44, 1.6, 0, 6.3); g.fill();
    };
    D.bones = function (g, d) {
      ell(g, 0, 2, 16, 6, "rgba(0,0,0,.22)");
      g.strokeStyle = "#cfc6b6"; g.lineWidth = 3; g.lineCap = "round"; g.beginPath(); g.moveTo(-12, -4); g.lineTo(10, -2); g.moveTo(-8, -10); g.lineTo(8, 2); g.stroke();
      g.fillStyle = "#e6dccb"; g.beginPath(); g.ellipse(2, -10, 8, 7, 0, 0, 6.3); g.fill(); g.fillStyle = "#1c1724"; g.beginPath(); g.arc(-1, -11, 1.8, 0, 6.3); g.arc(5, -11, 1.8, 0, 6.3); g.fill();
    };
    D.ashmound = function (g, d, t) {
      ell(g, 0, 2, 22, 9, "rgba(0,0,0,.2)"); poly(g, [-22, 0, -12, -14, 0, -18, 12, -12, 22, 0], "#6d6678", "#2a2433", 1.2); poly(g, [-4, -17, 0, -18, 10, -11, 2, -4], "#837b90");
      var e = 0.5 + Math.sin(t * 3 + (d.v || 0) * 7) * 0.5; g.fillStyle = "rgba(255,120,70," + 0.6 * e + ")"; g.beginPath(); g.arc(-4, -9, 1.5, 0, 6.3); g.fill();
    };
  }
})(typeof window !== "undefined" ? window : globalThis);
