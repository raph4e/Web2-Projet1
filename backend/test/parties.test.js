import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findOrCreateAccount } from '../repository/joueurs.js';
import { createGame, findGame, joinGame, leaveGame } from '../repository/parties.js';

// Ces tests utilisent une base vide en mémoire, pas db.sqlite3 (voir test/setup.js).
// Chaque test crée ses propres joueurs pour ne pas dépendre des autres tests.
let prochainId = 1;
function nouveauJoueur() {
  const id = prochainId++;
  return findOrCreateAccount({ githubId: id, login: `joueur${id}`, name: null, avatarUrl: null });
}

test('createGame renvoie un code de 6 caracteres en majuscules', async () => {
  const joueur = await nouveauJoueur();

  const code = await createGame(joueur.id);

  assert.match(code, /^[0-9A-F]{6}$/);
});

test.skip('createGame refuse une 2e partie pour le meme joueur', async () => {
  const joueur = await nouveauJoueur();
  await createGame(joueur.id);

  assert.equal(await createGame(joueur.id), null);
});

test('joinGame refuse de rejoindre sa propre partie', async () => {
  const joueur = await nouveauJoueur();
  const code = await createGame(joueur.id);

  assert.equal(await joinGame(code, joueur.id), null);
});

test('joinGame renvoie l\'adversaire et passe la partie en cours', async () => {
  const blanc = await nouveauJoueur();
  const noir = await nouveauJoueur();
  const code = await createGame(blanc.id);

  const resultat = await joinGame(code, noir.id);

  assert.deepEqual(resultat, { adversaire: blanc.login });
  const partie = await findGame(code);
  assert.equal(partie.statut, 'en_cours');
  assert.equal(partie.joueur_noir_login, noir.login);
});

test('joinGame refuse un 3e joueur', async () => {
  const blanc = await nouveauJoueur();
  const noir = await nouveauJoueur();
  const troisieme = await nouveauJoueur();
  const code = await createGame(blanc.id);
  await joinGame(code, noir.id);

  assert.equal(await joinGame(code, troisieme.id), null);
});

test('leaveGame refuse un joueur qui n\'est pas dans la partie', async () => {
  const blanc = await nouveauJoueur();
  const intrus = await nouveauJoueur();
  const code = await createGame(blanc.id);

  assert.equal(await leaveGame(code, intrus.id), false);
});

test('leaveGame marque la partie comme quittee', async () => {
  const blanc = await nouveauJoueur();
  const code = await createGame(blanc.id);

  assert.equal(await leaveGame(code, blanc.id), true);

  const partie = await findGame(code);
  assert.equal(partie.statut, 'quitte');
  assert.equal(partie.resultat, blanc.login);
  // On ne peut pas quitter deux fois
  assert.equal(await leaveGame(code, blanc.id), false);
});

test('apres avoir quitte, le joueur peut creer une nouvelle partie', async () => {
  const joueur = await nouveauJoueur();
  const code = await createGame(joueur.id);
  await leaveGame(code, joueur.id);

  assert.ok(await createGame(joueur.id));
});

test('findGame renvoie undefined pour un code inconnu', async () => {
  assert.equal(await findGame('ZZZZZZ'), undefined);
});
