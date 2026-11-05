/**
 * Fils de commentaires de TikTak : commentaires variés (compliments, questions, fans, drôles, critiques, désagréables, jaloux),
 * réponses d'Auguste (compte « auguste », avatar illustré), likes fictifs (parfois viraux), petites discussions cohérentes.
 *
 * Tout est FICTIF et DÉTERMINISTE (mêmes clips → mêmes fils) ; aucune donnée réelle. Les critiques restent modérées : jamais d'attaque
 * violente ni de harcèlement, et la jalousie n'est jamais présentée comme LA cause d'une critique (certains n'aiment simplement pas).
 * Auguste ne parle jamais à la place de Radia. Logique pure (aucun DOM), testée dans tests/clips-threads.test.ts.
 */
import type { Topic } from './gen';

export type CommentKind = 'praise' | 'question' | 'fan' | 'funny' | 'critic' | 'rude' | 'jealous';
export const NEGATIVE: readonly CommentKind[] = ['critic', 'rude', 'jealous'];

export interface NegativeComment {
  id: string;
  by: string;
  kind: 'critic' | 'rude' | 'jealous';
  /** Sujets pour lesquels le commentaire a du sens (`any` = tous). */
  topics: readonly (Topic | 'any')[];
  text: string;
  /** Réponses possibles d'Auguste (au moins 3, toutes différentes). */
  augusteReplies: readonly string[];
}

