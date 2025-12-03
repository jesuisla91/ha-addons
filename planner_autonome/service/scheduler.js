const fetch = require("node-fetch");

// Intervalle de synchronisation (en secondes)
const TICK_SECONDS = 60;

// URLs internes Home Assistant
const HA_SERVICE_URL = "http://supervisor/core/api/services/input_select/select_option";

// Token d’accès interne
const TOKEN = process.env.SUPERVISOR_TOKEN;

// Entités Home Assistant
const ENTITY_MODE = "input_select.mode_journee";
const ENTITY_PHASE = "input_select.phase_journee";

// Import de la logique interne du planner
const { getCurrentMode, getCurrentPhaseForNow, formatTime, dateToKey } = require("./planner-core");  
// Tu remplaces par ce que tu utilises comme fonctions (ou tu intègres directement)

// Fonction générique d’appel Home Assistant API
async function sendToHA(entity, value) {
    if (!TOKEN) {
        console.error("[planner] SUPERVISOR_TOKEN manquant !");
        return;
    }

    const payload = {
        entity_id: entity,
        option: value
    };

    try {
        const resp = await fetch(HA_SERVICE_URL, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${TOKEN}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        if (!resp.ok) {
            const err = await resp.text();
            console.error(`[planner] HA error (${resp.status}):`, err);
        }

    } catch (e) {
        console.error("[planner] Erreur HTTP:", e);
    }
}

// Boucle principale
function startScheduler() {
    console.log(`[planner] Scheduler autonome démarré (tick ${TICK_SECONDS}s).`);

    setInterval(async () => {
        const mode = getCurrentMode();
        const phase = getCurrentPhaseForNow();

        console.log(`[planner] Sync HA → Mode=${mode}, Phase=${phase}`);

        await sendToHA(ENTITY_MODE, mode);
        await sendToHA(ENTITY_PHASE, phase);

    }, TICK_SECONDS * 1000);
}

// Lancer le scheduler
startScheduler();
