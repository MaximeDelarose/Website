# Conversations libres de Tindeur et Snapchien

## Ce qui existe (et ce que ce n'est PAS)

Radia écrit **n'importe quel texte** avec le clavier de l'iPhone (champ `<input>` natif, police 16 px, bouton d'envoi, Entrée = envoi, le clavier reste ouvert).
Le personnage **lit** son message et répond. Ce n'est **pas un modèle de langage** : c'est un moteur **local à règles**, écrit à la main, qui tourne dans le jeu
(aucun réseau, donc aussi hors ligne). Il comprend un grand nombre de tournures et répond de façon cohérente, mais il n'invente pas n'importe quelle phrase :
ce qui sort de ses règles reçoit une réaction qui reprend un mot de Radia (« Ah, apiculteur… et ça te plaît ? »).

| Étape | Fichier | Rôle |
|---|---|---|
| Compréhension | `src/apps/brain/understand.ts` | Normalise (accents, SMS, argot, lettres répétées), tolère une faute de frappe, détecte ~65 intentions (salutation, « ça va », « t'es sérieux ? », blague, compliment, flirt, tristesse, refus, enfants, amitié, photo, rendez-vous, Snapchien…) et extrait le mot utile. |
| Décision | `src/apps/brain/chat.ts` (`chatReply`) | Sujets délicats (famille, amitié, photo, vie sentimentale, prénom, blagues) → réactions écrites à la main du moteur `react()` ; sinon réponses par intention, mots de l'univers du personnage (`facts.ts`), question en retour (sans répéter), souvenir d'un mot de Radia, prénom avec parcimonie. |
| Personnalité | `personas.ts`, `facts.ts`, `banks.ts`, `chatBanks.ts` | 25 hommes adultes fictifs : ton chaleureux / taquin / posé, métier, passions, rêve, week-end, rendez-vous imaginé, réactions à des mots précis (Léo : « apiculteur »). |
| Mémoire | `memory.ts` (`fun.apps.brain`) | Une mémoire par personnage, **partagée entre Tindeur et Snapchien** (enfants, amitié, vie sentimentale, photos, mots employés, dernière question) ; jamais mélangée entre deux personnages. |
| Rythme | `snap/chat/engine.ts` (`converseText`), `swipe/state.ts` (`sendText`) | Délais propres à chaque caractère, plusieurs bulles courtes, parfois une réponse bien plus tard (occupé), « écrit… », relance après 3 jours, éloignement poli. |

Respect des limites (non négociable, testé) : un refus de photo est immédiat et définitif ; « laisse-moi tranquille » met fin à l'échange ; aucune demande intime ;
les demandes déplacées reçoivent un refus poli ; les personnages sont tous fictifs et adultes ; aucune vraie photo n'est jamais demandée à l'iPhone.

## Sauvegardes

Tindeur : une conversation est maintenant une liste de messages `{k, text, t}` (`fun.apps.swipe.convos[pid].msgs`). Les **anciennes conversations à choix multiples**
(journal de nœuds, y compris les nœuds dynamiques `~…`) sont **rejouées en vrais messages** à la lecture de la sauvegarde (`sanitizeConvo`) : rien n'est perdu.
Un match supprimé ou bloqué est mémorisé (`removed`) et ne revient jamais dans la pile. Snapchien : format inchangé.

## Et une vraie IA conversationnelle ?

Un modèle donnerait des réponses plus libres. Il impose un coût, un risque (contenu inattendu) et une dépendance au réseau, donc :

* **Architecture prévue, non déployée** : `supabase/functions/radia-chat/` (Edge Function) appelle l'API du modèle **côté serveur uniquement**. La clé est un secret de la fonction
  (`supabase secrets set ANTHROPIC_API_KEY=…`) : **jamais** dans le JavaScript public. Entrées validées (liste blanche de personnages, textes bornés, historique de 8 messages),
  le message de Radia n'est jamais mêlé à la consigne système, réponses filtrées (3 bulles courtes, aucun terme interdit, aucune mention d'IA), délai maximal 8 s,
  plafonds de coût (global/jour et par appareil/jour, `supabase/radia-chat.sql`).
* **Repli** : en cas de clé absente, de plafond atteint, d'erreur, de délai dépassé ou de réseau coupé, le jeu répond avec le moteur local — le comportement actuel.
* **État honnête** : la logique pure (validation, consigne, filtre, plafonds) est testée ; la fonction n'est **pas déployée**, n'est **pas encore appelée par le jeu**
  et n'a **jamais été exécutée avec une vraie clé**. L'activer demande : une clé, l'application du SQL, le déploiement, puis le branchement asynchrone côté jeu
  (appel avec repli sur `chatReply`). Les réponses actuelles proviennent donc uniquement du moteur local.

## Tests

`tests/chat-free.test.ts` (compréhension, argot/fautes, changements de sujet, mémoire, refus, rendez-vous, Snapchien, 25 personnages × 20 messages),
`tests/swipe-state.test.ts` (envoi libre, réponses différées, relance, suppression/blocage, migration des anciennes conversations),
`tests/chat-ai-logic.test.ts` (logique serveur), e2e `scripts/tindeur-e2e.mjs` et `scripts/snap-chat-e2e.mjs` (champ de saisie, texte exact, « écrit… », Bitmoji de présence,
faux clavier via `visualViewport`). **Chromium émulé uniquement : aucun test sur un vrai iPhone ni sur le vrai clavier iOS.**
