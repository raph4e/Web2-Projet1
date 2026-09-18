1. Création de la base de données
    - Essentiellement 2 tables : joueurs (id, nom, elo) et parties (id, code, joueur_blanc_id, joueur_noir_id, statut, resultat).

2. Faire fonctioner GitHub (pour la connexion)
3. Faire la création d'une partie privée
4. Rejoindre une partie
5. Faire l'échiquier (début de chess.js)
6. Serveur valide les coups
7. Comment les deux navigateurs communiquent
8. Gérer la fin des parties
9. Calculer le elo

AUTHENTIFICATION
────────────────────────
GET  /auth/github
GET  /auth/github/callback


JOUEURS
────────────────────────
GET  /api/joueurs
GET  /api/joueurs/classement
GET  /api/joueurs/:id


PARTIES
────────────────────────
POST /api/parties
POST /api/parties/rejoindre
GET  /api/parties/:id
POST /api/parties/:id/coup
POST /api/parties/:id/abandonner