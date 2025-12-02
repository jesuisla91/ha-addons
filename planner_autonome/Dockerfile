ARG BUILD_FROM=ghcr.io/home-assistant/amd64-base:latest
FROM ${BUILD_FROM}

RUN apk add --no-cache nodejs npm

# Copie rootfs
COPY rootfs/ /

# Copie service + web
COPY service/ /opt/planner/service/
COPY web/ /opt/planner/web/

# Installe les dépendances Node (dont express)
RUN npm install --prefix /opt/planner/service

WORKDIR /opt/planner/service/
