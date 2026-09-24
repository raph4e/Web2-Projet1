import sqlite3 from "sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Déclaration du chemin vers la base de données SQLite3. Le fichier sera créé dans le même dossier que ce fichier.
const databasePath = path.join(path.dirname(fileURLToPath(import.meta.url)), "db.sqlite3");
const db = new sqlite3.Database(databasePath);

// Création des tables "joueurs", "parties" et "coups" si elles n'existent pas déjà. 
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS joueurs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nom TEXT NOT NULL UNIQUE,
            githubId INTEGER,
            login TEXT,
            name TEXT,
            avatarUrl TEXT,
            elo INTEGER NOT NULL DEFAULT 1000
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS parties (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT UNIQUE,
            joueur_blanc_id INTEGER,
            joueur_noir_id INTEGER,
            statut TEXT NOT NULL DEFAULT 'en_attente',
            tour TEXT NOT NULL DEFAULT 'blanc',
            resultat TEXT,
            date_creation DATETIME DEFAULT CURRENT_TIMESTAMP,
            date_fin DATETIME,

            FOREIGN KEY (joueur_blanc_id) REFERENCES joueurs(id),
            FOREIGN KEY (joueur_noir_id) REFERENCES joueurs(id)
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS coups (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            partie_id INTEGER NOT NULL,
            joueur_id INTEGER NOT NULL,
            numero INTEGER NOT NULL,
            coup TEXT NOT NULL,
            date_coup DATETIME DEFAULT CURRENT_TIMESTAMP,

            FOREIGN KEY (partie_id) REFERENCES parties(id),
            FOREIGN KEY (joueur_id) REFERENCES joueurs(id)
        )
    `);
});

export default db;