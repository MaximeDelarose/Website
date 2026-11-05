/**
 * Clients récurrents de RADIA (Endless / PIMBÊCHE). Chaque client a : un prénom, un portrait (voir src/game/art/customers.ts), une
 * personnalité, des goûts, des répliques de demande / de remerciement / d'histoire (débloquées avec la fidélité).
 *
 * RÈGLES (testées dans tests/customers.test.ts) :
 *   - JAMAIS d'âge, d'origine ni de nationalité (ni dans les données, ni dans les textes) ;
 *   - le hijab est un choix de portrait comme un autre : il n'impose aucune personnalité ni aucun langage ;
 *   - quelques expressions familières ou religieuses seulement, et jamais dans toutes les répliques d'un client ;
 *   - répliques courtes (≤ 110 caractères) ; `{what}` est remplacé par la demande réelle (« 2 savons à la rose »).
 */
import type { CollectionId } from './items';

export type LikeId = CollectionId | 'soap';

export type HairStyle = 'long' | 'bob' | 'bun' | 'curly' | 'short' | 'wavy' | 'ponytail' | 'braid' | 'afro' | 'none';
export type Accessory = 'none' | 'glasses' | 'earrings' | 'flower' | 'beret' | 'headband' | 'scarf' | 'cap';

export interface PortraitSpec {
  /** 0..5 : du plus clair au plus foncé (teintes variées, aucune lecture d'origine). */
  skin: number;
  face: 'round' | 'oval' | 'heart' | 'square';
  hair: HairStyle;
  hairColor: string;
  /** Couleur du hijab (absent = cheveux visibles). */
  hijab?: string;
  accessory: Accessory;
  eyes: 'round' | 'almond' | 'sleepy' | 'bright';
  eyeColor: string;
  mouth: 'smile' | 'grin' | 'soft' | 'smirk';
  blush: boolean;
  /** Fond pastel du médaillon. */
  bg: string;
  /** Couleur du haut. */
  top: string;
}

export interface Customer {
  id: string;
  name: string;
  /** Personnalité (mots-clés internes : sert aux dialogues, jamais affichée telle quelle). */
  trait: string;
  likes: LikeId[];
  portrait: PortraitSpec;
  /** Demandes : `{what}` = la commande. */
  requests: string[];
  /** Remerciements (au moins 4 : jamais le même deux fois de suite). */
  thanks: string[];
  /** Histoires débloquées par la fidélité (niveau 2, 3, 4 et 5). */
  stories: [string, string, string, string];
  /** Peut devenir partenaire de PIMBÊCHE. */
  partner?: boolean;
}

const C = (c: Customer): Customer => c;

