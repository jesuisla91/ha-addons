ARG BUILD_FROM=ghcr.io/home-assistant/amd64-base:latest
FROM ${BUILD_FROM}

# Install Node.js
RUN apk add --no-cache nodejs npm

# Copy S6 rootfs (services)
COPY ./rootfs/ /

# Copy Planner service code
COPY ./service/ /opt/planner/service/

# Copy web UI
COPY ./web/ /opt/planner/web/

WORKDIR /opt/planner/service/
