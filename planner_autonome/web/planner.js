// ================== CONFIG LOCALE ==================

const MODES = ["Travail", "Maison", "Absence"];
const PHASES = [
    { key: "Nuit",     css: "phase-nuit" },
    { key: "Lever",    css: "phase-lever" },
    { key: "Présence", css: "phase-presence" },
    { key: "Absence",  css: "phase-absent" },
    { key: "Soirée",   css: "phase-soiree" },
    { key: "Coucher",  css: "phase-couche" },
    { key: "Retour",   css: "phase-retour" }
];

const HOLIDAYS = [
    "01-01",  // Jour de l'An
    "01-05",  // Fête du Travail
    "14-07",  // Fête Nationale
    "25-12",  // Noël
    // Ajoute ici tes autres jours fériés
];

let schedulePhases = {};
let scheduleModes = {};

let currentPaintPhaseKey = "Présence";
let currentPaintModeKey  = "Travail";

let isDraggingPhase = false;
let lastSentPhase = null;
let lastSentMode  = null;

let calYear;
let calMonth;

let lastDateKeySynced = null;

function isHoliday(date) {
    const dateString = date.toISOString().split('T')[0].slice(5); // Extrait le format "MM-DD"
    return HOLIDAYS.includes(dateString);
}

// ================== UTILITAIRES ==================

function getPhaseDef(key) {
    return PHASES.find(p => p.key === key) || PHASES[0];
}

function phaseKeyToCss(key) {
    return getPhaseDef(key).css;
}

function dateToKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}


// ================== SAUVEGARDE WEBHOOK ==================

async function savePlannerConfigToHA() {
    const haStatus = document.getElementById("ha-status");

    const payload = {
        phases: schedulePhases,
        modes: scheduleModes
    };

    try {
        await fetch("/api/webhook/planner_save", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (haStatus) {
            haStatus.textContent = `Config sauvegardée (${formatTime()})`;
            haStatus.style.color = "#15803d";
        }

    } catch (e) {
        console.error("Erreur envoi Webhook :", e);
        if (haStatus) {
            haStatus.textContent = "Erreur sauvegarde config : " + e.message;
            haStatus.style.color = "#b91c1c";
        }
    }
}


// ================== CHARGEMENT JSON DEPUIS HA ==================

async function loadPlannerConfigFromHA() {
    try {
        const resp = await fetch("/local/planner/planner-data.json?cacheBust=" + Date.now(), {
            method: "GET",
            headers: {
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "Pragma": "no-cache",
                "Expires": "0"
            }
        });

        if (!resp.ok) throw new Error("Fichier JSON introuvable");

        const json = await resp.json();

        if (json.phases && typeof json.phases === "object") {
            schedulePhases = json.phases;
        }

        if (json.modes && typeof json.modes === "object") {
            scheduleModes = json.modes;
        }

        console.log("▶️ Config planner chargée depuis HA");

    } catch (e) {
        console.warn("⚠️ Impossible de charger la config depuis HA :", e);
        initDefaultPhaseSchedule();
        scheduleModes = {};
    }
}


// ================== INIT PAR DÉFAUT ==================

function initDefaultPhaseSchedule() {
    schedulePhases = {};
    MODES.forEach(mode => {
        schedulePhases[mode] = {};
        for (let h = 0; h < 24; h++) {
            schedulePhases[mode][h] = "Nuit";
        }
    });

    // Travail
    for (let h = 7; h < 9; h++) schedulePhases["Travail"][h] = "Lever";
    for (let h = 9; h < 17; h++) schedulePhases["Travail"][h] = "Absence";
    for (let h = 18; h < 22; h++) schedulePhases["Travail"][h] = "Soirée";
    schedulePhases["Travail"][22] = "Coucher";

    // Maison
    for (let h = 8; h < 12; h++) schedulePhases["Maison"][h] = "Présence";
    for (let h = 14; h < 16; h++) schedulePhases["Maison"][h] = "Présence";
    for (let h = 20; h < 22; h++) schedulePhases["Maison"][h] = "Soirée";
    schedulePhases["Maison"][22] = "Coucher";
}


// ================== SAUVEGARDE (PHASES & MODES) ==================

function savePhaseSchedule() {
    savePlannerConfigToHA();
}

function saveModeSchedule() {
    savePlannerConfigToHA();
}


// ================== MODES ==================

function getModeForDate(date) {
    const key = dateToKey(date);

    // Si c'est un jour férié, renvoyer "Jour férié"
    if (isHoliday(date)) {
        return "Jour férié";
    }

    const stored = scheduleModes[key];
    if (stored && MODES.includes(stored)) return stored;

    const dow = date.getDay();
    if (dow === 0 || dow === 6) return "Maison";
    return "Travail";
}


function getCurrentMode() {
    return getModeForDate(new Date());
}


// ================== UI – PALETTES ==================

function renderPhasePalette() {
    const palette = document.getElementById("phase-palette");
    palette.innerHTML = "";

    PHASES.forEach(phase => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "phase-button";
        if (phase.key === currentPaintPhaseKey) btn.classList.add("active");

        const dot = document.createElement("span");
        dot.className = `color-dot ${phaseKeyToCss(phase.key)}`;
        btn.appendChild(dot);

        const label = document.createElement("span");
        label.textContent = phase.key;
        btn.appendChild(label);

        btn.addEventListener("click", () => {
            currentPaintPhaseKey = phase.key;
            renderPhasePalette();
        });

        palette.appendChild(btn);
    });
}

