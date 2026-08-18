import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const TOEGESTANE_ORIGIN = "https://i-coach-lvo.github.io";
const INTERN_DOMEIN = "accounts.woordgrappen.invalid";

function headers(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": origin === TOEGESTANE_ORIGIN ? origin : TOEGESTANE_ORIGIN,
    "Access-Control-Allow-Headers": "apikey, authorization, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
    Vary: "Origin",
  };
}

function antwoord(status: number, body: Record<string, unknown>, origin: string | null) {
  return new Response(JSON.stringify(body), { status, headers: headers(origin) });
}

Deno.serve(async (request: Request) => {
  const origin = request.headers.get("origin");
  if (request.method === "OPTIONS") {
    return origin === TOEGESTANE_ORIGIN
      ? new Response(null, { status: 204, headers: headers(origin) })
      : antwoord(403, { message: "Niet toegestaan." }, origin);
  }
  if (request.method !== "POST" || origin !== TOEGESTANE_ORIGIN) {
    return antwoord(403, { message: "Niet toegestaan." }, origin);
  }

  let invoer: { username?: unknown; password?: unknown };
  try {
    invoer = await request.json();
  } catch {
    return antwoord(400, { message: "Ongeldige aanvraag." }, origin);
  }

  const username = String(invoer.username ?? "").trim().toLowerCase();
  const password = String(invoer.password ?? "");
  if (!/^[a-z0-9._-]{3,24}$/.test(username)) {
    return antwoord(400, { message: "Invalid username." }, origin);
  }
  if (password.length < 8 || password.length > 72) {
    return antwoord(400, { message: "Password must contain 8 to 72 characters." }, origin);
  }

  const secretKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  if (!secretKey || !supabaseUrl) {
    return antwoord(500, { message: "Registratie is tijdelijk niet beschikbaar." }, origin);
  }

  const admin = createClient(supabaseUrl, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error } = await admin.auth.admin.createUser({
    email: `${username}@${INTERN_DOMEIN}`,
    password,
    email_confirm: true,
    user_metadata: { weergavenaam: username, gebruikersnaam: username },
  });

  if (error) {
    const bestaatAl = /already|registered|exists/i.test(error.message);
    return antwoord(
      bestaatAl ? 409 : 500,
      { message: bestaatAl ? "Username already exists." : "Account maken is niet gelukt." },
      origin,
    );
  }
  return antwoord(201, { created: true }, origin);
});
