function Connexion({ onConnexion }) {
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
                </div>
            </div>
        </div>

    );
}

export default Connexion;