function renderModePalette() {
    const palette = document.getElementById("mode-palette");
    palette.innerHTML = "";

    const colors = {
        Travail: "mode-travail",
        Maison: "mode-maison",
        Absence: "mode-absence"
    };

    MODES.forEach(mode => {
        const btn = document.createElement("button");
        btn.className = "mode-button";
        if (mode === currentPaintModeKey) btn.classList.add("active");

        const dot = document.createElement("span");
        dot.className = "color-dot " + (colors[mode] || "");
        btn.appendChild(dot);

        const label = document.createElement("span");
        label.textContent = mode;
        btn.appendChild(label);

        btn.addEventListener("click", () => {
            currentPaintModeKey = mode;
            renderModePalette();
        });

        palette.appendChild(btn);
    });
}


// ================== GRILLE PHASES ==================

function renderGridPhases() {
    const grid = document.getElementById("schedule-grid");
    grid.innerHTML = "";

    // Ligne d'en-tête
    const headerRow = document.createElement("div");
    headerRow.className = "grid-row header";

    const modeCell = document.createElement("div");
    modeCell.className = "grid-cell mode-label";
    modeCell.textContent = "Mode / Heure";
    headerRow.appendChild(modeCell);

    for (let h = 0; h < 24; h++) {
        const hourCell = document.createElement("div");
        hourCell.className = "grid-cell hour-label";
        hourCell.textContent = `${h}h`;
        headerRow.appendChild(hourCell);
    }

    grid.appendChild(headerRow);

    // Lignes par mode
    MODES.forEach(mode => {
        const row = document.createElement("div");
        row.className = "grid-row";

        const modeLabel = document.createElement("div");
        modeLabel.className = "grid-cell mode-label";
        modeLabel.textContent = mode;
        row.appendChild(modeLabel);

        for (let h = 0; h < 24; h++) {
            const cell = document.createElement("div");
            cell.className = "grid-cell phase-cell";
            cell.dataset.mode = mode;
            cell.dataset.hour = h;

            const phaseKey = schedulePhases[mode][h];
            applyCellPhase(cell, phaseKey);

            cell.addEventListener("mousedown", (evt) => {
                if (evt.button !== 0) return;
                isDraggingPhase = true;
                paintPhaseCell(cell);
            });

            cell.addEventListener("mouseover", () => {
                if (isDraggingPhase) paintPhaseCell(cell);
            });

            row.appendChild(cell);
        }

        grid.appendChild(row);
    });

    document.addEventListener("mouseup", () => {
        if (isDraggingPhase) {
            isDraggingPhase = false;
            savePhaseSchedule();
            highlightCurrentPhaseCell();
        }
    });
}

