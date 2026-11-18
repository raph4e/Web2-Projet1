import http from "http";
import cors from "cors";
import express from "express";
import { auth, currentAccount } from "./auth.js";
import { findAllAccounts, findGamesByPlayer } from "./repository/joueurs.js";
import {
    createGame,
    findGame,
    joinGame,
    leaveGame,
    updatePlayersElo,
} from "./repository/parties.js";
import { FEN_DEPART, scoreBlancDepuisFen } from "./repository/outils.js";
import { requireAccount } from "./authorization.js";
import { initSocket } from "./socket.js";

export const app = express();
const PORT = 3000;
export const server = http.createServer(app);
const io = initSocket(server);

if (process.env.NODE_ENV !== "test") {
    server.listen(PORT, () => {
        console.log(`Serveur démarré sur http://localhost:${PORT}`);
    });
}

// Déclaration des middlewares pour gérer les requêtes CORS et le parsing du JSON
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());
app.use(auth);

// Route de test pour vérifier que le serveur fonctionne
app.get("/", (req, res) => {
    res.json({ message: "Serveur du jeu d'échecs fonctionnel" });
});


// Route pour récupérer tout les joueurs
app.get("/api/joueurs", async (req, res) => {
    try {
        res.json(await findAllAccounts());
    } catch (err) {
        res.status(500).json({ erreur: err.message });
    }
});

// Route pour récupérer toutes les parties d'un joueur.
app.get("/api/joueurs/:id/parties", async (req, res) => {
    const playerId = Number(req.params.id);
    if (!Number.isSafeInteger(playerId) || playerId <= 0) {
        return res.status(400).json({ erreur: "Un identifiant de joueur positif est requis." });
    }

    try {
        res.json(await findGamesByPlayer(playerId));
    } catch (err) {
        res.status(500).json({ erreur: err.message });
    }
});

// Route pour créer une partie si le joueur est connecté. Retourne le code de la partie créée ou une erreur si le joueur est déjà dans une partie.
// La position de départ est imposée par le serveur : un FEN envoyé par le client est ignoré.
app.post("/api/parties", requireAccount, async (req, res) => {
    try {
        const code = await createGame(req.account.id, FEN_DEPART);
        if (!code) {
            return res.status(409).json({ erreur: "Vous êtes déjà dans une partie active." });
        }
        res.status(201).json({ code });
    } catch (err) {
        res.status(500).json({ erreur: err.message });
    }
});

// Termine une partie. Le résultat est calculé par le serveur à partir de la position
// enregistrée en base : on ignore tout score envoyé par le client.
app.post("/api/parties/:code/terminer", requireAccount, async (req, res) => {
    try {
        const code = req.params.code.toUpperCase();
        const game = await findGame(code);
        if (!game || !game.FEN) return res.status(404).json({ erreur: "Partie introuvable." });

        const scoreBlanc = scoreBlancDepuisFen(game.FEN);
        if (scoreBlanc === null) {
            return res.status(409).json({ erreur: "La partie n'est pas terminée." });
        }

        const updated = await updatePlayersElo(code, req.account.id, scoreBlanc);
        if (!updated) return res.status(409).json({ erreur: "Cette partie est déjà terminée ou inaccessible." });
        res.json({ statut: "terminee" });
    } catch (err) {
        res.status(500).json({ erreur: err.message });
    }
});

// Route pour récupérer une partie par son code. Retourne les informations de la partie et les noms des joueurs.
app.get("/api/parties/:code", async (req, res) => {
    try {
        const game = await findGame(req.params.code.toUpperCase());
        if (!game) return res.status(404).json({ erreur: "Partie introuvable." });
        res.json(game);
    } catch (err) {
        res.status(500).json({ erreur: err.message });
    }
});

// Route pour supprimer une partie si le joueur est connecté et appartient à la partie. Retourne une erreur si la partie n'existe pas ou si le joueur n'appartient pas à la partie.
app.delete("/api/parties/:code", requireAccount, async (req, res) => {
    try {
        const code = req.params.code.toUpperCase();

        const left = await leaveGame(code, req.account.id);
        if (!left) return res.status(404).json({ erreur: "Partie introuvable." });

        io.to(code).emit("partie:quitte", {
            code,
            message: `${req.account.login} a quitté la partie`,
        });

        res.status(204).end();
    } catch (err) {
        res.status(500).json({ erreur: err.message });
    }
});

// Rejoint une partie en attente ou restaure une partie en cours dont le joueur est déjà membre.
app.post("/api/parties/:code/rejoindre", requireAccount, async (req, res) => {
    try {
        const code = req.params.code.toUpperCase();
        const joined = await joinGame(code, req.account.id);
        if (!joined) {
            return res.status(409).json({ erreur: "Cette partie n'est pas disponible." });
        }

        const game = await findGame(code);
        if (!game) {
            return res.status(404).json({ erreur: "Partie introuvable." });
        }

        io.to(code).emit("partie:etat", {
            id: game.id,
            code: game.code,
            statut: game.statut,
            FEN: game.FEN ?? "start",
            joueur_blanc_id: game.joueur_blanc_id,
            joueur_noir_id: game.joueur_noir_id,
            joueur_blanc_login: game.joueur_blanc_login,
            joueur_noir_login: game.joueur_noir_login,
        });

        res.json(joined);
    } catch (err) {
        res.status(500).json({ erreur: err.message });
    }
});

