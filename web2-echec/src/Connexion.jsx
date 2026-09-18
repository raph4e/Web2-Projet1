function Connexion() {
    const seConnecterAvecGithub = () => {
        window.location.href = "http://localhost:3000/auth/github";
    };

    return (
        <section className="hero is-fullheight" style={{ backgroundColor: "#6b4f3a" }}>
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
        </section>
    );
}

export default Connexion;

