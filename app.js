const SUPABASE_URL = "https://ylskdwvtxuionyuzuyfs.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_Xj_RHfxvs358TdjWjqlQwA_PgRhV-6k";

const grapElement = document.querySelector("#grap");
const statusElement = document.querySelector("#status");
const volgendeKnop = document.querySelector("#volgende");

let woordgrappen = [];
let huidigeId = null;

function toonWillekeurigeGrap() {
  const kandidaten = woordgrappen.filter(({ id }) => id !== huidigeId);
  const keuze = kandidaten[Math.floor(Math.random() * kandidaten.length)];

  huidigeId = keuze.id;
  grapElement.textContent = keuze.grap;
  statusElement.textContent = "";
}

async function laadWoordgrappen() {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/woordgrappen?select=id%2Cgrap&order=id.asc`,
      {
        headers: {
          apikey: SUPABASE_PUBLISHABLE_KEY,
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Supabase gaf status ${response.status}`);
    }

    woordgrappen = await response.json();

    if (woordgrappen.length < 2) {
      throw new Error("Er staan niet genoeg woordgrappen in de database");
    }

    toonWillekeurigeGrap();
    volgendeKnop.disabled = false;
  } catch (error) {
    grapElement.textContent = "Ai, de woordgrappen liggen even dubbel.";
    statusElement.textContent = "Probeer de pagina straks opnieuw.";
    console.error(error);
  }
}

volgendeKnop.addEventListener("click", toonWillekeurigeGrap);
laadWoordgrappen();
