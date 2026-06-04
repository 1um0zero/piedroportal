# Piedro Portal — Actielijst voor de klant (voor het ISO 13485-dossier)

**Bijlage bij:** `COMPLIANCE-REPORT.md`
**Datum:** 2026-06-04
**Doel:** Alles wat van Piedro (de klant) afhangt om de Portal productieklaar en juridisch conform te maken. Het ontwikkelteam heeft de technische maatregelen in §1 al geïmplementeerd; de onderstaande punten vereisen commerciële, juridische, configuratie- of operationele beslissingen van Piedro.

> Legenda — **P0** = vereist vóór livegang · **P1** = kort na livegang · **P2** = doorlopend.

---

## Reeds geïmplementeerd door het ontwikkelteam ✅

- Bedrijfslidmaatschapsmodel geünificeerd; toegang tot het bestelproces hersteld.
- Aanmaken van bestellingen verstevigd (server-side validatie van bedrijfseigendom en status).
- Een niet-geauthenticeerd e-mail-endpoint verwijderd; het PDF-voorbeeld-endpoint geauthenticeerd.
- HTML-escaping van alle patiënt-/kliniekwaarden in e-mails.
- Beveiligingsheaders + Content-Security-Policy; portal uitgesloten van zoekmachines (`robots.txt`, `noindex`).
- Profielupdates verplaatst naar een server action met een veld-whitelist (geen zelf-escalatie van rol).
- Juridische pagina's opgezet: **Privacybeleid**, **Gebruiksvoorwaarden**, **Juridische kennisgeving**, plus footer, tabel met subverwerkers en een melding over essentiële cookies.
- Row-Level Security-beleid voor de database voorbereid (`migrations/002_rls_policies.sql`).
- E-mailclient bestand tegen ontbrekende configuratie.

---

## 1. Gegevensbescherming & contracten (juridisch / FG)

