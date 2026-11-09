# Tableau de bord de progression (radia-admin.html)

**Collecte** — uniquement si Radia active « Partager ma progression de jeu ♡ » (Réglages, option distincte du temps de jeu).
Côté jeu : `src/core/progressShare.ts` (logique pure : instantané, jalons, résumé de session, temps par mode) et `src/core/progressSync.ts` (envoi : 1 toutes les 45 s au plus, + un dernier à la mise en veille).
Côté serveur : `supabase/radia-progress.sql` (tables verrouillées par RLS, RPC `radia_progress_join / _push / _mine / _pause` à secret d'appareil, `radia_progress_admin` réservée aux administrateurs), suppression par la fonction Edge `radia-push` (`progress-forget`).

**Ce qui est enregistré** : instantané de progression (chapitre, niveau d'histoire, objectif et son avancement si une partie est sauvegardée, niveau et XP de Radia, compteurs de commandes / fusions / combos / découvertes, PIMBÊCHE, Mon Monde), jalons (niveau terminé, chapitre débloqué, niveau de Radia, souvenirs/photos, améliorations PIMBÊCHE), temps ACTIF par mode, résumé de chaque session (différences de compteurs début → fin).
**Jamais** : messages, conversations, contacts, position, interactions sociales, clics.

**Fiabilité** : jalons idempotents (identifiant stable `lvl:23`, `chu:4`…), envois numérotés (un renvoi est ignoré), temps par mode borné par le temps réellement écoulé, rien en arrière-plan, rien reconstitué pour le passé, erreurs affichées clairement dans la page.
**Conservation** : sessions 90 j, jalons et temps par mode 400 j, purge par la fonction Edge.
**Limites** : le mode (chapitres, libre, Mon Monde…) est déduit de l'écran affiché ; le « niveau actuel » est le prochain niveau de l'histoire d'après la sauvegarde ; un niveau quitté en cours n'est jamais compté terminé.
