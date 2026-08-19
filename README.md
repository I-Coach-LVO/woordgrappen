# Woordgrappen

Een kleine Nederlandstalige website die bij ieder bezoek een willekeurige woordgrap uit Supabase toont. Met **Nog eentje** verschijnt direct een andere grap.

Bezoekers kunnen een account maken met alleen een gebruikersnaam en wachtwoord. Supabase houdt per gebruiker bij welke grappen al zijn getoond en hoe vaak. De browser gebruikt uitsluitend een publieke Supabase-sleutel; accountregistratie met verhoogde rechten gebeurt in een afgeschermde Edge Function. De tabellen zijn met Row Level Security beveiligd.

Omdat er geen e-mailadres wordt opgeslagen, is automatisch wachtwoordherstel per e-mail niet mogelijk.

De website bevat een PWA-manifest en appiconen, zodat hij als **Mop van de dag** op het beginscherm kan worden geïnstalleerd. Er is bewust geen offline modus of pushfunctionaliteit toegevoegd.