/** 16 commentaires négatifs / critiques / jaloux × 3 réponses d'Auguste = 48 réponses différentes. */
export const NEGATIVES: readonly NegativeComment[] = [
  { id: 'n1', by: 'loulou75', kind: 'jealous', topics: ['any'], text: 'Je comprends pas pourquoi elle a autant de vues.', augusteReplies: ['Et pourtant t\'as pris le temps de regarder et de commenter.', 'Les vues, c\'est comme les cœurs : ça vient à celles qui les méritent.', 'Tu veux la recette ? Étape 1 : être elle.'] },
  { id: 'n2', by: 'missparis', kind: 'jealous', topics: ['any'], text: 'Encore une qui se prend pour une star.', augusteReplies: ['Elle a même pas besoin de se prendre pour quoi que ce soit, elle brille déjà.', 'Pour quelqu\'un qui se prend pour une star, elle reste étonnamment gentille avec tout le monde.', 'On se prend pas pour une star quand on en est une : on fait juste sa vie.'] },
  { id: 'n3', by: 'alexdu92', kind: 'critic', topics: ['any'], text: 'Elle a quoi de plus que les autres ?', augusteReplies: ['Je pourrais te faire une liste, mais j\'ai pas assez de batterie.', 'Du charme, du talent et un fan numéro un. C\'est un début.', 'Elle a surtout quelqu\'un qui répond à tes commentaires, regarde.'] },
  { id: 'n4', by: 'juliette', kind: 'critic', topics: ['tenues', 'sortie', 'photo'], text: 'Tout ça pour montrer une tenue ?', augusteReplies: ['Oui, et elle te la montre gratuitement. Pense à dire merci.', 'Tout ça pour une tenue ? Toi, tout ça pour un commentaire.', 'Une tenue, une vidéo, zéro raison de râler. Équation parfaite.'] },
  { id: 'n5', by: 'marco', kind: 'critic', topics: ['any'], text: 'Je vois pas ce qu\'elle a d\'exceptionnel.', augusteReplies: ['Heureusement que d\'autres ont de meilleures lunettes.', 'C\'est normal : l\'exceptionnel se voit mieux avec le cœur.', 'Ça tombe bien, elle ne cherche pas à t\'impressionner, toi.'] },
  { id: 'n6', by: 'inesstyle', kind: 'critic', topics: ['any'], text: 'Franchement, c\'est surcoté.', augusteReplies: ['Moi je trouve qu\'elle est encore sous-cotée.', 'Surcoté ? Il va falloir revoir ta calculette.', 'Si c\'est surcoté, pourquoi t\'es encore là ? Mystère.'] },
  { id: 'n7', by: 'vero.critique', kind: 'rude', topics: ['any'], text: 'Encore une vidéo inutile.', augusteReplies: ['Heureusement que t\'étais là pour augmenter les commentaires.', 'Inutile ? Tu l\'as regardée jusqu\'au bout, c\'est du sérieux.', 'Pour une vidéo inutile, tu as pris beaucoup de temps pour la commenter.'] },
  { id: 'n8', by: 'tom.grincheux', kind: 'rude', topics: ['tenues', 'carriere', 'photo'], text: 'Sa tenue est vraiment bizarre.', augusteReplies: ['Elle pourrait mettre un sac-poubelle, elle aurait encore du style.', 'Bizarre ? Non, avant-gardiste. Tu comprendras dans dix ans.', 'Le goût, ça ne s\'impose pas, mais ça se partage. Là, c\'est partagé par des milliers de gens.'] },
  { id: 'n9', by: 'sam.sceptique', kind: 'critic', topics: ['carriere', 'tenues', 'photo'], text: 'Elle croit vraiment qu\'elle est mannequin ?', augusteReplies: ['Elle a surtout le mérite d\'essayer et de travailler pour ses rêves.', 'Elle ne le croit pas, elle le fait. Nuance.', 'Le courage d\'essayer, ça se remarque. Le reste aussi.'] },
  { id: 'n10', by: 'lea.zoom', kind: 'jealous', topics: ['any'], text: 'Elle se croit au-dessus des autres.', augusteReplies: ['Ou alors elle fait juste sa vie tranquillement.', 'Au-dessus des autres ? Elle répond même à ceux qui sont pas gentils.', 'Elle est surtout au-dessus de la bagarre : elle ne se dispute jamais.'] },
  { id: 'n11', by: 'nico.dossier', kind: 'jealous', topics: ['any'], text: 'Pourquoi tout le monde l\'aime autant ?', augusteReplies: ['Peut-être parce qu\'elle est facile à aimer, justement.', 'Question honnête, réponse honnête : elle est sincère.', 'Toi aussi on t\'aime, tu sais : ta présence ici le prouve.'] },
  { id: 'n12', by: 'paul.sarcasme', kind: 'rude', topics: ['humour', 'chat', 'fans'], text: 'C\'est censé être drôle ?', augusteReplies: ['Pas besoin d\'être censé : ça l\'est, 2 000 personnes ont ri.', 'Si tu cherches quelque chose de drôle, ton commentaire est un bon début.', 'Rassure-toi : tout le monde rit sauf toi, c\'est une moyenne honorable.'] },
  { id: 'n13', by: 'clem.avis', kind: 'critic', topics: ['chat', 'fleurs', 'chocolat', 'chateau'], text: 'Encore la même chose, aucune originalité.', augusteReplies: ['Il y a des choses dont on ne se lasse pas : les chats, les fleurs, le chocolat…', 'Aucune originalité ? Elle a un style que personne n\'a copié.', 'La répétition, c\'est quand ça ne plaît pas. Là, tout le monde en redemande.'] },
  { id: 'n14', by: 'nora.top', kind: 'jealous', topics: ['fans', 'any'], text: 'Les fans, ça s\'achète maintenant.', augusteReplies: ['Les cœurs, ça ne s\'achète pas : ça se gagne.', 'Si ça s\'achète, tu peux en prendre une dizaine, je dis ça comme ça.', 'On ne paie pas la gentillesse : elle se mérite, et elle, elle l\'a.'] },
  { id: 'n15', by: 'max.analyse', kind: 'critic', topics: ['sortie', 'photo', 'chateau'], text: 'Un resto, une photo, des likes. Classique.', augusteReplies: ['Classique, mais avec un style qui n\'est pas donné à tout le monde.', 'Classique ? Alors l\'originalité, c\'est de ne rien poster ?', 'Ce classique-là donne faim et envie de sourire. Mission accomplie.'] },
  { id: 'n16', by: 'chloe.nuance', kind: 'jealous', topics: ['tenues', 'carriere'], text: 'Elle change de tenue tous les jours, c\'est du show.', augusteReplies: ['Du show ? Oui, et c\'est gratuit.', 'Elle est libre de changer de tenue, comme tu l\'es de changer de commentaire.', 'Moi je trouve qu\'elle n\'en change pas assez.'] },
];

/** Quand un critique s'adoucit après la réponse d'Auguste (réplique de l'auteur → réponse finale d'Auguste). */
export const FOLLOWUPS: readonly { author: string; auguste: string }[] = [
  { author: 'Bon, j\'avoue, la vidéo est pas mal.', auguste: 'Tu vois, on progresse !' },
  { author: 'OK, j\'ai exagéré, désolé.', auguste: 'Bienvenue dans le camp des gens heureux.' },
  { author: 'Bon… la musique est jolie quand même.', auguste: 'Ça, c\'est un beau commentaire. Merci !' },
  { author: 'Je n\'avais pas vu ce passage, c\'est beau.', auguste: 'Voilà, c\'est mieux. Un cœur pour toi ♡' },
  { author: 'Mouais, d\'accord, point pour toi.', auguste: 'Respect : reconnaître ça, c\'est pas donné à tout le monde.' },
  { author: 'Pas faux. Je retire ce que j\'ai dit.', auguste: 'On se calme, on s\'aime, on regarde la suite.' },
];

