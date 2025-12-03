# Planner Add-on
FROM ghcr.io/hassio-addons/base:14.0.0

# Set the working directory
WORKDIR /app

# Copy service and web files
COPY service/ /app/service/
COPY web/ /app/web/

# Install Node.js and npm
RUN apk add --no-cache nodejs npm

# Install backend dependencies
RUN cd /app/service && npm install

# Expose the web UI port
EXPOSE 8099
