const SUPABASE_URL = "https://ylskdwvtxuionyuzuyfs.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_Xj_RHfxvs358TdjWjqlQwA_PgRhV-6k";
const SESSIE_SLEUTEL = "woordgrappen-sessie";
const INTERN_ACCOUNT_DOMEIN = "accounts.woordgrappen.invalid";
const INSTALLATIEMELDING_SLEUTEL = "woordgrappen-installatiemelding-gesloten";

const elementen = {
  grap: document.querySelector("#grap"),
  status: document.querySelector("#status"),
  volgende: document.querySelector("#volgende"),
  statistiek: document.querySelector("#statistiek"),
  welkom: document.querySelector("#welkom"),
  inloggen: document.querySelector("#inloggen"),
  uitloggen: document.querySelector("#uitloggen"),
  dialoog: document.querySelector("#auth-dialoog"),
  sluitAuth: document.querySelector("#sluit-auth"),
  authTitel: document.querySelector("#auth-titel"),
  authUitleg: document.querySelector("#auth-uitleg"),
  authStatus: document.querySelector("#auth-status"),
  tabLogin: document.querySelector("#tab-login"),
  tabRegistratie: document.querySelector("#tab-registratie"),
  loginFormulier: document.querySelector("#login-formulier"),
  registratieFormulier: document.querySelector("#registratie-formulier"),
  installatiemelding: document.querySelector("#installatiemelding"),
  installatieUitleg: document.querySelector("#installatie-uitleg"),
  sluitInstallatie: document.querySelector("#sluit-installatie"),
  installeerApp: document.querySelector("#installeer-app"),
};

let woordgrappen = [];
let huidigeGrap = null;
let sessie = null;
let profiel = null;
let weergaveTellingen = new Map();
let installatiePrompt = null;

function draaitAlsApp() {
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

function isMobielApparaat() {
  return /Android|iPhone|iPod/i.test(navigator.userAgent) ||
    (/Macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
}

function isAppleMobiel() {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (/Macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
}

function installatiemeldingGesloten() {
  return localStorage.getItem(INSTALLATIEMELDING_SLEUTEL) === "ja";
}

function verbergInstallatiemelding(onthouden = false) {
  elementen.installatiemelding.hidden = true;
  if (onthouden) localStorage.setItem(INSTALLATIEMELDING_SLEUTEL, "ja");
}

function toonInstallatiemelding() {
  if (!isMobielApparaat() || draaitAlsApp() || installatiemeldingGesloten()) return;

  if (isAppleMobiel()) {
    elementen.installatieUitleg.textContent =
      "Open deze pagina in Safari, tik op Delen en kies ‘Zet op beginscherm’.";
    elementen.installeerApp.hidden = true;
  } else if (installatiePrompt) {
    elementen.installatieUitleg.textContent =
      "Installeer deze webapp en open hem voortaan direct vanaf je beginscherm.";
    elementen.installeerApp.hidden = false;
  } else {
    elementen.installatieUitleg.textContent =
      "Open het Chrome-menu (⋮) en kies ‘App installeren’ of ‘Toevoegen aan startscherm’.";
    elementen.installeerApp.hidden = true;
  }
  elementen.installatiemelding.hidden = false;
}

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  installatiePrompt = event;
  toonInstallatiemelding();
});

window.addEventListener("appinstalled", () => {
  installatiePrompt = null;
  verbergInstallatiemelding(true);
});

function basisHeaders() {
  return { apikey: SUPABASE_PUBLISHABLE_KEY, "Content-Type": "application/json" };
}

function ingelogdeHeaders() {
  return { ...basisHeaders(), Authorization: `Bearer ${sessie.access_token}` };
}

function normaliseerGebruikersnaam(waarde) {
  return String(waarde).trim().toLowerCase();
}

function isGeldigeGebruikersnaam(gebruikersnaam) {
  return /^[a-z0-9._-]{3,24}$/.test(gebruikersnaam);
}

function internAccountadres(gebruikersnaam) {
  return `${gebruikersnaam}@${INTERN_ACCOUNT_DOMEIN}`;
}

async function leesJson(response) {
  const tekst = await response.text();
  const data = tekst ? JSON.parse(tekst) : null;
  if (!response.ok) {
    throw new Error(data?.msg || data?.message || data?.error_description || "Er ging iets mis.");
  }
  return data;
}

function bewaarSessie(nieuweSessie) {
  sessie = {
    ...nieuweSessie,
    expires_at:
      nieuweSessie.expires_at ||
      Math.floor(Date.now() / 1000) + Number(nieuweSessie.expires_in || 3600),
  };
  localStorage.setItem(SESSIE_SLEUTEL, JSON.stringify(sessie));
}

function verwijderSessie() {
  sessie = null;
  profiel = null;
  weergaveTellingen = new Map();
  localStorage.removeItem(SESSIE_SLEUTEL);
}

async function haalGebruikerOp() {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: ingelogdeHeaders(),
  });
  sessie.user = await leesJson(response);
  localStorage.setItem(SESSIE_SLEUTEL, JSON.stringify(sessie));
}

