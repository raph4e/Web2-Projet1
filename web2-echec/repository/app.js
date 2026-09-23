import express from "express";
import cors from "cors";
import db from "./db.js";

const app = express();

app.use(cors());
app.use(express.json());

const PORT = 3000;

app.get("/", (req, res) => {
    res.json({
        message: "Serveur du jeu d'échecs fonctionnel"
    });
});

// Créer un joueur
app.post("/api/joueurs", (req, res) => {
    const { nom } = req.body;

    if (!nom) {
        return res.status(400).json({
            erreur: "Le nom est obligatoire"
        });
    }

    const sql = `
        INSERT INTO joueurs (nom)
        VALUES (?)
    `;

    db.run(sql, [nom], function (err) {
        if (err) {
            return res.status(500).json({
                erreur: err.message
            });
        }

        res.status(201).json({
            message: "Joueur créé avec succès",
            joueur: {
                id: this.lastID,
                nom: nom,
                elo: 1000
            }
        });
    });
});

// Récupérer les joueurs
app.get("/api/joueurs", (req, res) => {

    db.all("SELECT * FROM joueurs", (err, joueurs) => {

        if (err) {
            return res.status(500).json({
                erreur: err.message
            });
        }

        res.json(joueurs);
    });
});

// ── 2. GESTION DES PARTIES ───────────────────────────────────────────
app.post("/api/parties", (req, res) => {
    const { joueur_id, code } = req.body;

    if (!joueur_id || !code) {
        return res.status(400).json({
            erreur: "Le joueur_id et le code sont obligatoires"
        });
    }

    // Tirage au sort de la couleur du créateur
    const whiteTeam = Math.random() < 0.5;
    const joueur_blanc_id = whiteTeam ? joueur_id : null;
    const joueur_noir_id = whiteTeam ? null : joueur_id;

    const sql = `
        INSERT INTO parties (code, joueur_blanc_id, joueur_noir_id, statut, tour)
        VALUES (?, ?, ?, 'en_attente', 'blanc')
    `;

    db.run(sql, [code, joueur_blanc_id, joueur_noir_id], function (err) {
        if (err) {
            return res.status(500).json({ erreur: err.message });
        }

        res.status(201).json({
            message: "Partie créée avec succès",
            partie_id: this.lastID,
            code: code,
            votre_couleur: whiteTeam ? "blanc" : "noir"
        });
    });
})

app.post("/api/parties/:code/rejoindre", (req, res) => {
    const { code } = req.params;   
    const { joueur_id } = req.body;

    if (!joueur_id) {
        return res.status(400).json({
            erreur: "Le joueur_id est obligatoire"
        });
    }

    // 1. Cherche uniquement la partie si son statut est 'en_attente'
    db.get("SELECT * FROM parties WHERE code = ? AND statut = 'en_attente'", [code], (err, partie) => {
        if (err) {
            return res.status(500).json({ erreur: err.message });
        }

        // Si la partie n'existe pas ou n'est plus en attente
        if (!partie) {
            return res.status(404).json({ erreur: "Partie introuvable ou déjà complète" });
        }

        // 2. Détermine le rôle libre
        const champLibre = partie.joueur_blanc_id === null ? "joueur_blanc_id" : "joueur_noir_id";

        const sql = `
            UPDATE parties 
            SET ${champLibre} = ?, statut = 'en_cours'
            WHERE code = ?
        `;

        // 3. Exécution de la mise à jour (1er '?' -> joueur_id, 2e '?' -> code)
        db.run(sql, [joueur_id, code], function (err) {
            if (err) {
                return res.status(500).json({ erreur: err.message });
            }

            res.json({
                message: "Partie rejointe avec succès",
                votre_couleur: champLibre === "joueur_blanc_id" ? "blanc" : "noir"
            });
        });
    });
});
// Récupérer les détails d'une partie avec ses joueurs
app.get("/api/parties/:code", (req, res) => {
    const { code } = req.params;

    const sql = `
        SELECT p.*, 
               jb.nom AS nom_blanc, 
               jn.nom AS nom_noir
        FROM parties p
        LEFT JOIN joueurs jb ON p.joueur_blanc_id = jb.id
        LEFT JOIN joueurs jn ON p.joueur_noir_id = jn.id
        WHERE p.code = ?
    `;

    db.get(sql, [code], (err, partie) => {
        if (err) {
            return res.status(500).json({ erreur: err.message });
        }
        if (!partie) {
            return res.status(404).json({ erreur: "Partie introuvable" });
        }
        res.json(partie);
    });
});

// ── 3. GESTION DES COUPS ─────────────────────────────────────────────

// Enregistrer un coup joué
app.post("/api/coups", (req, res) => {
    const { partie_id, joueur_id, numero, coup, prochain_tour } = req.body;

    if (!partie_id || !joueur_id || !numero || !coup) {
        return res.status(400).json({ erreur: "Champs requis manquants pour enregistrer le coup" });
    }

    const sqlCoup = `
        INSERT INTO coups (partie_id, joueur_id, numero, coup)
        VALUES (?, ?, ?, ?)
    `;

    db.run(sqlCoup, [partie_id, joueur_id, numero, coup], function (err) {
        if (err) {
            return res.status(500).json({ erreur: err.message });
        }

        // Met à jour le tour de la partie si fourni (ex: 'noir' ou 'blanc')
        if (prochain_tour) {
            db.run(`UPDATE parties SET tour = ? WHERE id = ?`, [prochain_tour, partie_id]);
        }

        res.status(201).json({
            message: "Coup enregistré",
            coup_id: this.lastID
        });
    });
});

// Obtenir l'historique des coups d'une partie
app.get("/api/parties/:partie_id/coups", (req, res) => {
    const { partie_id } = req.params;

    const sql = `
        SELECT c.*, j.nom AS nom_joueur
        FROM coups c
        JOIN joueurs j ON c.joueur_id = j.id
        WHERE c.partie_id = ?
        ORDER BY c.numero ASC
    `;

    db.all(sql, [partie_id], (err, coups) => {
        if (err) {
            return res.status(500).json({ erreur: err.message });
        }
        res.json(coups);
    });
});

app.listen(PORT, () => {
    console.log(`Serveur démarré sur http://localhost:${PORT}`);
});