| # | Prioriteit | Actie | Waarom |
|---|---|---|---|
| 1 | **P0** | **Onderteken en archiveer verwerkersovereenkomsten (DPA's)** met Vercel, Supabase, Resend en Anthropic. | AVG art. 28; ISO 13485 leveranciersbeheer (7.4). Bewijs voor het dossier. |
| 2 | **P0** | **Anthropic (AI-assistent) verwerkt patiëntgegevens die naar de VS worden gestuurd.** Onderteken de DPA van Anthropic **en activeer zero-data-retention**, óf laat ons de assistent beperken zodat hij geen patiëntidentificatie toont, óf maak hem opt-in per kliniek. | Art. 9 gezondheidsgegevens + internationale doorgifte. |
| 3 | **P0** | **Resend (e-mail) stuurt patiënt-PDF's naar de VS.** Bevestig DPA + doorgiftemechanisme en **verifieer een eigen verzenddomein van Piedro** (DNS-records); stel daarna de variabele `EMAIL_FROM` in. Het huidige afzenderadres is een niet-bezorgbaar testadres. | Bezorgbaarheid + doorgifteconformiteit. |
| 4 | **P0** | **Voer een DPIA uit** (gegevensbeschermingseffectbeoordeling). | Art. 35 — waarschijnlijk verplicht bij grootschalige gezondheidsgegevens. |
| 5 | **P0** | **Bepaal de verwerkingsverantwoordelijke / verwerker-relatie** met klinieken en stel een **DPA-sjabloon** voor hen op. | Bepaalt rechtsgrond & verantwoordelijkheden. |
| 6 | **P1** | Maak het **verwerkingsregister (ROPA)**, een **procedure voor datalekken** (melding binnen 72 uur), een **procedure voor rechten van betrokkenen** en een **bewaarschema** dat de 10-jarige bewaarplicht voor hulpmiddeldossiers afweegt tegen de AVG-opslagbeperking. | Art. 30/33/34; ISO documentbeheer. |
| 7 | **P0** | **Laat een jurist** het Privacybeleid, de Voorwaarden en de Juridische kennisgeving **beoordelen** en **vertaal ze (NL/FR/DE)**. | De pagina's in de app zijn Engelse concepten met placeholders. |

## 2. Configuratie & hosting (Piedro / ontwikkeling samen)

| # | Prioriteit | Actie | Waarom |
|---|---|---|---|
| 8 | **P0** | **Bevestig dat het Supabase-project in een EU-regio staat** (bijv. Frankfurt). Zo niet, plan een migratie. | Datalocatie gezondheidsgegevens. |
| 9 | **P0** | **Vul de placeholders in `src/lib/legal-info.ts`**: juridische naam, vestigingsadres, KvK-nummer, btw-nummer, telefoon, contact-e-mail, FG-e-mail, ISO 13485-certificaatnummer. | Voedt de juridische pagina's & footer. |
| 10 | **P0** | **Stel de productie-omgevingsvariabelen** in Vercel in: `EMAIL_FROM`, `ORDER_NOTIFY_EMAIL`, `ADMIN_NOTIFY_EMAIL`, `NEXT_PUBLIC_CONTACT_EMAIL`, `NEXT_PUBLIC_DPO_EMAIL`, `NEXT_PUBLIC_SITE_URL`, `SUPABASE_WEBHOOK_SECRET`. | Vervangt hard-coded testwaarden. |
| 11 | **P0** | **Voer `migrations/002_rls_policies.sql`** uit in een staging-/branch-database, test de volledige app en pas het daarna toe op productie. | Defence-in-depth (RLS). |
| 12 | **P0** | **Zet de `order-pdfs`-opslag-bucket op Privé** in Supabase. *(In code gedaan: de app levert PDF's nu uitsluitend via kortlevende ondertekende URL's.)* Zolang de bucket openbaar blijft, blijven de objecten via URL bereikbaar. | Patiëntgegevens mogen niet openbaar bereikbaar zijn. |
| 13 | **P1** | **Activeer MFA** voor `piedro_admin`-accounts en bevestig het **wachtwoordbeleid** van Supabase. | Bescherming van bevoorrechte accounts. |
| 14 | **P2** | **Voorzie rate limiting** (Vercel/Upstash) voor inloggen en de AI-assistent. | Brute force / kostenmisbruik. |

## 3. Back-up, continuïteit & assurance (Piedro / operations)

| # | Prioriteit | Actie | Waarom |
|---|---|---|---|
| 15 | **P0** | **Bevestig het Supabase-abonnement en activeer Point-in-Time Recovery (PITR)**; documenteer **RPO/RTO**; plan en **registreer een testherstel**. | ISO-bewaarplicht; auditors eisen bewijs dat back-ups werken. |
| 16 | **P1** | Definieer een back-up-/exportroutine voor de **opslag-buckets** (PDF's, afbeeldingen). | Dossiers moeten provider-incidenten overleven. |
| 17 | **P1** | Schrijf een beknopt **uitwijkplan (disaster recovery)** (provider-uitval, gegevensverlies, sleutelcompromittering). | Bedrijfscontinuïteit. |
| 18 | **P1** | Laat vóór livegang een onafhankelijke **penetratietest** uitvoeren (jaarlijks herhalen). | Onafhankelijke assurance. |

## 4. Branding & keurmerken

| # | Prioriteit | Actie | Waarom |
|---|---|---|---|
| 19 | **P1** | **Bevestig het gebruik van het ISO 13485-keurmerk** met uw certificeringsinstantie (keurmerk + certificaatnummer, volgens hun regels). | Het keurmerk is eigendom van de certificeerder. |
| 20 | **P2** | Plaats **geen** CE/UKCA-markering op de Portal-UI — die hoort op het schoeisel en de documentatie. | Voorkom de suggestie dat de software een CE-gemarkeerd hulpmiddel is. |

---

### Documenten op te nemen in het ISO-dossier
`COMPLIANCE-REPORT.md` (het rapport), deze actielijst, de ondertekende DPA's van subverwerkers, de DPIA, de ROPA, het bewijs van back-up/herstel, de softwarevalidatie-records (zie rapport §4) en het penetratietestrapport.

*Geen juridisch advies — te beoordelen door een FG / juridisch adviseur.*
