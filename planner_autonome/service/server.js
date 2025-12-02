const express = require("express");
const app = express();
const path = require("path");

// Memory state
let currentMode = "Jour";
let currentPhase = "Matin";

app.use(express.json());

// Serve UI front-end
app.use("/", express.static(path.join(__dirname, "../web")));

// API
app.get("/api/state", (req, res) => {
    res.json({
        mode: currentMode,
        phase: currentPhase
    });
});

// Example of autonomous loop
setInterval(() => {
    console.log("Planner loop running...");
    // Ici, on mettra la logique du Planner.js
}, 60000);

app.listen(8000, () => {
    console.log("Planner Autonome running at http://homeassistant:8000");
});
