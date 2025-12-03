// ============================================================
// Planner – Front-end (lié au backend express du Planner Add-on)
// ============================================================

// ------------------------------------------------------------
// GLOBAL STATE
// ------------------------------------------------------------

let plannerData = null;

let currentMode = null;
let currentPhase = null;

let activeDayMode = "Travail";
let activePhase = "Nuit";

let calDate = new Date();
let calMonth = calDate.getMonth();
let calYear = calDate.getFullYear();

let isMouseDown = false;

// Modes de journée
const MODES = ["Travail", "Maison", "Absence"];

// Phases horaires
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
// API CALLS
// ------------------------------------------------------------

async function loadConfig() {
    try {
        const res = await fetch("/api/config");
        plannerData = await res.json();
        document.getElementById("ha-status").textContent = "Backend OK";
        ensureDefaultStructure();
        renderAll();
    } catch (err) {
        console.error("Erreur GET /api/config :", err);
        document.getElementById("ha-status").textContent = "Backend ERROR";
    }
}

async function saveConfig() {
    try {
        const res = await fetch("/api/config", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(plannerData)
        });
        if (!res.ok) throw new Error();
        document.getElementById("ha-status").textContent = "Sauvegardé ✔️";
    } catch (err) {
        document.getElementById("ha-status").textContent = "Erreur sauvegarde";
        console.error("Erreur POST /api/config :", err);
    }
}

// ------------------------------------------------------------
// ENSURE STRUCTURE
// ------------------------------------------------------------

function ensureDefaultStructure() {
    if (!plannerData.schedules) plannerData.schedules = {};
    if (!plannerData.phases) plannerData.phases = {};

    // Create phase arrays if needed
    for (const mode of MODES) {
        if (!plannerData.phases[mode]) {
            plannerData.phases[mode] = Array(24).fill(null);
        }
    }
}

// ------------------------------------------------------------
// RENDERING
// ------------------------------------------------------------

function renderAll() {
    renderModePalette();
    renderPhasePalette();
    renderCalendar();
    renderScheduleGrid();
    updateClockDisplay();
}

// ------------------------------------------------------------
// MODE PALETTE
// ------------------------------------------------------------

function renderModePalette() {
    const container = document.getElementById("mode-palette");
    container.innerHTML = "";

    MODES.forEach(mode => {
        const div = document.createElement("div");
        div.className = `item mode-${mode}`;
        div.textContent = mode;

        if (activeDayMode === mode) div.classList.add("active");

        div.addEventListener("click", () => {
            activeDayMode = mode;
            renderModePalette();
        });

        container.appendChild(div);
    });
}

// ------------------------------------------------------------
// PHASE PALETTE
// ------------------------------------------------------------

function renderPhasePalette() {
    const container = document.getElementById("phase-palette");
    container.innerHTML = "";

    PHASES.forEach(phase => {
        const div = document.createElement("div");
        div.className = `item ${phase.css}`;
        div.textContent = phase.key;

        if (activePhase === phase.key) div.classList.add("active");

        div.addEventListener("click", () => {
            activePhase = phase.key;
            renderPhasePalette();
        });

        container.appendChild(div);
    });
}

// ------------------------------------------------------------
// CALENDAR
// ------------------------------------------------------------

function renderCalendar() {
    const label = document.getElementById("cal-month-label");
    const grid = document.getElementById("calendar-grid");

    label.textContent = `${monthName(calMonth)} ${calYear}`;
    grid.innerHTML = "";

    const first = new Date(calYear, calMonth, 1);
    const startDay = first.getDay() === 0 ? 6 : first.getDay() - 1;
    const days = new Date(calYear, calMonth + 1, 0).getDate();

    for (let i = 0; i < startDay; i++) {
        grid.appendChild(document.createElement("div"));
    }

    for (let d = 1; d <= days; d++) {
        const div = document.createElement("div");
        div.textContent = d;
        div.className = "calendar-day";

        const dateKey = makeKey(calYear, calMonth + 1, d);
        if (plannerData.schedules[dateKey] === activeDayMode) {
            div.classList.add("selected");
        }

        div.addEventListener("click", () => {
            plannerData.schedules[dateKey] = activeDayMode;
            saveConfig();
            renderCalendar();
        });

        grid.appendChild(div);
    }
}

function monthName(m) {
    return ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"][m];
}

function makeKey(y,m,d) {
    return `${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
}

// ------------------------------------------------------------
// SCHEDULE GRID (PHASES 24H)
// ------------------------------------------------------------

function renderScheduleGrid() {
    const grid = document.getElementById("schedule-grid");
    grid.innerHTML = "";

    const arr = plannerData.phases[activeDayMode];

    for (let h = 0; h < 24; h++) {
        const div = document.createElement("div");
        div.className = "schedule-hour";

        if (arr[h]) {
            const ph = PHASES.find(p => p.key === arr[h]);
            if (ph) div.classList.add(ph.css);
        }

        div.addEventListener("mousedown", () => {
            isMouseDown = true;
            arr[h] = activePhase;
            saveConfig();
            renderScheduleGrid();
        });

        div.addEventListener("mouseover", () => {
            if (isMouseDown) {
                arr[h] = activePhase;
                saveConfig();
                renderScheduleGrid();
            }
        });

        grid.appendChild(div);
    }

    document.addEventListener("mouseup", () => (isMouseDown = false));
}

// ------------------------------------------------------------
// CLOCK (auto refresh)
// ------------------------------------------------------------

function updateClockDisplay() {
    const now = new Date();
    document.getElementById("current-time").textContent = now.toLocaleTimeString("fr-FR");
}

setInterval(updateClockDisplay, 1000);

// Reload full config every 60s
setInterval(loadConfig, 60000);

// ------------------------------------------------------------
// INIT
// ------------------------------------------------------------

document.getElementById("prev-month").onclick = () => {
    if (--calMonth < 0) {
        calMonth = 11;
        calYear--;
    }
    renderCalendar();
};

document.getElementById("next-month").onclick = () => {
    if (++calMonth > 11) {
        calMonth = 0;
        calYear++;
    }
    renderCalendar();
};

loadConfig();
