import { useEffect, useState } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";

function Echiquier({ positionInitiale, adversaire, eloBlanc, eloNoir, monTour, partieQuittee, onMove, erreurSauvegarde }) {
    const [nombrePoints, setNombrePoints] = useState(1);
    const [game, setGame] = useState(() => new Chess(positionInitiale));

    useEffect(() => {
        setGame(new Chess(positionInitiale));
    }, [positionInitiale]);

    // Met à jour le nombre de points affichés pour l'animation de l'attente de l'adversaire
    useEffect(() => {
        if (monTour || game.isGameOver()) return undefined;

        const intervalle = setInterval(() => {
            setNombrePoints((points) => points === 3 ? 1 : points + 1);
        }, 500);

        return () => clearInterval(intervalle);
    }, [monTour, game]);

    // Gestion du déplacement via react-chessboard et chess.js
    function onDrop(sourceSquare, targetSquare) {
        // Empêche de jouer si ce n'est pas le tour du joueur ou si la partie est finie
        if (!monTour || game.isGameOver()) return false;

        try {
            const gameCopy = new Chess(game.fen());
            const result = gameCopy.move({
                from: sourceSquare,
                to: targetSquare,
                promotion: 'q',
            });

            if (result) {
                setGame(gameCopy);
                if (onMove) {
                    const scoreBlanc = gameCopy.isCheckmate()
                        ? gameCopy.turn() === "b" ? 1 : 0
                        : gameCopy.isDraw() || gameCopy.isStalemate() ? 0.5 : null;
                    onMove(gameCopy.fen(), scoreBlanc);
                }
                return true;
            }
        } catch {
            return false;
        }
        return false;
    }

    // Détermine le message de titre en fonction de l'état du jeu
    const getTitreMessage = () => {
        if (partieQuittee) return partieQuittee;
        if (game.isCheckmate()) return "Échec et mat !";
        if (game.isDraw()) return "Match nul !";
        if (game.isStalemate()) return "Pat ! (Match nul)";
        
        return monTour
            ? "À vous de jouer!"
            : `En attente de l’adversaire${".".repeat(nombrePoints)}`;
    };

    return (
        <div className="hero-body p-0">
            <div className="container pt-4 has-text-centered">
                <h1 className="title has-text-centered has-text-white">
                    {getTitreMessage()}
                </h1>
                {erreurSauvegarde && (
                    <p className="has-text-danger-light mb-4" role="alert">
                        Erreur lors de l'enregistrement : {erreurSauvegarde}
                    </p>
                )}

                {partieQuittee || game.isGameOver() ? (
                    <p className="has-text-white mb-4">
                        {game.isCheckmate() 
                            ? "La partie est terminée par échec et mat." 
                            : game.isDraw() || game.isStalemate() 
                            ? "La partie s'est terminée sur un match nul." 
                            : "La partie est terminée."}
                    </p>
                ) : (
                    <div className="has-text-white mb-4">
                        {/* Affichage de l'adversaire et de son Elo */}
                        <p>
                            Adversaire : <strong>{adversaire}</strong> 
                            {eloNoir && <span className="tag is-dark ml-2">Elo : {eloNoir}</span>}
                        </p>
                        {/* Affichage de ton Elo (Blancs) */}
                        {eloBlanc && (
                            <p className="is-size-7 mt-1">
                                Mon Elo : <span className="has-text-weight-bold">{eloBlanc}</span>
                            </p>
                        )}
                    </div>
                )}
                
                {!partieQuittee && (
                    <div
                        className="mx-auto"
                        style={{
                            width: "min(90vw, 480px)",
                            maxWidth: "100%",
                        }}
                    >
                        <div className="box p-3 has-background-light">
                            <Chessboard 
                                position={game.fen()} 
                                onPieceDrop={onDrop}
                                arePiecesDraggable={monTour && !game.isGameOver()}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Echiquier;