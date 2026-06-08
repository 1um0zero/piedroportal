# Piedro Portal — Master Project Tracker

> Single source of truth for everything still to do before (and shortly after) launch.
> Reusable for future projects: copy the structure, keep the legend.

## How to use
- Check a box `[x]` when done. Topics have a **status** that's done only when all its steps are.
- **Owner:** 👤 = you (Jorge / Piedro / client side) · 🤖 = me (Claude / dev) · 👥 = both.
- **Priority:** 🔴 P0 (blocks launch) · 🟠 P1 (around launch) · 🟡 P2 (post-launch).
- **Built (uncommitted):** code is written + tsc/lint-clean but **not committed/deployed** yet.
- **Attachments / inputs:** drop files in `docs/attachments/<NN-topic>/` and link them under the task
  with `📎`. See `docs/attachments/README.md`.
- Detail lives in: `docs/launch/LAUNCH-ROADMAP.md`, `LAUNCH-QUESTIONNAIRE.md`, `ERP-INTEGRATION.md`,
  `docs/compliance/*`.

Last updated: 2026-06-06.

---

## 1. Domain, DNS & hosting — 🔴 / 👥
- [ ] **1.1** Point **portal.piedro.pt** DNS at Vercel · 👤 (you control piedro.pt DNS)
- [ ] **1.2** Add the custom domain in Vercel + verify · 🤖 config / 👤 confirm
- [ ] **1.3** Piedro updates the **link on piedro.com** to the new portal · 👤
- [ ] **1.4** **Redirector on old Power Pages** → new portal (keep PP alive in background) · 👤 (🤖 can help)
- [ ] **1.5** Remove the **`robots noindex`** at go-live (staging guard) · 🤖
- [ ] **1.6** TLS cert issued once DNS resolves (Vercel auto) · 👥 verify
- [ ] **1.7** Later: redirect **piedro.com → portal** once stable · 👤
- [ ] **1.8** Email-auth DNS (SPF/DKIM/DMARC) for the sending domain · 👤 (see 6.6)

## 2. Environment & secrets (Vercel prod) — 🔴 / 👤
- [ ] **2.1** Confirm set: Supabase URL/anon/service, `RESEND_API_KEY`, `ANTHROPIC_API_KEY`, Dataverse creds · 👤 *(Q2.1)*
- [ ] **2.2** Set `NEXT_PUBLIC_SITE_URL` (used by forgot-password + callback redirects) · 👤
- [ ] **2.3** Set notify-email envs as **fallback** only (now admin-editable, see 6): `ORDER_NOTIFY_EMAIL`, `ADMIN_NOTIFY_EMAIL`, `EMAIL_FROM` · 👤
- [ ] **2.4** Set `ERP_API_TOKEN` (long random secret) · 👤
- [ ] **2.5** Confirm **Supabase region = EU** (patient data) · 👤 *(Q2.2)*
- [ ] **2.6** Take a Supabase **backup/snapshot** before any wipe · 👤

## 3. Data wipe & rebuild — 🔴 / 👥
- [ ] **3.1** Decide exact **test data** to destroy (orders/users/companies; keep product images?) · 👤 *(Q3.1)*
- [ ] **3.2** Backup, then wipe test rows · 👤
- [x] **3.3** ✅ Migrations **001–012 all run in prod** (user confirmed 2026-06-06 via the combined
      `migrations/ALL_006-012.sql`). · 👤
- [ ] **3.4** Rebuild from Dataverse in order (each `--dry-run` first) · 👥
  - [ ] 3.4.a `import-accounts.mjs` → companies · 👤 run
  - [ ] 3.4.b `dataverse-import.mjs` → products · 👤 run
  - [ ] 3.4.c `import-dataverse-orders.mjs` → orders (**step-3 only**, **TESTES\*** excluded) ✅ built · 👤 run
- [ ] **3.5** **Reconciliation**: `count(*) orders` == script's "expected = kept" · 👥
- [ ] **3.6** Re-create portal-only data not in Dataverse: branches, exclusive labels, company_admins · 👤 *(Q3.3)*
- [ ] **3.7** ~~Import legacy order PDFs~~ **DEFERRED (Q11.3)**: in SharePoint via a `pdf_link` column,
      not all filled — "esquecer isto para já". Revisit post-launch. · 🟡
  - 📎 *(paste where the PDFs live in Dataverse here)*

