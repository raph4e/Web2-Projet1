import { test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import express from 'express';
import { findOrCreateAccount } from '../repository/joueurs.js';
import { COOKIE_NAME, signSession } from '../session.js';

// Tests d'intégration : on envoie de vraies requêtes HTTP à l'application Express,
// avec la base en mémoire (voir test/setup.js).
//
// app.js n'exporte pas l'application et appelle app.listen(3000) dès qu'on l'importe.
// Avant de l'importer, on remplace donc listen() par une version qui n'ouvre aucun port
// et qui garde l'application dans `app`. supertest l'utilise ensuite directement.
let app;
express.application.listen = function () {
  app = this;
};
await import('../app.js');

let prochainId = 1;
function nouveauJoueur() {
  const id = prochainId++;
  return findOrCreateAccount({ githubId: id, login: `joueur${id}`, name: `Joueur ${id}`, avatarUrl: null });
}

// Fabrique le cookie qu'aurait le navigateur d'un joueur connecté.
function cookiePour(joueur) {
  return `${COOKIE_NAME}=${signSession({ accountId: joueur.id })}`;
}

test('GET / repond que le serveur fonctionne', async () => {
  const res = await request(app).get('/');

  assert.equal(res.status, 200);
});

test('GET /api/me sans cookie renvoie 401', async () => {
  const res = await request(app).get('/api/me');

  assert.equal(res.status, 401);
});

test('GET /api/me avec un faux cookie renvoie 401', async () => {
  const res = await request(app).get('/api/me').set('Cookie', `${COOKIE_NAME}=faux.cookie`);

  assert.equal(res.status, 401);
});

test('GET /api/me avec un cookie valide renvoie le profil', async () => {
  const joueur = await nouveauJoueur();

  const res = await request(app).get('/api/me').set('Cookie', cookiePour(joueur));

  assert.equal(res.status, 200);
  assert.equal(res.body.id, joueur.id);
  assert.equal(res.body.login, joueur.login);
});

test('POST /api/parties sans etre connecte renvoie 401', async () => {
  const res = await request(app).post('/api/parties');

  assert.equal(res.status, 401);
});

test('POST /api/parties cree une partie, puis refuse la 2e (409)', async () => {
  const joueur = await nouveauJoueur();

  const premiere = await request(app).post('/api/parties').set('Cookie', cookiePour(joueur));
  assert.equal(premiere.status, 201);
  assert.match(premiere.body.code, /^[0-9A-F]{6}$/);

  const seconde = await request(app).post('/api/parties').set('Cookie', cookiePour(joueur));
  assert.equal(seconde.status, 409);
});

test('GET /api/parties/:code inconnu renvoie 404', async () => {
  const res = await request(app).get('/api/parties/ZZZZZZ');

  assert.equal(res.status, 404);
});

test('scenario complet : creer, rejoindre, consulter, quitter', async () => {
  const blanc = await nouveauJoueur();
  const noir = await nouveauJoueur();

  // Le joueur blanc crée la partie
  const creation = await request(app).post('/api/parties').set('Cookie', cookiePour(blanc));
  const { code } = creation.body;

  // Le joueur noir la rejoint (en minuscules : le serveur doit accepter)
  const rejoindre = await request(app)
    .post(`/api/parties/${code.toLowerCase()}/rejoindre`)
    .set('Cookie', cookiePour(noir));
  assert.equal(rejoindre.status, 200);
  assert.deepEqual(rejoindre.body, { statut: 'en_cours', adversaire: blanc.login });

  // N'importe qui peut consulter la partie
  const partie = await request(app).get(`/api/parties/${code}`);
  assert.equal(partie.status, 200);
  assert.equal(partie.body.statut, 'en_cours');
  assert.equal(partie.body.joueur_blanc_login, blanc.login);
  assert.equal(partie.body.joueur_noir_login, noir.login);

  // Le joueur noir quitte : 204, puis 404 s'il réessaie
  const quitter = await request(app).delete(`/api/parties/${code}`).set('Cookie', cookiePour(noir));
  assert.equal(quitter.status, 204);
  const quitterEncore = await request(app).delete(`/api/parties/${code}`).set('Cookie', cookiePour(noir));
  assert.equal(quitterEncore.status, 404);
});

test('POST /api/parties/:code/rejoindre sur une partie inexistante renvoie 409', async () => {
  const joueur = await nouveauJoueur();

  const res = await request(app).post('/api/parties/ZZZZZZ/rejoindre').set('Cookie', cookiePour(joueur));

  assert.equal(res.status, 409);
});

test('POST /api/auth/logout efface le cookie', async () => {
  const res = await request(app).post('/api/auth/logout');

  assert.equal(res.status, 204);
  assert.ok(res.headers['set-cookie'][0].startsWith(`${COOKIE_NAME}=;`));
});

test('GET /api/auth/github redirige vers GitHub avec un state', async () => {
  const res = await request(app).get('/api/auth/github');

  assert.equal(res.status, 302);
  const url = new URL(res.headers.location);
  assert.equal(url.hostname, 'github.com');
  assert.ok(url.searchParams.get('state'));
  assert.ok(res.headers['set-cookie'][0].startsWith(`${COOKIE_NAME}=`));
});

test('GET /api/auth/callback avec un mauvais state renvoie 400', async () => {
  const cookie = `${COOKIE_NAME}=${signSession({ state: 'le-bon-state' })}`;

  const res = await request(app).get('/api/auth/callback?code=abc&state=un-autre-state').set('Cookie', cookie);

  assert.equal(res.status, 400);
});

test('GET /api/auth/callback connecte le joueur (GitHub simule)', async (t) => {
  // On remplace fetch : aucune requête ne part vraiment vers GitHub
  t.mock.method(globalThis, 'fetch', async (url) => {
    if (String(url).includes('access_token')) {
      return Response.json({ access_token: 'faux-jeton' });
    }
    return Response.json({ id: 9999, login: 'githubeur', name: 'Git Hubeur', avatar_url: 'g.png' });
  });
  const cookie = `${COOKIE_NAME}=${signSession({ state: 'abc' })}`;

  const res = await request(app).get('/api/auth/callback?code=123&state=abc').set('Cookie', cookie);

  assert.equal(res.status, 302);
  assert.equal(res.headers.location, 'http://localhost:5173/');

  // Le cookie reçu permet ensuite d'accéder à /api/me
  const nouveauCookie = res.headers['set-cookie'][0].split(';')[0];
  const me = await request(app).get('/api/me').set('Cookie', nouveauCookie);
  assert.equal(me.body.login, 'githubeur');
});
