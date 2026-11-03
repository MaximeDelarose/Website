/**
 * Les 8 souvenirs de l'album. Les scènes restent fidèles à ce qui a été
 * fourni (photos, phrases) sans inventer de détails personnels précis.
 */
import type { DialogueLine } from './dialogue';

export interface MemoryDef {
  id: string;
  title: string;
  desc: string;
  /** Comment le débloquer (affiché tant qu'il est verrouillé). */
  how: string;
  lines: DialogueLine[];
}

export const MEMORIES: MemoryDef[] = [
  {
    id: 'flowers',
    title: 'Les premières fleurs',
    desc: 'Le tout premier bouquet de ce petit monde. Il n\'a pas de prix, mais il a coûté beaucoup de graines.',
    how: 'Chapitre 1',
    lines: [{ who: 'auguste', expr: 'love', text: 'J\'aurais pu t\'offrir toutes les fleurs de Paris. Mais aucune n\'aurait été aussi jolie que ton sourire.' }],
  },
  {
    id: 'nord',
    title: 'Le Nord de Paris',
    desc: '« C\'est cool dans le Nord de Paris bb. » Une phrase devenue une petite blague rien qu\'à nous.',
    how: 'Chapitre 2',
    lines: [{ who: 'auguste', expr: 'smile', text: 'Bon… j\'avoue, avec toi c\'est encore mieux.' }],
  },
  {
    id: 'arc',
    title: 'L\'Arc de Triomphe',
    desc: 'Un soir de pluie, sous l\'Arc de Triomphe. « Juste une trend entre #bff »… paraît-il.',
    how: 'Mini-jeu : les souvenirs mélangés',
    lines: [{ who: 'auguste', expr: 'love', text: 'Trempés jusqu\'aux os. Et pourtant, je n\'aurais voulu être nulle part ailleurs.' }],
  },
  {
    id: 'cinema',
    title: 'Le cinéma',
    desc: 'Un film dont Auguste ne se souvient pas vraiment. Il regardait ailleurs.',
    how: 'Chapitre 3',
    lines: [{ who: 'auguste', expr: 'tease', text: 'J\'aurais pu regarder le film dix fois… mais je crois que je me serais encore laissé distraire par toi.' }],
  },
  {
    id: 'billard',
    title: 'Le billard',
    desc: 'Une partie de billard. Le score exact restera un secret d\'État.',
    how: 'Mini-jeu : le billard des cœurs',
    lines: [{ who: 'auguste', expr: 'smile', text: 'Je voulais gagner la partie… mais je crois que j\'ai surtout gagné un beau souvenir.' }],
  },
  {
    id: 'promenade',
    title: 'Une promenade',
    desc: 'Une balade dans Paris, chemise rayée et chaussures rouges. La ville avait l\'air de poser pour toi.',
    how: 'Fin du chapitre 3',
    lines: [{ who: 'auguste', expr: 'love', text: 'Galbi, twahechtek… Tu me manques parfois alors que je viens à peine de te quitter.' }],
  },
  {
    id: 'royaume',
    title: 'Le royaume de Radia',
    desc: 'Un royaume tout entier, une couronne dorée, et une seule reine.',
    how: 'Fin du chapitre 4',
    lines: [{ who: 'auguste', expr: 'love', text: 'Aux échecs, on dit que la reine est la pièce la plus puissante. Moi, je crois surtout qu\'elle est celle qui rend tout le jeu plus beau.' }],
  },
  {
    id: 'monde',
    title: 'Notre petit monde',
    desc: 'Le monde que j\'ai créé pour toi. Touche « Revoir la fin » pour y retourner.',
    how: 'Fin de l\'histoire',
    lines: [{ who: 'auguste', expr: 'love', text: 'Merci d\'être entrée dans mon monde.' }],
  },
];

export const memoryById = (id: string) => MEMORIES.find((m) => m.id === id);
