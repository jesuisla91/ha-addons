ARG BUILD_FROM
FROM $BUILD_FROM

# Install Node.js
RUN apk add --no-cache nodejs npm

# Create service folder
RUN mkdir -p /service

# Copy service files
COPY service/package.json /service/package.json
COPY service/server.js /service/server.js

# Install Node dependencies
WORKDIR /service
RUN npm install --only=production

# Copy run script
COPY run.sh /run.sh
RUN chmod a+x /run.sh

CMD [ "/run.sh" ]
