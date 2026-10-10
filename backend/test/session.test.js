import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COOKIE_NAME, readSession, signSession, verifySession } from '../session.js';

// Une session signée puis vérifiée doit redonner les mêmes données.
test('signSession puis verifySession redonne la session', () => {
  const cookie = signSession({ accountId: 42 });

  const session = verifySession(cookie);

  assert.equal(session.accountId, 42);
  assert.ok(session.exp > Date.now()); // la date d'expiration est dans le futur
});


test('Test du cookie modifie', () => {
  const cookie = signSession({ accountId: 42 });

  // On remplace la partie "données" (avant le point) en gardant l'ancienne signature
  const [, signature] = cookie.split('.');
  const fausseDonnee = Buffer.from(JSON.stringify({ accountId: 1, exp: Date.now() + 100000 })).toString('base64url');
  const cookieModifie = `${fausseDonnee}.${signature}`;

  const session = verifySession(cookieModifie);

  assert.deepEqual(session, {});
});

// Une valeur sans point n'a pas de signature.
test('test return data', () => {
    const session = verifySession('bonjour')
    assert.deepEqual(session, {})
})

test('Valeur vide ou absente', () => {
  assert.deepEqual(verifySession(''), {});
  assert.deepEqual(verifySession(undefined), {});
});

test('Signature modifiee', () => {
  const cookie = signSession({ accountId: 42 });

  // On garde les données, mais on remplace le dernier caractère de la signature
  const dernier = cookie.at(-1) === 'A' ? 'B' : 'A';
  const cookieModifie = cookie.slice(0, -1) + dernier;

  assert.deepEqual(verifySession(cookieModifie), {});
});

test('Session expiree', (t) => {
  const cookie = signSession({ accountId: 42 });

  // On fait croire au code qu'on est dans 8 jours
  const dansHuitJours = Date.now() + 8 * 24 * 60 * 60 * 1000;
  t.mock.method(Date, 'now', () => dansHuitJours);

  assert.deepEqual(verifySession(cookie), {});
});

test('readSession trouve le bon cookie parmi plusieurs', () => {
  const cookie = signSession({ accountId: 42 });
  const req = { headers: { cookie: `theme=sombre; ${COOKIE_NAME}=${cookie}; langue=fr` } };

  const session = readSession(req);

  assert.equal(session.accountId, 42);
});

test('readSession sans cookie', () => {
  const req = { headers: {} };

  assert.deepEqual(readSession(req), {});
});
