import db from "../db.js";

// Avec PostgreSQL (module pg), db.query() retourne une promesse : plus besoin de callbacks.
// Le résultat contient .rows (les lignes) et .rowCount (le nombre de lignes touchées).
// Les paramètres s'écrivent $1, $2, ... au lieu de ?.

// Récupère tous les joueurs.
export async function findAllAccounts() {
    const { rows } = await db.query("SELECT * FROM joueurs");
    return rows;
}

// Récupère un joueur par son ID. Retourne undefined s'il n'existe pas.
export async function findAccount(id) {
    const { rows } = await db.query("SELECT * FROM joueurs WHERE id = $1", [id]);
    return rows[0];
}

// Récupère toutes les parties auxquelles un joueur a participé.
// $1 est réutilisé deux fois : pas besoin de passer playerId deux fois dans le tableau.
export async function findGamesByPlayer(playerId) {
    const { rows } = await db.query(
        `SELECT * FROM parties
         WHERE joueur_blanc_id = $1 OR joueur_noir_id = $1
         ORDER BY date_creation DESC, id DESC`,
        [playerId],
    );
    return rows;
}

// Récupère un joueur par son GitHub ID ou crée un nouveau joueur si aucun n'existe.
export async function findOrCreateAccount({ githubId, login, name, avatarUrl }) {
    // Recherche d'un joueur existant par son GitHub ID ("githubId" entre guillemets, voir db.js)
    const { rows } = await db.query(`SELECT * FROM joueurs WHERE "githubId" = $1`, [githubId]);
    const joueur = rows[0];

    // Si le joueur existe déjà, on met à jour ses informations et on retourne le joueur existant
    if (joueur) {
        await db.query(
            `UPDATE joueurs SET nom = $1, login = $1, name = $2, "avatarUrl" = $3 WHERE "githubId" = $4`,
            [login, name, avatarUrl, githubId],
        );
        return { ...joueur, nom: login, login, name, avatarUrl };
    }

    // Sinon on l'insère. RETURNING * remplace this.lastID de SQLite : PostgreSQL renvoie
    // directement la ligne créée (avec son id et son elo par défaut).
    const insertion = await db.query(
        `INSERT INTO joueurs (nom, "githubId", login, name, "avatarUrl")
         VALUES ($1, $2, $1, $3, $4)
         RETURNING *`,
        [login, githubId, name, avatarUrl],
    );
    return insertion.rows[0];
}

// Crée un nouveau joueur à partir du profil GitHub
export function creerJoueur(profile) {
    return findOrCreateAccount(profile);
}
