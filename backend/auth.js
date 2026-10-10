import { Router } from 'express';
import { randomBytes } from 'node:crypto';
import * as repository from './repository/joueurs.js';
import { clearSession, readSession, writeSession } from './session.js';

// Déclaration des variables d'environnement pour l'authentification GitHub
const CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const CALLBACK_URL = process.env.GITHUB_CALLBACK_URL ?? 'http://localhost:3000/api/auth/callback';

export const auth = Router();

// Route pour rediriger l'utilisateur vers GitHub pour l'authentification
auth.get('/api/auth/github', (req, res) => {

  const state = randomBytes(16).toString('hex');
  writeSession(res, { state });

  const url = new URL('https://github.com/login/oauth/authorize');
  url.searchParams.set('client_id', CLIENT_ID);
  url.searchParams.set('redirect_uri', CALLBACK_URL);
  url.searchParams.set('state', state);

  res.redirect(url.href);
});

// Route de rappel après l'authentification GitHub
auth.get('/api/auth/callback', async (req, res) => {
  const { code, state } = req.query;
  const session = readSession(req);
  if (!code || !state || state !== session.state) {
    return res.status(400).json({ error: 'Retour OAuth invalide (state).' });
  }

  // Récupération du jeton d'accès GitHub en échange du code d'autorisation
  const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { accept: 'application/json', 'content-type': 'application/json' },
    body: JSON.stringify({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code,
      redirect_uri: CALLBACK_URL,
    }),
  });

  // Récupération du jeton d'accès depuis la réponse de GitHub
  const { access_token: token } = await tokenResponse.json();

  // Si le jeton d'accès n'est pas présent, cela signifie que GitHub a refusé le code d'autorisation
  if (!token) {
    return res.status(400).json({ error: 'GitHub a refusé le code.' });
  }

  // Récupération des informations de l'utilisateur à partir de l'API GitHub
  const userResponse = await fetch('https://api.github.com/user', {
    headers: {
      authorization: `Bearer ${token}`,
      accept: 'application/vnd.github+json',
      'user-agent': 'web2-echec',
    },
  });
  const user = await userResponse.json();

  // Création ou récupération du compte utilisateur dans la base de données et écriture de la session
  const account = await repository.findOrCreateAccount({
    githubId: user.id,
    login: user.login,
    name: user.name,
    avatarUrl: user.avatar_url,
  });
  writeSession(res, { accountId: account.id });

  // Redirection vers la page d'accueil après l'authentification réussie
  res.redirect('http://localhost:5173/');
});

// Route pour la déconnexion de l'utilisateur
auth.post('/api/auth/logout', (req, res) => {
  clearSession(res);
  res.status(204).end();
});

// Route pour récupérer les informations du compte connecté
auth.get('/api/me', async (req, res) => {
  const account = await currentAccount(req);
  if (!account) {
    return res.status(401).json({ error: 'Non connecté.' });
  }
  res.status(200).json(publicProfile(account));
});


// Fonction pour récupérer le compte actuel à partir de la session, sinon retourne null si l'utilisateur n'est pas connecté
export async function currentAccount(req) {
  const { accountId } = readSession(req);
  if (!accountId) return null;
  return (await repository.findAccount(accountId)) ?? null;
}

// Fonction pour créer un profil public à partir des informations du compte
function publicProfile(account) {
  return {
    id: account.id,
    login: account.login,
    name: account.name,
    avatarUrl: account.avatar_url,
  };
}