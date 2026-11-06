import pg from "pg";

// Connexion à PostgreSQL. L'adresse vient de la variable d'environnement DATABASE_URL
// (définie dans docker-compose.yml). La valeur par défaut sert quand on lance "npm start"
// directement sur l'ordi : elle pointe vers le PostgreSQL de docker-compose.yml (port 5433).
// Un "pool" garde plusieurs connexions ouvertes et les réutilise entre les requêtes.
const db = new pg.Pool({
    connectionString: process.env.DATABASE_URL ?? "postgres://echec:echec@localhost:5433/echec",
});

// Création des tables "joueurs", "parties" et "coups" si elles n'existent pas déjà.
// Attention : PostgreSQL met en minuscules les noms de colonnes qui ne sont pas entre guillemets.
// "githubId", "avatarUrl" et "FEN" sont donc entre guillemets pour garder leur majuscule
// (sinon le JS recevrait joueur.githubid au lieu de joueur.githubId).
// SERIAL remplace INTEGER PRIMARY KEY AUTOINCREMENT, et TIMESTAMP remplace DATETIME.
await db.query(`
    CREATE TABLE IF NOT EXISTS joueurs (
        id SERIAL PRIMARY KEY,
        nom TEXT NOT NULL UNIQUE,
        "githubId" INTEGER,
        login TEXT,
        name TEXT,
        "avatarUrl" TEXT,
        elo INTEGER NOT NULL DEFAULT 1000
    );

    CREATE TABLE IF NOT EXISTS parties (
        id SERIAL PRIMARY KEY,
        code TEXT UNIQUE,
        joueur_blanc_id INTEGER REFERENCES joueurs(id),
        joueur_noir_id INTEGER REFERENCES joueurs(id),
        statut TEXT NOT NULL DEFAULT 'en_attente',
        tour TEXT NOT NULL DEFAULT 'blanc',
        resultat TEXT,
        date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        date_fin TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS coups (
        id SERIAL PRIMARY KEY,
        partie_id INTEGER NOT NULL REFERENCES parties(id),
        "FEN" TEXT
    );
`);

export default db;
