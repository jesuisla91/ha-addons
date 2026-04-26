// ============================================================
//  PLANNER - VERSION CORRIGEE
//  Fix : bug "plannerData is null" au demarrage
//
//  Modifications par rapport a l'original :
//  1. getModeForDateKey : garde null-safe sur plannerData
//  2. updateCurrentStatus : early return si plannerData pas charge
//  3. renderScheduleGrid + setPhase : gardes null-safe
//  4. INIT : updateCurrentStatus() appele AVANT loadConfig()
// ============================================================

// ------------------------------------------------------------
// CONSTANTES
// ------------------------------------------------------------
const MODES = ["Travail", "Maison", "Absence"];

const PHASES = [
    { key: "Nuit", css: "phase-nuit" },
    { key: "Lever", css: "phase-lever" },
    { key: "Présence", css: "phase-presence" },
    { key: "Absence", css: "phase-absent" },
    { key: "Soirée", css: "phase-soiree" },
    { key: "Coucher", css: "phase-couche" },
    { key: "Retour", css: "phase-retour" }
];

const API_BASE = window.location.pathname.replace(/\/$/, "");

// ------------------------------------------------------------
// ETAT GLOBAL
// ------------------------------------------------------------
let plannerData = null;

let activeModeCalendar = "Travail";
let activePhase = "Nuit";

let isMouseDown = false;

let now = new Date();
let calMonth = now.getMonth();
let calYear = now.getFullYear();

const elModePalette      = document.getElementById("mode-palette");
const elPhasePalette     = document.getElementById("phase-palette");
const elCalendarGrid     = document.getElementById("calendar-grid");
const elCalMonthLabel    = document.getElementById("cal-month-label");
const elScheduleGrid     = document.getElementById("schedule-grid");
const elCurrentTime      = document.getElementById("current-time");
const elCurrentModeLabel = document.getElementById("current-mode-label");
const elCurrentPhase     = document.getElementById("current-phase");
const elHaStatus         = document.getElementById("ha-status");

// ------------------------------------------------------------
// OUTILS
// ------------------------------------------------------------
function pad(n) { return n < 10 ? "0" + n : n; }

function makeKey(y, m, d) {
    return `${y}-${pad(m)}-${pad(d)}`;
}

function monthName(m) {
    return ["Janvier","Février","Mars","Avril","Mai","Juin",
            "Juillet","Août","Septembre","Octobre","Novembre","Décembre"][m];
}

function autoMode(y, m, d) {
    const date = new Date(y, m - 1, d);
    const day = date.getDay();
    return (day === 0 || day === 6) ? "Maison" : "Travail";
}

// FIX 1 : garde null-safe
function getModeForDateKey(dateKey) {
    if (!plannerData || !plannerData.schedules || !plannerData.schedules[dateKey]) {
        return autoMode(
            parseInt(dateKey.substring(0, 4)),
            parseInt(dateKey.substring(5, 7)),
            parseInt(dateKey.substring(8, 10))
        );
    }
    return plannerData.schedules[dateKey];
}

// ------------------------------------------------------------
// BACKEND API
// ------------------------------------------------------------
async function loadConfig() {
    try {
        const res = await fetch(`${API_BASE}/api/config`);
        plannerData = await res.json();
        elHaStatus.textContent = "Backend OK";

        ensureStructure();
        renderAll();

    } catch (err) {
        console.error("GET /api/config erreur :", err);
        elHaStatus.textContent = "Backend ERROR";
    }
}

async function saveConfig() {
    try {
        const res = await fetch(`${API_BASE}/api/config`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(plannerData)
        });

        if (!res.ok) throw new Error("POST erreur");

        elHaStatus.textContent = "Sauvegardé ✔️";

    } catch (err) {
        console.error("POST /api/config erreur :", err);
        elHaStatus.textContent = "Erreur sauvegarde";
    }
}

function ensureStructure() {
    if (!plannerData.schedules) plannerData.schedules = {};
    if (!plannerData.phases) plannerData.phases = {};

    for (const mode of MODES) {
        if (!plannerData.phases[mode])
            plannerData.phases[mode] = new Array(24).fill(null);
    }
}

// ------------------------------------------------------------
// AFFICHAGE GLOBAL
// ------------------------------------------------------------
function renderAll() {
    renderModePalette();
    renderPhasePalette();
    renderCalendar();
    renderScheduleGrid();
    updateCurrentStatus();
}

function renderModePalette() {
    elModePalette.innerHTML = "";

    MODES.forEach(mode => {
        const div = document.createElement("div");
        div.className = "palette-item mode-" + mode;
        div.textContent = mode;

        if (activeModeCalendar === mode)
            div.classList.add("active");

        div.onclick = () => {
            activeModeCalendar = mode;
            renderModePalette();
        };

        elModePalette.appendChild(div);
    });
}

function renderPhasePalette() {
    elPhasePalette.innerHTML = "";

    PHASES.forEach(phase => {
        const div = document.createElement("div");
        div.className = "palette-item " + phase.css;
        div.textContent = phase.key;

        if (activePhase === phase.key)
            div.classList.add("active");

        div.onclick = () => {
            activePhase = phase.key;
            renderPhasePalette();
        };

        elPhasePalette.appendChild(div);
    });
}

