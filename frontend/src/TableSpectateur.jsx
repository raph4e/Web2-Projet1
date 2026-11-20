function TableSpectateur({ parties = [], onObserverPartie, onRetourConnexion, chargement = false }) {
    return (
        <div className="hero-body">
            <div className="container">
                <div className="box">
                    <div className="is-flex is-justify-content-space-between is-align-items-center mb-4">
                        <h1 className="title mb-0">Parties en cours</h1>
                        {onRetourConnexion && (
                            <button
                                type="button"
                                className="button is-light is-small"
                                onClick={onRetourConnexion}
                            >
                                Retour à la connexion
                            </button>
                        )}
                    </div>

                    {chargement ? (
                        <p className="has-text-centered">Chargement des parties...</p>
                    ) : parties.length === 0 ? (
                        <p className="has-text-centered has-text-grey">
                            Aucune partie active pour le moment.
                        </p>
                    ) : (
                        <table className="table is-fullwidth is-striped is-hoverable">
                            <thead>
                                <tr>
                                    <th>Partie</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {parties.map((partie) => {
                                    const joueur1 =
                                        partie.joueur_blanc_login ||
                                        partie.joueurBlancLogin ||
                                        partie.joueurBlanc ||
                                        partie.joueur1 ||
                                        "En attente";
                                    const joueur2 =
                                        partie.joueur_noir_login ||
                                        partie.joueurNoirLogin ||
                                        partie.joueurNoir ||
                                        partie.joueur2 ||
                                        "En attente";

                                    return (
                                        <tr key={partie.code}>
                                            <td>
                                                <strong>{joueur1}</strong>
                                                <span className="mx-2 has-text-grey">vs</span>
                                                <strong>{joueur2}</strong>
                                            
                                            </td>
                                            <td>
                                                <button
                                                    type="button"
                                                    className="button is-info is-small"
                                                    onClick={() => onObserverPartie(partie.code)}
                                                >
                                                    Regarder
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}

export default TableSpectateur;