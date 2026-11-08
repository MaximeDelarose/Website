/* =========================================================================
   Party : les jeux et leurs modes versus.

   PARTY_GAMES : un jeu = sa page et son allure (icône, couleurs).
   PARTY_MODES : un mode =
     id, game         identifiant + jeu (PARTY_GAMES)
     name             nom du mode
     short            (conseillé) une phrase, affichée dans la liste des modes
     desc             règles complètes (repliées sous « Règles » si short existe)
     tip              rappel affiché pendant le décompte
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
/* Les jeux du Versus sont en refonte : on les rajoute un par un, à la main.
   Modèle à copier pour un jeu et un mode :

   window.PARTY_GAMES = [
     { id: "merger", name: "Merger", page: "merger.html", icon: "🫧", color: "#e8873a" },
   ];
   window.PARTY_MODES = [
     { id: "merger-score", game: "merger", name: "Course au score", min: 2, max: 4,
       formats: ["ffa", "teams"], dur: 180, rank: "score", retry: true, unit: "pts",
       short: "3 minutes pour faire le plus gros score.",
       desc: "Si ton bac déborde, tu repars à zéro et ton meilleur score est gardé.",
       tip: "Enchaîne les combos !", opts: { picked: [0, 1, 2, 3, 4, 5] }, bot: { rate: 55 } },
   ];

   L'ancienne liste complète (Merger, Survivor, Dice, King Dice, Défense,
   Grand Chêne, Échecs) est dans l'historique git de ce fichier. */
window.PARTY_GAMES = [];
window.PARTY_MODES = [];
