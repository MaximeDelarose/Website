export type Gender = 'femme' | 'homme' | 'autre';
export type Intention = 'serieuse' | 'doucement' | 'reflexion';
export type Avail = 'soiree' | 'journee' | 'weekend' | 'variable';
export type Slot = string; // ex. "jeu-soir", "sam-jour"

export interface Profile {
  id: string;
  name: string;
  age: number;
  gender: Gender;
  zone: string;
  km: number; // distance approximative (arrondie)
  bio: string;
  seeking: string;
  interests: string[];
  intention: Intention;
  avail: Avail[];
  slots: Slot[];
  hue: number; // variante de portrait
  likesYou: boolean; // simulation : réciprocité
  replies: string[];
  photo?: string;
  fake?: boolean;
}

export interface Me {
  name: string;
  birth: string;
  gender: Gender | '';
  city: string;
  photo?: string;
  kids: string; // '', '1', '2', '3+'
  kidsAges: string[];
  situation: string;
  time: string;
  intention: Intention;
  avail: Avail[];
  interests: string[];
  traits: string[];
  values: string[];
  phrase: string;
  meet: 'femmes' | 'hommes' | 'tous';
  ageMin: number;
  ageMax: number;
  maxKm: number;
}

export interface Msg {
  id: string;
  from: 'me' | 'them' | 'sys';
  kind: 'text' | 'photo' | 'moment';
  text: string;
  at: number;
}

export interface Settings {
  readReceipts: boolean;
  showDistance: boolean;
  hideFromTonight: boolean;
  notifications: boolean;
}

export interface Tonight {
  on: boolean;
  until: number; // timestamp
}

export interface AppState {
  stage: 'welcome' | 'onboarding' | 'app';
  me: Me;
  slots: Slot[]; // mes créneaux généraux
  liked: string[];
  passed: string[];
  matches: string[];
  blocked: string[];
  reported: string[];
  chats: Record<string, Msg[]>;
  unread: Record<string, number>;
  tonight: Tonight;
  settings: Settings;
}
