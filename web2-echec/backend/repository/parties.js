import db from "../db.js";
import { randomBytes } from "node:crypto";
import { createInitialMove, calculeElo } from "./outils.js";

export function updateGameFEN(gameId, FEN, playerId) {
    return new Promise((resolve, reject) => {
        db.run(
            `UPDATE coups
             SET FEN = ?
             WHERE partie_id = ?
               AND EXISTS (
                   SELECT 1
                   FROM parties
                   WHERE parties.id = coups.partie_id
                     AND parties.statut = 'en_cours'
                     AND (parties.joueur_blanc_id = ? OR parties.joueur_noir_id = ?)
               )`,
            [FEN, gameId, playerId, playerId],
            function (error) {
                if (error) reject(error);
                else resolve(this.changes > 0);
            },
        );
    });
}

// Crée une nouvelle partie pour le joueur.
export function createGame(playerId, FEN) {
    return new Promise((resolve, reject) => {
        const code = randomBytes(3).toString("hex").toUpperCase();
        db.run(
            "INSERT INTO parties (code, joueur_blanc_id) VALUES (?, ?)",
            [code, playerId],
            function (insertError) {
                if (insertError) {
                    reject(insertError);
                    return;
                }

                const gameId = this.lastID;
                createInitialMove(gameId, FEN)
                    .then(() => resolve(code))
                    .catch((moveError) => {
                        db.run("DELETE FROM parties WHERE id = ?", [gameId], (deleteError) => {
                            reject(deleteError ?? moveError);
                        });
                    });
            },
        );
    });
}

// Récupère une partie et les noms de ses joueurs.
export function findGame(code) {
    return new Promise((resolve, reject) => {
        db.get(
            `SELECT parties.id, parties.code, parties.statut, parties.resultat,
                    blanc.login AS joueur_blanc_login,
                    noir.login AS joueur_noir_login
             FROM parties
             LEFT JOIN joueurs AS blanc ON blanc.id = parties.joueur_blanc_id
             LEFT JOIN joueurs AS noir ON noir.id = parties.joueur_noir_id
             WHERE parties.code = ?`,
            [code],
            (err, game) => {
                if (err) reject(err);
                else resolve(game);
            },
        );
    });
}

// Marque la partie comme quittée et enregistre le nom du joueur sortant.
export function leaveGame(code, playerId) {
    return new Promise((resolve, reject) => {
        db.get(
            `SELECT statut, joueur_blanc_id, joueur_noir_id
             FROM parties
             WHERE code = ?
               AND statut IN ('en_attente', 'en_cours')
               AND (joueur_blanc_id = ? OR joueur_noir_id = ?)`,
            [code, playerId, playerId],
            (selectError, game) => {
                if (selectError) {
                    reject(selectError);
                    return;
                }
                if (!game) {
                    resolve(false);
                    return;
                }

                db.run(
                    `UPDATE parties
                     SET statut = 'quitte',
                         resultat = (SELECT login FROM joueurs WHERE id = ?)
                     WHERE code = ?
                       AND statut IN ('en_attente', 'en_cours')
                       AND (joueur_blanc_id = ? OR joueur_noir_id = ?)`,
                    [playerId, code, playerId, playerId],
                    function (updateError) {
                        if (updateError) {
                            reject(updateError);
                            return;
                        }
                        if (this.changes === 0) {
                            resolve(false);
                            return;
                        }

                        const hasOpponent = game.joueur_blanc_id && game.joueur_noir_id;
                        if (game.statut !== "en_cours" || !hasOpponent) {
                            resolve(true);
                            return;
                        }

                        const scoreBlanc = playerId === game.joueur_blanc_id ? 0 : 1;
                        applyPlayersElo(
                            game.joueur_blanc_id,
                            game.joueur_noir_id,
                            scoreBlanc,
                        ).then(
                            () => resolve(true),
                            reject,
                        );
                    },
                );
            },
        );
    });
}

