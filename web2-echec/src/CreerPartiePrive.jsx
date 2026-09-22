function CreerPartiePrive({ onCreer, onJoindre }) {
    return (
        <div className="hero-body">
            <div className="container is-flex is-justify-content-center">
                <div className="box has-text-centered" style={{ width: "400px" }}>
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
    );
}

export default CreerPartiePrive;