/** Réactions d'autres personnages sous une réponse d'Auguste. */
export const REACTIONS: readonly { by: string; text: string }[] = [
  { by: 'lila.petale', text: 'Il a tout dit !' }, { by: 'gaspard.humour', text: 'Mais MDR la réponse !' }, { by: 'maison.nour', text: 'Meilleur commentaire.' },
  { by: 'rose.atelier', text: 'Heureusement qu\'il est là !' }, { by: 'cacao.lou', text: 'Bien répondu !' }, { by: 'zoe.paillettes', text: 'Auguste, président !' },
  { by: 'theo.coulisses', text: 'Je suis venu pour ce fil.' }, { by: 'nina.scene', text: 'Ce fil est mieux que la vidéo 😂' }, { by: 'jardin.camille', text: 'Notre avocat préféré.' },
  { by: 'hugo.cuisine', text: 'Il défend comme personne.' },
];

/** Questions et messages de fans (en plus des compliments et commentaires drôles déjà fournis par gen.ts). */
export const QUESTIONS: readonly { by: string; text: string; topics: readonly (Topic | 'any')[] }[] = [
  { by: 'clara.lune', text: 'C\'est quelle musique ?', topics: ['any'] }, { by: 'sam.promenade', text: 'Où est-ce que tu as trouvé cette tenue ?', topics: ['tenues', 'sortie', 'carriere'] },
  { by: 'julie.ciel', text: 'Tu postes quand la suite ?', topics: ['any'] }, { by: 'eve.ruban', text: 'C\'est où, ce décor ?', topics: ['sortie', 'chateau', 'photo'] },
  { by: 'adam.bricole', text: 'Il s\'appelle comment, le chat ?', topics: ['chat'] }, { by: 'manon.thé', text: 'Tu peux refaire la même avec une autre couleur ?', topics: ['tenues', 'fleurs', 'chateau'] },
  { by: 'leo.vinyle', text: 'C\'est fait à la main ?', topics: ['chocolat', 'fleurs', 'chateau'] }, { by: 'studio.iris', text: 'Quelqu\'un a le nom de la chanson ?', topics: ['carriere', 'humour', 'any'] },
];
export const FAN_LINES: readonly { by: string; text: string }[] = [
  { by: 'lila.petale', text: 'Je te suis depuis le début, fière de toi !' }, { by: 'mira.danse', text: 'Mon petit rituel du soir : ta vidéo ♡' },
  { by: 'rose.atelier', text: 'T\'es ma créatrice préférée, point.' }, { by: 'zoe.paillettes', text: 'Tu m\'as redonné le sourire aujourd\'hui.' },
  { by: 'victor.deco', text: 'On attend toujours tes vidéos avec impatience !' }, { by: 'nina.scene', text: 'Tellement inspirante, merci ♡' },
];

// ------------------------------------------------------------------ types du fil
export type MsgKind = CommentKind | 'auguste' | 'react' | 'followup';
export interface ThreadMsg {
  /** Identifiant stable (sert aux likes de Radia et à ses réponses). */
  id: string;
  by: string;
  text: string;
  kind: MsgKind;
  likes: number;
  /** Réponse devenue virale (≥ 1 200 likes). */
  viral?: boolean;
}
export interface Thread { root: ThreadMsg; replies: ThreadMsg[] }

export interface ClipPopularity { id: string; topic: Topic; likes: number; mine?: boolean }

