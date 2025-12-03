# Planner Add-on
FROM ghcr.io/hassio-addons/base:14.0.0

# Set the working directory
WORKDIR /app

# Copy service files
COPY service/ /app/service/
COPY web/ /app/web/

# Install Node.js and NPM
RUN apk add --no-cache nodejs npm

# Install dependencies (Express etc.)
RUN cd /app/service && npm install

# Expose the port used by the web UI
EXPOSE 8099

# Start the server
CMD ["node", "/app/service/server.js"]
