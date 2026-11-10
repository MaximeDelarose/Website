/**
 * Ce que chaque personnage (fictif, adulte) répond quand Radia lui pose des questions libres : son métier, ses passions, son rêve, son week-end,
 * sa façon d'imaginer un rendez-vous, et ses réactions à des MOTS précis liés à son univers (« apiculteur » pour Léo, « tracteur » pour Kevin…).
 * Écrit à la main : une phrase = une bulle.
 */
export interface Facts {
  job: string[]; hobby: string[]; dream: string[]; weekend: string[]; date: string[];
  /** Réactions à des mots-clés de SON univers : [expression régulière sur le texte normalisé, répliques possibles]. */
  kw: [string, string[]][];
}

export const FACTS: Record<string, Facts> = {
  kevin: {
    job: ['Je m\'occupe de la ferme familiale. Enfin, surtout de Josiane. Et un peu des vaches.'], hobby: ['Les tracteurs. Je sais, c\'est pas une surprise.', 'La balade en tracteur le dimanche. Josiane adore.'],
    dream: ['Un jour, un tracteur avec le chauffage dans le siège. Josiane 2.0.', 'Avoir une grande tablée de gens que j\'aime bien, à la ferme.'], weekend: ['Lavage de Josiane, puis sieste avec Josiane. C\'est ma vie.', 'Marché le matin, tracteur l\'après-midi. Et toi ?'],
    date: ['Une balade en tracteur, Josiane briquée avec un petit coussin pour toi. Je te promets que c\'est romantique 😅', 'On prend Josiane et on va manger des crêpes au bord du champ ?'],
    kw: [['tracteur|josiane|moissonn|ferme|champ', ['Josiane t\'a déjà adoptée, je le sens.', 'Attends, tu me parles de tracteurs, là ? Je crois que je suis amoureux. De la conversation.']], ['vache|animaux|cochon|poule', ['Les vaches ? Elles me regardent comme si elles savaient des trucs.', 'J\'ai une vache qui s\'appelle Paulette. Elle est plus intelligente que moi.']]],
  },
  dylan: {
    job: ['Entrepreneur. Troisième projet. Le premier a fait un flop, le deuxième aussi, mais le troisième c\'est le bon, je le sens.', 'Je lance ma boîte. Là je cherche surtout un nom. Ça avance bien.'], hobby: ['Sport tous les jours. Pompes, course, un peu de boxe.', 'Muscu, networking, et dormir quand j\'ai le temps.'],
    dream: ['Réussir ma boîte, puis profiter. Avec quelqu\'un de bien à côté de moi.', 'Courir un marathon sans mourir. Un objectif réaliste.'], weekend: ['Séance du matin, brunch, puis un projet. Toi ?', 'Course à pied, puis je bosse sur mon projet jusqu\'à plus soif.'],
    date: ['Un petit-déj sportif puis une balade. Ou un dîner, j\'improvise bien.', 'Je t\'invite : resto, ensuite on marche. Je promets de pas parler startups plus de dix minutes.'],
    kw: [['startup|projet|business|entreprise|boite', ['Ah, on parle business ! Je te fais un pitch rapide : c\'est génial. Voilà, fin du pitch.']], ['sport|muscu|course|pompes|salle', ['Là tu parles ma langue. Quand est-ce qu\'on s\'entraîne ensemble ?']]],
  },
  maxime: {
    job: ['Je travaille dans l\'administratif. Rien de fou, mais j\'aime bien que les choses soient bien faites.', 'Un poste assez classique. Mes journées sont calmes, mes soirées plutôt cinéma.'], hobby: ['Le cinéma, surtout. Et les bons restos.', 'Les films, la cuisine, et lire. Je suis un peu casanier.'],
    dream: ['Une vie simple, avec quelqu\'un de sincère. Je sais, c\'est classique.', 'Construire quelque chose de solide. Un foyer, un jardin.'], weekend: ['Cinéma samedi, resto dimanche, si j\'ai de la compagnie.', 'Plutôt tranquille. Un film, un bon repas.'],
    date: ['Un dîner dans un petit restaurant calme. Je choisirais bien, tu verras.', 'Un ciné suivi d\'un dîner. Classique, mais ça marche.'],
    kw: [['film|cinema|serie', ['Ah, cinéma ! Dis-moi ton film préféré, je saurai tout de toi.']], ['resto|restaurant|manger', ['Les restos, c\'est ma passion discrète. Je te ferai découvrir une adresse.']]],
  },
  thomas: {
    job: ['Je travaille dans un bureau d\'études. Les plans, les cartes… ça me va bien.', 'Un métier tranquille : je mesure des choses. Euh, ça fait moins sexy dit comme ça.'], hobby: ['La randonnée, et les cartes anciennes. Je sais, c\'est rare.', 'Marcher dans la nature avec une vieille carte. C\'est mon bonheur.'],
    dream: ['Faire le tour d\'un massif sans croiser personne. Sauf quelqu\'un de gentil, peut-être.', 'Avoir une petite maison avec une grande carte au mur.'], weekend: ['Rando, normalement. Euh, je peux te proposer d\'en parler si ça t\'intéresse.', 'Une balade de 12 km et une vieille carte. Voilà mon week-end.'],
    date: ['Une balade tranquille, avec thermos. Euh, si ça te dit, hein.', 'Un café dans un endroit calme, sans pression. Je suis du genre transparent.'],
    kw: [['carte|plan|rando|montagne|sentier', ['Les cartes… tu m\'as eu. Je peux t\'en parler pendant des heures, tu risques de regretter.']]],
  },
  jordan: {
    job: ['Je bosse dans le voyage. Un peu de tout, mais je bouge beaucoup.', 'Je suis dans l\'événementiel, un métier où l\'on sourit beaucoup. Ça me va.'], hobby: ['Voyager, rire, passer du temps avec ma famille. Mon neveu m\'adore.', 'Les voyages, la musique, et faire rire les gens, c\'est mon sport.'],
    dream: ['Faire le tour du monde avec la bonne personne. Je laisse la place libre 😏', 'Une grande tablée, des rires, des gens que j\'aime.'], weekend: ['Je suis souvent chez ma famille, ou en balade. Et toi, tu fais quoi ?', 'Probablement un truc improvisé. J\'aime pas planifier.'],
    date: ['Un dîner aux chandelles ? Non, trop classique. Une soirée musique, et on danse mal ensemble 😄', 'Je t\'emmène quelque part où on ne s\'attend pas. Ça te dit ?'],
    kw: [['voyage|vacances|avion|pays|ile', ['Le voyage, c\'est ma religion. Tu as un pays de rêve ?']], ['famille|neveu|oncle', ['Mon neveu m\'a promu « oncle cool ». Meilleur titre de ma vie.']]],
  },
  julien: {
    job: ['Je suis dans la vente. Je vends tout, sauf moi, parce que c\'est déjà fait.', 'Je suis commercial. Je suis très bon. Ça s\'entend, non ?'], hobby: ['Moi. Je veux dire : me soigner, le sport, le développement personnel. Et toi ?', 'Les voyages, les belles montres, et parler de moi, avoue.'],
    dream: ['Trouver la femme de ma vie. Je suis sûr qu\'elle lit mes messages en ce moment.', 'Un jour, un livre sur ma vie. Titre : « Moi ».'], weekend: ['Salle, brunch, shopping. Une journée normale pour un homme comme moi.'],
    date: ['Je te réserve une table dans le meilleur restaurant. Je choisis la tenue, tu choisis la table.', 'Un cocktail chic, puis on voit. Je suis plein de surprises.'],
    kw: [['moi|toi|vente|argent', ['Ah, on parle de moi ? Je savais que ça arriverait.']]],
  },
  nicolas: {
    job: ['Coach sportif, indépendant. Je fais transpirer les gens pour de l\'argent. C\'est beau.', 'Je suis coach. Je motive les gens, y compris moi-même, trois fois par jour.'], hobby: ['Muscu, protéines, développement perso. Ma vie en trois mots.', 'La salle, la salle, et un peu de lecture sur la discipline.'],
    dream: ['Ouvrir ma salle. Et trouver quelqu\'un qui supporte mes shakers.', 'Être la meilleure version de moi-même. Et que quelqu\'un le remarque.'], weekend: ['Séance jambes samedi, séance bras dimanche. Le repos, c\'est pour les faibles. Enfin, un peu.'],
    date: ['Un footing à deux, puis un brunch protéiné. C\'est romantique, je te le garantis.', 'On fait une séance ensemble, puis je t\'offre un smoothie.'],
    kw: [['proteine|shaker|muscu|salle|sport|pompes', ['Là on se comprend. Tu t\'entraînes ? Je peux te faire un programme sur mesure.']]],
  },
  alexandre: {
    job: ['Je travaille dans la restauration, côté gestion. Je goûte, je compare, je note.', 'Un métier qui me fait manger de bonnes choses. Je ne me plains pas.'], hobby: ['La gastronomie, le vin, et mon carnet de restos. Tout y passe.', 'Cuisiner, goûter, découvrir des adresses. Ma boussole, c\'est l\'estomac.'],
    dream: ['Ouvrir un petit restaurant à moi. Avec une carte courte et honnête.', 'Faire un tour des meilleures tables d\'Europe, avec quelqu\'un qui sait apprécier.'], weekend: ['Marché le matin, repas qui dure trois heures. Voilà le programme.'],
    date: ['Je te fais découvrir une table que je garde secrète. Sans pression, mais avec du bon vin.', 'Un dîner, bien sûr. Je te laisse choisir le dessert.'],
    kw: [['manger|resto|restaurant|cuisine|vin|plat|gastronomie', ['Là, tu viens de toucher ma corde sensible. Raconte-moi ton plat préféré.']]],
  },
  baptiste: {
    job: ['Je suis dans un bureau, assez calme. Je range des choses. Ça me convient.', 'Rien de très excitant, mais mes listes sont impeccables.'], hobby: ['Le thé, les listes, et les films. Je sais, c\'est un peu mamie.', 'Écrire des listes de films à voir, boire du thé en les regardant.'],
    dream: ['Une vie simple, calme, avec une bonne tasse de thé et quelqu\'un qui reste.', 'Rien de grandiose. Un quotidien doux.'], weekend: ['Thé, film, liste. Peut-être dans cet ordre.', 'Je reste au chaud. Et je mets à jour mes listes.'],
    date: ['Un salon de thé, un film après. Si ça te va, bien sûr.', 'Un moment simple, sans prise de tête. Je crois que ça nous irait bien.'],
    kw: [['the|tisane|liste|film', ['Le thé, c\'est ma grande passion. Je peux te faire une liste de mes préférés. Je l\'ai déjà faite, en fait.']]],
  },
  hugo: {
    job: ['Je travaille dans l\'éducation. J\'aime transmettre, même quand c\'est fatigant.', 'Un boulot calme, plutôt humain. Les gens, ça m\'intéresse.'], hobby: ['La randonnée, le piano, et la cuisine ratée. Je dis « ratée » pour être honnête.', 'Je joue du piano le soir, parfois faux. Ça me détend.'],
    dream: ['Une connexion vraie. Et un piano dans un salon plein de lumière.', 'Voyager avec un sac léger, puis rentrer chez moi avec quelqu\'un à mes côtés.'], weekend: ['Randonnée samedi, cuisine ratée dimanche. Et toi ?'],
    date: ['Une randonnée tranquille, puis un repas que je cuisine. Je te préviens : c\'est une aventure.', 'Un café, une balade. Simple, authentique.'],
    kw: [['piano|musique|jouer', ['Le piano… tu veux que je te joue quelque chose un jour ? Je promets de pas rater trop de notes.']], ['cuisine|recette|plat', ['Ma cuisine est une expérience. Ne t\'attends à rien, ça aide.']]],
  },
  theo: {
    job: ['Je fais un peu de tout. Enfin, plutôt peu de tout. Je suis dans une phase de réflexion.', 'Intérim, pour l\'instant. Je teste des choses. Et toi ?'], hobby: ['Pizza ou sushis : je débats chaque soir. Aucune décision depuis 2019.', 'Je regarde des séries en me demandant si j\'en regarde assez.'],
    dream: ['Savoir ce que je veux. Ce serait déjà énorme, non ?', 'Un jour j\'aurai une réponse. Pour l\'instant je prends mon temps.'], weekend: ['Peut-être un truc. Peut-être rien. Je verrai. Toi ?'],
    date: ['Un resto, mais je ne sais pas lequel. Pizza ou sushis, tu choisis, ça m\'aide.', 'On verra, mais l\'idée me plaît. Je décide dans la semaine.'],
    kw: [['pizza|sushi', ['Pizza ou sushis, tu vois le dilemme. Tu es team quoi ? Je te laisse trancher.']]],
  },
  lucas: {
    job: ['Je suis dans l\'informatique, un peu de développement. Mon patron ne sait pas que je rêve de quêtes.', 'Un travail de bureau. Mon vrai métier, c\'est niveau 29 en coop.'], hobby: ['Les jeux vidéo, évidemment. Surtout en coopération.', 'Jouer, jouer, et jouer. Et manger de la pizza froide pendant.'],
    dream: ['Un partenaire de coop pour la vie. Dans le jeu et à côté, si possible.', 'Finir un jeu à 100 %. Puis recommencer.'], weekend: ['Partie en ligne samedi, partie en ligne dimanche. Et une pizza entre les deux.'],
    date: ['Une soirée jeu, puis une pizza. Tu choisis ton personnage. Je te laisse le meilleur.', 'On se fait une partie coop ? C\'est mon idée du romantisme.'],
    kw: [['jeu|jouer|console|manette|niveau|coop|partie', ['Là, tu viens de gagner mon respect. Tu joues à quoi ?']], ['pizza', ['La pizza froide, c\'est la meilleure. Je défendrai ce point jusqu\'au bout.']]],
  },
  antoine: {
    job: ['Professeur de lettres. Je corrige des copies, je fais lire des gens, je réponds à des questions bizarres.', 'J\'enseigne la littérature. Mes élèves me donnent des surnoms. Je les connais tous.'], hobby: ['Les livres, la randonnée, et l\'écoute. J\'aime écouter, c\'est rare.', 'Lire, marcher, discuter. Dans cet ordre, ou pas.'],
    dream: ['Écrire un livre un jour, même petit. Et avoir quelqu\'un pour le relire.', 'Une maison pleine de livres. Et d\'une personne à qui lire des passages.'], weekend: ['Randonnée, lecture. Je suis tranquille. Et toi ?'],
    date: ['Une librairie, puis un café. Je pourrais te lire un passage. Rassure-toi, pas trop long.', 'Une balade avec une conversation qui compte. Le reste est secondaire.'],
    kw: [['livre|lire|lecture|roman|auteur|poeme', ['Les livres… tu vas me faire parler pendant des heures. Quel est ton livre préféré ?']]],
  },
  romain: {
    job: ['Je travaille dans l\'audiovisuel, côté production. C\'est un petit monde.', 'Un peu de cinéma, un peu de bureaucratie. Surtout de bureaucratie.'], hobby: ['Cinéma d\'auteur, jazz, vin nature. Je sais, ça sonne cliché.', 'Les films qui durent trois heures et les conversations qui comptent.'],
    dream: ['Réaliser un film. Ou au moins en terminer un sans m\'endormir au milieu.', 'Une vie libre, sans compromis idiots.'], weekend: ['Cinéma, bar à vin, peut-être un concert de jazz. Tu te joins ?'],
    date: ['Un film en VO, puis un verre de vin nature. Tu me diras ce que t\'en as pensé.', 'Un bar à jazz, et on discute jusqu\'à la fermeture.'],
    kw: [['film|cinema|realisateur|serie', ['Ah, cinéma. Donne-moi trois films et je te dis qui tu es. Enfin, j\'essaie.']], ['jazz|vin|musique', ['Le jazz, c\'est un mode de vie. Ou un mode de somnolence. Ça dépend du soir.']]],
  },
  mathieu: {
    job: ['Technicien, rien d\'extraordinaire. Les journées sont longues, la pêche les compense.'], hobby: ['La pêche. Patient. Très patient.', 'Pêcher, c\'est surtout attendre. Je suis bon à ça.'],
    dream: ['Une grande prise un dimanche matin, et quelqu\'un pour partager le thermos.', 'Rien de fou : une vie calme, un lac, du silence.'], weekend: ['Je pêche. Évidemment. Et toi ?'],
    date: ['Une matinée au bord du lac, thermos de café, et du silence. C\'est ma définition de la romance.', 'Je t\'emmène à mon coin secret de pêche. Je ne l\'ai jamais montré à personne.'],
    kw: [['peche|poisson|lac|riviere|thermos', ['Ah, la pêche. Je ne te l\'ai pas dit, mais j\'en parle rarement. Tu es privilégiée.']]],
  },
  florian: {
    job: ['Je travaille dans le commerce. Les gens, les sourires, la bonne ambiance.', 'Je suis dans l\'événementiel. Les fêtes, c\'est ma deuxième maison.'], hobby: ['Les fêtes, les gens sincères, et les bons moments. Pas de drama.', 'Sortir, danser, rire. Et mesurer 1,90 m, c\'est un hobby à plein temps.'],
    dream: ['Une vie sincère, avec des gens vrais. Et de la bonne musique.', 'Trouver quelqu\'un qui me fait rire sans effort.'], weekend: ['Soirée samedi, brunch dimanche. Et toi, tu es plutôt sortie ou canapé ?'],
    date: ['Un rooftop et une bonne playlist. Je choisis la musique, tu choisis la boisson.', 'Un dîner, puis on voit où la soirée nous emmène.'],
    kw: [['fete|soiree|danse|sortir|musique', ['Là tu me parles ! Je suis un grand fan des soirées qui finissent trop tard.']]],
  },
  clement: {
    job: ['Je m\'occupe d\'espaces verts. Les plantes, c\'est ma famille.', 'Un travail au grand air. Et chez moi, 27 plantes qui m\'attendent.'], hobby: ['Les plantes, le jardinage, le café. Voilà mon trio.', 'J\'arrose, je parle à mes plantes, je prends un café. Quotidien parfait.'],
    dream: ['Un grand jardin partagé. Avec des tomates, et quelqu\'un pour les goûter.', 'Un balcon qui déborde de verdure.'], weekend: ['Jardinage, café, jardinage. Ma vie est un cycle parfait.'],
    date: ['Je te fais visiter mon jardin, puis un café sur le balcon. Mes plantes sont sages, promis.', 'Une balade dans un parc, on nomme les arbres ensemble.'],
    kw: [['plante|jardin|fleur|arbre|tomate|cactus', ['Mes plantes seraient ravies de t\'entendre. Gérard surtout, il adore les compliments.']]],
  },
  pierre: {
    job: ['Je travaille dans une administration. Les blagues m\'aident à tenir.', 'Je suis… comptable. Je compte les blagues aussi, il y en a trop.'], hobby: ['Les blagues. Elles sont nulles, mais je les assume.', 'Les calembours, les crêpes, et faire soupirer les gens.'],
    dream: ['Faire rire quelqu\'un en dehors de la pitié. Un grand rêve.', 'Ouvrir une crêperie à jeux de mots. « La Crêpe Toi Toi ».'], weekend: ['Crêpes le matin, calembours l\'après-midi. Et toi ?'],
    date: ['Une crêperie, évidemment. Je prends un « beurre-sucre » et tu prends ce que tu veux.', 'Un café avec une blague nulle en entrée. Tu vois, je prépare le terrain.'],
    kw: [['blague|calembour|rire|drole', ['Ah, tu aimes les blagues ? Attends, j\'en ai une. Non, elle est nulle. Si, je la dis quand même.']], ['crepe', ['Les crêpes, c\'est la seule chose que je réussis du premier coup. Presque.']]],
  },
  samuel: {
    job: ['Musicien à mes heures, et à d\'autres heures, employé dans un magasin. Mon groupe a trois fans, dont ma tante.', 'Je suis guitariste. Le reste, c\'est pour payer les cordes.'], hobby: ['La guitare, les compositions, les concerts de salon.', 'Écrire des chansons que personne ne comprend. C\'est mon art.'],
    dream: ['Une vraie scène, et une chanson pour toi. Si tu es partante.', 'Que quelqu\'un chante mes paroles dans la rue.'], weekend: ['Concert de salon samedi. Tu viens ? On est trois, ma tante comprise.'],
    date: ['Je te joue une chanson que j\'ai écrite. Elle est un peu triste, mais jolie.', 'Un petit bar avec de la musique live, et on parle de tout.'],
    kw: [['guitare|musique|chanson|concert|groupe|chanter', ['La musique ! Tu chantes ? Moi, c\'est ma vie, malgré les trois fans.']]],
  },
  victor: {
    job: ['Je travaille dans la logistique. Je suis organisé, très organisé, au cas où.', 'Un métier sérieux. Je prépare toujours des plans B.'], hobby: ['La survie, la randonnée, les conserves. Je suis prêt pour tout.', 'Apprendre des techniques d\'autonomie. Si l\'apocalypse arrive, tu m\'appelles.'],
    dream: ['Rester en vie. Avec bonne humeur.', 'Une cabane autonome et quelqu\'un à protéger, symboliquement.'], weekend: ['Randonnée avec sac de survie. Au cas où, tu sais.'],
    date: ['Une randonnée avec pique-nique. J\'apporte tout : trousse de secours, thermos, et sourire.', 'Un dîner. J\'ai un plan A, B et C.'],
    kw: [['apocalypse|survie|conserve|bunker|catastrophe', ['Ah, tu poses la bonne question. J\'ai assez de conserves pour tenir six mois. Et un carnet.']]],
  },
  adrien: {
    job: ['Je suis dans le conseil. Entre nous, je lis les étoiles avant les contrats.', 'Un métier de bureau. Mon vrai métier, c\'est l\'astrologie, mais ça paye moins.'], hobby: ['L\'astrologie, le thé, regarder les étoiles. Je sais ce qui va arriver, d\'ailleurs.', 'Les astres, les cartes du ciel. Je sais déjà ton signe, je crois.'],
    dream: ['Voir une éclipse totale avec quelqu\'un de spécial.', 'Comprendre pourquoi Mercure est toujours rétrograde quand ça m\'arrange.'], weekend: ['Observation des étoiles, si le ciel est dégagé. Mercure décidera.'],
    date: ['Une soirée sous les étoiles avec un thé. Je t\'explique les constellations.', 'Je regarde ton thème astral, on en discute autour d\'un dîner.'],
    kw: [['signe|horoscope|astro|etoile|mercure|ciel|lune', ['Les astres ! Dis-moi ta date de naissance, je te dis tout. Ou presque.']]],
  },
  paul: {
    job: ['Je travaille dans une bibliothèque. Beaucoup de silence, beaucoup de livres.', 'Un métier calme. J\'aime ranger. Et lire en cachette.'], hobby: ['Le jardinage, la lecture, le thé. Je suis un peu timide, mais passionné.', 'Cultiver des choses, lire, boire du thé.'],
    dream: ['Une petite maison avec un potager, et quelqu\'un à qui lire.', 'Rien d\'extravagant : de la douceur.'], weekend: ['Potager et lecture. Un week-end parfait, je trouve.'],
    date: ['Une promenade dans un jardin, puis un thé. Si tu veux, bien sûr.', 'Un moment tranquille, sans pression. Je te laisserai choisir.'],
    kw: [['jardin|potager|plante|legume|livre|lire|the', ['Ah, tu aimes ça aussi ? Ça me rend heureux. Et un peu moins timide.']]],
  },
  karim: {
    job: ['Pâtissier. Je mets du sucre dans tout, y compris dans mes messages.', 'Je suis pâtissier, ce qui veut dire que mes journées sentent bon.'], hobby: ['La pâtisserie, évidemment. Les desserts, l\'humour, et goûter ce que je fais.', 'Créer des desserts, et faire rire ceux qui les mangent.'],
    dream: ['Ouvrir ma pâtisserie, avec mon nom dessus. Et ton dessert préféré à la carte.', 'Faire le gâteau parfait. Je suis à 98 %.'], weekend: ['Fournée du samedi matin, puis repos. Et sieste sucrée.'],
    date: ['Je te prépare un dessert rien que pour toi, et on le mange ensemble.', 'Un salon de thé, plusieurs gâteaux, et on partage tout.'],
    kw: [['gateau|dessert|patisserie|sucre|chocolat|tarte|creme|croissant', ['Là, tu tombes sur le bon. Dis-moi ton dessert préféré et je te le prépare.']]],
  },
  enzo: {
    job: ['Coiffeur. Je passe mes journées à dire « on fait quoi aujourd\'hui ? » à des gens qui répondent « comme d\'habitude ».', 'Je tiens un salon. Les gens me confient leurs cheveux et leurs secrets, dans cet ordre.'], hobby: ['Les coupes, les tendances, et me tromper de ciseaux. Un grand classique.', 'Inventer des coiffures. Certaines sont réussies, la plupart sont mémorables.'],
    dream: ['Avoir mon propre salon avec mon nom en néon. Et peut-être une cliente qui reste pour le café.', 'Gagner un concours de coiffure. Je suis à 40 % de préparation.'], weekend: ['Je coupe les cheveux de mes amis, qu\'ils le veuillent ou non.', 'Samedi : salon. Dimanche : sieste. Programme de star.'],
    date: ['Je te coiffe, tu me juges, on boit un café. C\'est le plan.', 'Un resto et une balade, et je promets de ne regarder aucune coupe de passant. Presque.'],
    kw: [['coupe|cheveux|coiffure|coiffeur|ciseaux|rasoir|barbe', ['Tu parles cheveux, là. Je suis déjà en train de t\'imaginer avec une coupe magnifique.', 'Les cheveux, c\'est mon domaine. Dis-moi tout : court, long, frange ?']]],
  },
  leo: {
    job: ['Je suis en reconversion. Pour la sixième fois. Cette fois, c\'est la bonne.', 'Je suis en reconversion. Je veux devenir apiculteur. Ou potier. Ou pilote de drone.'], hobby: ['Tester des métiers. Je vous le jure, j\'ai essayé la poterie, les abeilles, et le drone.', 'Découvrir des trucs. Je suis très curieux, trop peut-être.'],
    dream: ['Trouver ma voie. En attendant, je goûte à tout.', 'Faire un métier qui me plaît vraiment. Ça m\'a l\'air chouette.'], weekend: ['Atelier de poterie, puis cours de drone. Ou l\'inverse.'],
    date: ['On teste un truc ensemble : cours de cuisine, de poterie, ou autre. Je suis ouvert à tout.', 'Un café, puis on invente la suite. J\'adore improviser.'],
    kw: [['apiculteur|abeille|miel|ruche', ['Je sais pas, les abeilles elles ont l\'air d\'avoir une vie plus organisée que moi 😭', 'Les abeilles ont un plan, des tâches, une reine. Moi j\'ai juste une application de to-do.']], ['potier|poterie|argile|poterie', ['La poterie, c\'est zen. Sauf quand le vase s\'effondre. Là c\'est moins zen.']], ['drone|pilote|voler', ['Pilote de drone, ça fait trop classe. Je me vois déjà avec une casquette.']], ['reconversion|metier|travail|changer', ['Oui, je suis en reconversion. Pour la sixième fois. Je suis un expert.']]],
  },
};

export const factsOf = (id: string): Facts | undefined => FACTS[id];