export const CUSTOMERS: Customer[] = [
  C({ id: 'yasmine', name: 'Yasmine', trait: 'douce et chaleureuse, aime les fleurs et les cadeaux', likes: ['flowers', 'gift', 'soap'],
    portrait: { skin: 2, face: 'round', hair: 'none', hairColor: '#6b4a3a', hijab: '#d9c2a0', accessory: 'earrings', eyes: 'round', eyeColor: '#5a3b2a', mouth: 'smile', blush: true, bg: '#fde8df', top: '#f2a7b8' },
    requests: ['Salam Radia ! Tu pourrais me préparer {what} ?', 'Coucou Radia, j\'aurais besoin de {what}, si tu peux ♡', 'Bonjour ! {what}, ce serait parfait pour offrir.'],
    thanks: ['Merci beaucoup Radia ! C\'est magnifique, t\'es adorable !', 'Oh, c\'est exactement ce que je voulais, merci ♡', 'Tu as un vrai don, merci mille fois !', 'Quel beau travail, ça va faire plaisir !'],
    stories: ['Tu te souviens de ma dernière commande ? Je l\'ai offerte, et elle a adoré !', 'Je parle de toi autour de moi : « la boutique de Radia », ça fait son effet.', 'J\'ai gardé l\'emballage de ton premier cadeau, il est trop joli pour le jeter.', 'Radia, tu fais partie de mes petits bonheurs de la semaine. Merci d\'exister ♡'] }),
  C({ id: 'ines', name: 'Inès', trait: 'drôle et spontanée, adore les chocolats, a souvent des cadeaux à préparer', likes: ['choc', 'gift', 'pastry'],
    portrait: { skin: 1, face: 'heart', hair: 'curly', hairColor: '#8a4b2a', accessory: 'flower', eyes: 'bright', eyeColor: '#6b4a2a', mouth: 'grin', blush: true, bg: '#ffe9c8', top: '#ffb27a' },
    requests: ['Coucou ! J\'ai besoin de {what}, tu peux m\'aider ?', 'Radia ! {what}, c\'est pour un cadeau et je suis à la bourre 😅', 'Dis, tu aurais {what} ? Je te donne mon éternelle gratitude.'],
    thanks: ['Mais j\'adore ! Tu gères trop !', 'Ahah, tu me sauves, je te dois un chocolat !', 'Parfait, je file l\'offrir avant d\'oublier !', 'Tu es la meilleure, officiellement.'],
    stories: ['Le cadeau de la dernière fois ? Un carton plein. Tout le monde en veut un !', 'J\'ai goûté tes chocolats en cachette… oups. Je recommande.', 'Je prépare une surprise énorme, et devine qui je veux dans l\'équipe ?', 'Tu sais que j\'ai une étagère « cadeaux de Radia » ? Elle est presque pleine !'] }),
  C({ id: 'amira', name: 'Amira', trait: 'élégante et attentionnée, apprécie les savons raffinés', likes: ['soap', 'perfume', 'jewel'],
    portrait: { skin: 3, face: 'oval', hair: 'none', hairColor: '#4a3328', hijab: '#e8b4c0', accessory: 'none', eyes: 'almond', eyeColor: '#3f2a1f', mouth: 'soft', blush: false, bg: '#f6e3ee', top: '#c9a0dc' },
    requests: ['Bonjour Radia, tu aurais {what} ?', 'Radia, j\'aimerais {what}, avec ton soin habituel.', 'Bonsoir, serait-il possible d\'avoir {what} ?'],
    thanks: ['Allah ybarek, quel beau travail !', 'C\'est délicat et très soigné, merci Radia.', 'Un vrai plaisir de te confier mes commandes.', 'Merci, c\'est d\'une grande élégance.'],
    stories: ['Le savon de la dernière fois parfume encore toute la maison.', 'Je t\'ai recommandée à des amies qui aiment les belles choses.', 'Tes finitions sont remarquables : on sent que tu les fais avec amour.', 'Garde ce petit mot : tu as un vrai talent, Radia ♡'] }),
  C({ id: 'nour', name: 'Nour', trait: 'créative, aime les décorations et les bouquets', likes: ['flowers', 'castle', 'gift'],
    portrait: { skin: 2, face: 'round', hair: 'none', hairColor: '#5a3a30', hijab: '#bda7e6', accessory: 'flower', eyes: 'bright', eyeColor: '#5a3b2a', mouth: 'grin', blush: true, bg: '#ece4fb', top: '#8fd3b0' },
    requests: ['Hello Radia ! Je prépare une déco, il me faudrait {what}.', 'J\'ai une idée de bouquet… {what}, tu pourrais ?', 'Radia, {what} pour mon atelier, s\'il te plaît !'],
    thanks: ['Oh, c\'est encore plus joli que dans ma tête !', 'Ça va rendre ma table sublime, merci !', 'J\'en ai des idées plein la tête grâce à toi !', 'Parfait, je prends des photos tout de suite.'],
    stories: ['J\'ai dessiné un croquis de ta boutique idéale. Je te le montre un jour !', 'Mon atelier a changé de couleurs grâce à tes bouquets.', 'On pourrait créer une collection ensemble, non ?', 'Chaque fois que je te vois, j\'ai envie de créer. Merci ♡'] }),
  C({ id: 'kenza', name: 'Kenza', trait: 'très expressive et amusante, cadeaux de dernière minute', likes: ['gift', 'choc', 'bag'],
    portrait: { skin: 3, face: 'heart', hair: 'ponytail', hairColor: '#2f2220', accessory: 'headband', eyes: 'almond', eyeColor: '#2f2220', mouth: 'grin', blush: true, bg: '#ffe1e1', top: '#ff7aa8' },
    requests: ['Radia, sauve-moi ! J\'ai complètement oublié un anniversaire ! {what} !', 'URGENT : {what}, c\'est pour dans une heure 🙈', 'Dis-moi que tu as {what}… je t\'en supplie.'],
    thanks: ['Wallah, tu m\'as sauvée !', 'Je t\'adore, je t\'adore, je t\'adore !', 'Héroïne du jour, c\'est toi !', 'Ouf ! Personne ne saura que j\'avais oublié.'],
    stories: ['Personne ne sait que mes cadeaux « inspirés » viennent de toi. Chut.', 'Cette fois j\'ai prévu à l\'avance ! … Enfin, presque.', 'Tu m\'as évité trois catastrophes ce mois-ci. Trois !', 'Je crois que tu es mon plan B préféré, et mon plan A aussi ♡'] }),
  C({ id: 'lina', name: 'Lina', trait: 'gérante d\'une boutique de cosmétiques, peut devenir partenaire de PIMBÊCHE', likes: ['soap', 'perfume', 'bag'], partner: true,
    portrait: { skin: 2, face: 'oval', hair: 'none', hairColor: '#4a3328', hijab: '#a9c9a4', accessory: 'glasses', eyes: 'sleepy', eyeColor: '#4a3328', mouth: 'smirk', blush: false, bg: '#e4f2e1', top: '#f6f0e4' },
    requests: ['Bonjour Radia, j\'aimerais tester {what} dans ma boutique.', 'Radia, {what} pour mes vitrines, tu peux ?', 'Peux-tu me préparer {what} ? Mes clientes posent des questions.'],
    thanks: ['C\'est superbe. Je crois qu\'on va beaucoup travailler ensemble !', 'Très pro, très joli. Merci Radia.', 'Mes clientes vont adorer.', 'Livraison parfaite, comme toujours.'],
    stories: ['Tes savons partent vite en boutique, c\'est bon signe.', 'Mes clientes demandent « les savons de Radia » par leur nom.', 'Radia, tes savons plaisent énormément. Ça te dirait qu\'on les propose dans ma boutique ?', 'Notre vitrine PIMBÊCHE marche super bien. Merci pour la confiance ♡'] }),
  C({ id: 'meriem', name: 'Meriem', trait: 'apprécie les produits artisanaux et les parfums', likes: ['perfume', 'soap', 'flowers'],
    portrait: { skin: 3, face: 'square', hair: 'braid', hairColor: '#3a2a22', accessory: 'earrings', eyes: 'almond', eyeColor: '#3a2a22', mouth: 'soft', blush: false, bg: '#f1e4d6', top: '#d6a77a' },
    requests: ['Salut Radia ! Je cherche {what}, du vrai fait main.', 'Tu aurais {what} ? J\'aime quand c\'est parfumé avec soin.', 'Radia, {what}, avec ton petit supplément d\'âme.'],
    thanks: ['Ça sent bon et ça se voit que c\'est fait main.', 'Voilà un travail d\'artisane, bravo !', 'Merci, c\'est exactement l\'ambiance que je voulais.', 'Je vais le garder précieusement.'],
    stories: ['J\'ai ouvert ton dernier parfum au marché : tout le monde s\'est retourné.', 'Je reconnaîtrais ta signature les yeux fermés, maintenant.', 'On devrait faire un stand ensemble un dimanche.', 'Merci de faire des choses belles et vraies ♡'] }),
  C({ id: 'leila', name: 'Leïla', trait: 'aime offrir de beaux coffrets', likes: ['gift', 'soap', 'jewel'],
    portrait: { skin: 2, face: 'round', hair: 'none', hairColor: '#4a3328', hijab: '#f0e6d2', accessory: 'none', eyes: 'round', eyeColor: '#4a3328', mouth: 'smile', blush: true, bg: '#fbf1dd', top: '#e8a0a0' },
    requests: ['Radia, je voudrais {what}, bien présenté pour offrir.', 'Un beau coffret ? {what}, si possible avec un ruban.', 'Bonjour ! {what}, que ce soit joli à ouvrir.'],
    thanks: ['Un vrai écrin, merci Radia !', 'Elle va être émue, c\'est certain.', 'La présentation est parfaite.', 'Merci, c\'est un cadeau dans le cadeau.'],
    stories: ['Ma tante a gardé la boîte de ton dernier coffret. Elle la trouve trop belle.', 'Offrir tes coffrets est devenu ma petite tradition.', 'J\'aimerais un coffret pour une occasion spéciale, tu me guideras ?', 'Tes coffrets font de moi la reine des cadeaux ♡'] }),
  C({ id: 'sarah', name: 'Sarah', trait: 'posée, aime les belles choses simples', likes: ['jewel', 'cloth', 'perfume'],
    portrait: { skin: 1, face: 'oval', hair: 'bob', hairColor: '#b07a4a', accessory: 'none', eyes: 'sleepy', eyeColor: '#6b8fa8', mouth: 'soft', blush: false, bg: '#e6eef8', top: '#9db8d9' },
    requests: ['Bonjour Radia, {what}, s\'il te plaît.', 'J\'aimerais {what}, rien de compliqué.', 'Tu pourrais me préparer {what} ?'],
    thanks: ['Parfait, merci Radia.', 'C\'est simple et beau, j\'adore.', 'Exactement ce qu\'il fallait.', 'Merci, belle journée à toi !'],
    stories: ['Je prends mon temps quand je choisis, mais avec toi c\'est facile.', 'Tes créations ont un côté apaisant que j\'aime beaucoup.', 'Je viens d\'emménager : j\'ai décoré avec tes objets.', 'Tu rends mes journées plus douces, merci ♡'] }),
  C({ id: 'sofia', name: 'Sofia', trait: 'pétillante, toujours pressée, adore les pâtisseries', likes: ['pastry', 'choc', 'gift'],
    portrait: { skin: 2, face: 'heart', hair: 'wavy', hairColor: '#7a3a2a', accessory: 'beret', eyes: 'bright', eyeColor: '#4a6b3a', mouth: 'grin', blush: true, bg: '#ffeed6', top: '#e86a6a' },
    requests: ['Radia ! {what} pour un goûter, vite vite !', 'Tu as {what} ? Mes invités arrivent !', 'Coucou, {what}, et surtout bien sucré !'],
    thanks: ['Un délice ! Merci merci merci !', 'Ça va disparaître en deux minutes, ahah !', 'Tu fais les meilleures gourmandises !', 'Parfait, je cours les servir !'],
    stories: ['Mon goûter de la semaine dernière : un triomphe grâce à toi.', 'On m\'a demandé ton adresse. Je n\'ai rien dit (mais presque).', 'Je rêve d\'une tablée entière de tes douceurs.', 'Chaque goûter est une fête quand tu es dans le coin ♡'] }),
  C({ id: 'nadia', name: 'Nadia', trait: 'réfléchie, aime planifier, collectionne les jolis sacs', likes: ['bag', 'cloth', 'acc'],
    portrait: { skin: 3, face: 'oval', hair: 'bun', hairColor: '#2a1d18', accessory: 'glasses', eyes: 'round', eyeColor: '#2a1d18', mouth: 'smile', blush: false, bg: '#e9e3f5', top: '#7a6bb0' },
    requests: ['Radia, j\'ai prévu {what} pour la semaine, tu peux ?', 'Bonjour, {what}, avec un peu d\'avance cette fois !', 'J\'ai noté : {what}. Tu t\'en occupes ?'],
    thanks: ['Tout est conforme, merci Radia !', 'Je coche la case : parfait.', 'Et en avance en plus, bravo !', 'Merci, ça tombe pile.'],
    stories: ['J\'ai fait une liste de mes boutiques favorites : la tienne est en haut.', 'Ton emballage, je le range à la bonne place, bien sûr.', 'Tu m\'as fait changer ma façon de choisir mes cadeaux.', 'Planifier avec toi, c\'est un plaisir ♡'] }),
  C({ id: 'samira', name: 'Samira', trait: 'solaire, adore recevoir du monde, généreuse', likes: ['pastry', 'flowers', 'soap'],
    portrait: { skin: 4, face: 'round', hair: 'none', hairColor: '#2a1d18', hijab: '#e39a6a', accessory: 'earrings', eyes: 'bright', eyeColor: '#2a1d18', mouth: 'grin', blush: true, bg: '#ffe6d0', top: '#f2c14a' },
    requests: ['Radia, j\'ai du monde à la maison : {what} ?', 'Dis, {what}, tu peux ? Je régale !', 'Bonjour, il me faudrait {what} pour ce soir.'],
    thanks: ['Merci du fond du cœur, tout le monde va être gâté !', 'Tu es un rayon de soleil, Radia.', 'C\'est beau et généreux, comme toi.', 'Je reviendrai, c\'est promis !'],
    stories: ['Mes invités ont voulu savoir d\'où venaient tes créations.', 'Ma table n\'a jamais été aussi belle.', 'Viens goûter un jour, je t\'invite !', 'Ta générosité me donne envie d\'en faire autant ♡'] }),
  C({ id: 'camille', name: 'Camille', trait: 'romantique et enthousiaste, aime les fleurs', likes: ['flowers', 'love', 'gift'],
    portrait: { skin: 1, face: 'heart', hair: 'long', hairColor: '#c98f5a', accessory: 'flower', eyes: 'bright', eyeColor: '#5a8f7a', mouth: 'smile', blush: true, bg: '#ffe4ec', top: '#ff9fb8' },
    requests: ['Coucou Radia ! J\'aimerais offrir {what} à quelqu\'un.', 'Un petit {what} pour une personne spéciale, tu peux ?', 'Radia, {what}, j\'ai le cœur qui bat !'],
    thanks: ['Oh merci ! C\'est encore plus joli que ce que j\'imaginais !', 'Il / elle va fondre, j\'en suis sûre.', 'C\'est romantique à souhait !', 'Je suis tellement contente !'],
    stories: ['Ça a marché : mon cadeau a fait mouche !', 'Je t\'écris tout : la suite de l\'histoire est mignonne.', 'Tu as un sixième sens pour les bouquets.', 'Grâce à toi, je crois encore plus à l\'amour ♡'] }),
  C({ id: 'chloe', name: 'Chloé', trait: 'sportive, franche, aime les cadeaux utiles', likes: ['acc', 'bag', 'pastry'],
    portrait: { skin: 1, face: 'square', hair: 'ponytail', hairColor: '#d9a85a', accessory: 'cap', eyes: 'round', eyeColor: '#4a7fa8', mouth: 'smirk', blush: false, bg: '#e2f1fa', top: '#5db0d9' },
    requests: ['Salut Radia ! {what}, mais du solide.', 'Il me faut {what}, rapide et efficace !', 'Tu as {what} ? C\'est pour un pote.'],
    thanks: ['Nickel, merci !', 'Direct, simple, parfait.', 'T\'es au top, Radia.', 'Ça, c\'est du bon matos !'],
    stories: ['Mon pote était ravi, il me redemande l\'adresse.', 'Tes trucs tiennent le coup, même au sport.', 'On fait un défi ? Qui livre le plus vite !', 'Franchement, t\'es une valeur sûre ♡'] }),
  C({ id: 'emma', name: 'Emma', trait: 'timide et gentille, toujours reconnaissante', likes: ['love', 'flowers', 'jewel'],
    portrait: { skin: 1, face: 'round', hair: 'braid', hairColor: '#8f5a3a', accessory: 'scarf', eyes: 'sleepy', eyeColor: '#6b4a2a', mouth: 'soft', blush: true, bg: '#fdeee4', top: '#c79ad9' },
    requests: ['Bonjour Radia… j\'aurais besoin de {what}, si ça ne te dérange pas.', 'Euh, {what}, s\'il te plaît ?', 'Pardon de te déranger : {what}.'],
    thanks: ['Oh… merci, c\'est parfait !', 'Tu es vraiment gentille, merci Radia.', 'Je n\'osais pas demander, et c\'est parfait.', 'Merci beaucoup, vraiment.'],
    stories: ['Je suis plus à l\'aise pour demander, grâce à toi.', 'Ton sourire m\'a donné du courage.', 'J\'ai offert ton cadeau en personne, pour une fois !', 'Merci d\'être patiente avec moi ♡'] }),
  C({ id: 'thomas', name: 'Thomas', trait: 'maladroit et drôle, oublie les anniversaires', likes: ['gift', 'choc', 'chess'],
    portrait: { skin: 1, face: 'square', hair: 'short', hairColor: '#4a3328', accessory: 'glasses', eyes: 'round', eyeColor: '#4a3328', mouth: 'grin', blush: false, bg: '#fff0d2', top: '#5a8fd9' },
    requests: ['Salut ! J\'ai encore besoin d\'un cadeau de dernière minute : {what}.', 'Radia, {what}… j\'ai oublié. Encore.', 'Je te jure que c\'est la dernière fois : {what} !'],
    thanks: ['Tu viens de sauver mon anniversaire, merci !', 'Ahah, tu m\'évites la honte du siècle !', 'Je note ton nom en gras dans mon agenda.', 'Je te dois une fleur. Ou dix.'],
    stories: ['J\'ai mis une alarme « Radia » dans mon téléphone, on avance.', 'J\'ai acheté un agenda. Je l\'ai déjà perdu.', 'Tu m\'as sauvé cinq fois. Cinq !', 'Un jour je serai à l\'heure. Pas aujourd\'hui. Merci ♡'] }),
  C({ id: 'antoine', name: 'Antoine', trait: 'grand amateur de chocolats, tranquille', likes: ['choc', 'pastry', 'gift'],
    portrait: { skin: 2, face: 'oval', hair: 'short', hairColor: '#2a2a2a', accessory: 'none', eyes: 'sleepy', eyeColor: '#3a2a1a', mouth: 'smile', blush: false, bg: '#efe0cf', top: '#7a5a46' },
    requests: ['Bonjour Radia, {what}, avec du chocolat si possible.', 'Je prendrais bien {what}, tranquillement.', 'Radia, {what} ? Un petit plaisir.'],
    thanks: ['Un régal, merci Radia.', 'Je vais le savourer doucement.', 'Rien ne vaut ton travail, vraiment.', 'Merci, c\'est ma pause préférée.'],
    stories: ['J\'ai fait goûter tes chocolats à mes collègues, plus rien à la fin.', 'Mon carré préféré reste le tien.', 'Je t\'ai trouvé une recette ancienne, je te la passe.', 'Merci pour ces petits bonheurs ♡'] }),
  C({ id: 'julien', name: 'Julien', trait: 'curieux, bricoleur, aime les choses bien faites', likes: ['castle', 'acc', 'chess'],
    portrait: { skin: 4, face: 'square', hair: 'afro', hairColor: '#1f1a18', accessory: 'headband', eyes: 'almond', eyeColor: '#2a1f18', mouth: 'smile', blush: false, bg: '#e4eefb', top: '#6bb39a' },
    requests: ['Salut Radia ! {what}, tu me dis comment tu fais ?', 'J\'aurais besoin de {what} pour un projet.', 'Radia, {what}, que ce soit bien fini.'],
    thanks: ['Impeccable, la finition est superbe !', 'Ça, c\'est du beau boulot.', 'Merci, je vais pouvoir terminer mon projet.', 'Très propre, bravo !'],
    stories: ['J\'ai bricolé un petit présentoir pour tes créations.', 'Je me suis mis à observer comment tu travailles.', 'On pourrait fabriquer quelque chose ensemble.', 'Tu m\'inspires, vraiment ♡'] }),
  C({ id: 'manon', name: 'Manon', trait: 'rêveuse, adore les histoires et les petits mots', likes: ['love', 'paris', 'flowers'],
    portrait: { skin: 2, face: 'heart', hair: 'long', hairColor: '#5a3a5a', accessory: 'headband', eyes: 'round', eyeColor: '#7a5a8a', mouth: 'smile', blush: true, bg: '#f0e6fa', top: '#ffb8d9' },
    requests: ['Radia, {what}, comme dans un conte.', 'J\'ai rêvé de {what}. Tu peux le rendre réel ?', 'Bonjour ! {what}, avec un petit mot dedans ?'],
    thanks: ['C\'est tout droit sorti d\'un conte, merci !', 'Tu rends les rêves réels, Radia.', 'Je vais glisser un mot dedans, c\'est parfait.', 'Merci, ça me met des étoiles dans les yeux.'],
    stories: ['J\'écris une histoire où une boutique ressemble à la tienne.', 'Ton dernier cadeau a fini dans mon journal.', 'Je t\'ai trouvé un personnage : une fée des savons.', 'Les histoires sont plus belles avec toi dedans ♡'] }),
  C({ id: 'elise', name: 'Élise', trait: 'raffinée, sérieuse, connaît les belles marques artisanales', likes: ['jewel', 'perfume', 'soap'],
    portrait: { skin: 3, face: 'oval', hair: 'bob', hairColor: '#1f1a18', accessory: 'earrings', eyes: 'almond', eyeColor: '#2a1f18', mouth: 'soft', blush: false, bg: '#f3e8e0', top: '#b06a8a' },
    requests: ['Bonjour Radia. {what}, je vous prie.', 'J\'ai un événement : {what}, avec la plus belle finition.', 'Pourrais-je avoir {what} ?'],
    thanks: ['Remarquable. Merci, Radia.', 'Une exécution irréprochable.', 'Mes invités n\'en reviendront pas.', 'C\'est exactement le niveau que j\'attendais.'],
    stories: ['J\'ai comparé avec de grandes maisons : ta finition tient la comparaison.', 'Je t\'ai cité devant des gens exigeants.', 'Je serais honorée de voir PIMBÊCHE à mon événement.', 'Tu mérites que ton nom soit connu ♡'] }),
];

export const customerById = (id: string): Customer | undefined => CUSTOMERS.find((c) => c.id === id);

/** Liste des clients qui apprécient une collection (pour choisir un client cohérent avec la commande). */
export const customersWhoLike = (like: LikeId): Customer[] => CUSTOMERS.filter((c) => c.likes.includes(like));
