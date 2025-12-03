ARG BUILD_FROM=ghcr.io/hassio-addons/base:14.0.0
FROM ${BUILD_FROM}

# Dossier de travail
WORKDIR /app

# Copie du backend et du frontend
COPY service/ /app/service/
COPY web/ /app/web/
COPY run.sh /run.sh

# Installation de Node.js + npm
RUN apk add --no-cache nodejs npm

# Installation des dépendances backend
RUN cd /app/service && npm install

# Script exécutable
RUN chmod a+x /run.sh

# Port HTTP de l'add-on
EXPOSE 8099

# Lance le script principal
CMD [ "/run.sh" ]
