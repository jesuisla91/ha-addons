ARG BUILD_FROM=ghcr.io/home-assistant/amd64-base:latest
FROM ${BUILD_FROM}

# Install Node.js
RUN apk add --no-cache nodejs npm

# Copy rootfs (if any)
COPY rootfs/ /

# Copy Planner service and web interface
COPY service/ /opt/planner/service/
COPY web/ /opt/planner/web/

WORKDIR /opt/planner/service/

# Install dependencies if package.json exists
RUN if [ -f package.json ]; then npm install; fi

# S6 will handle the service startup

