import cors from "cors";
import express from "express";
import { auth, currentAccount } from "./auth.js";
import { findAllAccounts } from "./repository/joueurs.js";
import {
    createGame,
    findGame,
    joinGame,
    leaveGame,
    updateGameFEN,
    updatePlayersElo,
} from "./repository/parties.js";
import { requireAccount } from "./authorization.js";

const app = express();
const PORT = 3000;

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

// Route pour créer une partie si le joueur est connecté. Retourne le code de la partie créée ou une erreur si le joueur est déjà dans une partie.
app.post("/api/parties", requireAccount, async (req, res) => {
    const account = await currentAccount(req);
    if (!account) return res.status(401).json({ erreur: "Non connecté." });

    const { FEN } = req.body ?? {};
    if (typeof FEN !== "string" || FEN.trim().length === 0) {
        return res.status(400).json({ erreur: "Un FEN non vide est requis." });
    }

    try {
        const code = await createGame(account.id, FEN);
        res.status(201).json({ code });
    } catch (err) {
        res.status(500).json({ erreur: err.message });
    }
});

// Route pour update la partie en cours
app.patch("/api/parties/:id/fen", async (req, res) => {
    const account = await currentAccount(req);
    if (!account) return res.status(401).json({ erreur: "Non connecté." });

    const gameId = Number(req.params.id);
    const { FEN } = req.body ?? {};
    if (
        !Number.isSafeInteger(gameId) ||
        gameId <= 0 ||
        typeof FEN !== "string" ||
        FEN.trim().length === 0
    ) {
        return res.status(400).json({ erreur: "Un identifiant de partie positif et un FEN non vide sont requis." });
    }

    try {
        const updated = await updateGameFEN(gameId, FEN, account.id);
        if (!updated) return res.status(404).json({ erreur: "Partie introuvable ou non accessible." });
        res.json({ partie_id: gameId, FEN });
    } catch (err) {
        res.status(500).json({ erreur: err.message });
    }
});

app.post("/api/parties/:code/terminer", async (req, res) => {
    const account = await currentAccount(req);
    if (!account) return res.status(401).json({ erreur: "Non connecté." });

    const { scoreBlanc } = req.body ?? {};
    if (![0, 0.5, 1].includes(scoreBlanc)) {
        return res.status(400).json({ erreur: "Le score des blancs doit être 0, 0.5 ou 1." });
    }

    try {
        const updated = await updatePlayersElo(
            req.params.code.toUpperCase(),
            account.id,
            scoreBlanc,
        );
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
        const left = await leaveGame(req.params.code.toUpperCase(), account.id);
        if (!left) return res.status(404).json({ erreur: "Partie introuvable." });
        res.status(204).end();
    } catch (err) {
        res.status(500).json({ erreur: err.message });
    }
});

// Route pour rejoindre une partie si le joueur est connecté et que la partie est en attente. Retourne une erreur si la partie n'existe pas ou si elle n'est pas en attente.
app.post("/api/parties/:code/rejoindre", requireAccount, async (req, res) => {
    try {
        const game = await joinGame(req.params.code.toUpperCase(), account.id);
        if (!game) return res.status(409).json({ erreur: "Cette partie n'est pas disponible." });
        res.json({ statut: "en_cours", adversaire: game.adversaire });
    } catch (err) {
        res.status(500).json({ erreur: err.message });
    }
});

// Démarrage du serveur
app.listen(PORT, () => {
    console.log(`Serveur démarré sur http://localhost:${PORT}`);
});
