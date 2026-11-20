function Connexion({ _onConnexion, onContinuerInvite }) {
    const seConnecterAvecGithub = () => {
        window.location.href = "http://localhost:3000/api/auth/github";
    };

    return (
        <div className="hero-body">
            <div className="container is-flex is-justify-content-center">
                <div
                    className="box has-text-centered"
                    style={{ width: "400px" }}
                >
                    <h1 className="title">
                        Connexion
                    </h1>

                    <button
                        className="button is-dark is-fullwidth"
                        onClick={seConnecterAvecGithub}
                    >
                        Se connecter avec GitHub
                    </button>
                    {onContinuerInvite && (
                        <button
                            type="button"
                            className="button is-light is-fullwidth mt-3"
                            onClick={onContinuerInvite}
                        >
                            Continuer en tant qu'invité
                        </button>
                    )}
                </div>
            </div>
            
        </div>

    );
}

export default Connexion;

