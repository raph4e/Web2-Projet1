# Projet Web 2 - Jeu d'echecs

## Progression du projet

- [x] Creer la base de donnees SQLite
  - Table `joueurs`
  - Table `parties`
  - Table `coups`
- [x] Ajouter la connexion avec GitHub
- [x] Creer une partie privee
- [x] Rejoindre une partie avec un code
- [x] Afficher l'echiquier
- [ ] Valider les coups cote serveur
- [x] Faire communiquer les deux navigateurs
- [x] Gerer le depart d'un joueur
- [ ] Gerer la fin d'une partie
- [ ] Calculer le classement ELO

## Structure de la base de donnees

### `joueurs`

| Colonne | Description |
| --- | --- |
| `id` | Identifiant du joueur |
| `nom` | Nom utilise par le joueur |
| `githubId` | Identifiant GitHub |
| `login` | Username GitHub |
| `name` | Nom complet GitHub |
| `avatarUrl` | URL de l'avatar GitHub |
| `elo` | Classement du joueur |

### `parties`

| Colonne | Description |
| --- | --- |
| `id` | Identifiant de la partie |
| `code` | Code prive de la partie |
| `joueur_blanc_id` | Joueur qui cree la partie |
| `joueur_noir_id` | Joueur qui rejoint la partie |
| `statut` | Etat de la partie |
| `tour` | Joueur dont c'est le tour |
| `resultat` | Resultat ou message de fin |

### `coups`

Cette table enregistrera les coups joues dans chaque partie.

## Routes d'authentification

| Methode | Route | Role |
| --- | --- | --- |
| `GET` | `/api/auth/github` | Commencer la connexion GitHub |
| `GET` | `/api/auth/callback` | Recevoir le retour de GitHub |
| `GET` | `/api/me` | Recuperer le compte connecte |
| `POST` | `/api/auth/logout` | Deconnecter le joueur |

## Routes des joueurs

| Methode | Route | Role |
| --- | --- | --- |
| `GET` | `/api/joueurs` | Recuperer tous les joueurs |

## Routes des parties

| Methode | Route | Role |
| --- | --- | --- |
| `POST` | `/api/parties` | Creer une partie privee |
| `GET` | `/api/parties/:code` | Consulter l'etat d'une partie |
| `POST` | `/api/parties/:code/rejoindre` | Rejoindre une partie |
| `DELETE` | `/api/parties/:code` | Quitter une partie |

## Organisation du projet

```text
backend/
├── app.js                  # Serveur Express et routes API
├── auth.js                 # Authentification GitHub
├── db.js                   # Connexion et tables SQLite
├── session.js              # Gestion des sessions
└── repository/
    ├── joueurs.js          # Requetes liees aux joueurs
    └── parties.js          # Requetes liees aux parties

frontend/src/
├── App.jsx                 # Navigation principale
├── Connexion.jsx           # Connexion GitHub
├── CreerPartiePrive.jsx    # Choix de creation ou de jonction
├── JoindrePartie.jsx       # Formulaire pour rejoindre une partie
├── AttentePartie.jsx       # Attente du deuxieme joueur
└── Echiquier.jsx           # Affichage de l'echiquier
```
## Exigences techniques
- [x] Express pour l'API, React Router en mode framework pour le client, rendu côté serveur là où c'est bénéfique.
- [ ] La position vit dans la base (FEN et liste des coups), pas dans la mémoire du serveur : une partie survit à un redémarrage.
- [ ] La mise à jour de l'échiquier adverse se fait par interrogation périodique de l'API.
- [ ] Tout le SQL dans repository/ ; SQLite (node:sqlite), le fichier de base sur un volume Docker.
- [ ] Tests d'intégration de l'API.
- [ ] .github/workflows/ci.yml : les tests à chaque push sur main, si les tests passent, les images publiées sur ghcr.io avec les tags latest et sha-.
- [ ] deploy/compose.yml avec image: et non build:, le compte et le tag lus dans un .env posé à côté, hors dépôt, qui démarre l'application sur une machine où il n'y a que Docker.
- [ ] Les secrets (ex : identifiant et secret de l'application GitHub OAuth, clé de session) dans l'environnement, jamais dans le dépôt.
- [ ] deploy/.env.example : les variables attendues, avec des valeurs d'exemple, et un README.md qui dit comment démarrer l'application, en développement et sur la machine de déploiement.
