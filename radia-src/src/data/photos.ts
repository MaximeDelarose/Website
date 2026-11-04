/** Nos photos : débloquées au fil de l'histoire, visibles dans l'album. */
export interface PhotoDef { id: string; title: string; caption: string }

export const PHOTOS: PhotoDef[] = [
  { id: 'p4', title: 'Un bisou sur la joue', caption: 'Le meilleur endroit du monde, c\'est juste là.' },
  { id: 'p1', title: 'Nous deux', caption: 'Toi, moi, et rien d\'autre à faire.' },
  { id: 'p3', title: 'Ce regard', caption: 'Ce regard-là, je le connais par cœur.' },
  { id: 'p5', title: 'Minuit', caption: 'Même dans le noir, c\'est toi que je vois.' },
  { id: 'p2', title: 'Pendant que tu dors', caption: 'Tu sais, je remercie souvent Dieu que tu aies croisé ma route.' },
  { id: 'p6', title: 'Sous la glycine', caption: 'Le soleil, les feuilles, et ma reine.' },
];

export const photoById = (id: string) => PHOTOS.find((p) => p.id === id);
