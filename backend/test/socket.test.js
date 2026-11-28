import { createServer } from 'node:http';
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { io as createSocketClient } from 'socket.io-client';
import { initSocket } from '../socket.js';
import { COOKIE_NAME, signSession } from '../session.js';
import { findOrCreateAccount } from '../repository/joueurs.js';
import { createGame, findGame, joinGame } from '../repository/parties.js';
import db from '../db.js';

// Vide la base en mémoire avant chaque test pour éviter qu'il dépende des données d'un autre test.
beforeEach(async () => {
  for (const table of ['coups', 'parties', 'joueurs']) {
    await db.query(`DELETE FROM ${table}`);
  }
});

// Attend un événement Socket.IO, avec un délai maximal pour que le test échoue plutôt que de rester bloqué.
function attendreEvenement(socket, evenement) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      // Retire l'écouteur si l'événement n'arrive pas à temps.
      socket.off(evenement, recevoir);
      reject(new Error(`Délai dépassé en attendant l'événement ${evenement}.`));
    }, 5000);

    const recevoir = (donnees) => {
      // L'événement est reçu : annule le délai et retourne ses données au test.
      clearTimeout(timer);
      resolve(donnees);
    };

    socket.once(evenement, recevoir);
  });
}

// Démarre un serveur Socket.IO de test et ferme ses connexions une fois le test terminé.
async function demarrerServeurSocket(t, code) {
  // Démarre le serveur HTTP et attend qu'il écoute sur un port libre.
  const server = createServer();
  const socketServer = initSocket(server);
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });

  const clients = [];
  // Termine la partie avant les déconnexions pour éviter le délai de reconnexion de 60 secondes.
  t.after(async () => {
    await db.query("UPDATE parties SET statut = 'terminee' WHERE code = $1", [code]);
    clients.forEach((client) => client.disconnect());
    await new Promise((resolve) => socketServer.close(resolve));
  });

  const { port } = server.address();
  // Un compte fournit un cookie de session; sans compte, la connexion est celle d'un spectateur invité.
  const connecter = async (accountId = null) => {
    const options = { autoConnect: false };
    if (accountId !== null) {
      options.extraHeaders = {
        cookie: `${COOKIE_NAME}=${signSession({ accountId })}`,
      };
    }

    const client = createSocketClient(`http://127.0.0.1:${port}`, options);
    clients.push(client);
    const connected = attendreEvenement(client, 'connect');
    client.connect();
    await connected;
    return client;
  };

  return { connecter };
}

test('le second joueur reçoit le coup joué par son adversaire', async (t) => {
  // Crée les deux comptes et une partie en cours dans la base de test.
  const blanc = await findOrCreateAccount({ githubId: 20, login: 'blanc', name: null, avatarUrl: null });
  const noir = await findOrCreateAccount({ githubId: 21, login: 'noir', name: null, avatarUrl: null });
  const code = await createGame(blanc.id);
  await joinGame(code, noir.id);

  const { connecter } = await demarrerServeurSocket(t, code);

  // Établit une connexion authentifiée pour chacun des deux joueurs.
  const [socketBlanc, socketNoir] = await Promise.all([connecter(blanc.id), connecter(noir.id)]);

  // Fait rejoindre le salon de la partie aux deux joueurs et attend leur état initial.
  const blancDansLaPartie = attendreEvenement(socketBlanc, 'partie:etat');
  socketBlanc.emit('partie:rejoindre', { code });
  await blancDansLaPartie;

  const noirDansLaPartie = attendreEvenement(socketNoir, 'partie:etat');
  socketNoir.emit('partie:rejoindre', { code });
  await noirDansLaPartie;

  // Installe les écouteurs avant d'envoyer le coup pour ne pas manquer les événements.
  const coupRecu = attendreEvenement(socketNoir, 'coup:annonce');
  const etatRecu = attendreEvenement(socketNoir, 'partie:etat');
  socketBlanc.emit('coup:joue', { code, from: 'e2', to: 'e4' });

  // Vérifie que le second joueur a reçu le coup et le nouvel état enregistré par le serveur.
  const [coup, etat] = await Promise.all([coupRecu, etatRecu]);
  const partie = await findGame(code);

  assert.equal(coup.joueurId, blanc.id);
  assert.equal(coup.from, 'e2');
  assert.equal(coup.to, 'e4');
  assert.equal(etat.FEN, coup.fen);
  assert.equal(partie.FEN, coup.fen);
});

