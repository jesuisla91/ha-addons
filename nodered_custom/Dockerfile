ARG BUILD_FROM=ghcr.io/home-assistant/amd64-base:latest
FROM ${BUILD_FROM}

# Install Node.js + npm
RUN apk add --no-cache nodejs npm

# Add a simple Web server using Node.js
COPY web/ /opt/web/
COPY run.sh /run.sh

RUN chmod +x /run.sh

CMD ["/run.sh"]