## 4. User migration & password flows — 🔴 / 👥
- [x] **4.1** `import-contacts.mjs` (contacts → Auth + profiles + user_companies) ✅ built · 🤖
- [x] **4.2** company_admin rule (Q4.1): **assigned by a piedro_admin on the company sheet**, not
      inferred. ✅ import-contacts no longer guesses; company sheet has a Members & admins panel. · 🤖
- [x] **4.3** Set-password-on-first-login (migration 006 + middleware guard + login redirect) ✅ built · 🤖
- [x] **4.4** Forgot-password flow (link + page + reset email → /set-password) ✅ built · 🤖
- [ ] **4.5** Run migration + the contacts import (after companies import) · 👤
- [ ] **4.6** Decide handling of no-email / duplicate-email contacts · 👤 *(Q4.2)*
- [ ] **4.7** Create `piedro_admin` / `branch_staff` accounts · 👤 *(Q4.4)*

## 5. Backfill & data integrity — 🟠 / 👥
- [x] **5.1** `backfill-order-users.mjs` (order→contact→email→user) ✅ built · 🤖
- [x] **5.2** Dual cross-checks (contact-account == order-company; user ∈ company) ✅ built · 🤖
- [x] **5.3** `--verify` + reason capture into `orders.import_note` (migration 008) ✅ built · 🤖
- [x] **5.4** `/admin/orders/unassigned` list + reason + nav link ✅ built · 🤖
- [ ] **5.5** Run `--discover` → `--contact-field=…` → apply → `--verify` · 👤
- [ ] **5.6** Final SQL cross-check returns 0 rows (user ∉ company) · 👥

## 6. Email & notifications — 🟠 / 👥
- [x] **6.1** Notify emails **fail-closed** (no dev hardcodes) ✅ built · 🤖
- [x] **6.2** Admin-editable notify emails (`app_settings` + `/admin/settings`, migration 009) ✅ built · 🤖
- [x] **6.3** **Full i18n of all emails** (EN/NL/FR/DE) ✅ built · 🤖
  - [x] 6.3.a order emails → `emails` namespace ×4
  - [x] 6.3.b new-user notification email → i18n ×4 (+ values now HTML-escaped)
  - [x] 6.3.c internal locale = `notify_locale` setting (selector in /admin/settings); client = order locale
- [x] **6.4** **Client order confirmation by default** ✅ built (confirmation email TO the user, order locale, PDF) · 🤖
- [ ] **6.5** **Cc/Bcc on user AND customer** (default goes to the user) · 🤖 *(decided, 14.5)*
  - [x] 6.5.a migration 010: `profiles.notify_cc/bcc` + `companies.notify_cc/bcc` ✅ built
  - [x] 6.5.b email engine applies user+company Cc/Bcc to the confirmation ✅ built
  - [x] 6.5.c profile UI to edit user Cc/Bcc ✅ built (Profile page) · 🤖
  - [x] 6.5.d company UI to edit customer Cc/Bcc ✅ built (Company detail) · 🤖
  - [x] 6.5.e branch-office copy ✅ built (fan-out + branch notify UI in branch create/detail forms) · 🤖
- [x] **6.6** **Set-password text editable in admin panel** ✅ built · 🤖 *(14.2)*
  - [x] 6.6.a set-password page + reset-email texts editable per locale (app_settings override → i18n
        fallback). Editor at **/admin/settings/texts** (locale tabs, 6 fields), linked from Settings.
  - [x] 6.6.b "Propose from English" AI translation per locale (`proposeTranslationAction`, Haiku).
  - [x] 6.6.c **Take over the reset email** ✅ built — own single-use SHA-256-hashed token (migration 012),
        2h expiry, atomic claim, no user enumeration, multi-lingual Resend email, /set-password token mode
        + public middleware allowance. Engine uses i18n defaults; admin-editable override = 6.6.a/b.
- [ ] **6.6** Verified Piedro **Resend domain** + publish SPF/DKIM/DMARC · 👤
- [ ] **6.7** Inbox-deliverability test (NL recipient, not spam) · 👥

