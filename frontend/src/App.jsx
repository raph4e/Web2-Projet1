// Imports
import Connexion from "./Connexion";
import CreerPartiePrive from "./CreerPartiePrive";
import JoindrePartie from "./JoindrePartie";
import Echiquier from "./Echiquier";
import AttentePartie from "./AttentePartie";
import HistoriqueParties from "./HistoriqueParties";
import { useCallback, useEffect, useRef, useState } from "react";
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
    //corection de quitter partie 
    const [partieEnCours, setPartieEnCours] = useState(null);//ajout




    const socketRef = useRef(null);

    const codePartieRef = useRef(codePartie);
    const partieEnCoursRef = useRef(partieEnCours);
    const dernierCodePartieRef = useRef(null);




   


    const actualiserCompte = useCallback(async () => {
        try {
            const compteResponse = await fetch("http://localhost:3000/api/me", {
                credentials: "include",
                cache: "no-store",
            });
            if (!compteResponse.ok) {
                throw new Error("La partie est terminée, mais le classement n’a pas pu être actualisé.");
            }
            const dataCompte = await compteResponse.json();
            setCompte(dataCompte);
            setErreurSauvegarde(null);
        } catch (error) {
            setErreurSauvegarde(error.message);
        }
    }, []);


    useEffect(() => {
        codePartieRef.current = codePartie;
        if (codePartie) {
            dernierCodePartieRef.current = codePartie;
        }
    }, [codePartie]);
    useEffect(() => {
        partieEnCoursRef.current = partieEnCours;
    }, [partieEnCours]);

   


    // Initialisation ou mise à jour de la connexion socket avec le jeton d'authentification
    useEffect(() => {
        if (socketRef.current) {
            socketRef.current.disconnect();
        }

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
                whiteOnline: partie.whiteOnline,
                blackOnline: partie.blackOnline,
            };

            const moi = Number(compte?.id);
            const jeSuisBlanc = Number(partieNormalisee.joueur_blanc_id) === moi;
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
                setPartieEnCours((prev) => prev || { code: partieNormalisee.code, statut: "en_cours" });
                setPage("echiquier");
            }
        };

        currentSocket.on("partie:etat", handlePartieEtat);


        const handlePartieQuittee = ({ code, message }) => {
            const codeEvt = String(code || "").toUpperCase();
            const codeActif = String(codePartieRef.current || "").toUpperCase();
            const codeEnCours = String(partieEnCoursRef.current?.code || "").toUpperCase();

            const estMaPartie =
                (codeActif && codeEvt === codeActif) ||
                (codeEnCours && codeEvt === codeEnCours);
            if (!estMaPartie) return;

            setPartieEnCours(null);

            if (codeActif && codeEvt === codeActif) {
                setPartieQuittee(message);
                setCodePartie(null);
                setPartieId(null);
                setPartie(null);
                setAdversaire(null);
                setPositionInitiale(new Chess().fen());
                setNbSpectateurs(0);
                setPage(modeInvite ? "spectateur_liste" : "choix");
            }
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
    }, [token, compte?.id, estSpectateur, modeInvite]);

    // Vérifie si l'utilisateur est déjà connecté en récupérant les informations de son compte depuis le backend
    useEffect(() => {
        fetch("http://localhost:3000/api/me", { credentials: "include" })
            .then(async (response) => {
                if (!response.ok) return;
                const dataCompte = await response.json();
                setCompte(dataCompte);


                // Retrouve automatiquement une partie active après un rechargement
                if (dataCompte?.id) {
                    fetch(`http://localhost:3000/api/joueurs/${dataCompte.id}/parties`, {
                        credentials: "include",
                    })
                        .then(async (res) => {
                            if (!res.ok) return;
                            const parties = await res.json();
                            const active = parties.find((p) => p.statut === "en_cours");
                            setPartieEnCours(active);
                            if (active) {
                                setEstSpectateur(false);
                                setCodePartie(active.code);
                                setPage("echiquier");
                            }
                        })
                        .catch((err) => console.error("Erreur restauration partie:", err));
                }
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
            if (!estSpectateur && partie?.statut !== "terminee" && !partieQuittee) {
                const response = await fetch(`http://localhost:3000/api/parties/${codePartie}`, {
                    method: "DELETE",
                    credentials: "include",
                });

                if (!response.ok && response.status !== 404) {
                    throw new Error("Impossible de quitter la partie.");
                }
            } else if (estSpectateur) {
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
            setPartieEnCours(null);//ajout
            setPage("choix");
        }
    };

    // Le serveur enregistre chaque coup, détecte la fin de partie et met à jour l'Elo lui-même.
    // Quand il annonce "partie:terminee", on recharge seulement le profil pour afficher le nouvel Elo.
    useEffect(() => {
        const currentSocket = socketRef.current;
        if (!compte?.id || !currentSocket || estSpectateur) return undefined;
        const handlePartieTerminee = async ({ code }) => {
            const codeEvt = String(code || "").toUpperCase();
            const codeActif = String(codePartieRef.current || "").toUpperCase();
            const codeEnCours = String(partieEnCoursRef.current?.code || "").toUpperCase();
            const dernierCode = String(dernierCodePartieRef.current || "").toUpperCase();
            const concerneMaPartie =
                (codeActif && codeEvt === codeActif) ||
                (codeEnCours && codeEvt === codeEnCours) ||
                (dernierCode && codeEvt === dernierCode);

            if (!concerneMaPartie) return;

            setPartieEnCours(null);//ajout

            if (codeActif && codeEvt === codeActif) {
                setCodePartie(null);
                setPartieId(null);
                setPartie(null);
                setAdversaire(null);
                setPositionInitiale(new Chess().fen());
                setNbSpectateurs(0);
                setPage("choix");
            }

            try {
                const compteResponse = await fetch("http://localhost:3000/api/me", {
                    credentials: "include",
                    cache: "no-store",
                });
                if (!compteResponse.ok) {
                    throw new Error("La partie est terminée, mais le classement n’a pas pu être actualisé.");
                }
                const dataCompte = await compteResponse.json();
                setCompte(dataCompte);
                setErreurSauvegarde(null);
                
            } catch (error) {
                setErreurSauvegarde(error.message);
            }
        };

        currentSocket.on("partie:terminee", handlePartieTerminee);
        return () => {
            currentSocket.off("partie:terminee", handlePartieTerminee);
        };
    }, [compte?.id, estSpectateur, ]);
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
        if (page === "attente" && codePartie) {
            await fetch(`http://localhost:3000/api/parties/${codePartie}`, {
                method: "DELETE",
                credentials: "include",
            });
        }
        //ajout
        if (page === "echiquier" && codePartie) {
            setPartieEnCours((prev) => prev || { code: codePartie, statut: "en_cours" });
            socketRef.current?.emit("partie:quitter_salon", { code: codePartie });
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
    // Rejoint une partie actuellement en cours depuis le menu principal
    const handleRejoindrePartieEnCours = (partieActive) => {
        if (!partieActive?.code) return;
        setEstSpectateur(false);
        setPartieQuittee(null);
        setCodePartie(partieActive.code);
        setPage("echiquier");
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
        setPartieEnCours(null);//ajout
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
    //ajout pour connecter a mes websocket 
    useEffect(() => {
        const currentSocket = socketRef.current;
        if (!codePartie || !currentSocket || estSpectateur || !compte?.id) return undefined;

        const rejoindre = () => {
            currentSocket.emit("partie:rejoindre", { code: codePartie });
        };

        if (currentSocket.connected) {
            rejoindre();
        } else {
            currentSocket.once("connect", rejoindre);
        }

        return () => {
            currentSocket.off("connect", rejoindre);
        };
    }, [codePartie, compte?.id, token, estSpectateur]);
    return (
        <section className="hero is-fullheight" style={{ backgroundColor: "#6b4f3a" }}>
            {compte ? (
                <>
                    <header className="level p-4 mb-0" style={{ backgroundColor: "#6b4f3a" }}>
                        <div className="level-left">
                            {(page === "echiquier" || page === "joindre" || page === "attente" || page === "historique") && (
                                <button
                                    className="button is-white"
                                    onClick={page === "echiquier" && (partieQuittee || partie?.statut === "terminee") ? retournerAuChoix : (page === "echiquier" ? quitterPartie : retournerAuChoix)}
                                >
                                    {page === "echiquier"
                                        ? (partieQuittee || partie?.statut === "terminee" ? "Retour au menu" : "Abandonner / Quitter")
                                        : "Retour"}
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
                            onPartieTerminee={actualiserCompte}
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
                            //ajout
                            onRejoindreEnCours={handleRejoindrePartieEnCours}
                            partieEnCours={partieEnCours}
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