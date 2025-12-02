ARG BUILD_FROM=ghcr.io/home-assistant/amd64-base:latest
FROM ${BUILD_FROM}

# Install Node.js and Node-RED
RUN apk add --no-cache nodejs npm \
    && npm install -g --unsafe-perm node-red

# Copy rootfs (if any)
COPY rootfs/ /

# Default command
CMD ["/run.sh"]
