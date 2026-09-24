import cors from "cors";
import express from "express";
import { auth, currentAccount } from "./auth.js";
import { findAllAccounts } from "./repository/joueurs.js";
import { createGame, findGame, joinGame, leaveGame } from "./repository/parties.js";

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
app.post("/api/parties", async (req, res) => {
    const account = await currentAccount(req);
    if (!account) return res.status(401).json({ erreur: "Non connecté." });

    try {
        const code = await createGame(account.id);
        if (!code) return res.status(409).json({ erreur: "Vous êtes déjà dans une partie." });
        res.status(201).json({ code });
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
app.delete("/api/parties/:code", async (req, res) => {
    const account = await currentAccount(req);
    if (!account) return res.status(401).json({ erreur: "Non connecté." });

    try {
        const left = await leaveGame(req.params.code.toUpperCase(), account.id);
        if (!left) return res.status(404).json({ erreur: "Partie introuvable." });
        res.status(204).end();
    } catch (err) {
        res.status(500).json({ erreur: err.message });
    }
});

// Route pour rejoindre une partie si le joueur est connecté et que la partie est en attente. Retourne une erreur si la partie n'existe pas ou si elle n'est pas en attente.
app.post("/api/parties/:code/rejoindre", async (req, res) => {
    const account = await currentAccount(req);
    if (!account) return res.status(401).json({ erreur: "Non connecté." });

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