function applyCellPhase(cell, phaseKey) {
    PHASES.forEach(p => {
        cell.classList.remove(phaseKeyToCss(p.key));
    });
    cell.classList.remove("phase-current");

    const css = phaseKeyToCss(phaseKey);
    cell.classList.add(css);
    cell.textContent = phaseKey.charAt(0);
}

function paintPhaseCell(cell) {
    const mode = cell.dataset.mode;
    const hour = parseInt(cell.dataset.hour);
    schedulePhases[mode][hour] = currentPaintPhaseKey;
    applyCellPhase(cell, currentPaintPhaseKey);
}


// ================== CALENDRIER ==================

const MONTH_NAMES = [
    "janvier","février","mars","avril","mai","juin",
    "juillet","août","septembre","octobre","novembre","décembre"
];

const WEEKDAY_NAMES = ["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"];

function initCalendar() {
    const today = new Date();
    calYear = today.getFullYear();
    calMonth = today.getMonth();
    renderCalendar();
}

function renderCalendar() {
    const grid = document.getElementById("calendar-grid");
    grid.innerHTML = "";

    const headerRow = document.createElement("div");
    headerRow.className = "calendar-row calendar-weekdays";

    WEEKDAY_NAMES.forEach(name => {
        const cell = document.createElement("div");
        cell.className = "calendar-cell";
        cell.textContent = name;
        headerRow.appendChild(cell);
    });

    grid.appendChild(headerRow);

    document.getElementById("cal-month-label").textContent =
        `${MONTH_NAMES[calMonth]} ${calYear}`;

    const firstDay = new Date(calYear, calMonth, 1);
    const firstDayIndex = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();

    let currentDay = 1 - firstDayIndex;
    const todayKey = dateToKey(new Date());

    for (let week = 0; week < 6; week++) {
        const row = document.createElement("div");
        row.className = "calendar-row";

        for (let dow = 0; dow < 7; dow++) {
            const cell = document.createElement("div");
            cell.className = "calendar-cell";

            if (currentDay >= 1 && currentDay <= daysInMonth) {
                const date = new Date(calYear, calMonth, currentDay);
                const dateKey = dateToKey(date);
                cell.dataset.dateKey = dateKey;

                const number = document.createElement("div");
                number.className = "calendar-day-number";
                number.textContent = currentDay;
                cell.appendChild(number);

                const mode = getModeForDate(date);
                applyCalendarMode(cell, mode);

                if (dateKey === todayKey) {
                    cell.classList.add("today");
                }

                cell.addEventListener("click", () => {
                    scheduleModes[dateKey] = currentPaintModeKey;
                    saveModeSchedule();
                    applyCalendarMode(cell, currentPaintModeKey);

                    if (dateKey === todayKey) {
                        updateCurrentModeLabel();
                        highlightCurrentPhaseCell();
                        syncWithHA();
                    }
                });

            } else {
                cell.classList.add("empty");
            }

            row.appendChild(cell);
            currentDay++;
        }

        grid.appendChild(row);
    }
}

function applyCalendarMode(cell, mode) {
    cell.classList.remove("mode-travail","mode-maison","mode-absence");

    if (mode === "Travail") cell.classList.add("mode-travail");
    else if (mode === "Maison") cell.classList.add("mode-maison");
    else if (mode === "Absence") cell.classList.add("mode-absence");
}


// ================== PHASE COURANTE ==================

function getCurrentHour() {
    return new Date().getHours();
}

function formatTime(now = new Date()) {
    return String(now.getHours()).padStart(2, "0") + ":" +
           String(now.getMinutes()).padStart(2, "0");
}

function getCurrentPhaseForNow() {
    const mode = getCurrentMode();
    const hour = getCurrentHour();
    return schedulePhases[mode][hour];
}

