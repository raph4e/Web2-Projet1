// Imports
import Connexion from "./Connexion";
import CreerPartiePrive from "./CreerPartiePrive";
import JoindrePartie from "./JoindrePartie";
import Echiquier from "./Echiquier";
import AttentePartie from "./AttentePartie";
import { useEffect, useRef, useState } from "react";

function App() {

    // État du compte utilisateur connecté
    const [compte, setCompte] = useState(null);

    // Indique la page actuelle : "choix", "attente", "joindre", "echiquier" ou "terminee"
    const [page, setPage] = useState("choix");
    const [codePartie, setCodePartie] = useState(null);
    const [adversaire, setAdversaire] = useState(null);
    const [monTour, setMonTour] = useState(false);
    const [partieQuittee, setPartieQuittee] = useState(null);
    const pagePrecedente = useRef("choix");

    // Vérifie si l'utilisateur est déjà connecté en récupérant les informations de son compte depuis le backend
    useEffect(() => {
        fetch("http://localhost:3000/api/me", { credentials: "include" })
            .then(async (response) => {
                if (!response.ok) return;
                setCompte(await response.json());
            })
            .catch(() => setCompte(null));
    }, []);

    // Vérifie à chaque fois que la page est "attente" et qu'un code de partie est défini si la partie a commencé, auquel cas on passe à la page de l'échiquier
    useEffect(() => {
        if ((page !== "attente" && page !== "echiquier") || !codePartie) return undefined;

        const verifierPartie = async () => {
            const response = await fetch(`http://localhost:3000/api/parties/${codePartie}`, {
                cache: "no-store",
            });
            if (!response.ok) return;
            const partie = await response.json();
            if (partie.statut === "quitte") {
                setPartieQuittee(`${partie.resultat} a quitté la partie`);
                setCodePartie(null);
                setAdversaire(null);
                setMonTour(false);
                setPage("choix");
                return;
            }

            if (page === "attente" && partie.statut === "en_cours") {
                setAdversaire(partie.joueur_noir_login);
                setMonTour(true);
                setPage("echiquier");
            }
        };

        verifierPartie();
        const intervalle = setInterval(verifierPartie, 500);
        return () => clearInterval(intervalle);
    }, [page, codePartie]);

    // Efface le message après quelques secondes sans quitter la box de choix.
    useEffect(() => {
        if (!partieQuittee || page !== "choix") return undefined;

        const timer = setTimeout(() => setPartieQuittee(null), 2500);
        return () => clearTimeout(timer);
    }, [partieQuittee, page]);

    // Supprime la partie si l'utilisateur quitte l'échiquier par un autre changement de page.
    useEffect(() => {
        if (pagePrecedente.current === "echiquier" && page !== "echiquier" && codePartie) {
            fetch(`http://localhost:3000/api/parties/${codePartie}`, {
                method: "DELETE",
                credentials: "include",
            }).catch(() => {});
        }

        pagePrecedente.current = page;
    }, [page, codePartie]);

    // Crée une partie privée en appelant l'API du backend et met à jour l'état de l'application avec le code de la partie créée.
    const creerPartie = async () => {
        const response = await fetch("http://localhost:3000/api/parties", {
            method: "POST",
            credentials: "include",
        });
        if (!response.ok) return;
        const partie = await response.json();
        setCodePartie(partie.code);
        setAdversaire(null);
        setPartieQuittee(null);
        setPage("attente");
    };

    // Retourne à la page de choix de création ou de jonction de partie, en supprimant la partie si l'utilisateur était dans une partie en attente ou en cours.
    const retournerAuChoix = async () => {
        if ((page === "attente" || page === "echiquier") && codePartie) {
            await fetch(`http://localhost:3000/api/parties/${codePartie}`, {
                method: "DELETE",
                credentials: "include",
            });
        }
        setCodePartie(null);
        setAdversaire(null);
        setMonTour(false);
        setPartieQuittee(null);
        setPage("choix");
    };

    // Déconnecte l'utilisateur en appelant l'API de déconnexion du backend et réinitialise l'état de l'application.
    const seDeconnecter = async () => {
        await fetch("http://localhost:3000/api/auth/logout", {
            method: "POST",
            credentials: "include",
        });
        setCompte(null);
        setCodePartie(null);
        setAdversaire(null);
        setMonTour(false);
        setPartieQuittee(null);
        setPage("choix");
    };

    return (
        <section className="hero is-fullheight" style={{ backgroundColor: "#6b4f3a" }}>
            {/* Affiche la page en fonction de l'état de connexion et de la page actuelle */}
            {compte ? (
                <>
                    <header className="level p-4 mb-0" style={{ backgroundColor: "#6b4f3a" }}>
                        <div className="level-left">
                            {(page === "echiquier" || page === "joindre" || page === "attente") && (
                                <button className="button is-white" onClick={retournerAuChoix}>
                                    {page === "echiquier" ? "Quitter la partie" : "Retour"}
                                </button>
                            )}
                        </div>
                        <div className="level-right is-flex is-align-items-center">
                            <p className="has-text-white mr-4">
                                Connecté : <strong className="ml-2 has-text-white">{compte.login}</strong>
                            </p>
                            <button className="button is-light" onClick={seDeconnecter}>
                                Déconnexion
                            </button>
                        </div>
                    </header>
                    {page === "attente" ? (
                        <AttentePartie code={codePartie} />
                    ) : page === "echiquier" ? (
                        <Echiquier
                            adversaire={adversaire}
                            monTour={monTour}
                            partieQuittee={partieQuittee}
                        />
                    ) : page === "joindre" ? (
                        <JoindrePartie onRejoint={(code, nomAdversaire) => {
                            setCodePartie(code);
                            setAdversaire(nomAdversaire);
                            setMonTour(false);
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
                            message={partieQuittee}
                        />
                    )}
                </>
            ) : (
                <Connexion />
            )}
        </section>
    );
}

export default App;

