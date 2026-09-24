import { createHmac, timingSafeEqual } from 'node:crypto';

// Le cookie de session est signé pour que le navigateur ne puisse pas le modifier.
const COOKIE_NAME = 'Web2-Projet1_session';
const SECRET = process.env.SESSION_SECRET ?? 'developpement-seulement';
const DUREE_MS = 7 * 24 * 60 * 60 * 1000; 

// Retourne une session signée, prête à être posée dans un cookie. Le navigateur ne peut pas la modifier.
export function signSession(session) {
  const contenu = { ...session, exp: Date.now() + DUREE_MS };
  const data = Buffer.from(JSON.stringify(contenu)).toString('base64url');
  return `${data}.${signature(data)}`;
}

// Vérifie la signature et la date d'expiration d'une session. Retourne {} si elle est invalide.
export function verifySession(value) {
  const [data, sig] = (value ?? '').split('.');
  if (!data || !sig) return {};
  const expected = signature(data);

  if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    return {};
  }
  try {
    const session = JSON.parse(Buffer.from(data, 'base64url').toString());

    if (!(session.exp > Date.now())) return {};
    return session;
  } catch {
    return {};
  }
}

// Retourne la signature HMAC d'une chaîne de caractères.
function signature(data) {
  return createHmac('sha256', SECRET).update(data).digest('base64url');
}

// Lit la session dans la requête : le navigateur l'a renvoyée depuis le cookie. {} si elle est invalide ou absente. 
export function readSession(req) {
  const cookies = Object.fromEntries(
    (req.headers.cookie ?? '')
      .split(';')
      .map((part) => part.trim().split('='))
      .filter(([name]) => name),
  );
  return verifySession(cookies[COOKIE_NAME]);
}

// Écrit la session dans la réponse : le navigateur la stockera dans un cookie.
export function writeSession(res, session) {
  res.cookie(COOKIE_NAME, signSession(session), {
    httpOnly: true, // invisible au JavaScript de la page : un XSS ne la vole pas
    sameSite: 'lax', // pas envoyé par un formulaire posté depuis un autre site
    maxAge: DUREE_MS, // le navigateur l'oublie au bout d'une semaine, lui aussi
    path: '/',
  });
}

// Efface la session dans la réponse : le navigateur l'oubliera. S'éxécute lorsque l'utilisateur se déconnecte.
export function clearSession(res) {
  res.clearCookie(COOKIE_NAME, { path: '/' });
}

// Exporte le nom du cookie pour que les tests puissent le lire.
export { COOKIE_NAME };