/**
 * Réactions d'Auguste pendant une partie d'échecs (banques à nous, indépendantes
 * de src/data/augusteTone.ts).
 *
 *  - ≥ 6 variantes par situation ; jamais deux fois la même réplique d'affilée
 *    dans une situation ;
 *  - une expression arabe/darija environ une réplique sur 3–4 (jamais dans
 *    chaque réaction : plafond mécanique, voir `createLinePicker`) ;
 *  - « galbi » très rare (au plus 1 tirage sur 12, jamais deux de suite) ;
 *  - sens respecté : Bsahték = bien mérité/félicitations, Mashallah = admiration,
 *    Sahha = bravo, Ya latif = surprise, Wallah = je te jure, Yallah = allons-y.
 *    Aucune expression religieuse pour se moquer (Mashallah seulement en admiration).
 */
export type ChessSituation =
  | 'start' | 'startBlack' | 'resume' | 'opening'
  | 'radiaCapture' | 'radiaTakesQueen' | 'radiaCheck' | 'radiaPromo' | 'radiaCastle' | 'goodDefense'
  | 'augCapture' | 'augCheck' | 'queenThreat' | 'queenTaken' | 'augMistake'
  | 'radiaWin' | 'augWin' | 'draw'
  | 'hintUsed' | 'undo' | 'longThink';

