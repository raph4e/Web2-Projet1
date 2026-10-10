// Chargé avant chaque fichier de test (voir le script "test" du package.json).
// db.js ouvre toujours le fichier db.sqlite3. Pour ne jamais modifier la vraie base,
// on remplace sqlite3 par une version qui ouvre une base vide en mémoire à la place.
import { mock } from 'node:test';
import sqlite3 from 'sqlite3';

class BaseEnMemoire extends sqlite3.Database {
  constructor() {
    super(':memory:');
  }
}

mock.module('sqlite3', {
  defaultExport: { ...sqlite3, Database: BaseEnMemoire },
});

//test
//test2/