import { Server } from "socket.io";
import { Chess } from "chess.js";
import { currentAccount } from "./auth.js";
import { findGame, updateGameFEN, leaveGame, updatePlayersElo } from "./repository/parties.js";
import { scoreBlancDepuisFen } from "./repository/outils.js";

export function initSocket(server) {
    if (!server) {
        return {
            on: () => {},
            to: () => ({ emit: () => {} }),
            emit: () => {},
        };
    }

    const io = new Server(server, {
        cors: {
            origin: "http://localhost:5173",
            credentials: true,
        },
    });

    // Le portier : lit le cookie de session une seule fois, à l'ouverture de la connexion.
    // Pas de compte = spectateur (account = null) : il peut regarder, mais pas jouer.
    io.use(async (socket, next) => {
        try {
            const compte = await currentAccount(socket.request);
            socket.data.account = compte;
            next();
        } catch (err) {
            next(err);
        }
    });

    io.on("connection", (socket) => {

        // On envoie aussi l'état de la partie pour la reconnexion (exigence technique)
        socket.on("partie:rejoindre", async ({ code }) => {
            const roomCode = String(code).toUpperCase();

            socket.join(roomCode);
            socket.data.code = roomCode;

            const game = await findGame(roomCode);
            if (!game) {
                socket.emit("partie:erreur", { message: "Partie introuvable." });
                return;
            }

            socket.emit("partie:etat", {
                id: game.id,
                code: game.code,
                statut: game.statut,
                FEN: game.FEN ?? "start",
                joueur_blanc_id: game.joueur_blanc_id,
                joueur_noir_id: game.joueur_noir_id,
                joueur_blanc_login: game.joueur_blanc_login,
                joueur_noir_login: game.joueur_noir_login,
            });
        });

        socket.on("coup:joue", async ({ code, from, to, promotion = "q" }) => {
            try {
                // Vérifier que la personne est connectée (pas un spectateur)
                const account = socket.data.account;
                if (!account) {
                    socket.emit("coup:erreur", { message: "Les spectateurs ne peuvent pas jouer." });
                    return;
                }
                // Vérifier que la partie existe bel et bien
                const game = await findGame(code.toUpperCase());
                if (!game) {
                    socket.emit("coup:erreur", { message: "Partie introuvable." });
                    return;
                }

                // Vérifie que c'est bel et bien au tour du joueur
                const joueurBlancId = Number(game.joueur_blanc_id);
                const joueurNoirId = Number(game.joueur_noir_id);
                const idJoueur = Number(account.id);

                const estBlanc = joueurBlancId === idJoueur;
                const estNoir = joueurNoirId === idJoueur;

                if (!estBlanc && !estNoir) {
                    socket.emit("coup:erreur", { message: "Tu ne fais pas partie de cette partie." });
                    return;
                }

                // La position vient de la base de données, jamais du message du client
                const chess = game.FEN ? new Chess(game.FEN) : new Chess();
                const couleurAJouer = chess.turn();
                // Si le joueur est blanc et que le FEN dit "w", il peut jouer
                // Si le joueur est blanc et que le FEN dit "b", il ne peut pas jouer
                const couleurJoueur = estBlanc ? "w" : "b";

                if (couleurAJouer !== couleurJoueur) {
                    socket.emit("coup:erreur", { message: "Ce n'est pas ton tour." });
                    return;
                }

                const pieceSource = chess.get(from);
                if (!pieceSource || pieceSource.color !== couleurJoueur) {
                    socket.emit("coup:erreur", { message: "Tu ne peux pas déplacer cette pièce." });
                    return;
                }

                const move = chess.move({ from, to, promotion });
                if (!move) {
                    socket.emit("coup:erreur", { message: "Coup illégal." });
                    return;
                }

                const nouveauFen = chess.fen();

                // Enregistrer dans la DB
                const updated = await updateGameFEN(game.id, nouveauFen, account.id);
                if (!updated) {
                    socket.emit("coup:erreur", { message: "Partie inaccessible ou ce n'est pas ton tour." });
                    return;
                }

                // Diffuser le coup (les rooms sont nommées avec le code en majuscules)
                const roomCode = String(code).toUpperCase();
                io.to(roomCode).emit("coup:annonce", {
                    code: roomCode,
                    joueurId: account.id,
                    from,
                    to,
                    promotion,
                    fen: nouveauFen,
                    san: move.san,
                });

                // Fin de partie : c'est le serveur qui calcule le résultat, à partir de SA position
                const scoreBlanc = scoreBlancDepuisFen(nouveauFen);
                if (scoreBlanc !== null) {
                    const terminee = await updatePlayersElo(roomCode, account.id, scoreBlanc);
                    if (terminee) {
                        io.to(roomCode).emit("partie:terminee", { code: roomCode, scoreBlanc });
                    }
                }
            } catch (err) {
                console.error("Erreur coup:joue", err);
                socket.emit("coup:erreur", { message: err.message });
            }
        });

        socket.on("partie:abandonner", async ({ code }) => {
            try {
                const roomCode = String(code).toUpperCase();

                // 1. Refuser les spectateurs
                const account = socket.data.account;
                if (!account) {
                    socket.emit("partie:erreur", { message: "Les spectateurs ne peuvent pas abandonner." });
                    return;
                }

                // 2. Quitter la partie (refusé si le joueur ne fait pas partie de cette partie)
                const left = await leaveGame(roomCode, account.id);
                if (!left) {
                    socket.emit("partie:erreur", { message: "Tu ne fais pas partie de cette partie." });
                    return;
                }

                // 3. Prévenir tout le monde dans la room
                io.to(roomCode).emit("partie:quitte", {
                    code: roomCode,
                    message: `${account.login} a abandonné la partie`,
                });
            } catch (err) {
                console.error("Erreur partie:abandonner", err);
                socket.emit("partie:erreur", { message: err.message });
            }
        });
    });

    return io;
}