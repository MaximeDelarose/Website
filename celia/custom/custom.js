/* Personnalisation facultative (rien n'est obligatoire).
   - portrait : chemin relatif d'une image ronde de Celia (ex. "custom/portrait.jpg") affichée dans le cadre d'accueil.
                À ne renseigner que si tu choisis toi-même de publier une photo : ce dossier est public.
   - name     : prénom affiché dans les titres. */
window.CELIA_CUSTOM = {
  name: "Celia",
  portrait: null,
  /* true = utiliser les voix préenregistrées de celia/voix/ (voir _celia/voix/README.md) ; false = voix du navigateur */
  voices: false,
  /* Les grandes sœurs Aliya et Tania (apparitions dans l'écran de fin). Par défaut : illustrations originales dans le style du jeu.
     Pour les personnaliser, remplacer par exemple : aliya: { hairColor: 1, hairStyle: 'long', eyes: 0, skin: 1, outfit: 'd3', crown: 'c2' }
     (mêmes numéros que le dressing de Celia) ; ou fournir une image : aliya: { img: 'custom/aliya.png' } (image détourée, attention : ce dossier est PUBLIC). */
  sisters: {}
};