async function verversSessie() {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: basisHeaders(),
    body: JSON.stringify({ refresh_token: sessie.refresh_token }),
  });
  bewaarSessie(await leesJson(response));
}

async function herstelSessie() {
  const callback = new URLSearchParams(window.location.hash.slice(1));
  const callbackToken = callback.get("access_token");

  if (callbackToken) {
    bewaarSessie({
      access_token: callbackToken,
      refresh_token: callback.get("refresh_token"),
      expires_in: callback.get("expires_in"),
      token_type: callback.get("token_type"),
    });
    history.replaceState(null, "", window.location.pathname);
  } else {
    try {
      sessie = JSON.parse(localStorage.getItem(SESSIE_SLEUTEL));
    } catch {
      verwijderSessie();
    }
  }

  if (!sessie?.access_token) return;

  try {
    if (Number(sessie.expires_at) <= Math.floor(Date.now() / 1000) + 60) {
      await verversSessie();
    }
    if (!sessie.user) await haalGebruikerOp();
    await laadPersoonlijkeGegevens();
  } catch (error) {
    console.error(error);
    verwijderSessie();
  }
}

async function laadPersoonlijkeGegevens() {
  const [profielResponse, weergavenResponse] = await Promise.all([
    fetch(
      `${SUPABASE_URL}/rest/v1/profielen?select=weergavenaam&id=eq.${encodeURIComponent(sessie.user.id)}`,
      { headers: ingelogdeHeaders() },
    ),
    fetch(`${SUPABASE_URL}/rest/v1/grap_weergaven?select=grap_id`, {
      headers: ingelogdeHeaders(),
    }),
  ]);
  const profielen = await leesJson(profielResponse);
  const weergaven = await leesJson(weergavenResponse);
  profiel = profielen[0] || { weergavenaam: "grappenliefhebber" };
  weergaveTellingen = new Map();
  for (const { grap_id: grapId } of weergaven) {
    weergaveTellingen.set(grapId, (weergaveTellingen.get(grapId) || 0) + 1);
  }
}

function kiesWillekeurigeGrap() {
  let kandidaten = woordgrappen.filter(({ id }) => id !== huidigeGrap?.id);
  if (sessie) {
    const laagsteAantal = Math.min(
      ...kandidaten.map(({ id }) => weergaveTellingen.get(id) || 0),
    );
    kandidaten = kandidaten.filter(
      ({ id }) => (weergaveTellingen.get(id) || 0) === laagsteAantal,
    );
  }
  return kandidaten[Math.floor(Math.random() * kandidaten.length)];
}

async function registreerWeergave(grapId) {
  if (!sessie) return;
  const response = await fetch(`${SUPABASE_URL}/rest/v1/grap_weergaven`, {
    method: "POST",
    headers: { ...ingelogdeHeaders(), Prefer: "return=minimal" },
    body: JSON.stringify({ gebruiker_id: sessie.user.id, grap_id: grapId }),
  });
  await leesJson(response);
  weergaveTellingen.set(grapId, (weergaveTellingen.get(grapId) || 0) + 1);
}

function werkStatistiekBij() {
  if (!sessie || !huidigeGrap) {
    elementen.statistiek.hidden = true;
    return;
  }
  const gezien = woordgrappen.filter(({ id }) => (weergaveTellingen.get(id) || 0) > 0).length;
  const aantal = weergaveTellingen.get(huidigeGrap.id) || 0;
  elementen.statistiek.textContent =
    `${gezien} van ${woordgrappen.length} gezien · deze grap ${aantal}×`;
  elementen.statistiek.hidden = false;
}

async function toonVolgendeGrap() {
  elementen.volgende.disabled = true;
  elementen.status.textContent = "";
  try {
    huidigeGrap = kiesWillekeurigeGrap();
    elementen.grap.textContent = huidigeGrap.grap;
    await registreerWeergave(huidigeGrap.id);
    werkStatistiekBij();
  } catch (error) {
    elementen.status.textContent = "De grap verscheen, maar je kijkhistorie kon niet worden bijgewerkt.";
    console.error(error);
  } finally {
    elementen.volgende.disabled = false;
  }
}

function werkAccountweergaveBij() {
  const ingelogd = Boolean(sessie?.user);
  elementen.inloggen.hidden = ingelogd;
  elementen.uitloggen.hidden = !ingelogd;
  elementen.welkom.hidden = !ingelogd;
  elementen.welkom.textContent = ingelogd
    ? `Hoi, ${profiel?.weergavenaam || "grappenliefhebber"}!`
    : "";
  werkStatistiekBij();
}

function kiesAuthTab(tab) {
  const isLogin = tab === "login";
  elementen.loginFormulier.hidden = !isLogin;
  elementen.registratieFormulier.hidden = isLogin;
  elementen.tabLogin.classList.toggle("actief", isLogin);
  elementen.tabRegistratie.classList.toggle("actief", !isLogin);
  elementen.tabLogin.setAttribute("aria-selected", String(isLogin));
  elementen.tabRegistratie.setAttribute("aria-selected", String(!isLogin));
  elementen.authTitel.textContent = isLogin ? "Welkom terug." : "Maak je account.";
  elementen.authUitleg.textContent = isLogin
    ? "Log in om verder te gaan met jouw persoonlijke reeks."
    : "Kies je naam en ontvang alleen grappen die voor jou nog zo vers mogelijk zijn.";
  elementen.authStatus.textContent = "";
}

