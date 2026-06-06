# Piedro Portal — Launch Roadmap

**Target launch:** Mon 2026-06-08 · **Drafted:** 2026-06-06
**Reality check:** ~2 days (one a weekend). Several items below realistically slip to *fast-follow*
(week 1). Each item is tagged **[P0 = blocks opening the door]**, **[P1 = open week 1]**,
**[P2 = later]**, and **owner** (`me` = Claude/dev work, `you` = client/business, `both`).

---

## 0. The cutover model (read this first)

The single biggest decision that shapes everything else: **what happens to Dataverse / Power Pages
after launch?**

- **Source of truth for orders going forward** = the new portal (Supabase).
- **Old Power Pages portal** must be *frozen* (read-only or offline) before the final data refresh,
  otherwise new orders land in Dataverse during the migration and are lost.
- **a-shell ERP** currently pulls orders from Dataverse via API. After cutover it must pull from the
  new portal instead (see §6). Until that's built, there is an **integration gap** — orders placed in
  the new portal won't reach the ERP. This is the item most likely to need a bridge or a fast-follow.

**Recommended cutover sequence (the "weekend runbook"):**
1. Freeze old portal (banner + disable order submit).  → [P0, you]
2. Final Dataverse refresh into Supabase (accounts, products, orders).  → [P0, me+you]
3. Wipe test data, rebuild clean (see §3).  → [P0, me]
4. Migrate users (see §4).  → [P0, me]
5. Smoke test end-to-end on all 4 locales (see §8).  → [P0, both]
6. **GO / NO-GO gate.**
7. Point the production domain at the portal + remove `noindex` (see §1).  → [P0, you+me]
8. Announce to customers (see §7).  → [P0, you]

---

## 1. Domain, DNS & hosting  [mostly you]

- [ ] **[P0]** Production domain decided & registered (e.g. `portal.piedro.com`). Does it exist today? *(Q1.1)*
- [ ] **[P0]** Add custom domain in Vercel project; verify ownership.
- [ ] **[P0]** DNS records: CNAME/A → Vercel. Who controls DNS (registrar / Cloudflare)? *(Q1.2)*
- [ ] **[P0]** apex vs `www` redirect decided.
- [ ] **[P0]** TLS cert issued (Vercel auto once DNS resolves).
- [ ] **[P0]** **Remove `robots noindex`** that was added for staging — otherwise the live site stays
      invisible to search/clients. (Added in the 2026-06-04 hardening.)
- [ ] **[P0]** Email auth DNS for Resend: **SPF, DKIM, DMARC** on the sending domain (see §5).
- [ ] **[P1]** "DDNS" — clarify: is this the on-prem **a-shell / ERP host** behind a dynamic IP that
      needs a DDNS updater, or DNS records for the portal? *(Q1.3)* If ERP is on-prem and the portal
      must reach it (or vice-versa), confirm a stable hostname/IP + firewall rules.
- [ ] **[P0]** (per Q1.1/Q1.2) Point **portal.piedro.pt** at Vercel (client controls piedro.pt DNS);
      Piedro updates the link on **piedro.com** to the new portal.
- [ ] **[P1]** Add a **redirector on the old Power Pages** site forwarding visitors to the new portal
      (client can do it; offer help). Keep Power Pages alive in background for data validation (Q1.4).
- [ ] **[P1]** Later: redirect **piedro.com → portal** once stable.

## 2. Environment & secrets (Vercel production)  [me to verify, you to provide]

- [ ] **[P0]** Confirm in **Vercel prod env** (not just `.env.local`): `NEXT_PUBLIC_SUPABASE_URL`,
      `SUPABASE_SERVICE_ROLE_KEY`, anon key, `RESEND_API_KEY`, `EMAIL_FROM`, `ANTHROPIC_API_KEY`,
      Dataverse creds (if scripts run from CI). *(Q2.1)*
- [ ] **[P0]** Confirm **Supabase project region = EU** (GDPR data residency). *(Q2.2)*
- [ ] **[P0]** Take a **Supabase backup / snapshot** before any wipe.

## 3. Data: destroy test data + rebuild clean  [me]

- [ ] **[P0]** **Backup first** (point-in-time / pg_dump).
- [ ] **[P0]** Inventory what's test vs real: `orders`, `profiles`, `auth.users`, `companies`,
      `products`, storage `order-pdfs`, storage `products`. *(Q3.1 — which buckets/tables to wipe)*
- [ ] **[P0]** Wipe test rows (orders + test users + test companies). Keep product images if already
      uploaded; wipe test order PDFs.
