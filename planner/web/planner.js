// ============================================================
// Planner – Front-end (lié au backend express /api/config)
// ============================================================

// ----- Constantes -----
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

// ----- État global -----
let plannerData = null;

// Mode sélectionné pour affecter le calendrier
let activeCalendarMode = "Travail";

// Phase sélectionnée pour peindre la grille horaire
let activePhase = "Nuit";

// Date affichée dans le calendrier
let calDate = new Date();
let calMonth = calDate.getMonth();      // 0-11
let calYear = calDate.getFullYear();    // 20xx

let isMouseDown = false;

// ----- Raccourcis DOM -----
const elModePalette       = document.getElementById("mode-palette");
const elPhasePalette      = document.getElementById("phase-palette");
const elCalendarGrid      = document.getElementById("calendar-grid");
const elCalMonthLabel     = document.getElementById("cal-month-label");
const elScheduleGrid      = document.getElementById("schedule-grid");
const elCurrentTime       = document.getElementById("current-time");
const elCurrentModeLabel  = document.getElementById("current-mode-label");
const elCurrentPhase      = document.getElementById("current-phase");
const elHaStatus          = document.getElementById("ha-status");

// ------------------------------------------------------------
// Utilitaires
// ------------------------------------------------------------
function pad2(n) {
    return n < 10 ? "0" + n : "" + n;
}

function makeKey(y, m, d) {
    return `${y}-${pad2(m)}-${pad2(d)}`;
}

function monthName(index) {
    return [
        "Janvier","Février","Mars","Avril","Mai","Juin",
        "Juillet","Août","Septembre","Octobre","Novembre","Décembre"
    ][index];
}

function defaultModeForDate(dateObj) {
    const day = dateObj.getDay(); // 0 = dimanche, 6 = samedi
    // Week-end -> Maison, sinon Travail
    if (day === 0 || day === 6) return "Maison";
    return "Travail";
}

function getModeForDateKey(dateKey) {
    if (plannerData.schedules && plannerData.schedules[dateKey]) {
        return plannerData.schedules[dateKey];
    }
    const [y,m,d] = dateKey.split("-").map(Number);
    const dateObj = new Date(y, m - 1, d);
    return defaultModeForDate(dateObj);
}

function phaseByKey(key) {
    return PHASES.find(p => p.key === key) || null;
}

// ------------------------------------------------------------
// Chargement / sauvegarde via API
// ------------------------------------------------------------
async function loadConfig() {
    try {
        const res = await fetch("/api/config");
        plannerData = await res.json();
        elHaStatus.textContent = "Backend OK (chargé)";
        ensureStructure();
        renderAll();
    } catch (err) {
        console.error("Erreur GET /api/config :", err);
        elHaStatus.textContent = "Erreur backend";
    }
}

async function saveConfig() {
    try {
        const res = await fetch("/api/config", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(plannerData)
        });
        if (!res.ok) throw new Error("POST non OK");
        elHaStatus.textContent = "Sauvegardé ✔️";
    } catch (err) {
        console.error("Erreur POST /api/config :", err);
        elHaStatus.textContent = "Erreur sauvegarde";
    }
}

// Assure la structure minimale du JSON
function ensureStructure() {
    if (!plannerData) plannerData = {};
    if (!plannerData.schedules) plannerData.schedules = {};
    if (!plannerData.phases) plannerData.phases = {};
    for (const mode of MODES) {
        if (!plannerData.phases[mode]) {
            plannerData.phases[mode] = new Array(24).fill(null);
        }
    }
}

// ------------------------------------------------------------
// Rendu global
// ------------------------------------------------------------
function renderAll() {
    renderModePalette();
    renderPhasePalette();
    renderCalendar();
    renderScheduleGrid();
    updateCurrentStatus();
}

// ------------------------------------------------------------
// Palette des modes (pour le calendrier)
// ------------------------------------------------------------
function renderModePalette() {
    elModePalette.innerHTML = "";

    MODES.forEach(mode => {
        const div = document.createElement("div");
        div.className = "palette-item " + "mode-" + mode;
        div.textContent = mode;
        if (activeCalendarMode === mode) {
            div.classList.add("active");
        }
        div.addEventListener("click", () => {
            activeCalendarMode = mode;
            renderModePalette();
        });
        elModePalette.appendChild(div);
    });
}

// ------------------------------------------------------------
// Palette des phases (pour la grille horaire)
// ------------------------------------------------------------
function renderPhasePalette() {
    elPhasePalette.innerHTML = "";

    PHASES.forEach(phase => {
        const div = document.createElement("div");
        div.className = "palette-item " + phase.css;
        div.textContent = phase.key;
        if (activePhase === phase.key) {
            div.classList.add("active");
        }
        div.addEventListener("click", () => {
            activePhase = phase.key;
            renderPhasePalette();
        });
        elPhasePalette.appendChild(div);
    });
}

