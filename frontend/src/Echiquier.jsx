import { useEffect, useState } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";

function Pastille({ enLigne, taille = 12 }) {
    return (
        <span
            title={enLigne ? "En ligne" : "Hors ligne"}
            style={{
                display: "inline-block",
                width: taille,
                height: taille,
                flex: `0 0 ${taille}px`,
                borderRadius: "50%",
                backgroundColor: enLigne ? "#48c774" : "#b5b5b5",
                marginRight: 8,
            }}
        />
    );
}

function Echiquier({ socket, positionInitiale, adversaire, eloBlanc, eloNoir, partieQuittee, erreurSauvegarde, partieCode, monJoueurId, joueurBlancId, joueurBlancLogin, joueurNoirLogin, whiteOnline, blackOnline, estSpectateur = false, nbSpectateurs = 0, }) {
    const [nombrePoints, setNombrePoints] = useState(1);
    const [game, setGame] = useState(() => new Chess(positionInitiale));

    // Logique pour permettre seulement au joueur à qui est le tour de bouger les pièces.
    // monJoueurId sert seulement à l'affichage : il n'est jamais envoyé au serveur.
    const jeSuisBlanc = !estSpectateur && monJoueurId != null && Number(monJoueurId) === Number(joueurBlancId);
    const maCouleur = jeSuisBlanc ? "w" : "b";
    const monTourReel = !estSpectateur && game.turn() === maCouleur;


    const loginAdv = jeSuisBlanc ? joueurNoirLogin : joueurBlancLogin;

    const advEnLigne = jeSuisBlanc ? blackOnline : whiteOnline;

    const eloAdv = jeSuisBlanc ? eloNoir : eloBlanc;

    useEffect(() => {
        setGame(new Chess(positionInitiale));
    }, [positionInitiale]);

    useEffect(() => {
        if (!partieCode || !socket) return undefined;

        const handleCoupAnnonce = (data) => {
            setGame(new Chess(data.fen));
        };

        const handleCoupErreur = ({ message }) => {
            alert(message);
        };

        socket.on("coup:annonce", handleCoupAnnonce);
        socket.on("coup:erreur", handleCoupErreur);

        return () => {
            socket.off("coup:annonce", handleCoupAnnonce);
            socket.off("coup:erreur", handleCoupErreur);
        };
    }, [partieCode, socket]);

    // Met à jour le nombre de points affichés pour l'animation de l'attente de l'adversaire
    useEffect(() => {
        if (estSpectateur || monTourReel || game.isGameOver()) return undefined;

        const intervalle = setInterval(() => {
            setNombrePoints((points) => points === 3 ? 1 : points + 1);
        }, 500);

        return () => clearInterval(intervalle);
    }, [estSpectateur, monTourReel, game]);

    // Gestion du déplacement via react-chessboard et chess.js
    function onDrop(sourceSquare, targetSquare) {
        const current = new Chess(game.fen());
        if (estSpectateur) return false;
        if (!monTourReel || current.turn() !== maCouleur || game.isGameOver()) return false;

        const piece = current.get(sourceSquare);
        if (!piece) return false;

        if (piece.color !== maCouleur) {
            return false;
        }

        try {
            const gameCopy = new Chess(game.fen());
            const result = gameCopy.move({
                from: sourceSquare,
                to: targetSquare,
                promotion: "q",
            });

            if (result) {
                socket.emit("coup:joue", {
                    code: partieCode,
                    from: sourceSquare,
                    to: targetSquare,
                    promotion: "q",
                });

                setGame(gameCopy);
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
        if (estSpectateur) {
            const tourTexte = game.turn() === "w" ? "Blancs" : "Noirs";
            return `Mode spectateur — Tour des ${tourTexte}`;
        }

        return monTourReel
            ? "À vous de jouer!"
            : `En attente de l’adversaire${".".repeat(nombrePoints)}`;
    };

    return (
        <div className="hero-body p-0">
            <div className="container pt-4 has-text-centered">
                <h1 className="title has-text-centered has-text-white">
                    {getTitreMessage()}
                </h1>
                <div className="mb-3">
                    <span className="tag is-dark has-text-white is-medium">
                        Spectateurs : <strong className="has-text-white ml-1">{nbSpectateurs}</strong>
                    </span>
                </div>
                {erreurSauvegarde && (
                    <p className="has-text-danger-light mb-4" role="alert">
                        Erreur lors de l'enregistrement : {erreurSauvegarde}
                    </p>
                )}

                {/* --- AFFICHAGE PERMANENT DES PSEUDOS ET DES PASTILLES DE PRÉSENCE --- */}
                <div className="has-text-white mb-4">
                    {estSpectateur ? (
                        <div className="is-flex is-justify-content-center is-flex-wrap-wrap" style={{ gap: "1.5rem" }}>
                            <p className="is-flex is-align-items-center">
                                <Pastille enLigne={!!whiteOnline} />
                                <span>Blancs : <strong>{joueurBlancLogin || "En attente"}</strong></span>
                            </p>
                            <p className="is-flex is-align-items-center">
                                <Pastille enLigne={!!blackOnline} />
                                <span>Noirs : <strong>{joueurNoirLogin || "En attente"}</strong></span>
                            </p>
                        </div>
                    ) : (
                        <p className="is-flex is-align-items-center is-justify-content-center">
                            <Pastille enLigne={!!advEnLigne} />
                            <span>Adversaire : <strong>{loginAdv ?? adversaire}</strong></span>
                            {eloAdv && <span className="tag is-dark ml-2">Elo : {eloAdv}</span>}
                        </p>
                    )}
                </div>
                {/* --- MESSAGE DE FIN DE PARTIE SI NÉCESSAIRE --- */}
                {(partieQuittee || game.isGameOver()) && (
                    <p className="has-text-white mb-4">
                        {game.isCheckmate()
                            ? "La partie est terminée par échec et mat."
                            : game.isDraw() || game.isStalemate()
                                ? "La partie s'est terminée sur un match nul."
                                : "La partie est terminée."}
                    </p>
                )}

                {/* --- L'ÉCHIQUIER --- */}
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
                                arePiecesDraggable={!estSpectateur && monTourReel && !game.isGameOver()}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Echiquier;