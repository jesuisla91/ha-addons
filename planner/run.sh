#!/usr/bin/with-contenv bashio

bashio::log.info "Starting Planner add-on..."

cd /app/service
node server.js
