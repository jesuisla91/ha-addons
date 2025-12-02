// service/scheduler.js
const fs = require("fs");

const DATA_FILE = "/data/planner.json";
const WEBHOOK_URL = "http://supervisor/addons/a0d7b954_nodered/proxy/planner_update";



// Modes et jours fériés comme dans le front
const MODES = ["Travail", "Maison", "Absence"];
const HOLIDAYS = ["01-01", "05-01", "07-14", "12-25"];

let lastSentMode = null;
let lastSentPhase = null;
let schedulerStarted = false;

function dateToKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

function isHoliday(date) {
    const iso = date.toISOString().split("T")[0];
    const parts = iso.split("-");
    const mmdd = parts[1] + "-" + parts[2];
    return HOLIDAYS.includes(mmdd);
}

function loadConfig() {
    return new Promise((resolve, reject) => {
        fs.readFile(DATA_FILE, "utf8", (err, data) => {
            if (err) {
                if (err.code === "ENOENT") {
                    return resolve({ phases: {}, modes: {} });
                }
                return reject(err);
            }
            try {
                const json = JSON.parse(data);
                resolve({
                    phases: json.phases || {},
                    modes: json.modes  || {}
                });
            } catch (e) {
                reject(e);
            }
        });
    });
}

function getModeForDate(date, modes) {
    const dateKey = dateToKey(date);

    if (modes && modes[dateKey] && MODES.includes(modes[dateKey])) {
        return modes[dateKey];
    }

    if (isHoliday(date)) return "Maison";

    const dow = date.getDay();
    if (dow === 0 || dow === 6) return "Maison"; // Weekend

    return "Travail";
}

function getPhaseForNow(phases, mode, date) {
    const hour = date.getHours();
    if (!phases || !phases[mode]) return "Nuit";
    return phases[mode][hour] || "Nuit";
}

async function sendWebhook(mode, phase, date) {
    const payload = {
        mode,
        phase,
        timestamp: date.toISOString(),
        date: dateToKey(date),
        hour: date.getHours()
    };

    try {
        const resp = await fetch(WEBHOOK_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!resp.ok) {
            const txt = await resp.text();
            console.error(`[planner] Webhook HTTP ${resp.status}: ${txt}`);
        } else {
            console.log(`[planner] Webhook envoyé → mode=${mode}, phase=${phase}`);
        }
    } catch (e) {
        console.error("[planner] Erreur d'envoi webhook :", e.message);
    }
}

async function tickScheduler() {
    const now = new Date();

    try {
        const { phases, modes } = await loadConfig();

        const mode  = getModeForDate(now, modes);
        const phase = getPhaseForNow(phases, mode, now);

        if (lastSentMode === null || mode !== lastSentMode || phase !== lastSentPhase) {
            await sendWebhook(mode, phase, now);
            lastSentMode  = mode;
            lastSentPhase = phase;
        }
    } catch (e) {
        console.error("[planner] Erreur scheduler :", e.message);
    }
}

function startScheduler() {
    if (schedulerStarted) return;
    schedulerStarted = true;

    console.log("[planner] Scheduler autonome démarré (tick 60s).");

    tickScheduler().catch(() => {});
    setInterval(() => {
        tickScheduler().catch(() => {});
    }, 60000);
}

module.exports = { startScheduler };