- [ ] **[P0]** Rebuild from Dataverse, **in order**: `import-accounts.mjs` → `dataverse-import.mjs`
      → `import-dataverse-orders.mjs` (dry-run each first). All idempotent (upsert by GUID).
- [ ] **[P0]** Order import rules (now enforced in `import-dataverse-orders.mjs`): only **step 3**
      (confirmed) orders are imported; earlier steps are counted for info only, NOT imported; the
      **TESTES\*** customer is ignored entirely.
- [ ] **[P0]** **Reconciliation Dataverse↔Supabase**: the import prints "expected Supabase count =
      kept(step3, non-TESTES)". After import, confirm `SELECT count(*) FROM orders` equals it.
- [ ] **[P1]** User backfill + unassigned list: run `backfill-order-users.mjs` (`--discover` →
      `--contact-field=...` → apply → `--verify`); review leftovers at **/admin/orders/unassigned**
      (reason shown). Run migration `008_order_import_note.sql` first.
- [ ] **[P0]** Run **migrations 001–005** so the portal-only tables exist:
      `user_companies`, `branches` + `branch_models` + `profiles.branch_id`,
      `companies.exclusive_label`, order admin states, RLS policies. *(Q3.2 — which already ran?)*
- [ ] **[P0]** Re-apply portal-only data that doesn't come from Dataverse: branch definitions,
      exclusive labels, `is_company_admin` flags. *(Q3.3)*
- [ ] **[P1]** STRETCH/LAST/OUT-STOCK columns + `cr56f_category` are read but not written by the
      Excel import — decide semantics if needed.
- [ ] **[P1]** (per Q1.4) **Import legacy order PDFs** from Power Pages/Dataverse into the private
      `order-pdfs` bucket and set `orders.pdf_url` to the storage path (new signed-URL scheme).
      Needs a new script once we know where the PDFs live in Dataverse (Q11.3).

## 4. User migration (decided: clean, no invite, reset on 1st login)  [me]

- [ ] **[P0]** New script: Dataverse `contacts` (active, with email, linked to an account) →
      `auth.users` (`email_confirm: true`, random pw) + `profiles` + `user_companies`. With `--dry-run`.
- [ ] **[P0]** "Must set password" flag + set-password page + middleware guard (first login forces reset).
- [ ] **[P0]** Rule for **who is `company_admin`** per company. *(Q4.1)*
- [ ] **[P0]** Dedup: same email on multiple contacts; contacts with no email. *(Q4.2)*
- [ ] **[P1]** **Backfill `orders.user_id`** from migrated contacts (migrated orders are currently
      `user_id: null`). Needs the order's original owner contact captured during import. *(Q4.3)*
- [ ] **[P1]** Decide who gets `piedro_admin` / `branch_staff` and create those accounts. *(Q4.4)*

## 5. Email deliverability (Resend)  [you + me]

- [ ] **[P0]** Verified Piedro sending domain (move off `onboarding@resend.dev`). *(Q5.1)*
- [ ] **[P0]** SPF/DKIM/DMARC published (see §1).
- [ ] **[P0]** `EMAIL_FROM` set to the verified address.
- [ ] **[P1]** Test password-reset + order-confirmation emails land in inbox (not spam) for a NL recipient.

## 6. ERP / a-shell order integration  [both — see separate decision §6.1]

- [ ] **[P0 or bridge]** Orders placed in the new portal must reach a-shell. Until done, ERP is blind
      to new orders. Decide architecture (§6.1). *(Q6.1)*
- [ ] **[P0]** A stable **order export contract** (fields, additions JSON shape, status mapping).
- [ ] **[P1]** "exported/fetched" marker on orders so the ERP never re-imports the same order.
- [ ] **[P1]** Eliminate the **known flaws** of the current Dataverse→a-shell import. *(Q6.2 — list them)*
- [ ] **[P1]** Status sync back from ERP (production_state, etc.) into the portal, if wanted. *(Q6.3)*

### 6.1 Architectural fork (my recommendation)