// ------------------------------------------------------------------ outils déterministes
function hash(s: string): number { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function rng(seed: number): () => number { let a = seed >>> 0 || 1; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const pick = <T,>(r: () => number, a: readonly T[]): T => a[Math.floor(r() * a.length)];

/** Likes fictifs d'un message : dépendent de la popularité du clip et du type de message (paliers 120 / 480 / 1 200 / 3 500 pour une réponse virale). */
export const VIRAL_AT = 1200;
export function likesFor(kind: MsgKind, pop: number, r: () => number): { likes: number; viral: boolean } {
  const scale = Math.max(0.15, Math.min(1.6, Math.log10(Math.max(10, pop)) / 3.4)); // ≈ 0,3 (50 likes) … ≈ 1,3 (20 000 likes)
  if (kind === 'auguste') {
    const roll = r();
    const viralChance = 0.05 + 0.13 * Math.min(1, scale);
    if (roll < viralChance * 0.35) return { likes: Math.round(3300 + r() * 400), viral: true }; // ≈ 3 500
    if (roll < viralChance) return { likes: Math.round(1100 + r() * 300), viral: true }; // ≈ 1 200
    const tier = r() < 0.5 ? 120 : 480;
    return { likes: Math.max(18, Math.round(tier * (0.7 + r() * 0.6) * Math.min(1, scale + 0.2))), viral: false };
  }
  if (kind === 'react' || kind === 'followup') return { likes: Math.round(4 + r() * 60 * scale), viral: false };
  // une critique attire parfois beaucoup de likes (comme sur un vrai réseau) : la réponse d'Auguste n'est donc pas toujours en tête
  if (kind === 'critic' || kind === 'rude' || kind === 'jealous') return { likes: r() < 0.32 ? Math.round((140 + r() * 800) * scale) : Math.round(r() * 90 * scale), viral: false };
  return { likes: Math.round(3 + r() * 140 * scale), viral: false };
}

/** Un clip reçoit-il des critiques ? (≈ 35 % des clips, jamais systématique ; une publication de Radia un peu moins souvent) */
export function hasNegatives(clipId: string, mine = false): boolean { return (hash('neg' + clipId) % 100) < (mine ? 22 : 36); }

/**
 * Construit les fils de discussion d'un clip. `base` : commentaires positifs / drôles déjà produits (gen.ts → commentsFor).
 * Résultat : 5 à 9 fils ; 0 à 2 fils critiques (sous ≈ 1 clip sur 3) ; Auguste répond à ≈ 70 % des critiques.
 */
export function buildThreads(clip: ClipPopularity, base: { by: string; text: string }[]): Thread[] {
  const r = rng(hash('thr' + clip.id));
  const pop = Math.max(10, clip.likes);
  const out: Thread[] = [];
  const mk = (suffix: string, by: string, text: string, kind: MsgKind): ThreadMsg => { const l = likesFor(kind, pop, r); return { id: `${clip.id}:${suffix}`, by, text, kind, likes: l.likes, ...(l.viral ? { viral: true } : {}) }; };
  // 1. compliments / drôles (existants)
  base.slice(0, 4).forEach((c, i) => out.push({ root: mk(`p${i}`, c.by, c.text, i % 3 === 1 ? 'funny' : 'praise'), replies: [] }));
  // 2. une question, un message de fan
  const qs = QUESTIONS.filter((q) => q.topics.includes('any') || q.topics.includes(clip.topic));
  if (qs.length && r() < 0.7) { const q = pick(r, qs); out.push({ root: mk('q', q.by, q.text, 'question'), replies: [] }); }
  if (r() < 0.6) { const f = pick(r, FAN_LINES); out.push({ root: mk('f', f.by, f.text, 'fan'), replies: [] }); }
  // au moins 4 fils par vidéo : on complète avec des messages de fans (jamais deux fois le même)
  for (let k = 0; out.length < 4 && k < FAN_LINES.length; k++) { const f = FAN_LINES[(Math.floor(r() * FAN_LINES.length) + k) % FAN_LINES.length]; if (!out.some((t) => t.root.text === f.text)) out.push({ root: mk(`f${k}`, f.by, f.text, 'fan'), replies: [] }); }
  // 3. critiques (pas sous tous les clips)
  if (hasNegatives(clip.id, clip.mine)) {
    const pool = NEGATIVES.filter((n) => n.topics.includes('any') || n.topics.includes(clip.topic));
    const count = r() < 0.3 ? 2 : 1;
    const chosen: NegativeComment[] = [];
    while (chosen.length < count && chosen.length < pool.length) { const n = pick(r, pool); if (!chosen.includes(n)) chosen.push(n); }
    for (const n of chosen) {
      const root = mk(n.id, n.by, n.text, n.kind);
      const replies: ThreadMsg[] = [];
      if (r() < 0.7) {
        const a = mk(`${n.id}:a`, 'auguste', pick(r, n.augusteReplies), 'auguste');
        replies.push(a);
        if (r() < 0.55) { const rx = REACTIONS.filter((x) => x.by !== n.by); const k = 1 + (r() < 0.4 ? 1 : 0); const used = new Set<number>(); for (let i = 0; i < k; i++) { let j = Math.floor(r() * rx.length); while (used.has(j)) j = (j + 1) % rx.length; used.add(j); replies.push(mk(`${n.id}:r${i}`, rx[j].by, rx[j].text, 'react')); } }
        if (r() < 0.42) { const f = pick(r, FOLLOWUPS); replies.push(mk(`${n.id}:u`, n.by, f.author, 'followup')); replies.push(mk(`${n.id}:u2`, 'auguste', f.auguste, 'auguste')); }
      }
      out.push({ root, replies });
    }
  }
  // 4. mélange stable : les critiques ne sont pas toujours en tête
  const order = out.map((t, i) => ({ t, k: r() + (NEGATIVE.includes(t.root.kind as CommentKind) ? 0.35 : 0) + i * 0.01 }));
  order.sort((a, b) => a.k - b.k);
  return order.map((o) => o.t);
}

/** Nombre total de messages d'un fil (racine + réponses). */
export const threadSize = (t: Thread): number => 1 + t.replies.length;
