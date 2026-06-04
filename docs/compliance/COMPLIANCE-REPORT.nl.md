# Piedro Portal — Rapport over conformiteit, beveiliging & kwaliteit

**Opgesteld voor:** Opname in het ISO 13485 technisch dossier van Piedro International
**Systeem:** Piedro Portal — B2B-bestelportaal voor orthopedisch maatwerkschoeisel
**Documenttype:** Conformiteitsbeoordeling software / infrastructuur
**Versie:** 1.0
**Datum:** 2026-06-04
**Status:** Beoordeling vóór productie, met hiaatanalyse

> **Disclaimer.** Dit is een *technische* conformiteitsbeoordeling, opgesteld door het ontwikkelteam. Het is **geen juridisch advies**. De juridische documenten en gegevensbeschermingsconclusies (rollen verwerkingsverantwoordelijke/verwerker, rechtsgronden, bewaartermijnen, uitkomst DPIA) moeten vóór livegang worden beoordeeld en goedgekeurd door een gekwalificeerde functionaris voor gegevensbescherming (FG) en/of juridisch adviseur.

---

## 1. Systeemoverzicht

De Piedro Portal is een **besloten, geauthenticeerde** webapplicatie (geen anoniem bestellen) die door orthopedische klinieken, clinici en podologen wordt gebruikt om de Piedro-catalogus te bekijken en bestellingen te plaatsen voor **orthopedisch maatwerkschoeisel** voor **met naam genoemde patiënten**.

| Laag | Technologie | Aanbieder | Rol |
|---|---|---|---|
| Frontend / SSR | Next.js 16 (App Router), React 19 | Vercel | Hosting, CDN, serverless functions |
| Database | PostgreSQL | Supabase | Bestellingen, profielen, bedrijven, catalogus |
| Authenticatie | Supabase Auth (GoTrue) | Supabase | E-mail/wachtwoord, sessies |
| Bestandsopslag | Supabase Storage | Supabase | Productafbeeldingen, bestel-PDF's, avatars |
| Transactionele e-mail | Resend API | Resend | Bestelmeldingen met PDF-bijlagen |
| AI-assistent in de app | Claude (Haiku) | Anthropic | Conversatie voor zoeken/dupliceren van bestellingen |

### 1.1 Categorieën verwerkte persoonsgegevens

| Gegevens | Betrokkene | AVG-classificatie |
|---|---|---|
| E-mail, naam, geslacht, avatar | Clinicus (portalgebruiker) | Gewone persoonsgegevens (art. 4) |
| Patiëntnaam / referentie / notitie clinicus | **Patiënt** | **Bijzondere categorie — gezondheidsgegevens (art. 9)** |
| Orthopedische metingen & "additions" (inlegzolen, hakverhogingen, deformiteitscorrecties, maten per voet) | **Patiënt** | **Bijzondere categorie — gezondheidsgegevens (art. 9)** |
| Bedrijf, ERP-code, land | Kliniek (rechtspersoon) | Bedrijfsgegevens |

De aanwezigheid van **patiëntgezondheidsgegevens (artikel 9 AVG)** is de belangrijkste bepalende factor voor de onderstaande verplichtingen. Dit verhoogt de lat van "standaard webapp" naar "verwerking van bijzondere categorieën gegevens", wat strengere beveiliging, een waarschijnlijke **DPIA** en zorgvuldige beheersing van **internationale doorgiften** vereist.

---

## 2. Toepasselijke normen en juridische referenties

### 2.1 Gegevensbescherming (primair)

| Referentie | Van toepassing omdat | Belangrijkste verplichtingen voor deze portal |
|---|---|---|
| **Verordening (EU) 2016/679 (AVG)** | EU-betrokkenen (NL + EU-klinieken & patiënten) | Rechtsgrond (art. 6) + voorwaarde art. 9(2) voor gezondheidsgegevens; transparantie (art. 13–14); beveiliging (art. 32); verwerkersovereenkomsten (art. 28); ROPA (art. 30); melding datalek 72 u (art. 33–34); DPIA (art. 35) |
| **UK GDPR + Data Protection Act 2018** | VK-klinieken & patiënten | Equivalent aan AVG; ICO is toezichthouder; VK-doorgifteregels (IDTA/Addendum) |
| **NL: UAVG (Uitvoeringswet AVG)** | Nederlandse vestiging / klinieken | Nederlandse uitvoering van de AVG; Autoriteit Persoonsgegevens (AP) is toezichthouder |
| **ePrivacy-richtlijn 2002/58/EG (cookieregels)** | EU-bezoekers | Toestemming voor niet-essentiële cookies/opslag. *Huidige status: alleen essentiële auth-cookies → toestemmingsbanner niet strikt vereist, maar een cookiemelding wordt aanbevolen.* |
| **EU–VS Data Privacy Framework / SCC's** | VS-subverwerkers (Vercel, Resend, Anthropic) | Geldig doorgiftemechanisme vereist voor persoonsgegevens die de EER/VK verlaten |

