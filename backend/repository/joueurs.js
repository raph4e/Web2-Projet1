import db from "../db.js";

// Récupère tous les joueurs.
export function findAllAccounts() {
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM joueurs", (err, joueurs) => {
            if (err) reject(err);
            else resolve(joueurs);
        });
    });
}

// Récupère un joueur par son ID
export function findAccount(id) {
    return new Promise((resolve, reject) => {
        // Requête SQL pour récupérer un joueur par son ID
        db.get("SELECT * FROM joueurs WHERE id = ?", [id], (err, joueur) => {
            if (err) reject(err);
            else resolve(joueur);
        });
    });
}

// Récupère toutes les parties auxquelles un joueur a participé.
export function findGamesByPlayer(playerId) {
    return new Promise((resolve, reject) => {
        db.all(
            `SELECT * FROM parties
             WHERE joueur_blanc_id = ? OR joueur_noir_id = ?
             ORDER BY date_creation DESC, id DESC`,
            [playerId, playerId],
            (err, parties) => {
                if (err) reject(err);
                else resolve(parties);
            },
        );
    });
}

// Récupère un joueur par son GitHub ID ou crée un nouveau joueur si aucun n'existe
export function findOrCreateAccount({ githubId, login, name, avatarUrl }) {
    return new Promise((resolve, reject) => {
        // Recherche d'un joueur existant par son GitHub ID
        db.get("SELECT * FROM joueurs WHERE githubId = ?", [githubId], (selectError, joueur) => {
            // En cas d'erreur lors de la sélection, on rejette la promesse
            if (selectError) {
                reject(selectError);
                return;
            }
            
            // Si le joueur existe déjà, on met à jour ses informations et on retourne le joueur existant
            if (joueur) {
                db.run(
                    "UPDATE joueurs SET nom = ?, login = ?, name = ?, avatarUrl = ? WHERE githubId = ?",
                    [login, login, name, avatarUrl, githubId],
                    // En cas d'erreur lors de la mise à jour, on rejette la promesse, sinon on résout avec le joueur mis à jour
                    (updateError) => {
                        if (updateError) reject(updateError);
                        else resolve({ ...joueur, nom: login, login, name, avatarUrl });
                    },
                );
                return;
            }
            
            // Si le joueur n'existe pas, on l'insère dans la base de données et on retourne le nouveau joueur
            db.run(
                "INSERT INTO joueurs (nom, githubId, login, name, avatarUrl) VALUES (?, ?, ?, ?, ?)",
                [login, githubId, login, name, avatarUrl],
                function (insertError) {
                // En cas d'erreur lors de l'insertion, on rejette la promesse, sinon on résout avec le nouveau joueur créé
                if (insertError) reject(insertError);
                else resolve({ id: this.lastID, nom: login, githubId, login, name, avatarUrl, elo: 1000 });
                },
            );
        });
    });
}

// Crée un nouveau joueur à partir du profil GitHub
export function creerJoueur(profile) {
    return findOrCreateAccount(profile);
}