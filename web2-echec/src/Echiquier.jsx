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

function Echiquier({ onRetour }) {
    return (
        <div className="hero-body p-0">
            <button
                className="button is-white is-medium"
                style={{ position: "fixed", top: "1rem", left: "1rem", zIndex: 10 }}
                type="button"
                onClick={onRetour}
            >
                Retour
            </button>
            <div className="container pt-4">
                <h1 className="title has-text-centered has-text-white">Échiquier</h1>
                <div
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
                </div>
            </div>
        </div>
    );
}

export default Echiquier;
