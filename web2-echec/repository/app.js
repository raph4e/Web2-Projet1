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

app.listen(PORT, () => {
    console.log(`Serveur démarré sur http://localhost:${PORT}`);
});