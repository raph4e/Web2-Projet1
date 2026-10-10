## Déploiement (machine avec seulement Docker)

### Démarrage

1. Récupérer `docker-compose.yml` et `deploy/.env.example` et les placer dans un même dossier.
2. Créer le fichier d'environnement et le remplir :
```bash
   cp .env.example .env
```
Variables à renseigner :
`GHCR_OWNER` : raph4e
`IMAGE_TAG` : latest 
`GITHUB_CLIENT_ID` : À récupérer GitHub → Settings → Developer settings → OAuth Apps → New OAuth App
`GITHUB_CLIENT_SECRET` : À récupérer
`SESSION_SECRET` : openssl rand -hex 32

3. Lancer l'application :
```bash
   docker compose pull
   docker compose up -d
```
4. Ouvrir http://localhost:5173
