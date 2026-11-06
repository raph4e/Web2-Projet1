// Chargé avant chaque fichier de test grâce à l'option --import du script "test" (package.json).
// db.js se connecte normalement à un vrai serveur PostgreSQL. Pour que les tests n'aient
// besoin d'aucun serveur et ne touchent jamais la vraie base, on remplace pg.Pool par
// celui de pg-mem : une copie de PostgreSQL qui vit entièrement en mémoire.
// Ça doit être fait AVANT que db.js soit importé, d'où le --import.
import pg from 'pg';
import { newDb } from 'pg-mem';

const { Pool } = newDb().adapters.createPg();
pg.Pool = Pool;
