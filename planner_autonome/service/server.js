const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();

const WEB_ROOT = "/opt/planner/web";
const DATA_FILE = "/data/planner.json";
const PORT = process.env.PORT || 8000;

// Pour parser le JSON dans les requêtes POST
app.use(express.json());

// Servir les fichiers statiques du planner (CSS, JS, images…)
app.use(express.static(WEB_ROOT));

// Route principale → renvoie index.html
app.get("/", (req, res) => {
    res.sendFile(path.join(WEB_ROOT, "index.html"));
});

// GET /api/planner/config → renvoie { phases, modes }
app.get("/api/planner/config", (req, res) => {
    fs.readFile(DATA_FILE, "utf8", (err, data) => {
        if (err) {
            // Si le fichier n'existe pas encore, on renvoie une config vide
            if (err.code === "ENOENT") {
                return res.json({ phases: {}, modes: {} });
            }
            console.error("Erreur lecture planner.json :", err);
            return res.status(500).json({ error: "Erreur lecture fichier" });
        }

        try {
            const json = JSON.parse(data);
            res.json({
                phases: json.phases || {},
                modes: json.modes || {}
            });
        } catch (e) {
            console.error("Erreur parse planner.json :", e);
            res.status(500).json({ error: "Erreur parse JSON" });
        }
    });
});

// POST /api/planner/config → enregistre { phases, modes }
app.post("/api/planner/config", (req, res) => {
    const body = req.body || {};

    const phases = body.phases || {};
    const modes  = body.modes || {};

    const toSave = { phases, modes };

    fs.writeFile(DATA_FILE, JSON.stringify(toSave, null, 2), "utf8", (err) => {
        if (err) {
            console.error("Erreur écriture planner.json :", err);
            return res.status(500).json({ error: "Erreur écriture fichier" });
        }
        res.json({ ok: true });
    });
});

// Démarrage du serveur
app.listen(PORT, () => {
    console.log(`Planner service listening on port ${PORT}`);
});
