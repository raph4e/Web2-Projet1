import { useEffect, useState } from "react";

const piecesInitiales = [
    ["♜", "♞", "♝", "♛", "♚", "♝", "♞", "♜"],
    ["♟", "♟", "♟", "♟", "♟", "♟", "♟", "♟"],
    ["", "", "", "", "", "", "", ""],
    ["", "", "", "", "", "", "", ""],
    ["", "", "", "", "", "", "", ""],
    ["", "", "", "", "", "", "", ""],
    ["♙", "♙", "♙", "♙", "♙", "♙", "♙", "♙"],
    ["♖", "♘", "♗", "♕", "♔", "♗", "♘", "♖"],
];

function Echiquier({ adversaire, monTour, partieQuittee }) {
    const [nombrePoints, setNombrePoints] = useState(1);

    // Met à jour le nombre de points affichés pour l'animation de l'attente de l'adversaire si ce n'est pas le tour du joueur. 
    useEffect(() => {
        if (monTour) return undefined;

        const intervalle = setInterval(() => {
            setNombrePoints((points) => points === 3 ? 1 : points + 1);
        }, 500);

        return () => clearInterval(intervalle);
    }, [monTour]);

    return (
        <div className="hero-body p-0">
            <div className="container pt-4 has-text-centered">
                <h1 className="title has-text-centered has-text-white">
                    {partieQuittee ?? (monTour
                        ? "À vous de jouer!"
                        // Affiche une petite animation de points amusante parce que je m'ennuie un peu trop. Merci Copilot!
                        : `En attente de l’adversaire${".".repeat(nombrePoints)}`)}
                </h1>
                {partieQuittee ? (
                    <p className="has-text-white mb-4">La partie est terminée.</p>
                ) : (
                    <p className="has-text-white mb-4">Adversaire : <strong>{adversaire}</strong></p>
                )}
                {!partieQuittee && <div
                    className="mx-auto"
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(8, 1fr)",
                        gridTemplateRows: "repeat(8, 1fr)",
                        width: "min(90vw, 560px)",
                        aspectRatio: "1",
                        border: "4px solid #241a15",
                        boxSizing: "border-box",
                    }}
                >
                    {piecesInitiales.flatMap((rangee, rangeeIndex) =>
                        // Pour chaque case de l'échiquier, on détermine si elle est claire ou foncée en fonction de la somme des indices de la rangée et de la colonne. Si la somme est paire, la case est claire; sinon, elle est foncée.
                        rangee.map((piece, colonneIndex) => {
                            const caseClaire = (rangeeIndex + colonneIndex) % 2 === 0;

                            return (
                                <div
                                    key={`${rangeeIndex}-${colonneIndex}`}
                                    className="is-flex is-justify-content-center is-align-items-center"
                                    style={{
                                        backgroundColor: caseClaire ? "#f0d9b5" : "#b58863",
                                        fontSize: "clamp(1.8rem, 7vw, 3.5rem)",
                                        lineHeight: 1,
                                        userSelect: "none",
                                    }}
                                >
                                    {piece}
                                </div>
                            );
                        }),
                    )}
                </div>}
            </div>
        </div>
    );
}

export default Echiquier;
