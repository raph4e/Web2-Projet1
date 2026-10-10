function JoindrePartie({ onRejoint }) {

    // Permet de joindre une partie en soumettant le code de la partie à l'API du backend.
    const joindrePartie = async (event) => {
        event.preventDefault();
        const code = event.currentTarget.codePartie.value.trim().toUpperCase();
        const response = await fetch(`http://localhost:3000/api/parties/${code}/rejoindre`, {
            method: "POST",
            credentials: "include",
        });

        // Si réussi, appelle la fonction onRejoint avec le code de la partie et le nom de l'adversaire.
        if (response.ok) {
            const partie = await response.json();
            onRejoint(code, partie.adversaire);
        } else {
            const resultat = await response.json();
            alert(resultat.erreur ?? "Impossible de rejoindre cette partie.");
        }
    };

    return (
        <div className="hero-body p-0">
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
