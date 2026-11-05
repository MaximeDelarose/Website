/** Tindeur jouable : types partagés (aucun DOM). Tout est fictif : personnages adultes imaginaires. */

export type HairStyle = 'short' | 'quiff' | 'buzz' | 'curly' | 'bald' | 'long' | 'bun' | 'slick' | 'messy' | 'afro' | 'receding' | 'side';
export type Beard = 'none' | 'stubble' | 'full' | 'goatee' | 'mustache' | 'chin';
export type Outfit = 'tee' | 'polo' | 'shirt' | 'hoodie' | 'suit' | 'tank' | 'sweater' | 'overalls' | 'apron' | 'blazer' | 'cardigan' | 'turtle' | 'bare' | 'abs';
export type Glasses = 'none' | 'round' | 'square' | 'sun' | 'sunHead';
export type Acc = 'none' | 'cap' | 'beanie' | 'headphones' | 'headset' | 'earbud' | 'chefhat' | 'beret' | 'bandana' | 'tie' | 'bowtie' | 'scarf' | 'medal' | 'towel' | 'flower' | 'strawhat';
export type Mood = 'smile' | 'grin' | 'smirk' | 'wink' | 'calm' | 'shy' | 'proud' | 'tongue' | 'surprised';
export type Bg = 'field' | 'gym' | 'resto' | 'office' | 'city' | 'forest' | 'kitchen' | 'stage' | 'library' | 'greenhouse' | 'lake' | 'bakery' | 'stars' | 'camp' | 'gallery' | 'party' | 'cafe' | 'sunset' | 'crossroads' | 'room' | 'shop';
export type Prop = 'none' | 'tractor' | 'shaker' | 'guitar' | 'fish' | 'plant' | 'cupcake' | 'plate' | 'laptop' | 'book' | 'controller' | 'map' | 'coffee' | 'dumbbell' | 'phone' | 'wine' | 'tent';

/** Apparence dessinée (Canvas 2D vectoriel) : chaque profil combine ces paramètres différemment. */
export interface Look {
  skin: string; hair: HairStyle; hairColor: string; face?: 'round' | 'long' | 'square';
  beard?: Beard; outfit: Outfit; top: string; top2?: string;
  glasses?: Glasses; acc?: Acc; accColor?: string; mood: Mood; bg: Bg; bgc: [string, string]; prop?: Prop;
  brow?: 'flat' | 'up' | 'down' | 'worried';
}

export interface Choice { t: string; to: string; ask?: boolean }
export type EndKind = 'funny' | 'sweet' | 'calm';
export interface Node {
  id: string;
  /** Ses messages (une bulle chacun). */
  say: string[];
  /** Les réponses possibles de Radia ; vide = fin de l'histoire. */
  ch: Choice[];
  end?: { title: string; note: string; kind: EndKind };
}

export interface Profile {
  id: string; name: string; age: number; km: number;
  bio: string; tags: string[];
  /** Probabilité qu'il « matche » quand Radia aime son profil (0..1). */
  like: number;
  look: Look;
  start: string;
  nodes: Node[];
}
