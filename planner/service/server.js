// service/server.js
// Backend for Planner add-on: serves web UI + JSON config API

const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");
const cron = require("node-cron");

const app = express();
const PORT = 8099;

// Persistent JSON file (add-on data directory)
const DATA_FILE = "/data/planner_config.json";

// ------------------------------------------------------
// Helpers: load & save config
// ------------------------------------------------------

function loadConfig() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, "utf8");
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error("Error loading config:", err);
  }

  // Default structure if file does not exist or is invalid
  const now = new Date().toISOString();
  return {
    schedules: {},   // your calendar + modes later
    phases: {},      // your phase definitions later
    meta: {
      createdAt: now,
      lastLoaded: now,
      lastTick: null,
      lastSaved: null
    }
  };
}

function saveConfig(config) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(config, null, 2), "utf8");
  } catch (err) {
    console.error("Error saving config:", err);
  }
}

// ------------------------------------------------------
// Initial load
// ------------------------------------------------------

let plannerConfig = loadConfig();
plannerConfig.meta = plannerConfig.meta || {};
plannerConfig.meta.lastLoaded = new Date().toISOString();
saveConfig(plannerConfig);

// ------------------------------------------------------
// Middleware
// ------------------------------------------------------

app.use(bodyParser.json());

// Serve static front-end files
const WEB_ROOT = "/app/web";
app.use(express.static(WEB_ROOT));

// ------------------------------------------------------
// API endpoints
// ------------------------------------------------------

// Get full planner configuration
app.get("/api/config", (req, res) => {
  res.json(plannerConfig);
});

// Save full planner configuration
app.post("/api/config", (req, res) => {
  try {
    const body = req.body || {};
    // You can later validate structure here if needed
    plannerConfig = body;
    plannerConfig.meta = plannerConfig.meta || {};
    plannerConfig.meta.lastSaved = new Date().toISOString();

    saveConfig(plannerConfig);
    res.json({ status: "ok" });
  } catch (err) {
    console.error("Error in POST /api/config:", err);
    res.status(500).json({ status: "error", message: "Failed to save config" });
  }
});

// Root -> serve index.html explicitly (optional, static already does it)
app.get("/", (req, res) => {
  res.sendFile(path.join(WEB_ROOT, "index.html"));
});

// ------------------------------------------------------
// Cron job: runs every minute
// Here we will later compute current mode/phase based on calendar + time
// For now, we just update a heartbeat and resave.
// ------------------------------------------------------

cron.schedule("* * * * *", () => {
  const now = new Date().toISOString();
  if (!plannerConfig.meta) plannerConfig.meta = {};
  plannerConfig.meta.lastTick = now;

  // TODO: later:
  // - compute current day mode
  // - compute current phase
  // - update plannerConfig.current = { mode, phase, time, date }

  saveConfig(plannerConfig);
  console.log(`[Planner] Tick at ${now}`);
});

// ------------------------------------------------------
// Start server
// ------------------------------------------------------

app.listen(PORT, () => {
  console.log(`Planner add-on web server running on port ${PORT}`);
});