function applyPlayersElo(joueurBlancId, joueurNoirId, scoreBlanc) {
    return new Promise((resolve, reject) => {
        db.all(
            "SELECT id, elo FROM joueurs WHERE id IN (?, ?)",
            [joueurBlancId, joueurNoirId],
            (selectError, joueurs) => {
                if (selectError) {
                    reject(selectError);
                    return;
                }

                const joueurBlanc = joueurs.find((joueur) => joueur.id === joueurBlancId);
                const joueurNoir = joueurs.find((joueur) => joueur.id === joueurNoirId);
                if (!joueurBlanc || !joueurNoir) {
                    reject(new Error("Impossible de mettre à jour le classement des joueurs."));
                    return;
                }

                const nouvelEloBlanc = calculeElo(joueurBlanc.elo, joueurNoir.elo, scoreBlanc);
                const nouvelEloNoir = calculeElo(joueurNoir.elo, joueurBlanc.elo, 1 - scoreBlanc);
                db.run(
                    `UPDATE joueurs
                     SET elo = CASE id
                         WHEN ? THEN ?
                         WHEN ? THEN ?
                     END
                     WHERE id IN (?, ?)`,
                    [
                        joueurBlancId,
                        nouvelEloBlanc,
                        joueurNoirId,
                        nouvelEloNoir,
                        joueurBlancId,
                        joueurNoirId,
                    ],
                    function (updateError) {
                        if (updateError) reject(updateError);
                        else if (this.changes !== 2) {
                            reject(new Error("Le classement des deux joueurs n'a pas été mis à jour."));
                        } else resolve();
                    },
                );
            },
        );
    });
}

export function updatePlayersElo(code, playerId, scoreBlanc) {
    if (![0, 0.5, 1].includes(scoreBlanc)) {
        return Promise.reject(new RangeError("Le score des blancs doit être 0, 0.5 ou 1."));
    }

    return new Promise((resolve, reject) => {
        db.serialize(() => {
            db.run("BEGIN IMMEDIATE", (beginError) => {
                if (beginError) {
                    reject(beginError);
                    return;
                }

                const rollback = (error, rollbackResult) => {
                    db.run("ROLLBACK", (rollbackError) => {
                        if (rollbackError) reject(rollbackError);
                        else if (error) reject(error);
                        else resolve(rollbackResult);
                    });
                };

                db.get(
                    `SELECT id, joueur_blanc_id, joueur_noir_id
                     FROM parties
                     WHERE code = ? AND statut = 'en_cours'
                       AND (joueur_blanc_id = ? OR joueur_noir_id = ?)`,
                    [code, playerId, playerId],
                    (selectError, game) => {
                        if (selectError) {
                            rollback(selectError);
                            return;
                        }
                        if (!game) {
                            rollback(null, false);
                            return;
                        }

                        applyPlayersElo(
                            game.joueur_blanc_id,
                            game.joueur_noir_id,
                            scoreBlanc,
                        ).then(() => {
                            db.run(
                                `UPDATE parties
                                 SET statut = 'terminee',
                                     resultat = CASE
                                         WHEN ? = 0.5 THEN 'Match nul'
                                         WHEN ? = 1 THEN (
                                             SELECT login FROM joueurs WHERE id = joueur_blanc_id
                                         )
                                         ELSE (
                                             SELECT login FROM joueurs WHERE id = joueur_noir_id
                                         )
                                     END,
                                     date_fin = CURRENT_TIMESTAMP
                                 WHERE id = ? AND statut = 'en_cours'`,
                                [scoreBlanc, scoreBlanc, game.id],
                                function (updateError) {
                                    if (updateError) {
                                        rollback(updateError);
                                        return;
                                    }
                                    if (this.changes === 0) {
                                        rollback(null, false);
                                        return;
                                    }

                                    db.run("COMMIT", (commitError) => {
                                        if (commitError) rollback(commitError);
                                        else resolve(true);
                                    });
                                },
                            );
                        }).catch(rollback);
                    },
                );
            });
        });
    });
}

// Ajoute un joueur à une partie en attente.
export function joinGame(code, playerId) {
    return new Promise((resolve, reject) => {
        db.run(
            `UPDATE parties
             SET joueur_noir_id = ?, statut = 'en_cours'
             WHERE code = ? AND statut = 'en_attente' AND joueur_blanc_id != ?`,
            [playerId, code, playerId],
            function (updateError) {
                if (updateError) {
                    reject(updateError);
                    return;
                }

                if (this.changes === 0) {
                    resolve(null);
                    return;
                }

                db.get(
                    `SELECT joueurs.login AS adversaire
                     FROM parties
                     JOIN joueurs ON joueurs.id = parties.joueur_blanc_id
                     WHERE parties.code = ?`,
                    [code],
                    (selectError, game) => {
                        if (selectError) reject(selectError);
                        else resolve(game);
                    },
                );
            },
        );
    });
}