### 2.2 Medisch hulpmiddel & kwaliteitssysteem

| Referentie | Relevantie |
|---|---|
| **ISO 13485:2016** (klant is gecertificeerd) | De portal is **software die in het kwaliteitsmanagementsysteem wordt gebruikt** → valt onder **clausule 4.1.6 (validatie van QMS-software)** en **clausule 4.2 (document- & documentbeheer)**. De portal is een *recordgenererend hulpmiddel* in het bestel-/realisatieproces (clausule 7). |
| **Verordening (EU) 2017/745 (MDR)** | Orthopedisch maatwerkschoeisel is doorgaans een **maatwerkhulpmiddel (bijlage XIII)**. De vastgelegde bestelling is in feite de **voorschrift/verklaring (bijlage XIII §1)**. Bewaartermijn van die documentatie: **min. 10 jaar** nadat het laatste hulpmiddel in de handel is gebracht. |
| **UK MDR 2002 (gewijzigd)** | Post-Brexit equivalent voor in het VK geleverde maatwerkhulpmiddelen; UKCA-markeringsregime. |
| **ISO 14971** (risicomanagement) / **IEC 62304** (levenscyclus medische-hulpmiddelsoftware) | *Waarschijnlijk buiten scope voor de portal zelf* — de portal heeft **geen medisch doel** (stelt geen diagnose, meet niet, bepaalt geen therapie; dat doet de clinicus). Het is een bestel-/administratief hulpmiddel, dus **geen medisch hulpmiddel**, en IEC 62304 is niet van toepassing. Leg deze bepaling **schriftelijk vast** (een korte "kwalificatieverklaring") in het dossier. ISO 14971 is van toepassing op het *schoeisel*, niet op de portal. |

### 2.3 Informatiebeveiliging & kwaliteit (aanbevolen / best practice)

| Referentie | Waarom het hier van belang is |
|---|---|
| **ISO/IEC 27001 / 27002** | Branchebasis voor een ISMS. Ook als Piedro niet 27001-gecertificeerd is, toont aansluiting bij bijlage A "passende technische maatregelen" aan onder AVG art. 32. De onderstaande cloudaanbieders zijn 27001-gecertificeerd; Piedro kan dat aanhalen. |
| **ISO/IEC 27701** | Privacy-uitbreiding op 27001 — nuttig bewijs van AVG-verantwoording. |
| **ISO/IEC 27018** | Bescherming van PII in publieke cloud (Supabase/Vercel sluiten hierop aan). |
| **EN 301 549 / WCAG 2.1 AA** + **Europese Toegankelijkheidsakte (Richtlijn 2019/882)** | Toegankelijkheid. De EAA (van kracht juni 2025) richt zich vooral op B2C e-commerce; een B2B klinisch portaal is lager risico, maar WCAG 2.1 AA is een redelijk doel en wordt in zorginkoop steeds vaker verwacht. |

### 2.4 Certificeringen van aanbieders die Piedro in het dossier kan aanhalen

- **Vercel** — SOC 2 Type II; ISO 27001; AVG-conforme DPA beschikbaar.
- **Supabase** — SOC 2 Type II; ISO 27001; HIPAA-geschikt (op hogere abonnementen); AVG-DPA + EU-regio beschikbaar.
- **Resend** — SOC 2; AVG-DPA beschikbaar.
- **Anthropic** — SOC 2 Type II; ISO 27001; ISO 42001 (AI); biedt een commerciële DPA en **zero-data-retention**-opties.

> Verzamel en archiveer de ondertekende **DPA** van elk van de vier aanbieders. Deze, plus hun certificaten, zijn direct bewijs voor ISO 13485 leveranciersbeheer (clausule 7.4) en AVG art. 28.

---

## 3. Vereiste juridische documenten, portalteksten en logo's

