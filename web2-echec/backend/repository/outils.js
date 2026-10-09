import db from "../db.js";

export function createInitialMove(gameId, FEN) {
    return new Promise((resolve, reject) => {
        db.run(
            "INSERT INTO coups (partie_id, FEN) VALUES (?, ?)",
            [gameId, FEN],
            (error) => {
                if (error) reject(error);
                else resolve();
            },
        );
    });
}


export function calculeElo(eloA, eloB, scoreA) {
    if (![0, 0.5, 1].includes(scoreA)) {
        throw new RangeError("Le score doit être 0, 0.5 ou 1.");
    }

    const attenduA = 1 / (1 + 10 ** ((eloB - eloA) / 400));
    const nouvelEloA = Math.round(eloA + 20 * (scoreA - attenduA));

    return Math.min(3000, Math.max(100, nouvelEloA));
}