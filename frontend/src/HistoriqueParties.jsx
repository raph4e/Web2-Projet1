import { useEffect, useState } from "react";

function HistoriqueParties({ joueur }) {
    const [parties, setParties] = useState([]);
    const [chargement, setChargement] = useState(true);
    const [erreur, setErreur] = useState(null);

    useEffect(() => {
        const controller = new AbortController();

        async function chargerHistorique() {
            setChargement(true);
            setErreur(null);

            try {
                const response = await fetch(
                    `http://localhost:3000/api/joueurs/${joueur.id}/parties`,
                    { signal: controller.signal },
                );
                const resultat = await response.json();
                if (!response.ok) {
                    throw new Error(resultat.erreur ?? "Impossible de charger l’historique.");
                }
                setParties(resultat);
            } catch (error) {
                if (!controller.signal.aborted) setErreur(error.message);
            } finally {
                if (!controller.signal.aborted) setChargement(false);
            }
        }

        chargerHistorique();
        return () => controller.abort();
    }, [joueur.id]);

    return (
        <div className="hero-body">
            <div className="container">
                <div className="box">
                    <h1 className="title has-text-centered">Historique des parties</h1>

                    {chargement ? (
                        <p className="has-text-centered" role="status">Chargement de l’historique…</p>
                    ) : erreur ? (
                        <p className="has-text-danger has-text-centered" role="alert">{erreur}</p>
                    ) : parties.length === 0 ? (
                        <p className="has-text-centered">Aucune partie jouée pour le moment.</p>
                    ) : (
                        <div className="table-container">
                            <table className="table is-fullwidth is-striped">
                                <thead>
                                    <tr>
                                        <th>Code</th>
                                        <th>Couleur</th>
                                        <th>Statut</th>
                                        <th>Gagnant</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {parties.map((partie) => (
                                        <tr key={partie.id}>
                                            <td>{partie.code}</td>
                                            <td>
                                                {partie.joueur_blanc_id === joueur.id
                                                    ? "Blancs"
                                                    : "Noirs"}
                                            </td>
                                            <td>{partie.statut}</td>
                                            <td>{partie.resultat ?? "—"}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default HistoriqueParties;