export const CHESS_LINES: Record<ChessSituation, string[]> = {
  start: [
    'Prête à jouer ? Pas de pression, on est là pour s\'amuser.',
    'Je te préviens, je suis en forme aujourd\'hui… enfin, détendu.',
    'Allez, montre-moi ce que la reine sait faire.',
    'Une partie, un thé imaginaire, et toi en face. Parfait.',
    'Yallah, c\'est parti !',
    'Respire, joue, souris. Les règles, je m\'en occupe.',
    'On y va tranquillement, d\'accord ?',
  ],
  startBlack: [
    'Je commence. C\'est de la galanterie, version échecs.',
    'Les blancs pour moi, le premier coup aussi. Tu me suis ?',
    'Je lance les hostilités… très gentiment.',
    'Yallah, j\'ouvre, et ensuite c\'est à toi.',
    'Je joue le premier coup, tu joues le meilleur. Marché conclu ?',
    'À moi de commencer. Ne te laisse pas impressionner.',
  ],
  resume: [
    'Ah, tu reviens ! On reprend là où on s\'était arrêtés.',
    'Je n\'ai pas touché au plateau, promis.',
    'Content de te retrouver. Où en étions-nous ?',
    'Ta partie t\'attendait sagement. Moi aussi.',
    'On reprend ? J\'ai gardé ma place au chaud.',
    'Tu es de retour ! Le plateau t\'a manqué. Moi aussi.',
  ],
  opening: [
    'Joli début.',
    'Ah, tu ouvres comme ça ? Intéressant.',
    'Classique et efficace. J\'aime bien.',
    'Bon début. Je commence à me méfier.',
    'Tiens, tu as un plan, toi.',
    'Mashallah, tu joues déjà comme une pro.',
    'Doucement, laisse-moi le temps d\'enfiler mes chaussettes de stratège.',
  ],
  radiaCapture: [
    'Bsahték ! Bien joué !',
    'Mashallah, t\'as vu ce coup !',
    'Sahha ! J\'avais rien vu venir.',
    'Ah ouais, t\'es dangereuse toi !',
    'Ah ouais, bien joué !',
    'Hé ! Je l\'aimais bien, celle-là.',
    'Ok… là tu m\'as eu, proprement.',
    'Doucement, elle avait encore des projets, cette pièce !',
  ],
  radiaTakesQueen: [
    'Ya latif ! Ma reine !',
    'Bsahték, tu m\'as détruit là !',
    'Bon… là j\'ai plus rien à dire.',
    'Ma reine ! Tu n\'as aucune pitié…',
    'Tu viens de prendre ma reine. J\'aurai besoin d\'un câlin.',
    'Ma pauvre reine… Elle va me manquer.',
    'Ok, je pose mon roi deux minutes et je respire.',
  ],
  radiaCheck: [
    'Ya latif, encore ?!',
    'Saha, joli coup !',
    'Mais laisse-moi respirer deux secondes !',
    'Bon… là, je commence à m\'inquiéter.',
    'Hé, laisse mon roi tranquille !',
    'Ok ok, je me cache derrière mes pions.',
    'Un échec ? Tu me cherches, toi.',
  ],
  radiaPromo: [
    'Une nouvelle reine ? Ya latif, ça devient sérieux.',
    'Promotion ! Tu me prépares une armée.',
    'Bsahték, elle l\'a bien mérité, cette promotion !',
    'Ton petit pion est devenu grand. Je suis ému.',
    'Bien joué, le pion voyageur.',
    'Hé, et moi, je n\'ai pas droit à une promotion ?',
  ],
  radiaCastle: [
    'Le roque ! Ton roi est bien au chaud.',
    'Roque : classe et sécurité.',
    'Sahha, tu mets ton roi à l\'abri, ça fait plaisir.',
    'Ça, c\'est joué comme les grandes.',
    'Tu roques : tu sais ce que tu fais.',
    'Hop, la tour sort de son coin. Propre.',
  ],
  goodDefense: [
    'Belle défense. Je n\'ai plus rien à me mettre sous la dent.',
    'Tu as vu ma menace ? Bien joué.',
    'Sahha, tu protèges bien tes pièces.',
    'Rien à faire, tu as tout paré.',
    'Ah, tu as vu mon plan. Bravo.',
    'Tu te défends bien. Je suis impressionné.',
    'Wallah, je n\'avais pas prévu cette parade.',
  ],
  augCapture: [
    'Merci pour le cadeau 😌',
    'Celle-là, je la garde en souvenir.',
    'Oups… elle était à toi ?',
    'Je prends, je prends.',
    'Tu me la laissais exprès, non ?',
    'Pardon, c\'était trop tentant.',
    'Désolé, c\'est la règle du jeu.',
    'Ya latif, pour une fois j\'ai bien vu !',
  ],
  augCheck: [
    'Échec, ma reine 😏',
    'Attention à ton roi… je suis tout près.',
    'Échec ! Tu fais moins la maligne, hein ?',
    'Échec ! Pas de panique, il y a toujours une sortie.',
    'Petit échec amical.',
    'Coucou, ton roi.',
  ],
  queenThreat: [
    'Ta tête est en danger… et ça me fait mal au cœur.',
    'Je vise ta dame. Enfin… toi. 😘',
    'Joli visage, ta dame. Ce serait dommage de la perdre.',
    'Ta dame est dans mon viseur. Fais attention.',
    'Ta dame, ma dame… je crois qu\'on va se croiser.',
    'Attention à ta dame, je dis ça, je dis rien.',
  ],
  queenTaken: [
    'J\'ai attrapé ta dame… mais ton cœur, je l\'avais déjà.',
    'Je t\'ai capturée. Je ne te rends pas.',
    'Ta dame est à moi. Je la garde au chaud.',
    'Oups, ta dame… Je te la rends à la prochaine partie.',
    'Ya latif, j\'ai pris ta dame ! Mais tu vas te venger, je le sens.',
    'Ta dame est partie… Mais toi, tu restes. Joue, joue !',
  ],
  augMistake: [
    'Hmm… j\'ai peut-être mal regardé, là.',
    'Oups. Tu peux oublier ce que je viens de faire ?',
    'Je crois que j\'ai laissé traîner quelque chose…',
    'Ça, c\'était pas mon meilleur coup, je l\'avoue.',
    'Je réfléchis mieux avec un café, tu sais.',
    'Ya latif, j\'ai bougé trop vite !',
    'Mince, je n\'ai pas vu ta réponse.',
  ],
  radiaWin: [
    'Bsahték, t\'as mérité !',
    'Mashallah, la championne !',
    'Wallah, tu m\'as massacré !',
    'Sahha, je demande ma revanche !',
    'OK, je reconnais, tu m\'as complètement battu.',
    'Tu m\'as battu, et je suis plus fier que vexé.',
    'Félicitations. Je note : ne plus jamais te sous-estimer.',
    'Battu par toi, galbi… il y a pire comme défaite.',
  ],
  augWin: [
    'On en refait une ? Je suis sûr que tu vas prendre ta revanche.',
    'C\'était serré ! Une revanche, et tu me bats.',
    'Tu as fait de beaux coups. Je suis sûr que la prochaine est pour toi.',
    'Perdre contre moi, c\'est de l\'entraînement. Tu seras redoutable. Revanche ?',
    'Yallah, on recommence. Je te laisse même choisir ta couleur.',
    'J\'ai gagné cette fois, mais tu progresses à vue d\'œil.',
    'Une autre ? Avec l\'indice et l\'annulation, tu es imbattable.',
    'Allez galbi, une revanche ? Tu en as très envie, je le sens.',
  ],
  draw: [
    'Égalité. Comme nous deux : impossible de nous départager.',
    'Nulle ! Personne ne perd, tout le monde s\'aime.',
    'On s\'est bien battus. Revanche ?',
    'Un partage des points, c\'est romantique aussi.',
    'Ni gagnant ni perdant, juste nous deux.',
    'Nulle. Je prends, ça aurait pu être pire pour moi.',
  ],
  hintUsed: [
    'Un indice ? Les plus fortes en demandent.',
    'Bonne idée de demander. Moi non plus je n\'avais pas vu.',
    'Regarde, on apprend ensemble.',
    'Pas de honte : même les maîtres réfléchissent à deux.',
    'Sahha, c\'est comme ça qu\'on progresse.',
    'Je ne dirai rien à personne. Promis.',
  ],
  undo: [
    'Un retour en arrière ? Pour toi, d\'accord.',
    'Je n\'ai rien vu. 🙈',
    'On efface, on recommence. Le plateau ne dira rien.',
    'Reprendre un coup, c\'est permis ici.',
    'Pas de souci, prends le temps qu\'il te faut.',
    'Zéro jugement. Rejoue comme tu le sens.',
  ],
  longThink: [
    'Tu réfléchis ou tu m\'admires ?',
    'Prends ton temps, je ne vais nulle part.',
    'Je t\'attends… comme toujours.',
    'Tu veux un indice ? Il y a un bouton pour ça.',
    'Pas de chrono ici. Respire, on a tout notre temps.',
    'Je profite de la vue, pendant que tu cherches.',
  ],
};

