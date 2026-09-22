function JoindrePartie({ onRetour }) {
    const joindrePartie = (event) => {
        event.preventDefault();
        console.log("Code de partie :", event.currentTarget.codePartie.value);
    };

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
                <div className="is-flex is-justify-content-center">
                <div className="box has-text-centered" style={{ width: "400px" }}>
                    <h1 className="title">Joindre une partie</h1>
                    <form onSubmit={joindrePartie}>
                        <div className="field">
                            <label className="label has-text-left" htmlFor="codePartie">
                                Code de la partie
                            </label>
                            <div className="control">
                                <input
                                    className="input"
                                    id="codePartie"
                                    name="codePartie"
                                    type="text"
                                    placeholder="Entrez le code"
                                    required
                                />
                            </div>
                        </div>
                        <button className="button is-dark is-fullwidth" type="submit">
                            Joindre une partie
                        </button>
                    </form>
                </div>
                </div>
            </div>
        </div>
    );
}

export default JoindrePartie;