function highlightCurrentPhaseCell() {
    document.querySelectorAll(".phase-current")
        .forEach(el => el.classList.remove("phase-current"));

    const mode = getCurrentMode();
    const hour = getCurrentHour();
    const selector = `.phase-cell[data-mode="${mode}"][data-hour="${hour}"]`;
    const cell = document.querySelector(selector);
    if (cell) cell.classList.add("phase-current");

    document.getElementById("current-phase").textContent =
        getCurrentPhaseForNow();
}

function updateCurrentModeLabel() {
    document.getElementById("current-mode-label").textContent =
        getCurrentMode();
}


// ================== SYNC LIVE AVEC HOME ASSISTANT ==================

async function syncWithHA() {
    const haStatus = document.getElementById("ha-status");
    const phaseKey = getCurrentPhaseForNow();
    const mode    = getCurrentMode();

    const mustSendPhase = phaseKey !== lastSentPhase;
    const mustSendMode  = mode !== lastSentMode;

    if (!mustSendPhase && !mustSendMode) return;

    try {
        if (mustSendMode) {
            await callHAService("input_select","select_option",{
                entity_id: HA_MODE_ENTITY,
                option: mode
            });
            lastSentMode = mode;
        }

        if (mustSendPhase) {
            await callHAService("input_select","select_option",{
                entity_id: HA_PHASE_ENTITY,
                option: phaseKey
            });
            lastSentPhase = phaseKey;
        }

        haStatus.textContent =
            `OK (${formatTime()}) – Mode: ${mode} / Phase: ${phaseKey}`;
        haStatus.style.color = "#15803d";

    } catch (err) {
        haStatus.textContent = "Erreur : " + err.message;
        haStatus.style.color = "#b91c1c";
    }
}

async function callHAService(domain, service, payload) {
    if (!HA_LONG_LIVED_TOKEN) {
        throw new Error("Token manquant dans config.js !");
    }

    // Si HA_BASE_URL est vide → on utilise l’URL relative interne
    const base = HA_BASE_URL && HA_BASE_URL.trim() !== "" 
        ? HA_BASE_URL 
        : "";

    const url = base + `/api/services/${domain}/${service}`;

    console.log("���� Appel HA →", url, payload);

    const resp = await fetch(url, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${HA_LONG_LIVED_TOKEN}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    });

    if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(`HTTP ${resp.status} : ${txt}`);
    }
}



// ================== BOUCLE TEMPS ==================

function startClockAndSyncLoop() {
    const timeLabel = document.getElementById("current-time");

    timeLabel.textContent = formatTime();
    updateCurrentModeLabel();
    highlightCurrentPhaseCell();

    setInterval(() => {
        const now = new Date();
        const dateKey = dateToKey(now);
        timeLabel.textContent = formatTime(now);

        if (dateKey !== lastDateKeySynced) {
            lastDateKeySynced = dateKey;
            renderCalendar();
            updateCurrentModeLabel();
        }

        highlightCurrentPhaseCell();

    }, 10000);

    setInterval(() => {
        highlightCurrentPhaseCell();
        syncWithHA();
    }, 60000);

    lastDateKeySynced = dateToKey(new Date());
    syncWithHA();
}


// ================== INITIALISATION ==================

document.addEventListener("DOMContentLoaded", async () => {

    // Charger d'abord la config HA AVANT l'affichage
    await loadPlannerConfigFromHA();

    // Affichage complet
    renderPhasePalette();
    renderModePalette();
    renderGridPhases();
    initCalendar();

    // Forcer une mise à jour initiale avec les données chargées
    updateCurrentModeLabel();
    highlightCurrentPhaseCell();

    // Navigation mois
    document.getElementById("cal-prev").addEventListener("click", () => {
        calMonth--;
        if (calMonth < 0) { calMonth = 11; calYear--; }
        renderCalendar();
    });

    document.getElementById("cal-next").addEventListener("click", () => {
        calMonth++;
        if (calMonth > 11) { calMonth = 0; calYear++; }
        renderCalendar();
    });

    // Boucle temps
    startClockAndSyncLoop();
});
