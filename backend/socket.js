import { Server } from "socket.io";
import { findGame, updateGameFEN } from "./repository/parties.js";
import { Chess } from "chess.js";

export function initSocket(server) {
    const io = new Server(server, {
        cors: {
            origin: "http://localhost:5173",
            credentials: true,
        },
    });

    io.on("connection", (socket) => {

        // On envoie aussi l'état de la partie pour la reconnexion (exigence technique)
        socket.on("partie:rejoindre", async ({ code, joueurId }) => {
            const roomCode = String(code).toUpperCase();

            socket.join(roomCode);
            socket.data.code = roomCode;
            socket.data.joueurId = joueurId;

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

        socket.on("coup:joue", async ({ code, joueurId, from, to, promotion = "q", fen }) => {
            try {
                // Vérifier que la partie existe bel et bien
                const game = await findGame(code.toUpperCase());
                if (!game) {
                    socket.emit("coup:erreur", { message: "Partie introuvable." });
                    return;
                }

                // Vérifie que c'est bel et bien au tour du joueur
                const joueurBlancId = Number(game.joueur_blanc_id);
                const joueurNoirId = Number(game.joueur_noir_id);
                const idJoueur = Number(joueurId);

                const estBlanc = joueurBlancId === idJoueur;
                const estNoir = joueurNoirId === idJoueur;

                if (!estBlanc && !estNoir) {
                    socket.emit("coup:erreur", { message: "Tu ne fais pas partie de cette partie." });
                    return;
                }

                const chess = new Chess(fen);
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
                const updated = await updateGameFEN(game.id, nouveauFen, joueurId);
                if (!updated) {
                    socket.emit("coup:erreur", { message: "Partie inaccessible ou ce n'est pas ton tour." });
                    return;
                }

                // Diffuser le coup
                io.to(code).emit("coup:annonce", {
                    code,
                    joueurId,
                    from,
                    to,
                    promotion,
                    fen: nouveauFen,
                    san: move.san,
                });
            } catch (err) {
                console.error("Erreur coup:joue", err);
                socket.emit("coup:erreur", { message: err.message });
            }
        });
    });

    return io;
}