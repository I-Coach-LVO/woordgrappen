# Woordgrappen

Een kleine Nederlandstalige website die bij ieder bezoek een willekeurige woordgrap uit Supabase toont. Met **Nog eentje** verschijnt direct een andere grap.

Bezoekers kunnen een account maken met alleen een gebruikersnaam en wachtwoord. Supabase houdt per gebruiker bij welke grappen al zijn getoond en hoe vaak. De browser gebruikt uitsluitend een publieke Supabase-sleutel; accountregistratie met verhoogde rechten gebeurt in een afgeschermde Edge Function. De tabellen zijn met Row Level Security beveiligd.

Omdat er geen e-mailadres wordt opgeslagen, is automatisch wachtwoordherstel per e-mail niet mogelijk.

De website bevat een PWA-manifest en appiconen, zodat hij als **Mop van de dag** op het beginscherm kan worden geïnstalleerd. Er is bewust geen offline modus of pushfunctionaliteit toegevoegd.

## AI-woordgrappen

Alleen de expliciet aangewezen beheerders kunnen een onderwerp invoeren en via OpenRouter een nieuwe woordgrap laten maken met Mistral Nemo. De controle vindt zowel in de Supabase Edge Function als via Row Level Security plaats. Nieuwe grappen komen in `public.woordgrappen` en zijn daarna voor iedereen zichtbaar.

Zet voor lokaal gebruik de volgende waarden in `.env.local`:

```text
OPENROUTER_API_KEY=
OPENROUTER_MODEL=mistralai/mistral-nemo
```

`.env.local` wordt door Git genegeerd. Voor de live Edge Function moeten dezelfde waarden handmatig worden toegevoegd via **Supabase → Edge Functions → Secrets**. Zet de sleutel nooit in `app.js`, GitHub of andere openbare code.