De portal is **niet openbaar**, maar geauthenticeerde B2B medische portalen vereisen toch het volgende. Items met **ONTBREEKT** zijn nog niet aanwezig in de applicatie.

### 3.1 Juridische documenten / pagina's

| Document | Doel | Status |
|---|---|---|
| **Privacybeleid / Privacyverklaring** | AVG art. 13–14. Moet zowel de clinicus (gebruiker) als de **patiënt** behandelen. Identificeer verwerkingsverantwoordelijke(n), rechtsgrond, art. 9-voorwaarde, ontvangers/subverwerkers, doorgiften, bewaring, rechten, FG-contact. | **ONTBRAK** — toegevoegd: `/privacy`-pagina, gelinkt in footer + bij registratie |
| **Gebruiksvoorwaarden** | Definieert de contractuele relatie, aanvaardbaar gebruik, accountverantwoordelijkheden, aansprakelijkheid. | **ONTBRAK** — toegevoegd: `/terms` |
| **Cookiemelding** | Ook met alleen essentiële cookies is een korte melding best practice. | Toegevoegd (lage prioriteit — geen toestemming nodig voor alleen essentieel) |
| **Verwerkersovereenkomst (DPA)** tussen Piedro en elke kliniek | Verduidelijkt wie verwerkingsverantwoordelijke/verwerker is voor patiëntgegevens en de beveiligingstoezeggingen. **Cruciaal** gezien gezondheidsgegevens. | **ONTBREEKT** (juridisch/commercieel document, niet in de app) |
| **Lijst van subverwerkers** (openbaar of op verzoek) | Transparantie over Vercel/Supabase/Resend/Anthropic. | Toegevoegd — opgenomen in het Privacybeleid |
| **Juridische kennisgeving / Impressum** | Vereist in sommige rechtsgebieden (bijv. Duitsland DDG, NL bedrijfsinfo-regels): juridische naam, adres, registratienummer, btw, contact. | **ONTBRAK** — toegevoegd: footer / `/legal` (placeholders in te vullen) |
| **Verwerkingsregister (ROPA)** | AVG art. 30 — intern register. | **ONTBREEKT** (intern document) |
| **Gegevensbeschermingseffectbeoordeling (DPIA)** | AVG art. 35 — **waarschijnlijk verplicht**: grootschalige verwerking van bijzondere (gezondheids)gegevens. | **ONTBREEKT** (intern document) |
| **Procedure datalekken** | Melding binnen 72 uur (art. 33). | **ONTBREEKT** (intern document) |
| **Procedure rechten betrokkenen** | Inzage/rectificatie/wissing/overdraagbaarheid, afgewogen tegen medische bewaarplicht. | **ONTBREEKT** (intern document) |
| **Toestemmings-/rechtsgrondverklaring bij gegevensinvoer** | De kliniek moet een rechtsgrond hebben om patiëntgegevens in te voeren; de portal toont best een korte melding op het bestelformulier. | **ONTBREEKT** (UI-melding + proces aan kliniekzijde) |

### 3.2 Portalteksten en logo's

- **Footer** met: juridische bedrijfsnaam, © jaar, links naar Privacy, Voorwaarden, Juridische kennisgeving en "Subverwerkers". (Toegevoegd.)
- **Piedro-logo + ISO 13485-keurmerk** — het ISO-keurmerk mag alleen worden getoond volgens de **regels van de certificeringsinstantie** (meestal met certificaatnummer; het keurmerk is van de certificeerder, niet van de norm). Bevestig de gebruiksregels vóór plaatsing.
- **CE / UKCA-markering** hoort op het *hulpmiddel en de documentatie* (schoeisel), **niet** op de portal-UI. Plaats geen CE op de website om niet te suggereren dat de software een CE-gemarkeerd hulpmiddel is.
- **Cookie/Privacy**-link zichtbaar vóór/bij het inloggen.

---

## 4. Softwareontwikkelingslevenscyclus (voor ISO 13485 §4.1.6 & §7.3-achtige beheersing)

ISO 13485 vereist dat in het QMS gebruikte software wordt **gevalideerd** en dat wijzigingen **beheerst en traceerbaar** zijn. Huidige stand en hiaten:

