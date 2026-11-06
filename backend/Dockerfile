# Node 24 = version LTS actuelle (Node 20 n'a plus de mises à jour de sécurité depuis avril 2026).
# Alpine suffit maintenant : plus rien à compiler depuis qu'on n'utilise plus sqlite3.
FROM node:24-alpine

# Plus besoin de python3 / make / g++ : le module pg (PostgreSQL) est du pur JavaScript,
# contrairement à sqlite3 qui devait être compilé.

# Dossier de travail
WORKDIR /app

# Copie des fichiers de dépendances
COPY package*.json ./

# Installation des dépendances (sans les devDependencies comme pg-mem et supertest)
RUN npm ci --omit=dev

# Copie du reste du code source
COPY . .

# Exposition du port
EXPOSE 3000

# Commande pour démarrer l'application
CMD ["npm", "start"]