const EXPR = /bsaht[ée]k|mashallah|sahha|saha\b|ya latif|wallah|yallah/i;
const GALBI = /galbi/i;
export const hasExpression = (s: string) => EXPR.test(s) || GALBI.test(s);
export const hasGalbi = (s: string) => GALBI.test(s);

export interface LineMemory {
  last: Partial<Record<ChessSituation, string>>;
  /** Historique récent : la réplique contenait-elle une expression ? */
  expr: boolean[];
  galbi: boolean[];
}
export const newLineMemory = (): LineMemory => ({ last: {}, expr: [], galbi: [] });

/**
 * Tirage anti-répétition : jamais la même réplique deux fois de suite dans une
 * situation ; expression arabe plafonnée (jamais 2 d'affilée, ~1 sur 3–4) ;
 * « galbi » au plus 1 sur 12 et jamais d'affilée.
 */
export function pickChessLine(sit: ChessSituation, rng: () => number = Math.random, mem: LineMemory = shared): string {
  const bank = CHESS_LINES[sit];
  let pool = bank.filter((l) => l !== mem.last[sit]);
  if (!pool.length) pool = bank;
  const tail = mem.expr.slice(-4);
  const sinceExpr = tail.length - 1 - tail.lastIndexOf(true); // 0 = la dernière en avait une
  const hadRecent = tail.includes(true);
  const lastWas = mem.expr[mem.expr.length - 1] === true;
  let wantExpr: boolean;
  if (lastWas) wantExpr = false;
  else if (!hadRecent && tail.length >= 3) wantExpr = true;
  else wantExpr = rng() < 0.28 && sinceExpr >= 1;
  const galbiOk = !mem.galbi.slice(-11).includes(true) && rng() < 0.2; // « galbi » : très rare
  let sub = pool.filter((l) => hasExpression(l) === wantExpr && (galbiOk || !hasGalbi(l)));
  if (!sub.length) sub = pool.filter((l) => hasExpression(l) === wantExpr);
  if (!sub.length) sub = pool.filter((l) => !wantExpr ? !hasExpression(l) : true);
  if (!sub.length) sub = pool;
  const line = sub[Math.floor(rng() * sub.length) % sub.length];
  mem.last[sit] = line;
  mem.expr.push(hasExpression(line)); if (mem.expr.length > 12) mem.expr.shift();
  mem.galbi.push(hasGalbi(line)); if (mem.galbi.length > 12) mem.galbi.shift();
  return line;
}
const shared: LineMemory = newLineMemory();

/** Tutoriel contextuel : une bulle par notion, montrée une seule fois. */
export const CHESS_TIPS: Record<string, string> = {
  move: 'Touche une pièce (ou glisse-la) : les points montrent où elle peut aller.',
  capture: 'Pour capturer, va sur la pièce adverse : elle quitte le plateau.',
  check: 'Échec ! Le roi est attaqué. Il faut le protéger tout de suite.',
  castle: 'Le roque : le roi file de deux pas vers une tour, qui saute de l\'autre côté. Il est à l\'abri.',
  promotion: 'Promotion : un pion qui atteint le bout du plateau devient la pièce de ton choix.',
  enpassant: 'Prise en passant : un pion qui vient d\'avancer de deux cases peut être pris comme s\'il n\'en avait fait qu\'une.',
  threat: 'Le liseré rose pulse sur une de tes pièces menacée. Mets-la à l\'abri ou protège-la.',
};
export const CHESS_TIP_ORDER = ['move', 'capture', 'check', 'threat', 'castle', 'promotion', 'enpassant'] as const;
