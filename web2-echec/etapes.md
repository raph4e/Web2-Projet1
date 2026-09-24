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