| Beheersing | Huidige stand | Hiaat / actie |
|---|---|---|
| Versiebeheer | ✅ Git + GitHub, volledige historie | OK |
| Branching & wijzigingsrecords | ⚠️ Werk rechtstreeks op `master` gecommit | Definieer een gedocumenteerd branch/PR + reviewbeleid; commitberichten zijn al beschrijvend |
| Code review | ⚠️ Informeel | Documenteer een reviewstap (ook bij één reviewer) voor traceerbaarheid |
| CI/CD | ✅ Vercel auto-deploy bij push | Documenteer de pipeline; voeg een goedkeuring/record voor productie-deploy toe |
| Build/lint/type-check | ⚠️ `tsc` schoon; ESLint heeft bestaande fouten; geen CI-gate | Voeg een CI-gate toe (type-check + lint + build moeten slagen vóór deploy) |
| **Geautomatiseerde tests** | ❌ **Geen testsuite** | **Hiaat.** ISO 13485 §4.1.6 verwacht gedocumenteerde software**validatie**. Voeg toe: (a) een validatieplan, (b) testprotocollen voor het bestelproces en toegangscontrole, (c) uitvoeringsrecords. Minimaal: unit-tests op server actions + een end-to-end "bestelling plaatsen"-test. |
| Eisentraceerbaarheid | ❌ Geen formele | Houd een lichte eisen ↔ tests-matrix bij in het dossier |
| Omgevingen | ✅ Aparte productie (Vercel); dev lokaal | Documenteer; overweeg een staging-omgeving voor pre-prod-validatie |
| Configuratie / secrets | ✅ Env-variabelen, niet gecommit (`.env*` in git-ignore) | OK; documenteer procedure voor sleutelrotatie |

---

## 5. Beveiligingsbeoordeling

### 5.1 Aanwezige maatregelen ✅

- **Transportbeveiliging:** HTTPS/TLS afgedwongen door Vercel; HSTS beschikbaar (toegevoegd).
- **Authenticatie:** Supabase Auth (GoTrue) — wachtwoorden server-side gehasht (bcrypt), nooit in de app opgeslagen; e-mailbevestiging bij registratie; httpOnly-sessiecookies.
- **Autorisatie / RBAC:** drie rollen (`user`, `company_admin`, `piedro_admin`); elke adminpagina en server action controleert de rol server-side opnieuw.
- **Multi-tenant-isolatie:** bestellingen zijn afgebakend via `user_companies`; gewone gebruikers zien alleen hun eigen bestellingen, bedrijfsbeheerders hun bedrijven, Piedro-admins alles. *(Verstevigd 2026-06-04: aanmaak van bestellingen valideert nu bedrijfslidmaatschap en dwingt status server-side af.)*
- **Versleuteling in rust:** Supabase Postgres & Storage versleuteld (AES-256) door de aanbieder.
- **Secrets:** service-role-sleutel en API-sleutels in env-variabelen, server-only; `.env*` in git-ignore (geverifieerd).
- **Invoer van verhoogde status geblokkeerd:** gebruikers kunnen geen bestellingen met verhoogde status aanmaken (server-side afdwinging).

### 5.2 Beveiligingshiaten ⚠️ / ❌ (herstel vereist)