function renderCalendar() {
    elCalMonthLabel.textContent = `${monthName(calMonth)} ${calYear}`;
    elCalendarGrid.innerHTML = "";

    const first = new Date(calYear, calMonth, 1);
    const startDay = (first.getDay() + 6) % 7;
    const days = new Date(calYear, calMonth + 1, 0).getDate();

    const today = new Date();
    const todayKey = makeKey(today.getFullYear(), today.getMonth() + 1, today.getDate());

    for (let i = 0; i < startDay; i++) {
        elCalendarGrid.appendChild(document.createElement("div"));
    }

    for (let d = 1; d <= days; d++) {
        const dateKey = makeKey(calYear, calMonth + 1, d);
        const div = document.createElement("div");

        div.className = "calendar-day";
        div.textContent = d;

        if (dateKey === todayKey) {
            div.classList.add("today");
        }

        const mode = getModeForDateKey(dateKey);
        div.classList.add("mode-" + mode);

        div.onclick = () => {
            if (!plannerData) return;
            plannerData.schedules[dateKey] = activeModeCalendar;
            saveConfig();
            renderCalendar();
            updateCurrentStatus();
        };

        elCalendarGrid.appendChild(div);
    }
}

function renderScheduleHeader() {
    const header = document.getElementById("schedule-header");
    header.innerHTML = "<div class='schedule-row-label'></div>";

    for (let h = 0; h < 24; h++) {
        const cell = document.createElement("div");
        cell.className = "schedule-cell";
        cell.textContent = h;
        header.appendChild(cell);
    }
}

function renderScheduleGrid() {
    renderScheduleHeader();
    elScheduleGrid.innerHTML = "";

    if (!plannerData || !plannerData.phases) return;

    MODES.forEach(mode => {
        const row = document.createElement("div");
        row.className = "schedule-row";

        const label = document.createElement("div");
        label.className = "schedule-row-label";
        label.textContent = mode;

        row.appendChild(label);

        const arr = plannerData.phases[mode];

        for (let h = 0; h < 24; h++) {
            const cell = document.createElement("div");
            cell.className = "schedule-cell";
            cell.dataset.mode = mode;
            cell.dataset.hour = h;

            const phaseKey = arr[h];
            if (phaseKey) applyPhaseCss(cell, phaseKey);

            cell.addEventListener("mousedown", () => {
                isMouseDown = true;
                setPhase(mode, h, cell);
            });

            cell.addEventListener("mouseover", () => {
                if (isMouseDown) setPhase(mode, h, cell);
            });

            row.appendChild(cell);
        }

        elScheduleGrid.appendChild(row);
    });

    document.addEventListener("mouseup", () => isMouseDown = false);
}

function clearPhaseCss(cell) {
    PHASES.forEach(p => cell.classList.remove(p.css));
}

function applyPhaseCss(cell, key) {
    clearPhaseCss(cell);
    const ph = PHASES.find(p => p.key === key);
    if (ph) cell.classList.add(ph.css);
}

function setPhase(mode, hour, cell) {
    if (!plannerData || !plannerData.phases) return;
    plannerData.phases[mode][hour] = activePhase;
    applyPhaseCss(cell, activePhase);
    saveConfig();
    updateCurrentStatus();
}

// FIX 2 : garde dans updateCurrentStatus
function updateCurrentStatus() {
    const now = new Date();
    elCurrentTime.textContent = now.toLocaleTimeString("fr-FR");

    if (!plannerData || !plannerData.phases) {
        elCurrentModeLabel.textContent = "...";
        elCurrentPhase.textContent = "...";
        return;
    }

    const key = makeKey(now.getFullYear(), now.getMonth() + 1, now.getDate());
    const mode = getModeForDateKey(key);

    elCurrentModeLabel.textContent = mode;

    const currentHour = now.getHours();
    const phaseKey = plannerData.phases[mode] ? plannerData.phases[mode][currentHour] : null;
    elCurrentPhase.textContent = phaseKey || "---";

    const cells = document.querySelectorAll("#schedule-grid .schedule-cell");
    cells.forEach(cell => {
        cell.classList.remove("current-hour");

        const h = Number(cell.dataset.hour);
        if (!Number.isNaN(h) && h === currentHour) {
            cell.classList.add("current-hour");
        }
    });
}

setInterval(updateCurrentStatus, 1000);
setInterval(loadConfig, 60000);

document.getElementById("cal-prev").onclick = () => {
    calMonth--;
    if (calMonth < 0) {
        calMonth = 11;
        calYear--;
    }
    renderCalendar();
};

document.getElementById("cal-next").onclick = () => {
    calMonth++;
    if (calMonth > 11) {
        calMonth = 0;
        calYear++;
    }
    renderCalendar();
};

// FIX 3 : ordre d'init - updateCurrentStatus avant loadConfig
//         (la garde gere le cas null jusqu'au chargement)
updateCurrentStatus();
loadConfig();
