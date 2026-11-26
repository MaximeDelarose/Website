# Voix de la conteuse — marche à suivre

## Où on en est
- Le jeu lit aujourd'hui la **voix française du navigateur** (la meilleure voix installée sur l'iPhone, lecture ralentie, phrases découpées). C'est le mieux qu'une synthèse intégrée puisse faire.
- Le jeu est **prêt** à lire de vrais fichiers audio (`celia/js/voice.js`) : une seule conteuse partout, aucun appel réseau pendant que Celia joue, aucune clé dans le code public. Tant que `celia/voix/` n'existe pas, rien ne change.
- **Les 3 voix à écouter n'ont pas pu être produites** depuis l'environnement de développement : aucun accès réseau vers ElevenLabs et aucune clé API.

## Ce qu'il manque (à vous)
1. Un compte **ElevenLabs** et une **clé API** (à garder pour vous, jamais dans le dépôt).
2. Lancer sur votre ordinateur (Node 18+, ffmpeg) :
   ```bash
   export ELEVENLABS_API_KEY=...            # votre clé
   node _celia/voix/samples.mjs             # 3 échantillons « Coucou Celia ! Bienvenue dans ton monde magique ! »
   ```
   Ils arrivent dans `_celia/voix/echantillons/`. Écoutez-les et notez le `voice_id` de votre préférée.
3. Générer tout le jeu (152 phrases, une seule fois) :
   ```bash
   export ELEVENLABS_VOICE_ID=...           # la voix choisie
   node _celia/voix/generate.mjs --enable
   ```
   → crée `celia/voix/*.mp3` (normalisés à −16 LUFS, plus présents que la musique à −20 LUFS) et active `voices: true`.
4. Changer `VERSION` dans `celia/sw.js`, commiter, fusionner sur `main`.

Alternatives sans ElevenLabs : voix « Premium » de macOS (`say -v "Amélie (Améliorée)" -o fichier.aiff "texte"`), Azure/Google neural, ou **votre propre voix** : enregistrez chaque phrase de `phrases.json` dans `celia/voix/<clé>.mp3` et ajoutez-la dans `celia/voix/index.json` (`{"files": {"<clé>": "<clé>.mp3"}}`).

## Maintenance
- `node _celia/voix/phrases.cjs` (serveur local lancé) met à jour `phrases.json` quand on ajoute des textes ; `generate.mjs` ne régénère que les fichiers manquants.
- Une phrase sans fichier retombe automatiquement sur la voix du navigateur.
- Pendant une phrase, la musique baisse (−11 dB environ) puis remonte ; une nouvelle phrase remplace toujours la précédente ; le haut-parleur de la barre du haut réécoute la dernière consigne.

## Les personnages (sorcière, Aliya, Tania, Lumi)
- Chaque personnage a sa voix : `C.speak('narr' | 'witch' | 'aliya' | 'tania', texte)` (`celia/js/cast.js`). Sans fichiers, le jeu utilise des voix françaises **différentes** du navigateur quand l'iPhone en propose plusieurs, et sinon des hauteurs / débits différents (sorcière grave et lente, Aliya plus aiguë, Tania plus vive). **Ce sont des voix de synthèse, pas des enregistrements.**
- `node _celia/voix/cast.cjs` (serveur local lancé) liste toutes leurs répliques dans `_celia/voix/cast.json` (93 répliques : Lumi 44, sorcière 5, Aliya 23, Tania 21).
- `generate.mjs` les produit avec une voix par personnage : `ELEVENLABS_VOICE_ID` (Lumi), `ELEVENLABS_VOICE_WITCH` (grosse voix théâtrale, grondeuse mais drôle — jamais effrayante), `ELEVENLABS_VOICE_ALIYA`, `ELEVENLABS_VOICE_TANIA`. Le fichier d'une réplique de personnage est nommé d'après `empreinte(« personnage|texte »)` ; celui de Lumi, comme avant, d'après le texte seul.
- **Aucun de ces enregistrements n'a été produit** (pas d'accès réseau ni de clé ElevenLabs dans l'environnement de développement).
