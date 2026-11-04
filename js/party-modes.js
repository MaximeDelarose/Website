/* =========================================================================
   Party : les jeux et leurs modes versus.

   PARTY_GAMES : un jeu = sa page et son allure (icône, couleurs).
   PARTY_MODES : un mode =
     id, game         identifiant + jeu (PARTY_GAMES)
     name, desc, tip  textes (tip : rappel affiché pendant le décompte)
     min, max         nombre de joueurs (2 à 4)
     formats          "ffa" (chacun pour soi), "teams" (toutes les équipes),
                      ou des formats précis : "2-2", "1-2", "1-3"
     dur              durée max en secondes (chrono de la manche)
     rank             "score" (le plus haut), "survive" (dernier en vie, puis
                      score), "race" (premier arrivé, sinon le plus avancé)
     end              "last" : la manche s'arrête quand il ne reste qu'une
                      équipe en vie ; "first" : dès que quelqu'un finit
     retry            on recommence quand on perd, le meilleur score compte
     room             "all" / "team" : les joueurs partagent une vraie partie
                      en ligne du jeu (salon créé et rejoint tout seul)
     unit             unité affichée après le score
     opts             réglages passés au jeu (ctx.opts)
     bot              (facultatif) comment jouent les bots dans ce mode ; sans ce
                      champ, pas de bot. rate = points par seconde d'un bot
                      « moyen » (facile × 0,6, fort × 1,5), curve = accélération
                      (1 = régulier), death = [min, max] s avant d'être éliminé,
                      finish = [min, max] s pour finir (course), rain = envoie
                      des écureuils (Pluie d'écureuils). Valeurs approximatives,
                      à ajuster si les bots sont trop forts ou trop faibles.
   Une équipe est classée sur la moyenne de ses joueurs (score), sur son
   meilleur joueur (survie, course).
   ========================================================================= */
window.PARTY_GAMES = [
  { id: "survivor", name: "Écureuil Survivor", page: "jeu-classique.html", icon: "🐿️", color: "#5b8a4a" },
  { id: "merger", name: "Merger", page: "merger.html", icon: "🫧", color: "#e8873a" },
  { id: "dice", name: "Écureuil Dice", page: "dice.html", icon: "🎲", color: "#2f7f7a" },
  { id: "kingdice", name: "King Dice", page: "king-dice.html", icon: "👑", color: "#7a5ea8" },
  { id: "defense", name: "Écureuil Défense", page: "defense.html", icon: "🏰", color: "#8a5a3b" },
  { id: "idle", name: "Le Grand Chêne", page: "idle.html", icon: "🌳", color: "#b8860b" },
  { id: "chess", name: "Échecs", page: "echecs.html", icon: "♞", color: "#3f6b3a" },
];

