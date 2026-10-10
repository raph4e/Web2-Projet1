function AttentePartie({ code }) {
    return (
        <div className="hero-body">
            <div className="container is-flex is-justify-content-center">
                <div className="box has-text-centered" style={{ width: "400px" }}>
                    <h1 className="title">Partie privée</h1>
                    <p className="mb-3">Communiquez ce code à l'autre joueur :</p>
                    <p className="title is-2">{code}</p>
                    <p>En attente de l'autre joueur...</p>
                </div>
            </div>
        </div>
    );
}

export default AttentePartie;