## 7. ERP / a-shell integration — 🟠 / 👥
- [x] **7.1** Export endpoint `GET /api/erp/orders` + `POST /ack` + contract (migration 007) ✅ built · 🤖
- [ ] **7.2** Choose architecture A (bridge) vs **B** (a-shell reads portal, recommended) · 👤 *(Q6.1)*
- [ ] **7.3** Provide the **flaw list** to eliminate · 👤 *(Q6.2)*
- [ ] **7.4** Tell me how a-shell auths/pulls today + if its code can change by Mon · 👤 *(Q6.3)*
- [ ] **7.5** Finalize contract to a-shell's minimum fields · 🤖 *(Q6.5)*
- [ ] **7.6** Status-back from ERP (optional `PATCH`) · 👥 *(Q6.4)*
- [ ] **7.7** a-shell switches to the new endpoint (or temp bridge for Monday) · 👤 *(Q6.6)*

## 8. Customer communication — 🟠 / 👥
- [ ] **8.1** Who announces, channel, when · 👤 *(Q7.1)*
- [ ] **8.2** Draft announcement + first-login instructions (NL/EN/FR/DE) · 🤖 *(Q7.3)*
- [ ] **8.3** Support channel + on-call during week 1 · 👤 *(Q7.2)*

## 9. Compliance & legal — 🔴 / 👥  ← almost a sub-project
- [ ] **9.1** **Validate & CERTIFY all AI-drafted legal/compliance docs** (cannot publish uncertified) · 👤 lead, 🤖 support *(Q8.3)*
  - [ ] 9.1.a DPO/legal review of `docs/compliance/COMPLIANCE-REPORT.en/.nl` (GDPR Art.9, MDR custom-made, ISO 13485 §4.1.6)
  - [ ] 9.1.b Fill EVERY placeholder in `src/lib/legal-info.ts` (legal name, address, KvK, contacts, DPO) · 👤 provide, 🤖 wire
  - [ ] 9.1.c Review Privacy Policy / Terms / Impressum page texts · 👤
  - [ ] 9.1.d Confirm `docs/compliance/CLIENT-ACTIONS.en/.nl` items done + record evidence
  - [ ] 9.1.e Version + date each doc; store certified copies in the ISO/QMS dossier
  - 📎 *(attach signed copies / DPO sign-off here)*
- [ ] **9.2** DPAs signed: Supabase, Vercel, Resend, **Anthropic** (or disable chat) · 👤 *(Q8.2)*
- [ ] **9.3** ROPA, DPIA, retention schedule (MDR ≥10y) · 👤 lead, 🤖 support
- [ ] **9.4** Audit logging of patient-data access (ISO/MDR) · 🤖 build, 👤 confirm scope

## 10. Security & operations — 🟠 / 👥
- [ ] **10.1** RLS (migration 002) enabled **and tested** end-to-end · 👤 run, 👥 test
- [ ] **10.2** `order-pdfs` bucket = **Private** · 👤
- [ ] **10.3** Rate limiting on `/api/chat` + PDF routes · 🤖
- [x] **10.4** Chat Anthropic client made lazy (no module-load crash) ✅ built · 🤖
- [ ] **10.5** Admin MFA · 👤 (Supabase setting) / 🤖 (UI if needed)
- [ ] **10.6** Error monitoring (Sentry/Vercel) + Supabase backup schedule · 👥
- [ ] **10.7** Rollback plan (revert DNS / restore snapshot) · 👥

## 11. QA / smoke test / GO–NO-GO — 🔴 / 👥
- [ ] **11.1** Register/login + forced password reset · 👥
- [ ] **11.2** Gallery + filters + exclusive-model visibility · 👥
- [ ] **11.3** Full order (5 unit modes, additions, draft, submit) · 👥
- [ ] **11.4** PDF preview + final PDF email (signed URL, private bucket) · 👥
- [ ] **11.5** Admin: status change, orders, products, companies, branches, unassigned, settings · 👥
- [ ] **11.6** Roles see correct scope (user / company_admin / branch_staff / piedro_admin) · 👥
- [ ] **11.7** All 4 locales render (no leftover hardcoded PT) · 👥
- [ ] **11.8** Migrated orders display correctly · 👥
- [ ] **11.9** **GO / NO-GO** decision · 👤