function vertaalAuthFout(error) {
  const bericht = error.message.toLowerCase();
  if (bericht.includes("invalid login credentials")) return "Gebruikersnaam of wachtwoord klopt niet.";
  if (bericht.includes("username already exists")) return "Deze gebruikersnaam is al in gebruik.";
  if (bericht.includes("invalid username")) return "Gebruik 3–24 kleine letters, cijfers, punten, streepjes of underscores.";
  if (bericht.includes("password")) return "Kies een wachtwoord van minimaal 8 tekens.";
  return "Inloggen of registreren lukte niet. Probeer het opnieuw.";
}

async function verwerkLogin(event) {
  event.preventDefault();
  elementen.authStatus.textContent = "Even inloggen…";
  const formulier = new FormData(event.currentTarget);
  try {
    const gebruikersnaam = normaliseerGebruikersnaam(formulier.get("gebruikersnaam"));
    if (!isGeldigeGebruikersnaam(gebruikersnaam)) throw new Error("invalid username");
    const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: basisHeaders(),
      body: JSON.stringify({
        email: internAccountadres(gebruikersnaam),
        password: formulier.get("password"),
      }),
    });
    bewaarSessie(await leesJson(response));
    await laadPersoonlijkeGegevens();
    werkAccountweergaveBij();
    elementen.dialoog.close();
    event.currentTarget.reset();
    await toonVolgendeGrap();
  } catch (error) {
    elementen.authStatus.textContent = vertaalAuthFout(error);
  }
}

async function verwerkRegistratie(event) {
  event.preventDefault();
  elementen.authStatus.textContent = "Account wordt gemaakt…";
  const formulier = new FormData(event.currentTarget);
  try {
    const gebruikersnaam = normaliseerGebruikersnaam(formulier.get("gebruikersnaam"));
    if (!isGeldigeGebruikersnaam(gebruikersnaam)) throw new Error("invalid username");
    const password = formulier.get("password");
    const response = await fetch(`${SUPABASE_URL}/functions/v1/register-username`, {
      method: "POST",
      headers: basisHeaders(),
      body: JSON.stringify({
        username: gebruikersnaam,
        password,
      }),
    });
    await leesJson(response);
    const loginResponse = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: basisHeaders(),
      body: JSON.stringify({ email: internAccountadres(gebruikersnaam), password }),
    });
    bewaarSessie(await leesJson(loginResponse));
    await laadPersoonlijkeGegevens();
    werkAccountweergaveBij();
    elementen.dialoog.close();
    await toonVolgendeGrap();
    event.currentTarget.reset();
  } catch (error) {
    elementen.authStatus.textContent = vertaalAuthFout(error);
  }
}

async function logUit() {
  elementen.uitloggen.disabled = true;
  try {
    await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
      method: "POST",
      headers: ingelogdeHeaders(),
    });
  } finally {
    verwijderSessie();
    werkAccountweergaveBij();
    elementen.uitloggen.disabled = false;
    await toonVolgendeGrap();
  }
}

async function start() {
  try {
    const grappenResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/woordgrappen?select=id%2Cgrap&order=id.asc`,
      { headers: basisHeaders() },
    );
    woordgrappen = await leesJson(grappenResponse);
    if (woordgrappen.length < 2) {
      throw new Error("Er staan niet genoeg woordgrappen in de database");
    }
    await herstelSessie();
    werkAccountweergaveBij();
    await toonVolgendeGrap();
  } catch (error) {
    elementen.grap.textContent = "Ai, de woordgrappen liggen even dubbel.";
    elementen.status.textContent = "Probeer de pagina straks opnieuw.";
    console.error(error);
  }
}

elementen.volgende.addEventListener("click", toonVolgendeGrap);
elementen.inloggen.addEventListener("click", () => {
  kiesAuthTab("login");
  elementen.dialoog.showModal();
});
elementen.uitloggen.addEventListener("click", logUit);
elementen.sluitAuth.addEventListener("click", () => elementen.dialoog.close());
elementen.tabLogin.addEventListener("click", () => kiesAuthTab("login"));
elementen.tabRegistratie.addEventListener("click", () => kiesAuthTab("registratie"));
elementen.loginFormulier.addEventListener("submit", verwerkLogin);
elementen.registratieFormulier.addEventListener("submit", verwerkRegistratie);
elementen.dialoog.addEventListener("click", (event) => {
  if (event.target === elementen.dialoog) elementen.dialoog.close();
});
elementen.sluitInstallatie.addEventListener("click", () => verbergInstallatiemelding(true));
elementen.installeerApp.addEventListener("click", async () => {
  if (!installatiePrompt) return;
  await installatiePrompt.prompt();
  await installatiePrompt.userChoice;
  installatiePrompt = null;
  verbergInstallatiemelding(true);
});

start();
window.setTimeout(toonInstallatiemelding, 900);
