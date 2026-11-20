// Imports
import Connexion from "./Connexion";
import CreerPartiePrive from "./CreerPartiePrive";
import JoindrePartie from "./JoindrePartie";
import Echiquier from "./Echiquier";
import AttentePartie from "./AttentePartie";
import HistoriqueParties from "./HistoriqueParties";
import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { Chess } from "chess.js";
import TableSpectateur from "./TableSpectateur";

//const socket = io("http://localhost:3000", { withCredentials: true });

function App() {

    // État du compte utilisateur connecté
    const [compte, setCompte] = useState(null);
    const [token, setToken] = useState(null);

    // Indique la page actuelle : "choix", "attente", "joindre", "echiquier", "historique" ou "terminee"

    const [page, setPage] = useState("choix");
    const [codePartie, setCodePartie] = useState(null);
    const [partieId, setPartieId] = useState(null);
    const [partie, setPartie] = useState(null);
    const [positionInitiale, setPositionInitiale] = useState(() => new Chess().fen());
    const [adversaire, setAdversaire] = useState(null);
    const [partieQuittee, setPartieQuittee] = useState(null);
    const [erreurSauvegarde, setErreurSauvegarde] = useState(null);
    const [eloBlanc, setEloBlanc] = useState(null);
    const [eloNoir, setEloNoir] = useState(null);
    //pour les invité
    const [modeInvite, setModeInvite] = useState(false);
    const [estSpectateur, setEstSpectateur] = useState(false);
    const [partiesActives, setPartiesActives] = useState([]);
    const [chargementParties, setChargementParties] = useState(false);
    const [nbSpectateurs, setNbSpectateurs] = useState(0);

    const socketRef = useRef(null);


    // Initialisation ou mise à jour de la connexion socket avec le jeton d'authentification
    useEffect(() => {
        if (socketRef.current) {
            socketRef.current.disconnect();
        }

        // On passe le token dans l'objet 'auth' de Socket.io (Jalon 1)
        socketRef.current = io("http://localhost:3000", {
            withCredentials: true,
            auth: token ? { token } : {}
        });

        const currentSocket = socketRef.current;

        const handlePartieEtat = (partie) => {
            const partieNormalisee = {
                ...partie,
                joueur_blanc_id: partie.joueur_blanc_id ?? partie.joueurBlancId,
                joueur_noir_id: partie.joueur_noir_id ?? partie.joueurNoirId,
                joueur_blanc_login: partie.joueur_blanc_login ?? partie.joueurBlancLogin,
                joueur_noir_login: partie.joueur_noir_login ?? partie.joueurNoirLogin,
                // Récupération des statuts en ligne calculés par le serveur (Jalon 2)
                whiteOnline: partie.whiteOnline,
                blackOnline: partie.blackOnline,
            };

            const moi = Number(compte?.id);
            const jeSuisBlanc = Number(partieNormalisee.joueur_blanc_id) === moi;
            //inviter ajoute
            const joueur1 = partieNormalisee.joueur_blanc_login || "Blancs";
            const joueur2 = partieNormalisee.joueur_noir_login || "Noirs";

            setPartie(partieNormalisee);
            if (partieNormalisee.id) setPartieId(partieNormalisee.id);
            setPositionInitiale(partieNormalisee.FEN || new Chess().fen());
            setAdversaire(
                estSpectateur
                    ? `${joueur1} vs ${joueur2}`
                    : (jeSuisBlanc ? partieNormalisee.joueur_noir_login : partieNormalisee.joueur_blanc_login)
            );

            if (partieNormalisee.statut === "en_cours") {
                setPage("echiquier");
            }
        };

        currentSocket.on("partie:etat", handlePartieEtat);

        const handlePartieQuittee = ({ code, message }) => {
            if (!codePartie || code !== codePartie) return;

            setPartieQuittee(message);
            setCodePartie(null);
            setPartieId(null);
            setPartie(null);
            setAdversaire(null);
            setPositionInitiale(new Chess().fen());
            
            setNbSpectateurs(0);
            setPage(modeInvite ? "spectateur_liste" : "choix");
        };

        currentSocket.on("partie:quitte", handlePartieQuittee);

        const handleSpectateurs = ({ nbSpectateurs: count }) => {
            setNbSpectateurs(count ?? 0);
        };
        currentSocket.on("partie:spectateurs", handleSpectateurs);

        return () => {
            currentSocket.off("partie:etat", handlePartieEtat);
            currentSocket.off("partie:quitte", handlePartieQuittee);
            currentSocket.off("partie:spectateurs", handleSpectateurs);
        };
   }, [token]);

    // Vérifie si l'utilisateur est déjà connecté en récupérant les informations de son compte depuis le backend
    useEffect(() => {
        fetch("http://localhost:3000/api/me", { credentials: "include" })
            .then(async (response) => {
                if (!response.ok) return;
                setCompte(await response.json());
            })
            .catch(() => setCompte(null));
    }, []);

    // Charge les parties actives pour le tableau spectateur
    useEffect(() => {
        if (!modeInvite || page !== "spectateur_liste") return undefined;

        let actif = true;
        const chargerParties = async () => {
            setChargementParties(true);
            try {
                const res = await fetch("http://localhost:3000/api/parties", {
                    credentials: "include",
                });
                if (res.ok && actif) {
                    const data = await res.json();
                    setPartiesActives(Array.isArray(data) ? data : data.parties || []);
                }
            } catch (err) {
                console.error("Erreur chargement parties actives :", err);
            } finally {
                if (actif) setChargementParties(false);
            }
        };

        chargerParties();
        return () => {
            actif = false;
        };
    }, [modeInvite, page]);

    // Efface le message après quelques secondes sans quitter la box de choix.
    useEffect(() => {
        if (!partieQuittee || page !== "choix") return undefined;

        const timer = setTimeout(() => setPartieQuittee(null), 2500);
        return () => clearTimeout(timer);
    }, [partieQuittee, page]);

    // Crée une partie privée en appelant l'API du backend et met à jour l'état de l'application avec le code de la partie créée.
    const creerPartie = async () => {
        try {
            await quitterPartie();

            const response = await fetch("http://localhost:3000/api/parties", {
                method: "POST",
                credentials: "include",
                headers: { "content-type": "application/json" },
            });

            if (!response.ok) {
                const erreur = await response.json();
                console.error(erreur);
                return;
            }

            const partie = await response.json();
            setEstSpectateur(false);
            setCodePartie(partie.code);
            setToken(partie.token);
            setPage("attente");
        } catch (error) {
            console.error(error);
        }
    };

    const quitterPartie = async () => {
        if (!codePartie) return;

        try {
            if (!estSpectateur) {
                const response = await fetch(`http://localhost:3000/api/parties/${codePartie}`, {
                    method: "DELETE",
                    credentials: "include",
                });

                if (!response.ok && response.status !== 404) {
                    throw new Error("Impossible de quitter la partie.");
                }
            } else {
                socketRef.current?.emit("partie:quitter_observation", { code: codePartie });
            }
        } finally {
            setCodePartie(null);
            setPartieId(null);
            setPartie(null);
            setPositionInitiale(new Chess().fen());
            setAdversaire(null);
            setPartieQuittee(null);
            setErreurSauvegarde(null);
            setNbSpectateurs(0);
        }
    };

    // Le serveur enregistre chaque coup, détecte la fin de partie et met à jour l'Elo lui-même.
    // Quand il annonce "partie:terminee", on recharge seulement le profil pour afficher le nouvel Elo.
    useEffect(() => {
        const currentSocket = socketRef.current;
        if (!codePartie || !currentSocket|| estSpectateur) return undefined;

        const handlePartieTerminee = async ({ code }) => {
            if (code !== codePartie) return;
            try {
                const compteResponse = await fetch("http://localhost:3000/api/me", {
                    credentials: "include",
                    cache: "no-store",
                });
                if (!compteResponse.ok) {
                    throw new Error("La partie est terminée, mais le classement n’a pas pu être actualisé.");
                }
                setCompte(await compteResponse.json());
                setErreurSauvegarde(null);
            } catch (error) {
                setErreurSauvegarde(error.message);
            }
        };

        currentSocket.on("partie:terminee", handlePartieTerminee);
        return () => {
            currentSocket.off("partie:terminee", handlePartieTerminee);
        };
    }, [codePartie, compte?.id, token,estSpectateur]);

    // Retourne à la page de choix de création ou de jonction de partie, en supprimant la partie si l'utilisateur était dans une partie en attente ou en cours.
    const retournerAuChoix = async () => {
        if (estSpectateur) {
            if (codePartie) {
                socketRef.current?.emit("partie:quitter_observation", { code: codePartie });
            }
            setCodePartie(null);
            setPartieId(null);
            setPartie(null);
            setPositionInitiale(new Chess().fen());
            setAdversaire(null);
            setNbSpectateurs(0);
            setPartieQuittee(null);
            setErreurSauvegarde(null);
            setPage("spectateur_liste");
            return;
        }
        if ((page === "attente" || page === "echiquier") && codePartie) {
            await fetch(`http://localhost:3000/api/parties/${codePartie}`, {
                method: "DELETE",
                credentials: "include",
            });
        }
        setCodePartie(null);
        setPartieId(null);
        setPartie(null);
        setPositionInitiale(new Chess().fen());
        setAdversaire(null);
        setPartieQuittee(null);
        setErreurSauvegarde(null);
        setPage("choix");
        
    };

    // Déconnecte l'utilisateur en appelant l'API de déconnexion du backend et réinitialise l'état de l'application.
    const seDeconnecter = async () => {
        if (estSpectateur && codePartie) {
        socketRef.current?.emit("partie:quitter_observation", { code: codePartie });
    }
        if (compte) {
            await fetch("http://localhost:3000/api/auth/logout", {
                method: "POST",
                credentials: "include",
            });
        }
        setCompte(null);
        setModeInvite(false);
        setEstSpectateur(false);
        setCodePartie(null);
        setPartieId(null);
        setPartie(null);
        setAdversaire(null);
        setNbSpectateurs(0);
        setPartieQuittee(null);
        setErreurSauvegarde(null);
        setPage("choix");
    };

    const handleContinuerInvite = () => {
        setModeInvite(true);
        setEstSpectateur(true);
        setCodePartie(null);
        setPage("spectateur_liste");
    };

    const handleObserverPartie = (code) => {
        setEstSpectateur(true);
        setCodePartie(code);
        setPartieQuittee(null);
        setPage("echiquier");
        
    };
    useEffect(() => {
        const currentSocket = socketRef.current;
        if (!currentSocket || !estSpectateur || !codePartie) return undefined;

        const rejoindreObservation = () => {
            currentSocket.emit("partie:observer", { code: codePartie });
        };

        if (currentSocket.connected) {
            rejoindreObservation();
        } else {
            currentSocket.once("connect", rejoindreObservation);
        }

        return () => {
            currentSocket.off("connect", rejoindreObservation);
        };
    }, [codePartie, estSpectateur, token]);
    useEffect(() => {
        if (!codePartie || !socketRef.current || estSpectateur) return undefined;
        if (!compte?.id) return undefined;

        socketRef.current.emit("partie:rejoindre", {
            code: codePartie,
        });
    }, [codePartie, compte?.id, token, estSpectateur]);

    return (
        <section className="hero is-fullheight" style={{ backgroundColor: "#6b4f3a" }}>
            {compte ? (
                <>
                    <header className="level p-4 mb-0" style={{ backgroundColor: "#6b4f3a" }}>
                        <div className="level-left">
                            {(page === "echiquier" || page === "joindre" || page === "attente" || page === "historique") && (
                                <button className="button is-white" onClick={retournerAuChoix}>
                                    {page === "echiquier" ? "Quitter la partie" : "Retour"}
                                </button>
                            )}
                        </div>
                        <div className="level-right is-flex is-align-items-center">
                            <p className="has-text-white mr-4">
                                Connecté : <strong className="ml-2 has-text-white">{compte.login}</strong>
                                {compte.elo !== undefined && (
                                    <span className="tag is-light has-text-dark ml-3">Elo : {compte.elo}</span>
                                )}
                            </p>
                            <button className="button is-light" onClick={seDeconnecter}>
                                Déconnexion
                            </button>
                        </div>
                    </header>
                    {page === "attente" ? (
                        <AttentePartie code={codePartie} />
                    ) : page === "historique" ? (
                        <HistoriqueParties joueur={compte} />
                    ) : page === "echiquier" ? (
                        <Echiquier
                            socket={socketRef.current}
                            positionInitiale={positionInitiale}
                            adversaire={adversaire}
                            eloBlanc={eloBlanc}
                            eloNoir={eloNoir}
                            partieCode={codePartie}
                            monJoueurId={compte?.id}
                            joueurBlancId={partie?.joueur_blanc_id}
                            partieQuittee={partieQuittee}
                            erreurSauvegarde={erreurSauvegarde}
                            whiteOnline={partie?.whiteOnline}
                            blackOnline={partie?.blackOnline}
                            joueurBlancLogin={partie?.joueur_blanc_login}
                            joueurNoirLogin={partie?.joueur_noir_login}
                            estSpectateur={estSpectateur}
                            nbSpectateurs={nbSpectateurs}
                        />
                    ) : page === "joindre" ? (
                        <JoindrePartie onRejoint={(code, partie) => {
                            setEstSpectateur(false);
                            setCodePartie(code);
                            if (partie.token) setToken(partie.token);
                            setPartieId(partie.id);
                            setPositionInitiale(partie.FEN || new Chess().fen());
                            setAdversaire(partie.adversaire);
                            setEloBlanc(partie.joueur_est_blanc ? partie.elo_joueur : partie.elo_adversaire);
                            setEloNoir(partie.joueur_est_blanc ? partie.elo_adversaire : partie.elo_joueur);
                            setPartieQuittee(null);
                            setPage("echiquier");
                        }} />
                    ) : (
                        <CreerPartiePrive
                            onCreer={creerPartie}
                            onJoindre={() => {
                                setPartieQuittee(null);
                                setPage("joindre");
                            }}
                            onHistorique={() => setPage("historique")}
                            message={partieQuittee}
                        />
                    )}
                </>
            ) : modeInvite ? (
                <>
                    <header className="level p-4 mb-0" style={{ backgroundColor: "#6b4f3a" }}>
                        <div className="level-left">
                            {page === "echiquier" && (
                                <button className="button is-white" onClick={retournerAuChoix}>
                                    Retour aux parties
                                </button>
                            )}
                        </div>
                        <div className="level-right is-flex is-align-items-center">
                            <p className="has-text-white mr-4">
                                Mode : <strong className="ml-2 has-text-white">Invité (Spectateur)</strong>
                            </p>
                            <button className="button is-light" onClick={seDeconnecter}>
                                Quitter le mode invité
                            </button>
                        </div>
                    </header>

                    {page === "echiquier" ? (
                        <Echiquier
                            socket={socketRef.current}
                            positionInitiale={positionInitiale}
                            adversaire={adversaire}
                            eloBlanc={eloBlanc}
                            eloNoir={eloNoir}
                            partieCode={codePartie}
                            monJoueurId={null}
                            joueurBlancId={partie?.joueur_blanc_id}
                            partieQuittee={partieQuittee}
                            erreurSauvegarde={erreurSauvegarde}
                            whiteOnline={partie?.whiteOnline}
                            blackOnline={partie?.blackOnline}
                            joueurBlancLogin={partie?.joueur_blanc_login}
                            joueurNoirLogin={partie?.joueur_noir_login}
                            estSpectateur={true}
                            nbSpectateurs={nbSpectateurs}
                        />
                    ) : (
                        <TableSpectateur
                            parties={partiesActives}
                            chargement={chargementParties}
                            onObserverPartie={handleObserverPartie}
                            onRetourConnexion={seDeconnecter}
                        />
                    )}
                </>
            ) : (
                <Connexion onContinuerInvite={handleContinuerInvite} />
            )}
        </section>
    );
}

export default App;