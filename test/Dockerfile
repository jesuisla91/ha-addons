ARG BUILD_FROM
FROM $BUILD_FROM

# Install Node.js
RUN apk add --no-cache nodejs npm

# Create service folder
RUN mkdir -p /service

# Copy server and scripts
COPY run.sh /run.sh
COPY service/server.js /service/server.js

RUN chmod a+x /run.sh

CMD [ "/run.sh" ]
