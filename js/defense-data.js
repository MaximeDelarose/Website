/* =========================================================================
   Écureuil Défense — données du jeu (modifiable à la main)
   Tours posées librement + 3 voies d'amélioration de 5 niveaux chacune.
   Règle des voies : 2 voies au maximum, et une seule peut dépasser le niveau 2.
   Les sprites des ennemis viennent d'Écureuil Survivor (js/game-data.js).
   ========================================================================= */
(function (root) {
  "use strict";

  /* =====================================================================
     Tours
     kind   : "proj" (projectiles visés), "ring" (projectiles tout autour),
              "chain" (foudre qui rebondit), "snipe" (tir instantané, portée infinie),
              "pulse" (onde sur toute la portée), "aura" (soutien), "farm" (économie)
     rate   : secondes entre deux attaques (upgrades : rateX multiplie)
     pierce : nombre de bestioles qu'un projectile peut toucher
     ap     : perce l'armure · camo : voit les bestioles camouflées
     Les autres nombres d'une amélioration s'ajoutent, les booléens/objets remplacent.
     ===================================================================== */
  var TOWERS = {
    noisette: {
      name: "Frondeur", role: "Écureuil à la fronde", cost: 200, color: "#c98d4a",
      fur: { t: "#f2b05e", d: "#b85e2a", o: "#e8873a", c: "#fdf3de", k: "#2b1709", n: "#6b4430" },
      desc: "Un écureuil qui lance des noisettes à la fronde. Pas cher, polyvalent.",
      base: { kind: "proj", range: 92, rate: 0.85, dmg: 2, pierce: 2, pspd: 320 },
      paths: [
        { name: "Force", up: [
          { n: "Noisettes aiguisées", c: 120, d: "+1 perforation.", m: { pierce: 1 } },
          { n: "Coque ferrée", c: 240, d: "+1 dégât et perce l'armure.", m: { dmg: 1, ap: true } },
          { n: "Grosse noix", c: 650, d: "Énorme noix qui roule à travers les rangs : +3 dégâts, +6 perforation.", m: { dmg: 3, pierce: 6, psize: 2 } },
          { n: "Noix de coco", c: 2400, d: "+8 dégâts, +18 perforation, dégâts ×2 sur les gros.", m: { dmg: 8, pierce: 18, bigMul: 1, psize: 2 } },
          { n: "Rocher roulant", c: 15000, d: "Un rocher qui écrase tout : +40 dégâts, +80 perforation, ×2 sur les boss.", m: { dmg: 40, pierce: 80, bossMul: 1, psize: 3 } } ] },
        { name: "Cadence", up: [
          { n: "Bras agile", c: 100, d: "Tire 15 % plus vite.", m: { rateX: 0.85 } },
          { n: "Bras éclair", c: 190, d: "Tire encore 20 % plus vite.", m: { rateX: 0.8 } },
          { n: "Triple jet", c: 480, d: "Lance 3 noisettes en éventail.", m: { count: 2, spread: 0.3 } },
          { n: "Pluie de noisettes", c: 3200, d: "Tire 2× plus vite et 2 noisettes de plus.", m: { rateX: 0.5, count: 2 } },
          { n: "Gatling à glands", c: 19000, d: "Une mitrailleuse : 2,5× plus vite, +3 dégâts, +3 perforation.", m: { rateX: 0.4, dmg: 3, pierce: 3, count: 2 } } ] },
        { name: "Vision", up: [
          { n: "Longue-vue", c: 90, d: "+25 de portée.", m: { range: 25 } },
          { n: "Œil de lynx", c: 160, d: "Voit les bestioles camouflées, +12 de portée.", m: { camo: true, range: 12 } },
          { n: "Noisettes chercheuses", c: 520, d: "Les noisettes suivent leur cible, +2 perforation.", m: { home: true, pierce: 2 } },
          { n: "Coup critique", c: 1900, d: "20 % de chances de faire ×5 dégâts.", m: { crit: 0.2, critMul: 2 } },
          { n: "Maître lanceur", c: 9500, d: "+3 dégâts. Pouvoir « Frénésie » : tire 4× plus vite pendant 8 s.", m: { dmg: 3, ability: { id: "frenzy", name: "Frénésie", cd: 45, dur: 8, x: 4 } } } ] },
      ] },

    braise: {
      name: "Canon", role: "Canon à braises", cost: 450, color: "#c8553d",
      fur: { t: "#f6d36b", d: "#a8321e", o: "#e0542a", c: "#ffd9a0", k: "#2b1709", n: "#6b2010" },
      desc: "Un canon qui tire des boulets de braise : ils explosent sur un groupe et percent l'armure.",
      base: { kind: "proj", range: 88, rate: 1.4, dmg: 2, pierce: 1, pspd: 230, splash: 18, ap: true, psize: 1 },
      paths: [
        { name: "Explosions", up: [
          { n: "Grosse mèche", c: 220, d: "Explosions plus larges (+7).", m: { splash: 7 } },
          { n: "Poudre noire", c: 380, d: "+2 dégâts.", m: { dmg: 2 } },
          { n: "Fournaise", c: 1200, d: "+4 dégâts, explosions plus larges, brûle (3/s pendant 3 s).", m: { dmg: 4, splash: 8, burn: 3, burnT: 3 } },
          { n: "Volcan", c: 3800, d: "+14 dégâts, assomme 0,3 s, ×2 sur les gros.", m: { dmg: 14, splash: 6, stun: 0.3, bigMul: 1 } },
          { n: "Cœur du volcan", c: 32000, d: "+60 dégâts, ×3 sur les boss. Pouvoir « Météore » : 3000 dégâts sur la plus grosse bestiole.", m: { dmg: 60, bossMul: 2, ability: { id: "meteor", name: "Météore", cd: 40, dmg: 3000, r: 40 } } } ] },
        { name: "Éclats", up: [
          { n: "Mèche courte", c: 260, d: "Tire 20 % plus vite.", m: { rateX: 0.8 } },
          { n: "Éclats", c: 420, d: "L'explosion projette 6 éclats.", m: { frags: 6, fragDmg: 1 } },
          { n: "Bombe grappe", c: 950, d: "+4 éclats, plus forts (+2).", m: { frags: 4, fragDmg: 2 } },
          { n: "Feu d'artifice", c: 3400, d: "Tire 40 % plus vite, +6 éclats.", m: { rateX: 0.6, frags: 6, fragDmg: 2 } },
          { n: "Pluie de braises", c: 21000, d: "Lance 3 bombes à la fois, 2× plus vite.", m: { rateX: 0.5, count: 2, spread: 0.35, fragDmg: 4 } } ] },
        { name: "Portée", up: [
          { n: "Long tube", c: 200, d: "+25 de portée.", m: { range: 25 } },
          { n: "Souffle", c: 320, d: "Les explosions assomment 0,15 s (pas les boss).", m: { stun: 0.15 } },
          { n: "Braise-fusée", c: 850, d: "Projectiles rapides et chercheurs, +20 de portée.", m: { pspdX: 2, home: true, range: 20 } },
          { n: "Onde de choc", c: 2900, d: "Assomme 0,5 s de plus, explosions plus larges.", m: { stun: 0.5, splash: 8, dmg: 4 } },
          { n: "Grand incendie", c: 17000, d: "Brûle fort (20/s). Pouvoir « Incendie » : enflamme toutes les bestioles.", m: { burn: 20, burnT: 4, dmg: 6, ability: { id: "inferno", name: "Incendie", cd: 50, dps: 60, t: 6 } } } ] },
      ] },

    rafale: {
      name: "Moulin", role: "Moulin à plumes", cost: 280, color: "#3f8f8a",
      fur: { t: "#e0fff8", d: "#3f8f8a", o: "#7fd1c7", c: "#f0fffb", k: "#2b1709", n: "#1f4f4a" },
      desc: "Ses ailes projettent 8 plumes tout autour. Petite portée : place-le dans un virage.",
      base: { kind: "ring", range: 52, rate: 1.3, dmg: 1, pierce: 1, count: 8, pspd: 300 },
      paths: [
        { name: "Lames", up: [
          { n: "Plumes tranchantes", c: 150, d: "+1 perforation.", m: { pierce: 1 } },
          { n: "Vent vif", c: 260, d: "Tire 25 % plus vite.", m: { rateX: 0.75 } },
          { n: "Tourbillon", c: 850, d: "16 plumes, 40 % plus vite.", m: { count: 8, rateX: 0.6 } },
          { n: "Cyclone", c: 3000, d: "+3 dégâts, +4 perforation, 2× plus vite.", m: { dmg: 3, pierce: 4, rateX: 0.5 } },
          { n: "Ouragan", c: 21000, d: "+12 dégâts, +10 perforation, 2× plus vite.", m: { dmg: 12, pierce: 10, rateX: 0.5 } } ] },
        { name: "Feu", up: [
          { n: "Plumes chaudes", c: 200, d: "Brûle 1/s pendant 2 s.", m: { burn: 1, burnT: 2 } },
          { n: "Grande rafale", c: 230, d: "+12 de portée.", m: { range: 12 } },
          { n: "Plumes de feu", c: 750, d: "+2 dégâts, perce l'armure, brûle plus.", m: { dmg: 2, ap: true, burn: 2 } },
          { n: "Anneau de feu", c: 3600, d: "Plus de plumes : un anneau brûle tout dans la portée (+6 dégâts).", m: { ringPulse: true, dmg: 6 } },
          { n: "Petit soleil", c: 30000, d: "+30 dégâts, +20 de portée, plus rapide.", m: { dmg: 30, range: 20, rateX: 0.6, burn: 10 } } ] },
        { name: "Contrôle", up: [
          { n: "Bise", c: 150, d: "Ralentit de 25 % pendant 1 s.", m: { slow: 0.25, slowT: 1 } },
          { n: "Plus de plumes", c: 300, d: "+4 plumes.", m: { count: 4 } },
          { n: "Vent arrière", c: 520, d: "Plumes plus rapides, +15 de portée.", m: { pspdX: 1.5, range: 15 } },
          { n: "Plumes collantes", c: 2100, d: "Assomme 0,25 s (pas les boss), +2 dégâts.", m: { stun: 0.25, dmg: 2 } },
          { n: "Maître du vent", c: 12500, d: "Pouvoir « Bourrasque » : repousse toutes les bestioles en arrière.", m: { dmg: 4, ability: { id: "gust", name: "Bourrasque", cd: 40, d: 90 } } } ] },
      ] },

    givre: {
      name: "Cristal", role: "Cristal de givre", cost: 320, color: "#5fa3c9",
      fur: { t: "#e6f6fa", d: "#5f8fb8", o: "#a8d8f0", c: "#ffffff", k: "#2b1709", n: "#5f8fb8" },
      desc: "Un cristal qui gèle tout ce qui l'entoure (les gros et les boss sont juste ralentis).",
      base: { kind: "pulse", range: 50, rate: 2.2, dmg: 0, freeze: 1.0, camo: true },
      paths: [
        { name: "Gel", up: [
          { n: "Givre mordant", c: 160, d: "L'onde fait 1 dégât.", m: { dmg: 1 } },
          { n: "Glace dure", c: 320, d: "Gèle 0,5 s de plus.", m: { freeze: 0.5 } },
          { n: "Glace perçante", c: 1300, d: "+2 dégâts, perce l'armure, gèle aussi les gros.", m: { dmg: 2, ap: true, freezeBig: true } },
          { n: "Hiver éternel", c: 2900, d: "+3 dégâts ; les bestioles touchées restent ralenties (50 %, 4 s).", m: { dmg: 3, slow: 0.5, slowT: 4 } },
          { n: "Zéro absolu", c: 23000, d: "+8 dégâts. Pouvoir « Zéro absolu » : gèle tout le chemin 4 s (boss 2 s).", m: { dmg: 8, ability: { id: "absolute", name: "Zéro absolu", cd: 50, t: 4 } } } ] },
        { name: "Fragilité", up: [
          { n: "Givre large", c: 150, d: "+12 de portée.", m: { range: 12 } },
          { n: "Glace fragile", c: 420, d: "Les bestioles gelées prennent +1 dégât de chaque coup.", m: { brittle: 1 } },
          { n: "Éclats de glace", c: 1250, d: "Chaque onde lance 8 éclats (2 dégâts).", m: { frags: 8, fragDmg: 2 } },
          { n: "Glacier", c: 3600, d: "+4 dégâts, gelées : +3 dégâts par coup.", m: { dmg: 4, brittle: 3, fragDmg: 2 } },
          { n: "Reine des neiges", c: 16000, d: "Ondes 2× plus fréquentes, +10 dégâts, gelées : +5.", m: { rateX: 0.5, dmg: 10, brittle: 5 } } ] },
        { name: "Ralentir", up: [
          { n: "Bise glacée", c: 130, d: "Ralentit aussi de 30 % pendant 2 s.", m: { slow: 0.3, slowT: 2 } },
          { n: "Vent du nord", c: 260, d: "+15 de portée.", m: { range: 15 } },
          { n: "Blizzard", c: 1500, d: "Ondes 30 % plus fréquentes, +15 de portée.", m: { rateX: 0.7, range: 15 } },
          { n: "Aura glaciale", c: 3200, d: "Tout ce qui est dans la portée est ralenti de 40 % en permanence.", m: { auraSlow: 0.4 } },
          { n: "Tempête polaire", c: 14500, d: "Aura 60 %, +4 dégâts, ondes 2× plus fréquentes, même les boss sont bien ralentis.", m: { auraSlow: 0.2, dmg: 4, rateX: 0.5, bossSlow: true } } ] },
      ] },

    eclair: {
      name: "Bobine", role: "Bobine à éclairs", cost: 420, color: "#4a4a8a",
      fur: { t: "#fff2a0", d: "#b8901a", o: "#f2c230", c: "#fffbe0", k: "#2b1709", n: "#8a6a10" },
      desc: "Une bobine de cuivre : la foudre frappe une bestiole puis rebondit sur 2 voisines.",
      base: { kind: "chain", range: 88, rate: 1.1, dmg: 2, chain: 2, chainR: 46 },
      paths: [
        { name: "Foudre", up: [
          { n: "Rebond", c: 220, d: "+1 rebond.", m: { chain: 1 } },
          { n: "Haute tension", c: 420, d: "+1 dégât.", m: { dmg: 1 } },
          { n: "Arc électrique", c: 1250, d: "+3 rebonds, +2 dégâts, sauts plus longs.", m: { chain: 3, dmg: 2, chainR: 14 } },
          { n: "Tempête", c: 4600, d: "+5 rebonds, 40 % plus vite, perce l'armure.", m: { chain: 5, rateX: 0.6, ap: true } },
          { n: "Esprit de l'orage", c: 29000, d: "+8 dégâts. Pouvoir « Orage » : 600 dégâts à toutes les bestioles.", m: { dmg: 8, chain: 4, ability: { id: "storm", name: "Orage", cd: 45, dmg: 600 } } } ] },
        { name: "Plasma", up: [
          { n: "Courant fort", c: 200, d: "+1 dégât.", m: { dmg: 1 } },
          { n: "Surcharge", c: 360, d: "Tire 25 % plus vite.", m: { rateX: 0.75 } },
          { n: "Boule de plasma", c: 1050, d: "Chaque impact explose un peu (+2 dégâts).", m: { splash: 14, dmg: 2 } },
          { n: "Plasma pur", c: 4200, d: "+7 dégâts, ×2 sur les boss.", m: { dmg: 7, bossMul: 1, ap: true } },
          { n: "Étoile de plasma", c: 27000, d: "+28 dégâts, 2× plus vite.", m: { dmg: 28, rateX: 0.5 } } ] },
        { name: "Esprit", up: [
          { n: "Œil du hibou", c: 250, d: "Voit les camouflées.", m: { camo: true } },
          { n: "Long arc", c: 300, d: "+25 de portée.", m: { range: 25 } },
          { n: "Étourdissement", c: 1150, d: "Assomme 0,4 s (pas les boss).", m: { stun: 0.4 } },
          { n: "Champ magnétique", c: 3300, d: "+3 rebonds, ralentit 40 %, assomme plus longtemps.", m: { chain: 3, slow: 0.4, slowT: 1.5, stun: 0.2 } },
          { n: "Nuée d'étincelles", c: 18500, d: "+10 rebonds, +10 dégâts.", m: { chain: 10, dmg: 10 } } ] },
      ] },

    guetteur: {
      name: "Mirador", role: "Hibou tireur d'élite", cost: 350, color: "#5a6a2a",
      fur: { t: "#8a6a4a", d: "#3a2a1a", o: "#6b5a3a", c: "#d8c8a0", k: "#2b1709", n: "#3a2a1a" },
      desc: "Un hibou perché sur son mirador : tir instantané à portée infinie, lent mais précis.",
      base: { kind: "snipe", range: 9999, rate: 1.6, dmg: 3 },
      paths: [
        { name: "Calibre", up: [
          { n: "Pomme de pin lourde", c: 320, d: "+2 dégâts.", m: { dmg: 2 } },
          { n: "Perce-coque", c: 480, d: "+2 dégâts, perce l'armure.", m: { dmg: 2, ap: true } },
          { n: "Coup d'élite", c: 2600, d: "+12 dégâts, ×2 sur les gros.", m: { dmg: 12, bigMul: 1 } },
          { n: "Tir mortel", c: 5200, d: "+30 dégâts.", m: { dmg: 30 } },
          { n: "Légende du guet", c: 31000, d: "+120 dégâts, ×3 sur les boss.", m: { dmg: 120, bossMul: 2 } } ] },
        { name: "Cadence", up: [
          { n: "Rechargement", c: 300, d: "Tire 25 % plus vite.", m: { rateX: 0.75 } },
          { n: "Lunette nocturne", c: 350, d: "Voit les camouflées.", m: { camo: true } },
          { n: "Double tir", c: 1600, d: "Touche 2 bestioles à chaque tir.", m: { count: 1 } },
          { n: "Tir automatique", c: 4600, d: "2,5× plus vite.", m: { rateX: 0.4 } },
          { n: "Arsenal", c: 21000, d: "2× plus vite, +2 cibles. Pouvoir « Frénésie » : 4× plus vite 8 s.", m: { rateX: 0.5, count: 2, ability: { id: "frenzy", name: "Frénésie", cd: 45, dur: 8, x: 4 } } } ] },
        { name: "Soutien", up: [
          { n: "Éclats", c: 260, d: "Chaque tir éclabousse autour (1 dégât).", m: { splash: 12, sdmg: 1 } },
          { n: "Ricochet", c: 520, d: "Le tir rebondit sur 2 bestioles proches.", m: { chain: 2, chainR: 55 } },
          { n: "Ravitailleur", c: 1600, d: "Rapporte 80 noisettes à chaque fin de manche.", m: { income: 80 } },
          { n: "Largage", c: 4600, d: "Pouvoir « Largage » : un colis de noisettes (500 + 20 par manche).", m: { ability: { id: "cash", name: "Largage", cd: 60, base: 500, per: 20 } } },
          { n: "Commandant", c: 16000, d: "Les tours à moins de 90 tirent 20 % plus vite. +20 dégâts.", m: { dmg: 20, cmdSpd: 0.2, cmdR: 90 } } ] },
      ] },

    chene: {
      name: "Chêne", role: "Vieux chêne (soutien)", cost: 650, color: "#3f6b3a",
      fur: { t: "#9cd06a", d: "#2f4f2a", o: "#5b8a4a", c: "#d8efb0", k: "#2b1709", n: "#1f3a1b" },
      desc: "N'attaque pas au début : les tours sous ses branches tirent 10 % plus vite.",
      base: { kind: "aura", range: 70, rate: 1, auraSpd: 0.1 },
      paths: [
        { name: "Sève", up: [
          { n: "Sève vive", c: 400, d: "Aura : +5 % de cadence.", m: { auraSpd: 0.05 } },
          { n: "Racines profondes", c: 500, d: "Aura : +10 % de portée aux tours.", m: { auraRange: 0.1 } },
          { n: "Sève dorée", c: 2100, d: "Aura : +1 dégât à chaque coup.", m: { auraDmg: 1 } },
          { n: "Chêne millénaire", c: 6400, d: "Aura : +15 % de cadence, +1 dégât, perce l'armure.", m: { auraSpd: 0.15, auraDmg: 1, auraAp: true } },
          { n: "Esprit de la forêt", c: 26000, d: "Pouvoir « Éveil » : les tours dans la portée tirent 2× plus vite pendant 10 s.", m: { auraDmg: 2, ability: { id: "awaken", name: "Éveil", cd: 50, dur: 10, x: 2 } } } ] },
        { name: "Vision", up: [
          { n: "Feuilles-yeux", c: 300, d: "Aura : les tours voient les camouflées.", m: { auraCamo: true } },
          { n: "Lucioles", c: 300, d: "+20 de portée.", m: { range: 20 } },
          { n: "Lumière des bois", c: 1500, d: "Les bestioles dans la portée perdent leur camouflage et prennent +1 dégât.", m: { expose: 1 } },
          { n: "Marque du chasseur", c: 4200, d: "+2 dégâts subis de plus.", m: { expose: 2 } },
          { n: "Lune des bois", c: 17000, d: "Aura : 15 % de coups critiques (×3), +3 dégâts subis.", m: { auraCrit: 0.15, expose: 3 } } ] },
        { name: "Ronces", up: [
          { n: "Épines", c: 300, d: "Le chêne pique tout ce qui passe dans sa portée (1/s).", m: { thorns: 1 } },
          { n: "Ronces", c: 620, d: "+2 aux épines, ralentit de 20 %.", m: { thorns: 2, slow: 0.2, slowT: 1 } },
          { n: "Ronces de fer", c: 1850, d: "+4 aux épines, percent l'armure.", m: { thorns: 4, ap: true } },
          { n: "Forêt vivante", c: 6200, d: "+12 aux épines, assomment 0,2 s.", m: { thorns: 12, stun: 0.2 } },
          { n: "Colère du chêne", c: 24000, d: "+45 aux épines, ×2 sur les boss.", m: { thorns: 45, bossMul: 1 } } ] },
      ] },

    pepite: {
      name: "Grenier", role: "Grenier à noisettes", cost: 1000, color: "#a8741a",
      fur: { t: "#ffe27a", d: "#a8741a", o: "#e0a82a", c: "#fff3c0", k: "#2b1709", n: "#6b4430" },
      desc: "N'attaque pas : rapporte 70 noisettes à chaque fin de manche.",
      base: { kind: "farm", range: 60, rate: 1, income: 70 },
      paths: [
        { name: "Récolte", up: [
          { n: "Grands paniers", c: 500, d: "+30 par manche.", m: { income: 30 } },
          { n: "Noisetier", c: 650, d: "+60 par manche.", m: { income: 60 } },
          { n: "Verger", c: 2600, d: "+160 par manche.", m: { income: 160 } },
          { n: "Plantation", c: 7800, d: "+420 par manche.", m: { income: 420 } },
          { n: "Empire des glands", c: 38000, d: "+1300 par manche.", m: { income: 1300 } } ] },
        { name: "Banque", up: [
          { n: "Tirelire", c: 450, d: "À chaque manche : +1 % de tes noisettes (50 max).", m: { interest: 0.01, interestCap: 50 } },
          { n: "Coffre", c: 700, d: "+1 % (150 max).", m: { interest: 0.01, interestCap: 100 } },
          { n: "Banque des bois", c: 2600, d: "+2 % (500 max).", m: { interest: 0.02, interestCap: 350 } },
          { n: "Grande banque", c: 7000, d: "+2 % (1500 max).", m: { interest: 0.02, interestCap: 1000 } },
          { n: "Trésor du chêne", c: 30000, d: "+4 % (5000 max).", m: { interest: 0.04, interestCap: 3500 } } ] },
        { name: "Marchand", up: [
          { n: "Rabais", c: 400, d: "Améliorations 5 % moins chères pour les tours dans la portée.", m: { discount: 0.05 } },
          { n: "Bon vendeur", c: 500, d: "Tes tours se revendent 5 % plus cher.", m: { sellBonus: 0.05 } },
          { n: "Gros rabais", c: 2100, d: "Rabais 10 %, +50 par manche.", m: { discount: 0.05, income: 50 } },
          { n: "Contrebandier", c: 6400, d: "+10 % de noisettes par bestiole vaincue.", m: { killBonus: 0.1 } },
          { n: "Grand marchand", c: 31000, d: "+15 % par bestiole. Pouvoir « Largage » : un colis de noisettes.", m: { killBonus: 0.15, ability: { id: "cash", name: "Largage", cd: 50, base: 1200, per: 40 } } } ] },
      ] },
  };
  var TOWER_ORDER = ["noisette", "braise", "rafale", "givre", "eclair", "guetteur", "chene", "pepite"];

  /* =====================================================================
     Bestioles (sprites du Survivor)
     hp : PV de base (multipliés à chaque manche) · spd : pixels/s · cash : noisettes gagnées
     leak : vies perdues si elle passe · armor : dégâts retirés à chaque coup (sauf « ap »)
     camo : invisible pour les tours sans vision · big : ni gelée ni assommée
     kids : bestioles libérées à sa mort
     ===================================================================== */
  var ENEMIES = {
    slug:     { name: "Limace", hp: 4, spd: 24, cash: 2, leak: 1, from: 1 },
    bunny:    { name: "Lapin", hp: 4, spd: 48, cash: 2, leak: 1, from: 3, hop: true },
    rat:      { name: "Rat", hp: 7, spd: 40, cash: 3, leak: 1, from: 5 },
    wasp:     { name: "Guêpe", hp: 3, spd: 64, cash: 1, leak: 1, from: 6, fly: true },
    beetle:   { name: "Scarabée", hp: 9, spd: 22, cash: 4, leak: 1, from: 11, armor: 1 },
    spider:   { name: "Araignée", hp: 8, spd: 30, cash: 3, leak: 2, from: 8, kids: { spiderling: 2 } },
    spiderling: { name: "Petite araignée", sprite: "spider", scale: 0.7, hp: 3, spd: 42, cash: 1, leak: 1, from: 999 },
    moth:     { name: "Papillon de nuit", hp: 6, spd: 36, cash: 3, leak: 1, from: 15, camo: true, fly: true },
    fox:      { name: "Renard", hp: 14, spd: 52, cash: 5, leak: 2, from: 14 },
    frog:     { name: "Grenouille", hp: 14, spd: 26, cash: 6, leak: 2, from: 16, regen: 1, hop: true },
    hedgehog: { name: "Hérisson", hp: 26, spd: 22, cash: 9, leak: 2, from: 20, armor: 3 },
    crow:     { name: "Corbeau", hp: 12, spd: 70, cash: 4, leak: 2, from: 21, fly: true, noSlow: true },
    toad:     { name: "Crapaud", hp: 90, spd: 16, cash: 25, leak: 8, from: 22, big: true, kids: { frog: 3 } },
    bat:      { name: "Chauve-souris", hp: 16, spd: 58, cash: 6, leak: 2, from: 25, camo: true, fly: true },
    turtle:   { name: "Tortue", hp: 170, spd: 12, cash: 45, leak: 10, from: 28, big: true, armor: 7 },
    badger:   { name: "Blaireau", hp: 400, spd: 14, cash: 90, leak: 20, from: 33, big: true, kids: { hedgehog: 3 } },
    // boss : une manche sur 10
    boar:     { name: "Grand Sanglier", hp: 260, spd: 9, cash: 150, leak: 100, boss: true, power: "charge" },
    queen:    { name: "Reine des guêpes", hp: 550, spd: 11, cash: 300, leak: 100, boss: true, power: "swarm", fly: true },
    stag:     { name: "Grand Cerf", hp: 1500, spd: 9, cash: 500, leak: 100, boss: true, power: "charge" },
    mushking: { name: "Roi Champignon", hp: 3800, spd: 8, cash: 800, leak: 100, boss: true, power: "heal" },
    golem:    { name: "Golem de racines", hp: 9000, spd: 7, cash: 1200, leak: 100, boss: true, power: "roots", armor: 12 },
  };
  var BOSSES = ["boar", "queen", "stag", "mushking", "golem"];

  /* =====================================================================
     Modes de difficulté
     ===================================================================== */
  var MODES = [
    { id: "facile", name: "Facile", rounds: 30, lives: 150, cash: 700, cost: 0.85, hp: 0.9, desc: "30 manches, tours moins chères" },
    { id: "normal", name: "Normal", rounds: 40, lives: 100, cash: 650, cost: 1, hp: 1, desc: "40 manches" },
    { id: "difficile", name: "Difficile", rounds: 50, lives: 50, cash: 650, cost: 1.08, hp: 1.05, desc: "50 manches, bestioles plus solides" },
    { id: "survie", name: "Survie", rounds: 60, lives: 1, cash: 650, cost: 1.08, hp: 1.05, desc: "60 manches, une seule vie" },
  ];

  /* =====================================================================
     Cartes : terrain logique 480 × 320
     paths : chemins (les bestioles alternent) · water : eau (on ne construit pas dessus)
     rocks / trees : obstacles décoratifs (pas de construction)
     ===================================================================== */
  var MAPS = [
    { id: "clairiere", name: "Clairière", level: "Facile", style: "dirt",
      paths: [[[-10, 60], [120, 60], [120, 250], [250, 250], [250, 90], [370, 90], [370, 220], [490, 220]]],
      water: [], rocks: [[60, 150, 14], [430, 140, 12]], trees: [[190, 160], [310, 290], [40, 280], [440, 40], [310, 170]] },
    { id: "riviere", name: "Rivière", level: "Moyen", style: "dirt",
      paths: [[[-10, 270], [80, 270], [80, 80], [200, 80], [200, 200], [300, 200], [300, 50], [420, 50], [420, 250], [330, 250], [330, 330]]],
      water: [[[140, 130], [170, 120], [175, 175], [150, 330], [110, 330], [125, 200]], [[360, 110], [395, 120], [380, 170], [350, 160]]],
      rocks: [[250, 280, 16], [30, 40, 12]], trees: [[250, 130], [460, 140], [30, 180], [240, 20], [460, 300]] },
    { id: "spirale", name: "Spirale", level: "Moyen", style: "moss",
      paths: [[[-10, 30], [450, 30], [450, 290], [40, 290], [40, 90], [390, 90], [390, 230], [100, 230], [100, 150], [300, 150]]],
      water: [], rocks: [[240, 190, 12]], trees: [[350, 190], [150, 190], [10, 160], [470, 160]] },
    { id: "carrefour", name: "Deux sentiers", level: "Difficile", style: "dirt",
      paths: [[[-10, 70], [140, 70], [140, 160], [240, 160], [340, 160], [340, 260], [490, 260]],
              [[-10, 250], [140, 250], [140, 160], [240, 160], [340, 160], [340, 60], [490, 60]]],
      water: [[[210, 220], [270, 215], [285, 260], [250, 300], [200, 280]]], rocks: [[240, 80, 16], [60, 160, 14], [430, 160, 14]], trees: [[60, 20], [60, 300], [420, 300], [420, 20]] },
    { id: "marais", name: "Marais", level: "Difficile", style: "swamp",
      paths: [[[200, -10], [200, 110], [60, 110], [60, 210], [280, 210], [280, 120], [400, 120], [400, 330]]],
      water: [[[0, 240], [120, 250], [180, 300], [160, 330], [0, 330]], [[300, 0], [480, 0], [480, 70], [420, 80], [330, 50]], [[110, 150], [180, 145], [200, 175], [150, 185]]],
      rocks: [[330, 280, 12]], trees: [[100, 40], [300, 280], [460, 200], [240, 280]] },
  ];

  /* =====================================================================
     Réglages
     ===================================================================== */
  var CFG = {
    W: 480, H: 320,
    pathW: 18,          // largeur du chemin
    towerR: 9,          // rayon d'une tour posée
    sell: 0.7,          // revente : 70 % de ce qui a été dépensé
    roundBonus: 100,    // noisettes en fin de manche (+ numéro de la manche)
    maxSpeed: 3,
  };

  root.TD_DATA = { TOWERS: TOWERS, TOWER_ORDER: TOWER_ORDER, ENEMIES: ENEMIES, BOSSES: BOSSES, MODES: MODES, MAPS: MAPS, CFG: CFG };
})(typeof window !== "undefined" ? window : globalThis);
