# Piedro Portal — Client Action List (for the ISO 13485 dossier)

**Companion to:** `COMPLIANCE-REPORT.md`
**Date:** 2026-06-04
**Purpose:** Everything that depends on Piedro (the client) to make the Portal production-ready and legally compliant. The engineering team has already implemented the technical controls listed in §1; the items below require commercial, legal, configuration or operational decisions by Piedro.

> Legend — **P0** = required before go-live · **P1** = shortly after launch · **P2** = ongoing.

---

## Already implemented by the engineering team ✅

- Company-membership model unified; order flow access fixed.
- Order creation hardened (server-side company-ownership and status validation).
- Removed an unauthenticated email endpoint; authenticated the PDF-preview endpoint.
- HTML-escaping of all patient/clinic values in emails.
- Security headers + Content-Security-Policy; portal excluded from search engines (`robots.txt`, `noindex`).
- Profile updates moved to a server action with a field whitelist (no role self-escalation).
- Legal pages scaffolded: **Privacy Policy**, **Terms of Use**, **Legal Notice**, plus footer, sub-processor table and an essential-cookies notice.
- Database Row-Level Security policies prepared (`migrations/002_rls_policies.sql`).
- Email client hardened against missing configuration.

---

## 1. Data-protection & contracts (legal / DPO)

| # | Priority | Action | Why |
|---|---|---|---|
| 1 | **P0** | **Sign and file Data Processing Agreements (DPAs)** with Vercel, Supabase, Resend and Anthropic. | GDPR Art. 28; ISO 13485 supplier control (7.4). Evidence for the dossier. |
| 2 | **P0** | **Anthropic (AI assistant) handles patient data sent to the US.** Either sign Anthropic's DPA **and enable zero-data-retention**, or instruct us to restrict the assistant so it does not expose patient identifiers, or make it opt-in per clinic. | Art. 9 health data + international transfer. |
| 3 | **P0** | **Resend (email) sends patient PDFs to the US.** Confirm DPA + transfer mechanism, and **verify a Piedro-owned sender domain** (DNS records); then set the `EMAIL_FROM` variable. Current sender is a non-deliverable test address. | Deliverability + transfer compliance. |
| 4 | **P0** | **Carry out a DPIA** (Data Protection Impact Assessment). | Art. 35 — likely mandatory for large-scale health data. |
| 5 | **P0** | **Decide the controller / processor relationship** with clinics and put a **DPA template** in place for them. | Determines lawful basis & responsibilities. |
| 6 | **P1** | Create the **Records of Processing Activities (ROPA)**, a **breach-response procedure** (72-hour notification), a **data-subject-rights procedure**, and a **retention schedule** balancing the 10-year device-record duty against GDPR storage limitation. | Art. 30/33/34; ISO record control. |
| 7 | **P0** | **Have legal counsel review** the Privacy Policy, Terms and Legal Notice, then **translate them (NL/FR/DE)**. | The in-app pages are English drafts with placeholders. |

## 2. Configuration & hosting (Piedro / engineering together)

| # | Priority | Action | Why |
|---|---|---|---|
| 8 | **P0** | **Confirm the Supabase project is in an EU region** (e.g. Frankfurt). If not, plan a migration. | Health-data residency. |
| 9 | **P0** | **Fill the placeholders in `src/lib/legal-info.ts`**: legal name, registered address, KvK number, VAT/BTW, phone, contact email, DPO email, ISO 13485 certificate number. | Powers the legal pages & footer. |
| 10 | **P0** | **Set the production environment variables** in Vercel: `EMAIL_FROM`, `ORDER_NOTIFY_EMAIL`, `ADMIN_NOTIFY_EMAIL`, `NEXT_PUBLIC_CONTACT_EMAIL`, `NEXT_PUBLIC_DPO_EMAIL`, `NEXT_PUBLIC_SITE_URL`, `SUPABASE_WEBHOOK_SECRET`. | Replaces hard-coded test fallbacks. |
| 11 | **P0** | **Run `migrations/002_rls_policies.sql`** in a staging/branch database, test the full app, then apply to production. | Defence-in-depth (RLS). |
| 12 | **P0** | **Set the `order-pdfs` Storage bucket to Private** in Supabase. *(Done in code: the app now serves PDFs only through short-lived signed URLs.)* While the bucket stays public the objects remain reachable by URL. | Patient data must not be publicly reachable. |
| 13 | **P1** | **Enable MFA** for `piedro_admin` accounts and confirm the Supabase **password policy**. | Privileged-account protection. |
| 14 | **P2** | **Provision rate limiting** (Vercel/Upstash) for login and the AI assistant. | Brute-force / cost abuse. |

## 3. Backup, continuity & assurance (Piedro / operations)

| # | Priority | Action | Why |
|---|---|---|---|
| 15 | **P0** | **Confirm the Supabase plan and enable Point-in-Time Recovery (PITR)**; document **RPO/RTO**; schedule and **record a test restore**. | ISO record retention; auditors require evidence backups work. |
| 16 | **P1** | Define a backup/export routine for the **storage buckets** (PDFs, images). | Records must survive provider issues. |
| 17 | **P1** | Write a short **disaster-recovery plan** (provider outage, data loss, key compromise). | Business continuity. |
| 18 | **P1** | Commission an independent **penetration test** before go-live (repeat annually). | Independent assurance. |

## 4. Branding & marks

| # | Priority | Action | Why |
|---|---|---|---|
| 19 | **P1** | **Confirm ISO 13485 mark usage** with your certification body (mark + certificate number, per their rules). | The mark belongs to the certifier. |
| 20 | **P2** | Do **not** place CE/UKCA marks on the Portal UI — they belong on the footwear and its documentation. | Avoid implying the software is a CE-marked device. |

---

### Documents to include in the ISO dossier
`COMPLIANCE-REPORT.md` (this report), this action list, the signed sub-processor DPAs, the DPIA, the ROPA, the backup/restore evidence, the software-validation records (see report §4), and the penetration-test report.

*Not legal advice — to be reviewed by a DPO / legal counsel.*
