ARG BUILD_FROM=ghcr.io/home-assistant/amd64-base:latest
FROM ${BUILD_FROM}

RUN apk add --no-cache nodejs npm

COPY rootfs/ /

COPY service/ /opt/planner/service/
COPY web/ /opt/planner/web/

WORKDIR /opt/planner/service/
