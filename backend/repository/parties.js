    import db from "../db.js";
import { randomBytes } from "node:crypto";
import { createInitialMove, calculeElo, withTransaction } from "./outils.js";

// Met à jour la position (FEN) d'une partie en cours. Retourne true si une ligne a été modifiée.
export async function updateGameFEN(gameId, FEN, playerId) {
    const resultat = await db.query(
        `UPDATE coups
         SET "FEN" = $1
         WHERE partie_id = $2
           AND EXISTS (
               SELECT 1
               FROM parties
               WHERE parties.id = coups.partie_id
                 AND parties.statut = 'en_cours'
                 AND (parties.joueur_blanc_id = $3 OR parties.joueur_noir_id = $3)
           )`,
        [FEN, gameId, playerId],
    );
    // rowCount remplace this.changes de SQLite
    return resultat.rowCount > 0;
}

// Crée une nouvelle partie pour le joueur. Retourne le code, ou null s'il est déjà dans une partie.
export async function createGame(playerId, FEN) {
    const { rows } = await db.query(
        `SELECT id
         FROM parties
         WHERE statut IN ('en_attente', 'en_cours')
           AND (joueur_blanc_id = $1 OR joueur_noir_id = $1)
         LIMIT 1`,
        [playerId],
    );
    if (rows[0]) return null;

    const code = randomBytes(3).toString("hex").toUpperCase();

    // La partie et sa position de départ sont créées dans une même transaction :
    // si l'insertion du coup échoue, la partie est annulée automatiquement
    // (ça remplace le DELETE manuel de la version SQLite).
    await withTransaction(async (client) => {
        const insertion = await client.query(
            "INSERT INTO parties (code, joueur_blanc_id) VALUES ($1, $2) RETURNING id",
            [code, playerId],
        );
        await createInitialMove(insertion.rows[0].id, FEN, client);
    });
    return code;
}

// Récupère une partie et les noms de ses joueurs. Retourne undefined si le code n'existe pas.
export async function findGame(code) {
    const { rows } = await db.query(
        `SELECT parties.id, parties.code, parties.statut, parties.resultat,
                blanc.login AS joueur_blanc_login,
                blanc.elo AS joueur_blanc_elo,
                noir.login AS joueur_noir_login,
                noir.elo AS joueur_noir_elo
         FROM parties
         LEFT JOIN joueurs AS blanc ON blanc.id = parties.joueur_blanc_id
         LEFT JOIN joueurs AS noir ON noir.id = parties.joueur_noir_id
         WHERE parties.code = $1`,
        [code],
    );
    return rows[0];
}

// Marque la partie comme quittée et enregistre le nom du joueur sortant.
// Tout se fait dans une transaction : si la mise à jour de l'Elo échoue, la partie
// n'est pas marquée comme quittée non plus.
export function leaveGame(code, playerId) {
    return withTransaction(async (client) => {
        // On récupère aussi le login du joueur qui quitte (jointure "moi") pour l'écrire
        // dans resultat juste après.
        const { rows } = await client.query(
            `SELECT parties.statut, parties.joueur_blanc_id, parties.joueur_noir_id,
                    moi.login AS login_sortant
             FROM parties
             JOIN joueurs AS moi ON moi.id = $2
             WHERE parties.code = $1
               AND parties.statut IN ('en_attente', 'en_cours')
               AND (parties.joueur_blanc_id = $2 OR parties.joueur_noir_id = $2)`,
            [code, playerId],
        );
        const game = rows[0];
        if (!game) return false;

        const miseAJour = await client.query(
            `UPDATE parties
             SET statut = 'quitte',
                 resultat = $3
             WHERE code = $2
               AND statut IN ('en_attente', 'en_cours')
               AND (joueur_blanc_id = $1 OR joueur_noir_id = $1)`,
            [playerId, code, game.login_sortant],
        );
        if (miseAJour.rowCount === 0) return false;

        const hasOpponent = game.joueur_blanc_id && game.joueur_noir_id;
        if (game.statut !== "en_cours" || !hasOpponent) return true;

        // Le joueur qui quitte perd la partie
        const scoreBlanc = playerId === game.joueur_blanc_id ? 0 : 1;
        await applyPlayersElo(client, game.joueur_blanc_id, game.joueur_noir_id, scoreBlanc);
        return true;
    });
}

// Calcule et enregistre le nouvel Elo des deux joueurs.
// Reçoit le client de la transaction en cours pour que tout soit annulé en cas d'erreur.
async function applyPlayersElo(client, joueurBlancId, joueurNoirId, scoreBlanc) {
    const { rows: joueurs } = await client.query(
        "SELECT id, elo FROM joueurs WHERE id IN ($1, $2)",
        [joueurBlancId, joueurNoirId],
    );

    const joueurBlanc = joueurs.find((joueur) => joueur.id === joueurBlancId);
    const joueurNoir = joueurs.find((joueur) => joueur.id === joueurNoirId);
    if (!joueurBlanc || !joueurNoir) {
        throw new Error("Impossible de mettre à jour le classement des joueurs.");
    }

    const nouvelEloBlanc = calculeElo(joueurBlanc.elo, joueurNoir.elo, scoreBlanc);
    const nouvelEloNoir = calculeElo(joueurNoir.elo, joueurBlanc.elo, 1 - scoreBlanc);

    // ::int indique à PostgreSQL le type des paramètres (il ne peut pas le deviner dans un CASE)
    const miseAJour = await client.query(
        `UPDATE joueurs
         SET elo = CASE id
             WHEN $1::int THEN $2::int
             WHEN $3::int THEN $4::int
         END
         WHERE id IN ($1, $3)`,
        [joueurBlancId, nouvelEloBlanc, joueurNoirId, nouvelEloNoir],
    );
    if (miseAJour.rowCount !== 2) {
        throw new Error("Le classement des deux joueurs n'a pas été mis à jour.");
    }
}