## 12. Post-launch backlog — 🟡 / 🤖
- [ ] **12.1** SQL aggregation for dashboards (currently O(n) in JS)
- [ ] **12.2** Complete `labelFr/labelDe` in `additions-config.ts`
- [ ] **12.3** Gallery filters in URL (shareable links)
- [ ] **12.4** Drop deprecated `profiles.company_id`
- [ ] **12.5** Internal notification email language polish (decided via 6.3)
- [ ] **12.6** Set-password page copy customizable from the admin settings panel *(decided — see 6 / 13)*
- [ ] **12.7** **Canonical: numeric zero shown as "—"** (helper `nz()` in `src/lib/format.ts`).
      Applied: admin dashboard, companies table, orders list, user dashboard. Sweep remaining
      number screens as visited (admin/users, branches, products). · 🤖 *(rule set 2026-06-08)*
- [ ] **12.8** **Canonical: list sorting + categorical filters** (helpers in
      `src/components/ui/table-controls.tsx`). Sortable columns everywhere reasonable; select
      filter on categorical-repeat columns (status/country/role/label…), client-side. Reference =
      `CompaniesTable`. Apply to orders list, admin/users, branches, products as visited.
      · 🤖 *(rule set 2026-06-08)*
- [ ] **12.9** **Evolution: multi-select per-column filters** — current categorical filters are
      single-select. Upgrade to multi-select (checkbox dropdown) where useful, e.g. pick several
      statuses/countries/labels at once. Keep it light; drop on any column where it adds load.
      · 🤖 *(registered 2026-06-08)*

## 13. Decisions log (from chat)
- 2026-06-06 User migration = 100% clean, no invites, reset on first login.
- 2026-06-06 Orders: only **step 3** imported; others counted not imported; **TESTES\*** excluded.
- 2026-06-06 Notify emails admin-editable (done). Emails fully i18n, max polish.
- 2026-06-06 Client gets order confirmation **by default**; profile has Cc/Bcc options, default **Cc = self**.
- 2026-06-06 Set-password text customizable in the admin settings panel.
- 2026-06-06 Old Power Pages kept alive in background; legacy PDFs must be imported.
- 2026-06-06 (14.x) Internal email locale = admin setting; set-password text editable multi-lingual +
  AI-propose; non-step-3 not stored; use bucket images (no image import); Cc/Bcc on user+customer with
  default to user; From on piedro.com (fallback piedro.pt).

## 13b. Questionnaire answers digest (2026-06-06)
- **Env (Q2.1)** all set in Vercel; **region (Q2.2)** Ireland (EU ✓).
- **Migrations (Q3.2)** 001–005 done; 006–012 pending (→ 3.3). GUIDs stable (Q3.4).
- **Users (Q4.5)** ~340 users, ~200 companies. No users without email expected; report exceptions (Q4.2).
  Backfill user_id wanted (Q4.3). piedro_admin/branch_staff assignment TBD (Q4.4 = "?????").
- **Email (Q5.1)** From starts piedro.pt → later piedro.com; user will verify the domain.
- **ERP (Q6)** Option **B** (A only as emergency if orders pile up). Flaws: additions not always
  exported (forces 2nd validation), status-back errors. User has **full control of ERP code**; import
  is **manual + token + HTML calls** → fits our token GET endpoint. **Status-back REQUIRED** (Q6.4).
  Wants **all registered+approved orders with all data** (Q6.5). Temp bridge OK for Monday (Q6.6).
  **ERP integration is the LAST priority** (Q10).
- **Comms (Q7)** decided Monday with Piedro; support = Piedro NL staff + the chat; no draft yet.
- **Legal (Q8)** user will route docs to Piedro + ensure DPAs + certification.
- **Ops (Q9)** freeze window yes; everyone fixes Monday; **all-or-nothing** launch.
- **Import rules (Q11)** step==3 (string or number — handled); TESTES* by name; legacy PDFs deferred.

