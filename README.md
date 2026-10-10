## Déploiement (machine avec seulement Docker)

### Démarrage

1. Récupérer `docker-compose.yml` et `deploy/.env.example` et les placer dans un même dossier.
2. Créer le fichier d'environnement et le remplir :
```bash
   cp .env.example .env
```
Variables à renseigner :
-`GHCR_OWNER` : raph4e
-`IMAGE_TAG` : latest
-`BACKEND_IMAGE` : ghcr.io/raph4e/web2-echec-backend
-`BACKEND_TAG` : latest
-`FRONTEND_IMAGE` : ghcr.io/raph4e/web2-echec-frontend
-`FRONTEND_TAG` : latest
-`GITHUB_CLIENT_ID` : exemple_client_id
-`GITHUB_CLIENT_SECRET` : exemple_client_secret
-`SESSION_SECRET` : exemple_session_secret

3. Lancer l'application :
```bash
   docker compose pull
   docker compose up -d
```
4. Ouvrir http://localhost:5173