// Termine une partie en cours et met à jour l'Elo des deux joueurs.
// Retourne false si la partie n'est pas en cours ou si le joueur n'en fait pas partie.
export function updatePlayersElo(code, playerId, scoreBlanc) {
    if (![0, 0.5, 1].includes(scoreBlanc)) {
        return Promise.reject(new RangeError("Le score des blancs doit être 0, 0.5 ou 1."));
    }

    return withTransaction(async (client) => {
        // On termine la partie en premier. L'UPDATE verrouille la ligne jusqu'au COMMIT :
        // si les deux joueurs envoient "terminer" en même temps, le 2e attend, puis ne
        // trouve plus de partie 'en_cours' (rowCount = 0). L'Elo n'est donc appliqué qu'une fois.
        // Ça remplace le BEGIN IMMEDIATE de SQLite, qui n'existe pas dans PostgreSQL.
        // RETURNING renvoie les ids des joueurs sans faire un SELECT de plus.
        const { rows } = await client.query(
            `UPDATE parties
             SET statut = 'terminee',
                 resultat = CASE
                     WHEN $1::numeric = 0.5 THEN 'Match nul'
                     WHEN $1::numeric = 1 THEN (
                         SELECT login FROM joueurs WHERE id = parties.joueur_blanc_id
                     )
                     ELSE (
                         SELECT login FROM joueurs WHERE id = parties.joueur_noir_id
                     )
                 END,
                 date_fin = CURRENT_TIMESTAMP
             WHERE code = $2 AND statut = 'en_cours'
               AND (joueur_blanc_id = $3 OR joueur_noir_id = $3)
             RETURNING joueur_blanc_id, joueur_noir_id`,
            [scoreBlanc, code, playerId],
        );
        const game = rows[0];
        if (!game) return false;

        await applyPlayersElo(client, game.joueur_blanc_id, game.joueur_noir_id, scoreBlanc);
        return true;
    });
}

// Récupère une partie en cours du point de vue du joueur (adversaire, Elo, à qui le tour).
async function loadGame(code, playerId) {
    const { rows } = await db.query(
        `SELECT parties.id,
                parties.statut,
                -- CASE ... THEN 1 ELSE 0 : PostgreSQL renverrait sinon true/false au lieu de 1/0
                CASE WHEN parties.joueur_blanc_id = $1 THEN 1 ELSE 0 END AS joueur_est_blanc,
                coups."FEN" AS "FEN",
                CASE
                    WHEN parties.joueur_blanc_id = $1 THEN noir.login
                    ELSE blanc.login
                END AS adversaire,
                CASE
                    WHEN parties.joueur_blanc_id = $1 THEN blanc.elo
                    ELSE noir.elo
                END AS elo_joueur,
                CASE
                    WHEN parties.joueur_blanc_id = $1 THEN noir.elo
                    ELSE blanc.elo
                END AS elo_adversaire
         FROM parties
         LEFT JOIN joueurs AS blanc ON blanc.id = parties.joueur_blanc_id
         LEFT JOIN joueurs AS noir ON noir.id = parties.joueur_noir_id
         LEFT JOIN coups ON coups.partie_id = parties.id
         WHERE parties.code = $2
           AND parties.statut = 'en_cours'
           AND (parties.joueur_blanc_id = $1 OR parties.joueur_noir_id = $1)`,
        [playerId, code],
    );
    const game = rows[0];
    if (!game) return null;

    const fenTurn = game.FEN?.split(" ")[1] ?? "w";
    const whitesTurn = fenTurn === "w";
    return {
        ...game,
        monTour: game.joueur_est_blanc ? whitesTurn : !whitesTurn,
    };
}

// Ajoute un joueur à une partie en attente, ou restaure une partie en cours dont il est déjà membre.
export async function joinGame(code, playerId) {
    const { rows } = await db.query(
        `SELECT code, statut
         FROM parties
         WHERE statut IN ('en_attente', 'en_cours')
           AND (joueur_blanc_id = $1 OR joueur_noir_id = $1)
         LIMIT 1`,
        [playerId],
    );
    const currentGame = rows[0];

    if (currentGame && (currentGame.code !== code || currentGame.statut !== "en_cours")) {
        return null;
    }

    // Le joueur est déjà dans cette partie en cours : on la recharge simplement
    if (currentGame) return loadGame(code, playerId);

    const miseAJour = await db.query(
        `UPDATE parties
         SET joueur_noir_id = $1, statut = 'en_cours'
         WHERE code = $2
           AND statut = 'en_attente'
           AND joueur_blanc_id != $1
           AND joueur_noir_id IS NULL
           AND NOT EXISTS (
               SELECT 1
               FROM parties AS active
               WHERE active.statut IN ('en_attente', 'en_cours')
                 AND (active.joueur_blanc_id = $1 OR active.joueur_noir_id = $1)
           )`,
        [playerId, code],
    );
    if (miseAJour.rowCount === 0) return null;

    return loadGame(code, playerId);
}