| Option | How | Pros | Cons |
|---|---|---|---|
| **A — Bridge via Dataverse** | Portal dual-writes new orders back into Dataverse; a-shell unchanged. | ERP untouched; fastest to keep ERP working Monday. | Keeps Dataverse in the loop (the thing you're leaving); reproduces old flaws. |
| **B — a-shell reads Supabase directly** (recommended) | a-shell calls a portal export endpoint / Supabase REST with a service token; pulls orders + marks them fetched. | Removes Dataverse from the order path; clean, simplifiable, fixes flaws at the source. | a-shell import code must be changed; needs the export contract + auth. |

**Recommendation:** **B** long-term (it's literally what "ir mais longe e simplificar" means), with a
short-lived **A as a safety bridge** only if a-shell can't be changed before Monday. I need your flaw
list (Q6.2) and how a-shell authenticates/pulls today to design B.

## 7. Customer communication  [you, I can draft]

- [ ] **[P0]** Announcement: who sends, when, channel (email blast / old-portal banner / account mgrs). *(Q7.1)*
- [ ] **[P0]** First-login instructions (use "forgot password" to set your password), in NL/EN/FR/DE. *(I can draft)*
- [ ] **[P0]** Support channel during transition (email/phone) + who's on call. *(Q7.2)*
- [ ] **[P1]** Old-portal banner/redirect pointing to the new URL.

## 8. QA / smoke test (the GO/NO-GO checklist)  [both]

- [ ] **[P0]** Register/login + forced password reset works.
- [ ] **[P0]** Gallery browse + filters + exclusive-model visibility (owner vs non-owner).
- [ ] **[P0]** Full order: all 5 unit modes, additions, save draft, submit.
- [ ] **[P0]** PDF preview (watermark) + final PDF email (signed URL, private bucket).
- [ ] **[P0]** Admin: status change, `/admin/orders`, `/admin/products`, `/admin/companies`, branches.
- [ ] **[P0]** Roles: `user`, `company_admin`, `branch_staff`, `piedro_admin` each see the right scope.
- [ ] **[P0]** All 4 locales render (no leftover hardcoded PT).
- [ ] **[P0]** Migrated orders display correctly (even with `user_id` null until backfill).

## 9. Compliance / legal  [you + me]

- [ ] **[P0]** Privacy Policy / Terms / Impressum: real content (currently placeholders in `legal-info.ts`). *(Q9.1)*
- [ ] **[P0]** DPAs signed: Supabase, Vercel, Resend, Anthropic (patient data → US). Or disable chat. *(Q9.2)*
- [ ] **[P0]** **Validate & certify ALL generated legal/compliance documentation** before relying on it.
      The docs under `docs/compliance/` (COMPLIANCE-REPORT.en/.nl, CLIENT-ACTIONS.en/.nl) and the
      legal page texts in `src/lib/legal-info.ts` were **AI-drafted and are NOT legally certified** —
      they must be reviewed and signed off by a qualified DPO / legal counsel before launch. *(Q9.3)*
      Sub-tasks:
  - [ ] DPO/legal review of COMPLIANCE-REPORT (GDPR Art.9, MDR custom-made device, ISO 13485 §4.1.6).
  - [ ] Fill every placeholder in `legal-info.ts` (company legal name, address, KvK, contacts, DPO).
  - [ ] Confirm CLIENT-ACTIONS items are done and record evidence in the ISO dossier.
  - [ ] Version + date each doc and store the certified copies in the QMS / ISO dossier.
- [ ] **[P1]** ROPA, DPIA, retention schedule (MDR ≥10y), audit log — ISO 13485 dossier.
- See `docs/compliance/COMPLIANCE-REPORT.*.md` and `CLIENT-ACTIONS.*.md`.

## 10. Operational readiness  [both]

- [ ] **[P0]** RLS enabled & tested (migration 002) — defense in depth.
- [ ] **[P0]** `order-pdfs` bucket = **Private** (signed URLs depend on it).
- [ ] **[P0]** Rollback plan (revert DNS / restore Supabase snapshot).
- [ ] **[P1]** Error monitoring (Sentry or Vercel) + Supabase backup schedule.
- [ ] **[P1]** Rate limiting on `/api/chat` + PDF routes (cost/DoS).
- [ ] **[P1]** Admin MFA. **[P2]** SQL aggregation for dashboards; audit logging.

---

## Suggested 48h sequence (if going Monday)

1. **Sat:** answer the questionnaire; confirm domain/DNS/env/region; backups; decide ERP fork.
2. **Sat–Sun:** build user-migration script + set-password flow; build ERP export (or bridge).
3. **Sun:** freeze old portal → final Dataverse refresh → wipe+rebuild → migrate users → migrations.
4. **Sun night:** full smoke test (all locales/roles) → **GO/NO-GO**.
5. **Mon AM:** DNS switch + remove noindex → announce → monitor.

If ERP integration or user migration isn't solid by Sun night → **soft launch** (portal live, ERP
pulls via temporary bridge or manual export) and harden in week 1.