| # | Ernst | Bevinding | Herstel |
|---|---|---|---|
| S1 | 🔴 Hoog | **Patiëntgezondheidsgegevens worden naar Anthropic (VS) gestuurd** door de AI-assistent: zoektools bevragen `patient_name`, clinicus, maten en additions en geven die door aan de Claude-API. Dit is een **internationale doorgifte van art. 9-gegevens**. | Onderteken de **DPA van Anthropic + activeer zero-data-retention**; documenteer de doorgifte (SCC's/DPF) in de ROPA; **of** beperk de assistent zodat hij geen patiëntidentificatie teruggeeft; **of** maak de assistent opt-in per kliniek. Tot oplossing als doorgifterisico behandelen. |
| S2 | 🔴 Hoog | **Bestel-PDF's met patiëntgegevens worden via Resend (VS) gemaild** naar een Piedro-adres. Internationale doorgifte + het ontvangstadres is een hard-coded fallback. | Onderteken Resend-DPA; bevestig doorgiftemechanisme; verifieer een **eigen Piedro-verzenddomein** (momenteel `onboarding@resend.dev`, een sandbox-/testafzender — niet productieklaar en mogelijk niet-bezorgbaar). Zorg dat het bestemmingsadres geconfigureerd is, geen fallback. *(EMAIL_FROM-variabele toegevoegd; HTML-escaping toegepast.)* |
| S3 | 🟠 Middel | **Datalocatie onbevestigd.** EU/VK-gezondheidsgegevens horen in een **EU-regio**. De Supabase-regio is niet gedocumenteerd. | Bevestig en documenteer de Supabase-regio (aanbevolen **EU — Frankfurt**). Zo niet EU, plan migratie. Documenteer ook de Vercel-functieregio. |
| S4 | 🟠 Middel | **Geen database Row-Level Security (RLS)** als defence-in-depth. | RLS-beleid voorbereid (`migrations/002_rls_policies.sql`) — in staging uitvoeren en testen, daarna productie. |
| S5 | 🟠 Middel | **Geen audit-/toegangslog** van wie patiëntgegevens bekeek of wijzigde. | ISO 13485-documentbeheer + AVG-verantwoording verwachten dit. Voeg een append-only audit-log toe (wie, wat, wanneer) voor aanmaken/lezen/wijzigen/statuswijziging van bestellingen. |
| S6 | 🟠 Middel | **Twee niet-geauthenticeerde API-routes** (`/api/orders/send`, `/api/orders/preview`). | **Opgelost:** `/api/orders/send` verwijderd (dode duplicaatcode); `/api/orders/preview` geauthenticeerd. |
| S7 | 🟡 Laag | **E-mail-HTML niet ge-escaped.** | **Opgelost:** alle patiënt-/gebruikerswaarden worden ge-escaped. |
| S8 | 🟡 Laag | **Geen beveiligingsheaders / CSP.** | **Opgelost:** CSP, HSTS, X-Content-Type-Options, Referrer-Policy, X-Frame-Options, Permissions-Policy toegevoegd. |
| S9 | 🟡 Laag | **Geen rate limiting** op auth en de AI-chat. | Voeg rate limiting toe (bijv. Vercel/Upstash) tegen brute force en kostenmisbruik. |
| S10 | 🟡 Laag | **MFA niet afgedwongen** voor bevoorrechte (`piedro_admin`) accounts. | Activeer Supabase MFA, ten minste voor admins. |
| S11 | 🟡 Laag | **Wachtwoordbeleid** is min. 8 tekens, alleen client-side. | Dwing server-side af via Supabase Auth-wachtwoordbeleid. |

### 5.3 Aanbevolen assurance-activiteiten

- Onafhankelijke **penetratietest** vóór livegang (en jaarlijks).
- **Kwetsbaarheidsmonitoring** van dependencies (Dependabot / `npm audit` in CI).
- Documenteer een **incident-/datalek-runbook** (detecteren → indammen → beoordelen → melden binnen 72 u → registreren).

---

## 6. Back-up, herstel & bedrijfscontinuïteit

| Onderwerp | Huidig / vereist | Actie |
|---|---|---|
| Databaseback-ups | Supabase biedt automatische dagelijkse back-ups; **Point-in-Time Recovery (PITR)** beschikbaar op betaalde abonnementen | Bevestig het abonnement; **activeer PITR**; documenteer **RPO** (bijv. ≤ 24 u, of minuten met PITR) en **RTO** |
| Opslagback-ups (PDF's, afbeeldingen, avatars) | Supabase Storage is duurzaam maar **niet automatisch point-in-time herstelbaar zoals de DB** | Definieer een back-up-/exporttaak voor de `order-pdfs`-bucket (bestellingen zijn records die moeten blijven bestaan — zie bewaring) |
| Hersteltest | Niet gedocumenteerd | **Voer een testherstel uit en registreer dit** ten minste jaarlijks — auditors vragen bewijs dat de back-up echt werkt |
| Back-upversleuteling & locatie | Aanbieder-versleuteld, EU-regio (te bevestigen — S3) | Documenteer |
| Uitwijkplan (disaster recovery) | Niet gedocumenteerd | Schrijf een kort DR-plan: provider-uitval, gegevensverlies, sleutelcompromittering; inclusief statuspagina's en escalatiecontacten |
| Bedrijfscontinuïteit | Vercel + Supabase zijn hoog beschikbaar (multi-AZ) | Documenteer de afhankelijkheid en SLA-verwachtingen |

---

## 7. Bewaring & rechten van betrokkenen

- **Op te lossen bewaarconflict:** MDR-documentatie van maatwerkhulpmiddelen moet **≥ 10 jaar** worden bewaard, terwijl de AVG **opslagbeperking** vereist. Definieer een **bewaarschema** dat het *hulpmiddelrecord* het wettelijk minimum bewaart en patiëntidentificatie waar mogelijk minimaliseert/pseudonimiseert.
- **Recht op wissing** wordt beperkt door de medische bewaarplicht — documenteer deze uitzondering in het Privacybeleid en de rechtenprocedure.
- Voorzie processen voor **inzage, rectificatie, overdraagbaarheid, beperking, bezwaar**.
- Overweeg **pseudonimisering** van patiëntidentificatie in analyses/dashboards (de admin-dashboards aggregeren al, wat goed is).

---

## 8. Hiaatanalyse — geprioriteerd actieplan

| Prioriteit | Item | Eigenaar | Type |
|---|---|---|---|
| **P0 — vóór livegang** | S1 Anthropic-doorgifte van gezondheidsgegevens — DPA + zero-retention of assistent beperken | Eng + FG | Beveiliging/Juridisch |
| **P0** | S2 Resend-doorgifte + geverifieerd productie-afzenderdomein | Eng + FG | Beveiliging/Juridisch |
| **P0** | Privacybeleid, Voorwaarden, Juridische kennisgeving juridisch laten beoordelen + vertalen | Eng + Juridisch | Juridisch |
| **P0** | DPA's ondertekenen & archiveren (Vercel, Supabase, Resend, Anthropic) | FG | Juridisch |
| **P0** | DPIA voor gezondheidsgegevensverwerking | FG | Juridisch |
| **P0** | S3 EU-datalocatie bevestigen (Supabase-regio) | Eng | Beveiliging |
| **P1 — kort daarna** | S5 Audit-logging van toegang/wijzigingen patiëntgegevens | Eng | Beveiliging/ISO |
| **P1** | Softwarevalidatie: validatieplan + testprotocollen + geautomatiseerde tests | Eng/QA | ISO 13485 §4.1.6 |
| **P1** | S4 RLS uitvoeren (migratie 002) | Eng | Beveiliging |
| **P1** | ROPA, datalekprocedure, rechtenprocedure, bewaarschema | FG | Juridisch/ISO |
| **P2** | S9 rate limiting, S10 admin-MFA, S11 wachtwoordbeleid | Eng | Beveiliging |
| **P2** | CI-gate (type-check/lint/build); SDLC documenteren; staging-omgeving | Eng | ISO/Kwaliteit |
| **P2** | Penetratietest; dependency-scanning | Eng | Assurance |
| **P3** | WCAG 2.1 AA-toegankelijkheid; volledige UI-i18n | Eng | Kwaliteit |

---

## 9. Verklaring voor het ISO-dossier (samenvatting)

> De Piedro Portal is een besloten, geauthenticeerde B2B-bestelapplicatie gebouwd op een moderne, beveiligingsgetoetste stack (Next.js op Vercel, Supabase, Resend, Anthropic), waarvan alle infrastructuuraanbieders **SOC 2 Type II**- en **ISO/IEC 27001**-certificeringen bezitten. De applicatie dwingt rolgebaseerde toegangscontrole en gegevensisolatie per bedrijf af, gebruikt TLS tijdens transport en door de aanbieder beheerde AES-256-versleuteling in rust, houdt alle broncode onder versiebeheer met traceerbare wijzigingshistorie, en deployt via een geautomatiseerde pipeline.
>
> De portal wordt beoordeeld als **software die binnen het kwaliteitsmanagementsysteem wordt gebruikt (ISO 13485 §4.1.6)** en is **geen medisch hulpmiddel** (geen medisch doel). Hij genereert records die relevant zijn voor het bestelproces van maatwerkhulpmiddelen (MDR bijlage XIII).
>
> Openstaande punten die vóór de productielancering vereist zijn, worden in §8 bijgehouden; het belangrijkste is de formalisering van doorgiftebeheersing voor patiëntgezondheidsgegevens (DPA's met VS-subverwerkers), de set gegevensbeschermingsdocumenten (Privacybeleid, DPIA, ROPA), bevestiging van EU-datalocatie, gedocumenteerde softwarevalidatie/-tests en audit-logging. Zodra deze gesloten zijn, voldoet de portal aan de technische en organisatorische maatregelen die worden verwacht voor de verwerking van bijzondere categorieën gezondheidsgegevens onder de AVG en voor opname in een ISO 13485-kwaliteitssysteem.

---

*Einde rapport. Houd dit document onder versiebeheer; werk het bij bij elke materiële wijziging van het systeem of zijn subverwerkers.*
