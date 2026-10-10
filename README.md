## Déploiement (machine avec seulement Docker)

### Démarrage

1. Récupérer `docker-compose.yml` et `deploy/.env.example` et les placer dans un même dossier.
2. Créer le fichier d'environnement et le remplir :
```bash
   cp .env.example .env
```
Variables à renseigner :
- `GHCR_OWNER` : `raph4e`
- `IMAGE_TAG` : `latest`
- `BACKEND_IMAGE` : `ghcr.io/raph4e/web2-echec-backend`
- `BACKEND_TAG` : `latest`
- `FRONTEND_IMAGE` : `ghcr.io/raph4e/web2-echec-frontend`
- `FRONTEND_TAG` : `latest`
- `GITHUB_CLIENT_ID` : Ov23li9c1NAR7jaIAOZ8
- `GITHUB_CLIENT_SECRET` : 4828e6793b881a0c63ba3b0a462a6f7d0b98b061
- `SESSION_SECRET` : b10eab4bdb2a29fb0657269139e60578d85f48fa77fcc237a6bc6e7fe405d728

3. Lancer l'application :
```bash
   docker compose pull
   docker compose up -d
```
4. Ouvrir http://localhost:5173