window.PARTY_MODES = [
  /* ---------- Merger ---------- */
  { id: "merger-score", game: "merger", name: "Course au score", min: 2, max: 4, formats: ["ffa", "teams"], dur: 180, rank: "score", retry: true, unit: "pts",
    desc: "3 minutes pour faire le plus gros score. Si ton bac déborde, tu repars à zéro et ton meilleur score est gardé.",
    tip: "Enchaîne les combos : ils multiplient les points !", opts: { picked: [0, 1, 2, 3, 4, 5] }, bot: { rate: 55 } },
  { id: "merger-rain", game: "merger", name: "Pluie d'écureuils", min: 2, max: 4, formats: ["ffa", "teams"], dur: 300, rank: "survive", end: "last", unit: "pts",
    desc: "Chaque groupe que tu éclates fait pleuvoir des écureuils chez tes adversaires. Le dernier bac qui ne déborde pas gagne.",
    tip: "Gros groupes et combos = grosse averse chez les autres.", opts: { picked: [0, 1, 2, 3, 4], garbage: true }, bot: { rate: 45, death: [90, 280], rain: true } },

  /* ---------- Écureuil Survivor ---------- */
  { id: "es-last", game: "survivor", name: "Dernier debout", min: 2, max: 4, formats: ["ffa", "teams"], dur: 480, rank: "survive", end: "last", unit: "s", tieAlive: true,
    desc: "Survie à plusieurs, tous dans la même partie en ligne (connexion automatique). Personne ne peut être relevé : le dernier écureuil debout gagne. Ceux qui tiennent les 8 minutes gagnent ensemble.",
    tip: "Pas de relève : ne prends aucun risque !", room: "all", opts: { mode: "survie", map: "clairiere", noRevive: true } },
  { id: "es-hunt", game: "survivor", name: "Grande chasse", min: 2, max: 4, formats: ["ffa", "teams"], dur: 300, rank: "score", unit: "éliminations",
    desc: "Chacun sa partie, sur la même carte. 5 minutes pour éliminer le plus de bestioles. Si tu tombes, ton total est gelé.",
    tip: "Les éliminations comptent, pas le temps de survie.", opts: { mode: "survie", map: "clairiere", metric: "kills" }, bot: { rate: 1.6 } },
  { id: "es-dungeon", game: "survivor", name: "Speedrun du donjon", min: 2, max: 4, formats: ["ffa", "teams"], dur: 900, rank: "race", unit: "pts",
    desc: "Même donjon pour tout le monde. Le premier à vaincre le boss du 3ᵉ étage gagne ; sinon, au bout de 15 minutes, le plus avancé l'emporte.",
    tip: "Fonce vers l'escalier, les salles facultatives coûtent du temps.", opts: { mode: "dungeon", dungeon: "terriers", metric: "score" }, bot: { rate: 12, finish: [420, 840] } },
  { id: "es-arena", game: "survivor", name: "Arène : qui tient le plus", min: 2, max: 4, formats: ["ffa", "teams"], dur: 600, rank: "survive", end: "last", unit: "pts",
    desc: "Chacun dans son arène. Le dernier en vie gagne ; au bout de 10 minutes, le meilleur score départage.",
    opts: { mode: "arena", metric: "score" }, bot: { rate: 30, death: [200, 560] } },

  /* ---------- Écureuil Dice ---------- */
  { id: "rd-duel", game: "dice", name: "Duel de dés", min: 2, max: 2, formats: ["ffa"], dur: 720, rank: "survive", end: "last", unit: "vagues",
    desc: "Le versus en ligne du jeu, connecté tout seul : chacun défend sa réserve, les fusions envoient des ennuis en face. Le premier qui tombe perd.",
    room: "all", opts: { kind: "net-vs" } },
  { id: "rd-coop", game: "dice", name: "Duo contre duo", min: 4, max: 4, formats: ["2-2"], dur: 720, rank: "survive", end: "last", unit: "vagues",
    desc: "Chaque équipe de 2 joue une partie coop en ligne. L'équipe qui tient le plus longtemps gagne (sinon la vague la plus haute au bout de 12 minutes).",
    room: "team", opts: { kind: "net-coop" } },
  { id: "rd-survive", game: "dice", name: "Tenir la réserve", min: 2, max: 4, formats: ["ffa", "teams"], dur: 480, rank: "survive", end: "last", unit: "pts",
    desc: "Chacun sa partie solo, même carte et même graine. Le dernier à tenir gagne ; au bout de 8 minutes, le meilleur score (vague × 100 + éliminations).",
    opts: { kind: "solo" }, bot: { rate: 5, death: [180, 460] } },

  /* ---------- King Dice ---------- */
  { id: "kd-score", game: "kingdice", name: "Le roi le mieux gardé", min: 2, max: 4, formats: ["ffa", "teams"], dur: 240, rank: "score", unit: "pts",
    desc: "Chacun protège son roi, seul à la souris sur les deux côtés. Les vagues partent toutes seules : au bout de 4 minutes, le plus gros score gagne.",
    tip: "Fusionne vite, les vagues n'attendent pas.", opts: { kind: "solo", autoWave: 6 }, bot: { rate: 22 } },
  { id: "kd-duel", game: "kingdice", name: "Duel de rois", min: 2, max: 2, formats: ["ffa"], dur: 600, rank: "survive", end: "last", unit: "pts",
    desc: "Le versus en ligne de King Dice, connecté tout seul : chacun son roi, on s'envoie des ennemis. Le premier roi qui tombe perd.",
    room: "all", opts: { kind: "net-vs" } },
  { id: "kd-coop", game: "kingdice", name: "Deux royaumes", min: 4, max: 4, formats: ["2-2"], dur: 420, rank: "survive", end: "last", unit: "pts",
    desc: "Chaque équipe de 2 protège un roi en coop en ligne. L'équipe dont le roi tient le plus longtemps gagne (sinon le meilleur score au bout de 7 minutes).",
    room: "team", opts: { kind: "net-coop", autoWave: 8 } },

  /* ---------- Écureuil Défense ---------- */
  { id: "td-race", game: "defense", name: "Course aux manches", min: 2, max: 4, formats: ["ffa", "teams"], dur: 300, rank: "score", unit: "pts",
    desc: "Même carte, même difficulté, manches enchaînées automatiquement. Au bout de 5 minutes, celui qui est allé le plus loin gagne (manche × 1000 + éliminations).",
    tip: "Accélère (×2) quand tu es sûr de ta défense.", opts: { map: "clairiere", mode: "normal" }, bot: { rate: 45 } },

  /* ---------- Échecs ---------- */
  { id: "ch-blitz", game: "chess", name: "Blitz", min: 2, max: 2, formats: ["ffa"], dur: 660, rank: "score", unit: "pts",
    desc: "Une partie d'échecs en ligne, 5 minutes par joueur, connectée toute seule. Victoire 2 points, nulle 1. Si le chrono de la manche tombe avant la fin : nulle.",
    room: "all", opts: { kind: "net", tc: "5+0" } },
  { id: "ch-bot", game: "chess", name: "Course contre le bot", min: 2, max: 4, formats: ["ffa", "teams"], dur: 600, rank: "race", end: "first", unit: "pts",
    desc: "Tout le monde affronte le même bot (niveau 2). Le premier à le battre gagne la manche ; sinon, une nulle vaut mieux qu'une défaite.",
    tip: "Tu joues les Blancs. Vite et bien !", opts: { kind: "bot", level: 2 }, bot: { rate: 0, finish: [150, 520], winScore: 2 } },

  /* ---------- Le Grand Chêne ---------- */
  { id: "idle-sprint", game: "idle", name: "Sprint des glands", min: 2, max: 4, formats: ["ffa", "teams"], dur: 180, rank: "score", unit: "glands",
    desc: "Une forêt toute neuve (ta sauvegarde n'est pas touchée) : 3 minutes pour récolter le plus de glands.",
    tip: "Tape, recrute vite, puis laisse tourner.", opts: {}, bot: { rate: 25, curve: 1.6 } },
];
