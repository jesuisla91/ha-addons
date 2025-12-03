ARG BUILD_FROM=ghcr.io/hassio-addons/base:14.0.0
FROM ${BUILD_FROM}

# Set working dir
WORKDIR /app

# Copy files
COPY service/ /app/service/
COPY web/ /app/web/
COPY run.sh /app/run.sh

# NodeJS
RUN apk add --no-cache nodejs npm

# Install backend deps
RUN cd /app/service && npm install

# Make run.sh executable
RUN chmod a+x /app/run.sh

# Expose port
EXPOSE 8099

# REQUIRED FOR HOME ASSISTANT ADD-ONS
ENTRYPOINT ["/init"]
CMD []
