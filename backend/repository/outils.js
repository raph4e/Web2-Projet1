import db from "../db.js";

// Exécute fn(client) dans une transaction PostgreSQL.
// Avec un pool, chaque db.query() peut utiliser une connexion différente : pour qu'un
// BEGIN / COMMIT fonctionne, toutes les requêtes de la transaction doivent passer par le
// même client. On en emprunte donc un au pool, puis on le rend à la fin (release).
// Si fn lance une erreur, tout est annulé (ROLLBACK) et l'erreur est relancée.
export async function withTransaction(fn) {
    const client = await db.connect();
    try {
        await client.query("BEGIN");
        const resultat = await fn(client);
        await client.query("COMMIT");
        return resultat;
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}

// Enregistre la position de départ d'une partie.
// client est optionnel : on le passe quand l'insertion fait partie d'une transaction.
export async function createInitialMove(gameId, FEN, client = db) {
    await client.query(`INSERT INTO coups (partie_id, "FEN") VALUES ($1, $2)`, [gameId, FEN]);
}


export function calculeElo(eloA, eloB, scoreA) {
    if (![0, 0.5, 1].includes(scoreA)) {
        throw new RangeError("Le score doit être 0, 0.5 ou 1.");
    }

    const attenduA = 1 / (1 + 10 ** ((eloB - eloA) / 400));
    const nouvelEloA = Math.round(eloA + 20 * (scoreA - attenduA));

    return Math.min(3000, Math.max(100, nouvelEloA));
}