## 14. Open clarifications (RESOLVED 2026-06-06)
- [x] **14.1** Internal email language = **admin-set locale** (`notify_locale` setting).
- [x] **14.2** Set-password panel: **both** welcome text AND reset-email text, **multi-lingual**, with an
      AI-propose-translation option. → 6.6.
- [x] **14.3** Non-step-3 orders: **report at import only**, no stored stats.
- [x] **14.4** Use the **bucket images** (better) — do **not** import from Dataverse unless one is
      missing (unlikely). → 3.7 narrowed to PDFs only; image import dropped.
- [x] **14.5** Cc/Bcc on **user AND customer**; if nothing set, the order copy goes to the **user**.
      (No global archive Bcc.) Branch office can also receive (6.5.e). → 6.5.
- [x] **14.6** Resend From domain: **piedro.com** preferred (pending the client getting permission);
      otherwise **piedro.pt** (client-administered) for now. → 1.8 / 6.6 / `email_from` setting.

## 15. Branch = a configuration scope (ARCHITECTURE PRINCIPLE, user 2026-06-06)
**Principle:** a branch office (NL, UK, …) is a layer that can **override/replicate global admin
config**. Almost anything configurable at the admin level may need a per-branch version (language,
notify emails, and likely more later). An order **fans out**: every branch whose scope covers the
order's model gets its own copy, **in that branch's own language** (e.g. a FR order → NL branch copy
in NL, UK branch copy in EN). Settings resolution order: **Global → Branch → (Company → User)**.
- [x] **15.1** Which branch receives an order = the branch whose **model-scope includes the product's
      `style_name`** (reuses `getAdminScope` logic). ✅ decided + built (fan-out)
- [x] **15.2** Branch **notify email + notify locale** fields ✅ built (migration 011) — admin UI to edit = 6.5.e/16.x
- [ ] **15.3** Backlog: generalize per-branch overrides for other admin params (set-password text, etc.)
      as they are added · 🤖 (design as we go)

## 17. Overnight run — results & findings (2026-06-06/07, autonomous)
- ✅ **Deployed** to master (commits 987a657 incl. all email/auth/admin work, 2a006b2 security fixes).
- ✅ **Build gate** caught a real bug pre-deploy: `'use server'` file exported a const → moved to
  `src/lib/texts-config.ts`.
- ✅ **Security fixes (deployed):** (1) `/gallery/[id]/order` only loads a `?draft=` order if it
  belongs to the requester or piedro_admin (was a cross-tenant patient-data leak). (2)
  `/api/admin/notify-new-user` now fail-closed (required webhook secret; was public when unset) +
  settings-based recipients + i18n.
- ✅ **All API routes verified guarded** (session / piedro_admin / ERP token / webhook secret).
- ✅ **Companies refreshed** (200) and **users migrated**: 282 created + 2 reused, 0 failed, all flagged
  must_set_password. (340 contacts → 55 had no account, 1 dup email → 284 linkable.)
