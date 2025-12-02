ARG BUILD_FROM=ghcr.io/home-assistant/amd64-base:latest
FROM ${BUILD_FROM}

# Installer Node.js et npm
RUN apk add --no-cache nodejs npm

# Copier rootfs (pour l'instant peut être vide, c'est OK)
COPY rootfs/ /

# Copier le backend Node (service) et le frontend (web)
COPY service/ /opt/planner/service/
COPY web/ /opt/planner/web/

# Installer les dépendances Node dans /opt/planner/service
RUN npm install --prefix /opt/planner/service

# Repertoire de travail
WORKDIR /opt/planner/service/

# Lancer le serveur Node.js quand le conteneur démarre
CMD ["node", "/opt/planner/service/server.js"]
