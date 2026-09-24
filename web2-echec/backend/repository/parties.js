import db from "../db.js";
import { randomBytes } from "node:crypto";

// Crée une partie si le joueur n'en a pas déjà une active.
export function createGame(playerId) {
    return new Promise((resolve, reject) => {
        // Vérifie si le joueur a déjà une partie en cours ou en attente
        db.get(
            `SELECT id FROM parties
             WHERE statut IN ('en_attente', 'en_cours')
             AND (joueur_blanc_id = ? OR joueur_noir_id = ?)`,
            [playerId, playerId],
            (checkError, existingGame) => {
                if (checkError) {
                    reject(checkError);
                    return;
                }

                if (existingGame) {
                    resolve(null);
                    return;
                }
                
                // Génère un code unique pour la partie et l'insère dans la base de données
                const code = randomBytes(3).toString("hex").toUpperCase();
                db.run(
                    "INSERT INTO parties (code, joueur_blanc_id) VALUES (?, ?)",
                    [code, playerId],
                    (insertError) => {
                        if (insertError) reject(insertError);
                        else resolve(code);
                    },
                );
            },
        );
    });
}

// Récupère une partie et les noms de ses joueurs.
export function findGame(code) {
    return new Promise((resolve, reject) => {
        db.get(
            `SELECT parties.code, parties.statut, parties.resultat,
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
        db.run(
            `UPDATE parties
             SET statut = 'quitte',
                 resultat = (SELECT login FROM joueurs WHERE id = ?)
             WHERE code = ?
             AND statut IN ('en_attente', 'en_cours')
             AND (joueur_blanc_id = ? OR joueur_noir_id = ?)`,
            [playerId, code, playerId, playerId],
            function (err) {
                if (err) reject(err);
                else resolve(this.changes > 0);
            },
        );
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
