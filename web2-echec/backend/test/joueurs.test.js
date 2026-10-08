import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findAccount, findAllAccounts, findOrCreateAccount } from '../repository/joueurs.js';

// Ces tests utilisent une base vide en mémoire, pas db.sqlite3 (voir test/setup.js).

test('findOrCreateAccount cree un nouveau joueur avec un elo de 1000', async () => {
  const joueur = await findOrCreateAccount({ githubId: 1, login: 'alice', name: 'Alice', avatarUrl: 'a.png' });

  assert.ok(joueur.id);
  assert.equal(joueur.login, 'alice');
  assert.equal(joueur.elo, 1000);
});

test('findOrCreateAccount ne cree pas de doublon et met a jour le joueur', async () => {
  const premier = await findOrCreateAccount({ githubId: 2, login: 'bob', name: 'Bob', avatarUrl: 'b.png' });

  const second = await findOrCreateAccount({ githubId: 2, login: 'bob', name: 'Robert', avatarUrl: 'b.png' });

  assert.equal(second.id, premier.id);
  const enBase = await findAccount(premier.id);
  assert.equal(enBase.name, 'Robert');

  const tous = await findAllAccounts();
  assert.equal(tous.filter((j) => j.githubId === 2).length, 1);
});

test('findAccount renvoie undefined si le joueur n\'existe pas', async () => {
  assert.equal(await findAccount(999), undefined);
});

test('deux comptes GitHub avec le meme login sont refuses (nom UNIQUE)', async () => {
  await findOrCreateAccount({ githubId: 3, login: 'charlie', name: 'Charlie', avatarUrl: null });

  await assert.rejects(
    findOrCreateAccount({ githubId: 4, login: 'charlie', name: 'Autre', avatarUrl: null }),
  );
});