test('un spectateur peut regarder la partie mais ne peut pas jouer', async (t) => {
  // Crée une partie en cours avec deux joueurs.
  const blanc = await findOrCreateAccount({ githubId: 22, login: 'blanc', name: null, avatarUrl: null });
  const noir = await findOrCreateAccount({ githubId: 23, login: 'noir', name: null, avatarUrl: null });
  const code = await createGame(blanc.id);
  await joinGame(code, noir.id);

  const { connecter } = await demarrerServeurSocket(t, code);
  const socketBlanc = await connecter(blanc.id);
  const socketSpectateur = await connecter();

  // Le joueur rejoint la partie et le spectateur s'abonne à son salon.
  const blancDansLaPartie = attendreEvenement(socketBlanc, 'partie:etat');
  socketBlanc.emit('partie:rejoindre', { code });
  await blancDansLaPartie;

  const etatInitialSpectateur = attendreEvenement(socketSpectateur, 'partie:etat');
  socketSpectateur.emit('partie:observer', { code });
  const etatInitial = await etatInitialSpectateur;
  assert.equal(etatInitial.statut, 'en_cours');
  assert.equal(etatInitial.nbSpectateurs, 1);

  // Vérifie que le spectateur reçoit aussi les mises à jour diffusées après un coup valide.
  const coupRecu = attendreEvenement(socketSpectateur, 'coup:annonce');
  const etatRecu = attendreEvenement(socketSpectateur, 'partie:etat');
  socketBlanc.emit('coup:joue', { code, from: 'e2', to: 'e4' });
  const [coup, etat] = await Promise.all([coupRecu, etatRecu]);
  assert.equal(etat.FEN, coup.fen);

  // Même un coup légal est refusé si la demande vient du spectateur invité.
  const erreurRecue = attendreEvenement(socketSpectateur, 'coup:erreur');
  socketSpectateur.emit('coup:joue', { code, from: 'e7', to: 'e5' });
  const erreur = await erreurRecue;
  const partieApresTentative = await findGame(code);

  assert.equal(erreur.message, 'Les spectateurs ne peuvent pas jouer.');
  assert.equal(partieApresTentative.FEN, coup.fen);
});

// Vérifie qu'un compte authentifié qui observe une partie sans y jouer ne peut pas modifier sa position.
test('un spectateur authentifié qui ne participe pas à la partie ne peut pas jouer', async (t) => {
  const blanc = await findOrCreateAccount({ githubId: 24, login: 'blanc', name: null, avatarUrl: null });
  const noir = await findOrCreateAccount({ githubId: 25, login: 'noir', name: null, avatarUrl: null });
  const spectateur = await findOrCreateAccount({ githubId: 26, login: 'spectateur', name: null, avatarUrl: null });
  const code = await createGame(blanc.id);
  await joinGame(code, noir.id);

  const { connecter } = await demarrerServeurSocket(t, code);
  const socketSpectateur = await connecter(spectateur.id);

  const etatInitialSpectateur = attendreEvenement(socketSpectateur, 'partie:etat');
  socketSpectateur.emit('partie:observer', { code });
  const etatInitial = await etatInitialSpectateur;
  const partieInitiale = await findGame(code);
  assert.equal(etatInitial.statut, 'en_cours');

  // Le coup est légal pour les blancs, mais le compte spectateur n'est membre d'aucune équipe.
  const erreurRecue = attendreEvenement(socketSpectateur, 'coup:erreur');
  socketSpectateur.emit('coup:joue', { code, from: 'e2', to: 'e4' });
  const erreur = await erreurRecue;
  const partieApresTentative = await findGame(code);

  assert.equal(erreur.message, 'Tu ne fais pas partie de cette partie.');
  assert.equal(partieApresTentative.FEN, partieInitiale.FEN);
});

// Vérifie que l'adversaire reçoit la présence mise à jour après la déconnexion d'un joueur.
test('un joueur qui se déconnecte est annoncé hors ligne à son adversaire', async (t) => {
  const blanc = await findOrCreateAccount({ githubId: 27, login: 'blanc', name: null, avatarUrl: null });
  const noir = await findOrCreateAccount({ githubId: 28, login: 'noir', name: null, avatarUrl: null });
  const code = await createGame(blanc.id);
  await joinGame(code, noir.id);

  const { connecter } = await demarrerServeurSocket(t, code);
  const [socketBlanc, socketNoir] = await Promise.all([connecter(blanc.id), connecter(noir.id)]);

  const blancDansLaPartie = attendreEvenement(socketBlanc, 'partie:etat');
  socketBlanc.emit('partie:rejoindre', { code });
  await blancDansLaPartie;

  const noirDansLaPartie = attendreEvenement(socketNoir, 'partie:etat');
  socketNoir.emit('partie:rejoindre', { code });
  await noirDansLaPartie;

  const etatApresDeconnexion = attendreEvenement(socketNoir, 'partie:etat');
  socketBlanc.disconnect();
  const etat = await etatApresDeconnexion;

  assert.equal(etat.whiteOnline, false);
  assert.equal(etat.blackOnline, true);

  // Reconnecte le joueur pour annuler le délai de reconnexion de 60 secondes du serveur.
  const reconnexionConfirmee = attendreEvenement(socketNoir, 'partie:reconnexion_ok');
  const socketBlancReconnecte = await connecter(blanc.id);
  const etatApresReconnexion = attendreEvenement(socketBlancReconnecte, 'partie:etat');
  socketBlancReconnecte.emit('partie:rejoindre', { code });
  await Promise.all([reconnexionConfirmee, etatApresReconnexion]);
});
