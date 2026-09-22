// Imports
import Connexion from "./Connexion";
import CreerPartiePrive from "./CreerPartiePrive";
import JoindrePartie from "./JoindrePartie";
import Echiquier from "./Echiquier";
import { useState } from "react";

function App() {

    // Indique si l'utilisateur est connecté ou non
    const [estConnecte, setEstConnecte] = useState(false);

    // Indique la page actuelle : "choix", "joindre" ou "echiquier"
    const [page, setPage] = useState("choix");

    return (
        <section className="hero is-fullheight" style={{ backgroundColor: "#6b4f3a" }}>
            {/* Affiche la page en fonction de l'état de connexion et de la page actuelle */}
            {estConnecte ? (
                page === "echiquier" ? (
                    <Echiquier onRetour={() => setPage("choix")} />
                ) : page === "joindre" ? (
                    <JoindrePartie onRetour={() => setPage("choix")} />
                ) : (
                    <CreerPartiePrive
                        onCreer={() => setPage("echiquier")}
                        onJoindre={() => setPage("joindre")}
                    />
                )
            ) : (
                
                <Connexion onConnexion={setEstConnecte} />
            )}
        </section>
    );
}

export default App;