// ------------------------------------------------------------
// Calendrier (affectation des modes par jour)
// ------------------------------------------------------------
function renderCalendar() {
    elCalMonthLabel.textContent = `${monthName(calMonth)} ${calYear}`;
    elCalendarGrid.innerHTML = "";

    const first = new Date(calYear, calMonth, 1);
    const startDay = (first.getDay() + 6) % 7; // Lundi=0, Dimanche=6
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();

    // Cases vides avant le 1
    for (let i = 0; i < startDay; i++) {
        const emptyDiv = document.createElement("div");
        elCalendarGrid.appendChild(emptyDiv);
    }

    for (let d = 1; d <= daysInMonth; d++) {
        const dateKey = makeKey(calYear, calMonth + 1, d);
        const div = document.createElement("div");
        div.className = "calendar-day";
        div.textContent = d;

        const effectiveMode = getModeForDateKey(dateKey);
        if (effectiveMode) {
            div.classList.add("mode-" + effectiveMode);
        }

        div.addEventListener("click", () => {
            plannerData.schedules[dateKey] = activeCalendarMode;
            saveConfig();
            renderCalendar();
            updateCurrentStatus();
        });

        elCalendarGrid.appendChild(div);
    }
}

// ------------------------------------------------------------
// Grille 3 lignes x 24 heures (phases par mode)
// ------------------------------------------------------------
function renderScheduleGrid() {
    elScheduleGrid.innerHTML = "";

    for (const mode of MODES) {
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
            cell.dataset.hour = String(h);

            const phaseKey = arr[h];
            if (phaseKey) {
                applyPhaseCss(cell, phaseKey);
            }

            cell.addEventListener("mousedown", () => {
                isMouseDown = true;
                setPhaseOnCell(cell, mode, h);
            });

            cell.addEventListener("mouseover", () => {
                if (isMouseDown) {
                    setPhaseOnCell(cell, mode, h);
                }
            });

            row.appendChild(cell);
        }

        elScheduleGrid.appendChild(row);
    }

    // Gestion du relâchement souris globale
    document.addEventListener("mouseup", () => {
        isMouseDown = false;
    });
}

function clearPhaseCss(cell) {
    for (const ph of PHASES) {
        cell.classList.remove(ph.css);
    }
}

function applyPhaseCss(cell, phaseKey) {
    clearPhaseCss(cell);
    const ph = phaseByKey(phaseKey);
    if (ph) {
        cell.classList.add(ph.css);
    }
}

function setPhaseOnCell(cell, mode, hour) {
    plannerData.phases[mode][hour] = activePhase;
    applyPhaseCss(cell, activePhase);
    saveConfig();
    updateCurrentStatus();
}

// ------------------------------------------------------------
// Statut courant : heure, mode du jour, phase actuelle
// ------------------------------------------------------------
function updateClockDisplay() {
    const now = new Date();
    elCurrentTime.textContent = now.toLocaleTimeString("fr-FR");
}

function updateCurrentStatus() {
    const now = new Date();
    const key = makeKey(now.getFullYear(), now.getMonth() + 1, now.getDate());
    const modeToday = getModeForDateKey(key);
    elCurrentModeLabel.textContent = modeToday || "---";

    const hour = now.getHours();
    const arr = plannerData.phases[modeToday] || [];
    const phaseKey = arr[hour] || null;
    elCurrentPhase.textContent = phaseKey || "---";

    // On peut aussi l'enregistrer dans le JSON si tu veux
    plannerData.current = {
        date: key,
        time: now.toISOString(),
        mode: modeToday,
        hour: hour,
        phase: phaseKey
    };
}

// Horloge temps réel
setInterval(() => {
    updateClockDisplay();
    updateCurrentStatus();
}, 1000);

// Rechargement complet de la config toutes les 60s
setInterval(() => {
    loadConfig();
}, 60000);

// ------------------------------------------------------------
// Navigation calendrier
// ------------------------------------------------------------
document.getElementById("cal-prev").addEventListener("click", () => {
    calMonth--;
    if (calMonth < 0) {
        calMonth = 11;
        calYear--;
    }
    renderCalendar();
});

document.getElementById("cal-next").addEventListener("click", () => {
    calMonth++;
    if (calMonth > 11) {
        calMonth = 0;
        calYear++;
    }
    renderCalendar();
});

// ------------------------------------------------------------
// Init
// ------------------------------------------------------------
updateClockDisplay();
loadConfig();
