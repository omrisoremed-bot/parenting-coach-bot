# tasks/lessons.md

_Format : `[date] | ce qui a mal tourné | règle pour éviter`_

## 2026-04-14

- **`git merge` cross-branch échoue sur "unrelated histories"** | Plutôt que `merge`, copier les fichiers entre branches avec `git show <branch>:<path> > <path>` puis commit sur la branche cible. S'applique quand `gh-pages` et `main` n'ont pas d'ancêtre commun.
- **Python `print()` crash `UnicodeEncodeError` sur Windows (cp1256)** | Sur Windows, ne pas `print()` de strings contenant des accents/arabe sans setter `PYTHONIOENCODING=utf-8`. Pour tester la présence de texte, utiliser `in` plutôt que print.
- **Railway auto-deploy prend 30-90s après un push main** | Après un push qui ajoute une route, poller `/health` ou la nouvelle route en boucle courte (sleep 10s) au lieu de supposer que c'est déjà en ligne.
- **Token Telegram posté en clair dans le chat** | Si un utilisateur partage un secret dans la conversation, flagger immédiatement, procéder, puis rappeler la révocation à la fin. Ne pas juste taire le problème.
- **`sendMessage` utilisé partout dans le backend → un swap = 7 fichiers** | Avant d'ajouter un 2e canal, wrapper d'abord dans un adapter. La prochaine fois, créer l'adapter AVANT la 2e intégration, pas pendant.