- ⛔ **Backfill blocker (DECIDE TOGETHER):** the order→contact lookup is `_cr56f_user_value` (→contact)
  but it is **empty on ALL 4027 orders** — Power Pages never stored the per-order contact. So
  `orders.user_id` **cannot be backfilled** from order data (0/4027). Options to discuss: accept
  company-level linkage only (regular users won't see historical orders; company_admins will), or find
  another mapping source. (Q4.3 wanted user linkage — source data doesn't support it.)
- ⚠️ **Stray orders:** Supabase already holds **3813** orders (vs 3102 clean step-3) — earlier
  full import left non-step-3/TESTES rows. **Cleanup decision needed** before/with the refresh
  (re-import upserts, it does NOT delete these). Ready command: re-run `import-dataverse-orders.mjs`
  (now filtered) + a DELETE for rows not in the step-3 set.
- ▶️ **Orders import + backfill NOT run** (deferred to the supervised session, per "amanhã importarmos
  os dados"). Backfill field confirmed = `_cr56f_user_value` (but empty — see blocker).

## 16. Feature backlog (post-launch) — 🟡

### 16.2 Test orders excluded from statistics  ·  🤖 build · 👤 decide  ·  (registered 2026-06-07)
Test accounts (e.g. suporte@umzero.pt, albuquerque.tavares@gmail.com) place orders that must NOT
affect dashboards/stats. Two options to decide: (a) a dedicated **TESTES\*** customer (as before — the
order import already excludes it), or (b) an `is_test` flag/category on orders (or company) that all
analytics/dashboards filter out. Option (b) is cleaner (no fake company). Until decided, keep test
activity on a TESTES* company so it's auto-excluded.

### 16.3 Natural-language order intake (AI pre-fill)  ·  🤖 build · 👤 shape  ·  post-launch (registered 2026-06-08)
After picking the model, the client types a free-text order in **any language**, e.g.
*"1 pair, rehab, K, 32 with these adds in both foot: 10mm toe puffs, rocker sole and w/o piedro logo"*,
and an LLM **pre-fills** the order fields. The client then runs the **normal validation steps** on the
pre-filled form — the AI never submits. Low risk because the human gate stays.
- [ ] **16.3.a** **Schema-constrained parsing:** feed Claude the closed schema derived from
      `additions-config.ts` (enumerated options, mm ranges, sided/global, conditional parents) + the
      chosen product's real constructions/widths/sizes/closure + `adds_exclude`. Use tool use / structured
      output; values not in the allowed set are left empty, never invented. Fuzzy-match to allowed values.
- [ ] **16.3.b** **Map → form state** in the existing additions shape (`{l,r}` / scalar) to pre-fill
      Tab1 + Tab2; reuse the form + validation as-is. Ambiguous items left blank/flagged for the human.
- [ ] **16.3.c** **Preserve the intake** for audit + improvement: store original text + locale + parsed
      JSON + model id/version + timestamp (column or `order_intake` table). Capture the user's validation
      corrections → an eval dataset.
- [ ] **16.3.d** **Improve over time** via prompt/schema/few-shot tuning measured against the saved
      `prompt → expected fields` eval set (NOT model fine-tuning). 
- [ ] **16.3.e** ⚠️ **Compliance:** sends data to Anthropic (US) → same DPA/zero-retention rules as the
      chat (9.2 / Q8.2); patient/orthopedic data = GDPR Art.9. Gated by the same launch decision as chat.
- [ ] **16.3.f** Pairs with additions normalization (§19): the explode/config metadata is what the LLM
      needs; build after/with Phase 1.

### 16.1 AI post-login briefing  ·  🤖 build · 👤 shape  ·  NOT for Monday (registered 2026-06-06)
After login, each user gets a **natural-language summary in their own locale** of what mattered
recently — and what *didn't* happen — plus **suggested actions**. Essentially an NL interpretation of
the dashboard data. Start with simple models/templates and improve over time. Complements (does not
replace) the existing chat where the user can already ask specific questions. Users can also tell it
**what they habitually want to know**.
- [ ] **16.1.a** **Admin briefing** — e.g. what happened since yesterday, how many orders, best
      clients, top-selling models; flags like "recently added models aren't selling — maybe email the
      customers."
- [ ] **16.1.b** **Customer briefing** — e.g. models they've been ordering a lot, patients who haven't
      ordered in a while, and some additions-based insights (exact set TBD by user).
- [ ] **16.1.c** **Personalization** — let the user configure recurring topics they care about; store
      per-user preferences.
- [ ] **16.1.d** **Learning loop** — the system should "learn to learn" what's worth surfacing vs.
      what to avoid; capture feedback signals over time.
- [ ] **16.1.e** ⚠️ **Privacy/safety rules (canonical):** never expose **patient names** — use patient
      **IDs**; treat all patient/additions data as GDPR Art.9 special category (see
      `project_compliance_context`); the briefing sends data to the LLM → same DPA/zero-retention
      constraints as the chat (Q8.2). Define an allow/deny list of what may be mentioned.
- [ ] **16.1.f** Phasing: v1 = deterministic dashboard aggregates rendered to NL via a small prompt;
      later = richer reasoning + suggestions + personalization.
- [ ] **16.1.g** **Concrete v1 content (from org briefing 2026-06-08):** staff → "x orders to approve,
      don't forget the y pending decision"; client → "in-progress orders are approved, x in production,
      y delivered". Order-state reporting is the core of the briefing.

## 18. Organizational model & VSI integration — 🟡 / 👥  (from briefing 2026-06-08)
> Full context: `docs/PIEDRO-ORG-AND-FLOW.md` · memory `project_piedro_org`. PIEDRO INTERNATIONAL
> (Emil van Swaal): pair-by-pair (this portal) · custom (next) · fashion (out). NL head office + UK +
> factory **VSI** (SHUZ on A-Shell) + **VSI-C** (custom). Anabela Lopes = piedro_admin in NL.

- [x] **18.1** **Piedro Order = `piedro_order_id`** (Dataverse `cr56f_order_piedro`, staff-filled, gates
      approval) ✅ confirmed + import maps it + shown on unassigned. Filled on ALL orders except same-day
      of final import (else step<3 or test). `cr56f_name` = Power Pages API id, never shown to humans.
- [ ] **18.2** **Missing order fields, fed by VSI via a-shell (status-back):** `invoice_number` +
      `invoice_date`; `tracking_number` + `tracking_url` (clients want a clickable **link**). Migration +
      extend `/api/erp/orders/status` + client/staff UI.
- [ ] **18.8** **State history / audit (timestamp + user per state)** — `order_state_events` table; write
      an event on every state mutation (client submit, `updateOrderAdminAction`, ERP status-back) with
      who/when/source; timeline on the order detail. Feeds briefing/dashboards. · 🤖 build + 👤 run migration
- [ ] **18.3** **"Open work" views** for NL/UK staff — approve flow (registered → approved with Piedro
      Order + date; or awaiting payment/decision). Easy "what's open" surfacing.
- [ ] **18.4** **Inverted VSI import (production branch):** PT-language branch "produção" listing
      approved-not-integrated orders; opened on the Datacenter Windows VM running SHUZ, which generates a
      file + runs `c:\piedro\platuz\bin\ashw32.exe` (a-shell) with params; a-shell writes state back via
      http. Align with existing `order-contract.ts` + `/api/erp/orders*`.
- [ ] **18.5** **VSI-C ↔ portal "custom" area** — when the custom portal area is built, VSIC consumes it
      (separate A-Shell area, organically linked to VSI).
- [ ] **18.6** **Livingston / ZSM** — sub-areas of pair-by-pair = a filter over the portal (later).
- [ ] **18.7** **Branches as PT-language scopes:** VSI (production) and VSI-C are branches; reuse the
      branch model (notify locale = PT, model scope). See `project_branch_offices`.

## 19. Additions data model — normalize before a-shell — 🟠 / 🤖  (decided 2026-06-08)
> Problem: `orders.additions` is a wide JSONB; `emptyAdditions()` writes ALL ~60 fields even when
> empty/false (Power Pages form-designer artifact — one checkbox per expandable area). The ERP
> contract currently exports this raw cluttered JSON. **Decision: normalize to a related 1:N table**
> (N≥0), keep `additions-config.ts` as the form's source of truth, and **lock the ERP-facing shape
> before integrating a-shell**. Section/parent/side denormalized onto each row (simpler + ERP/SQL
> friendly). Standalone toggles stay as bool rows; parent toggles with children become derived.

- [ ] **19.1** **Phase 1 (before a-shell, low risk):** pure `explodeAdditions(order)` (config + JSONB →
      normalized array `{section, field_key, parent_key, side, type, value}`, only present items). Use it
      in the ERP contract (`additions` becomes an array; bump `contract_version` → 2); optionally in
      PDF/detail/dashboards. No migration, no write-path change. · 🤖
- [ ] **19.2** **Phase 2 (storage refactor, when there's runway):** table `order_additions`
      (`order_id, section, field_key, parent_key, side ['l'|'r'|'g'], field_type, value_num/text/bool`,
      indexes on order_id/field_key/section). Backfill from JSONB via `explodeAdditions`. Switch
      AdditionsForm/OrderForm writes + reads (dashboards/PDF/detail) to it; dual-write then drop the
      JSONB. ERP contract output unchanged → a-shell unaffected. · 🤖 build + 👤 run migration
- [ ] **19.3** Consider promoting `urgent` to a real `orders.urgent` column (used for filter/sort/ERP)
      instead of living inside additions. · 🤖
