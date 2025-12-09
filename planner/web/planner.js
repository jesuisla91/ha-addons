// ============================================================
//  PLANNER – VERSION FINALE
//  Compatible backend JSON (GET/POST /api/config)
//  Synchronisation automatique + couleur du calendrier
//  3 lignes horaires (Travail / Maison / Absence)
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

// ------------------------------------------------------------
// ÉTAT GLOBAL
// ------------------------------------------------------------
let plannerData = null;

let activeModeCalendar = "Travail";   // mode sélectionné pour peindre le calendrier
let activePhase = "Nuit";             // phase sélectionnée pour la grille horaire

let isMouseDown = false;

// date affichée dans le calendrier
let now = new Date();
let calMonth = now.getMonth();
let calYear = now.getFullYear();

// raccourcis DOM
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

// Si un jour n'a pas de mode défini → déduction automatique
function autoMode(y,m,d) {
    const date = new Date(y, m-1, d);
    const day = date.getDay();
    return (day === 0 || day === 6) ? "Maison" : "Travail";
}

// renvoie mode pour un jour
function getModeForDateKey(dateKey) {
    if (!plannerData.schedules[dateKey])
        return autoMode(
            parseInt(dateKey.substring(0,4)),
            parseInt(dateKey.substring(5,7)),
            parseInt(dateKey.substring(8,10))
        );
    return plannerData.schedules[dateKey];
}

// ------------------------------------------------------------
// BACKEND API
// ------------------------------------------------------------
async function loadConfig() {
    try {
        const res = await fetch("/api/config");
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
        const res = await fetch("/api/config", {
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

// Assure la structure JSON
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

// ------------------------------------------------------------
// PALETTE DES MODES
// ------------------------------------------------------------
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

// ------------------------------------------------------------
// PALETTE DES PHASES
// ------------------------------------------------------------
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

// ------------------------------------------------------------
// CALENDRIER
// ------------------------------------------------------------
function renderCalendar() {
    elCalMonthLabel.textContent = `${monthName(calMonth)} ${calYear}`;
    elCalendarGrid.innerHTML = "";

    const first = new Date(calYear, calMonth, 1);
    const startDay = (first.getDay() + 6) % 7; // lundi=0
    const days = new Date(calYear, calMonth+1, 0).getDate();

    // 🔹 Calcul de la date d'aujourd'hui
    const today      = new Date();
    const todayKey   = makeKey(today.getFullYear(), today.getMonth() + 1, today.getDate());

    // cases vides
    for (let i = 0; i < startDay; i++) {
        elCalendarGrid.appendChild(document.createElement("div"));
    }

    // jours
    for (let d = 1; d <= days; d++) {
        const dateKey = makeKey(calYear, calMonth+1, d);
        const div = document.createElement("div");

        div.className = "calendar-day";
        div.textContent = d;
        
        // 🔹 Si c'est aujourd'hui, on ajoute la classe spéciale
        if (dateKey === todayKey) {
            div.classList.add("today");
        }
        
        // appliquer la couleur du mode
        const mode = getModeForDateKey(dateKey);
        div.classList.add("mode-" + mode);

        // évènement clic (changer mode du jour)
        div.onclick = () => {
            plannerData.schedules[dateKey] = activeModeCalendar;

            saveConfig();
            renderCalendar(); // recolorisation immédiate
            updateCurrentStatus();
        };

        elCalendarGrid.appendChild(div);
    }
}

// ------------------------------------------------------------
// GRILLE 3 LIGNES x 24 HEURES
// ------------------------------------------------------------

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
    plannerData.phases[mode][hour] = activePhase;
    applyPhaseCss(cell, activePhase);
    saveConfig();
    updateCurrentStatus();
}

// ------------------------------------------------------------
// STATUT ACTUEL (mode du jour + phase actuelle)
// ------------------------------------------------------------
function updateCurrentStatus() {
    const now = new Date();
    elCurrentTime.textContent = now.toLocaleTimeString("fr-FR");

    const key = makeKey(now.getFullYear(), now.getMonth()+1, now.getDate());
    const mode = getModeForDateKey(key);

    elCurrentModeLabel.textContent = mode;

    const phaseKey = plannerData.phases[mode][now.getHours()];
    elCurrentPhase.textContent = phaseKey || "---";
}

// horloge
setInterval(updateCurrentStatus, 1000);

// synchro backend toutes les minutes
setInterval(loadConfig, 60000);

// ------------------------------------------------------------
// NAVIGATION CALENDRIER
// ------------------------------------------------------------
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

// ------------------------------------------------------------
// INIT
// ------------------------------------------------------------
loadConfig();
updateCurrentStatus();
