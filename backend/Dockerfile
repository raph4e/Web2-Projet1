# Utilisation de Node.js Debian (plus stable pour la compilation native de sqlite3)
FROM node:20-slim

# Installation des outils de compilation nécessaires pour sqlite3
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# Dossier de travail
WORKDIR /app

# Copie des fichiers de dépendances
COPY package*.json ./

# Installation des dépendances et compilation de sqlite3 pour cette image Linux
RUN npm install --build-from-source

# Copie du reste du code source
COPY . .

# Exposition du port
EXPOSE 3000

# Commande pour démarrer l'application
CMD ["npm", "start"]