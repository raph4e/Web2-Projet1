import { currentAccount } from "./auth";

// Middleware qui vérifie si l'utilisateur est connecté avant d'accéder à certaines routes. Si l'utilisateur n'est pas connecté, renvoie une erreur 401.
export async function requireAccount(req, res, next) {
    const account = await currentAccount(req);
    if (!account) {
      return res.status(401).json({ error: 'Connectez-vous.' });
    }
    req.account = account;
    next();
}