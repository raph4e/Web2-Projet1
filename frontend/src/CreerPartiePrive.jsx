function CreerPartiePrive({ onCreer, onJoindre, message }) {
    return (
        <div className="hero-body">
            <div className="container is-flex is-justify-content-center">
                <div className="has-text-centered" style={{ width: "400px", position: "relative" }}>
                    {message && (
                        <p
                            className="has-text-black is-size-5 has-text-weight-bold"
                            style={{ position: "absolute", bottom: "calc(100% + 1rem)", width: "100%" }}
                        >
                            {message}
                        </p>
                    )}
                    <div className="box has-text-centered">
                    <h1 className="title">Choisir une option</h1>
                    <button
                        className="button is-dark is-fullwidth"
                        onClick={onCreer}
                    >
                        Créer une partie privée
                    </button>
                    <button
                        className="button is-dark is-fullwidth mt-4"
                        onClick={onJoindre}
                    >
                        Joindre une partie
                    </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default CreerPartiePrive;