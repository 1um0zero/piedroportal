# Piedro Portal — Compliance, Security & Quality Report

**Prepared for:** Inclusion in the ISO 13485 technical dossier of Piedro International
**System:** Piedro Portal — B2B ordering portal for custom orthopaedic footwear
**Document type:** Software / infrastructure compliance assessment
**Version:** 1.0
**Date:** 2026-06-04
**Status:** Pre-production assessment with gap analysis

> **Disclaimer.** This is a *technical* compliance assessment produced by the engineering team. It is **not legal advice**. The legal artefacts and data-protection conclusions (controller/processor roles, lawful bases, retention periods, DPIA outcome) must be reviewed and signed off by a qualified Data Protection Officer (DPO) and/or legal counsel before go-live.

---

## 1. System overview

The Piedro Portal is a **private, authenticated** web application (no anonymous ordering) used by orthopaedic clinics, clinicians and podologists to browse Piedro's catalogue and place orders for **custom-made orthopaedic footwear** for **named patients**.

| Layer | Technology | Provider | Role |
|---|---|---|---|
| Frontend / SSR | Next.js 16 (App Router), React 19 | Vercel | Hosting, CDN, serverless functions |
| Database | PostgreSQL | Supabase | Orders, profiles, companies, catalogue |
| Authentication | Supabase Auth (GoTrue) | Supabase | Email/password, sessions |
| File storage | Supabase Storage | Supabase | Product images, order PDFs, avatars |
| Transactional email | Resend API | Resend | Order notifications with PDF attachments |
| In-app assistant | Claude (Haiku) | Anthropic | Conversational order search/duplication |

### 1.1 Categories of personal data processed

| Data | Subject | GDPR classification |
|---|---|---|
| Email, full name, gender, avatar | Clinician (portal user) | Ordinary personal data (Art. 4) |
| Patient name / reference / clinician note | **Patient** | **Special category — health data (Art. 9)** |
| Orthopaedic measurements & "additions" (insoles, heel lifts, deformity corrections, sizes per foot) | **Patient** | **Special category — health data (Art. 9)** |
| Company, ERP code, country | Clinic (legal entity) | Business data |

The presence of **patient health data (Article 9 GDPR)** is the single most important driver of the obligations below. It raises the bar from "standard web app" to "processing of special-category data", which triggers stricter security, a likely **DPIA**, and careful **international-transfer** controls.

---

## 2. Applicable standards and legal references

### 2.1 Data protection (primary)

| Reference | Applies because | Key obligations for this portal |
|---|---|---|
| **Regulation (EU) 2016/679 (GDPR)** | EU data subjects (NL + EU clinics & patients) | Lawful basis (Art. 6) + Art. 9(2) condition for health data; transparency (Arts. 13–14); security (Art. 32); processor contracts (Art. 28); ROPA (Art. 30); breach notification 72 h (Arts. 33–34); DPIA (Art. 35) |
| **UK GDPR + Data Protection Act 2018** | UK clinics & patients | Equivalent to GDPR; ICO is supervisory authority; UK international-transfer rules (IDTA/Addendum) |
| **NL: UAVG (Uitvoeringswet AVG)** | Dutch establishment / clinics | Dutch implementation of GDPR; Autoriteit Persoonsgegevens (AP) is supervisory authority |
| **ePrivacy Directive 2002/58/EC (cookie rules)** | EU visitors | Consent for non-essential cookies/storage. *Current status: only essential auth cookies are used → consent banner not strictly required, but a cookie notice is recommended.* |
| **EU–US Data Privacy Framework / SCCs** | US sub-processors (Vercel, Resend, Anthropic) | Valid transfer mechanism required for personal data leaving the EEA/UK |

### 2.2 Medical device & quality system

| Reference | Relevance |
|---|---|
| **ISO 13485:2016** (client is certified) | The portal is **software used in the quality management system** → falls under **clause 4.1.6 (validation of QMS software)** and **clause 4.2 (document & record control)**. The portal is a *record-generating tool* in the order/realisation process (clause 7). |
| **Regulation (EU) 2017/745 (MDR)** | Custom-made orthopaedic footwear is typically a **custom-made device (Annex XIII)**. The order it captures is effectively the **prescription/statement (Annex XIII §1)**. Retention of that documentation: **min. 10 years** after the last device is placed on the market. |
| **UK MDR 2002 (as amended)** | Post-Brexit equivalent for UK-supplied custom-made devices; UKCA marking regime. |
| **ISO 14971** (risk management) / **IEC 62304** (medical-device software lifecycle) | *Likely out of scope for the portal itself* — the portal has **no medical purpose** (it does not diagnose, measure, or determine therapy; the clinician does). It is an ordering/administrative tool, so it is **not a medical device** and IEC 62304 does not apply. This determination should be **documented** (a short "qualification statement") and kept in the dossier. ISO 14971 applies to the *footwear*, not the portal. |

### 2.3 Information security & quality (recommended / best practice)

| Reference | Why it matters here |
|---|---|
| **ISO/IEC 27001 / 27002** | Industry baseline for an ISMS. Even if Piedro is not 27001-certified, aligning the portal's controls to Annex A demonstrates "appropriate technical measures" under GDPR Art. 32. The cloud providers below are 27001-certified, which Piedro can cite. |
| **ISO/IEC 27701** | Privacy extension to 27001 — useful evidence of GDPR accountability. |
| **ISO/IEC 27018** | Protection of PII in public cloud (Supabase/Vercel align to it). |
| **EN 301 549 / WCAG 2.1 AA** + **European Accessibility Act (Dir. 2019/882)** | Accessibility. The EAA (in force June 2025) primarily targets B2C e-commerce; a B2B clinical portal is lower-risk, but WCAG 2.1 AA is a reasonable target and is increasingly expected in healthcare procurement. |

### 2.4 Provider certifications Piedro can cite in the dossier

- **Vercel** — SOC 2 Type II; ISO 27001; GDPR-compliant DPA available.
- **Supabase** — SOC 2 Type II; ISO 27001; HIPAA-capable (on higher plans); GDPR DPA + EU region available.
- **Resend** — SOC 2; GDPR DPA available.
- **Anthropic** — SOC 2 Type II; ISO 27001; ISO 42001 (AI); offers a Commercial DPA and **zero-data-retention** options.

> Collect and file the signed **DPA** from each of the four providers. These, plus their certificates, are direct evidence for ISO 13485 supplier control (clause 7.4) and GDPR Art. 28.

---

## 3. Required legal artefacts, on-portal text and logos

The portal is **not public**, but authenticated B2B medical portals still require the following. Items marked **MISSING** are not yet present in the application.

### 3.1 Legal documents / pages

| Artefact | Purpose | Status |
|---|---|---|
| **Privacy Policy / Data Protection Notice** | GDPR Arts. 13–14. Must address **both** the clinician (user) and the **patient** whose data is entered. Identify controller(s), lawful basis, Art. 9 condition, recipients/sub-processors, transfers, retention, rights, DPO contact. | **MISSING** — add a `/privacy` page, linked in footer + at registration |
| **Terms of Use / Terms of Service** | Defines the contractual relationship, acceptable use, account responsibilities, liability. | **MISSING** — add `/terms` |
| **Cookie notice** | Even with only essential cookies, a short notice ("we use essential cookies to keep you signed in") is best practice. | **MISSING** (low priority — no consent needed for essential only) |
| **Data Processing Agreement (DPA)** between Piedro and each clinic | Clarifies who is controller/processor for patient data and the security commitments. **Critical** given health data. | **MISSING** (legal/commercial document, not in-app) |
| **Sub-processor list** (public or on request) | Transparency on Vercel/Supabase/Resend/Anthropic. | **MISSING** — include in Privacy Policy |
| **Legal notice / Imprint (Impressum)** | Required in some jurisdictions (e.g. Germany DDG, NL company-info rules): legal name, registered address, registration number, VAT, contact. | **MISSING** — add to footer / `/legal` |
| **Records of Processing Activities (ROPA)** | GDPR Art. 30 — internal register. | **MISSING** (internal doc) |
| **Data Protection Impact Assessment (DPIA)** | GDPR Art. 35 — **likely mandatory**: large-scale processing of special-category (health) data. | **MISSING** (internal doc) |
| **Breach-response procedure** | 72-hour notification (Art. 33). | **MISSING** (internal doc) |
| **Data-subject-rights procedure** | Access/rectification/erasure/portability, balanced against medical retention. | **MISSING** (internal doc) |
| **Consent / lawful-basis statement at data entry** | The clinic must have a lawful basis to enter patient data; the portal should surface a short notice on the order form. | **MISSING** (UI note + clinic-side process) |

### 3.2 On-portal text and logos

- **Footer** with: company legal name, © year, links to Privacy, Terms, Legal Notice, and "Sub-processors". (Currently absent on most pages.)
- **Piedro logo + ISO 13485 certification mark** — the ISO mark may only be displayed per the **certification body's rules** (usually with cert number; the mark belongs to the certifier, not the standard). Confirm usage rules with the notified/certification body before placing it.
- **CE / UKCA marking** belongs on the *device and its documentation* (footwear), **not** on the portal UI. Do not place CE on the website to avoid implying the software is a CE-marked device.
- **Cookie/Privacy** link visible before/at login.

---

## 4. Software development lifecycle (for ISO 13485 §4.1.6 & §7.3-style control)

ISO 13485 requires that software used in the QMS be **validated** and that changes be **controlled and traceable**. Current state and gaps:

| Control | Current state | Gap / action |
|---|---|---|
| Version control | ✅ Git + GitHub, full history | OK |
| Branching & change records | ⚠️ Work committed directly to `master` | Define a documented branch/PR + review policy; commit messages already descriptive |
| Code review | ⚠️ Informal | Document a review step (even single-reviewer) for traceability |
| CI/CD | ✅ Vercel auto-deploy on push | Document the pipeline; add a deployment approval/record for production |
| Build/lint/type-check | ⚠️ `tsc` clean; ESLint has pre-existing errors; no CI gate | Add a CI gate (type-check + lint + build must pass before deploy) |
| **Automated tests** | ❌ **No test suite** | **Gap.** ISO 13485 §4.1.6 expects documented software **validation**. Add: (a) a validation plan, (b) test protocols for the order workflow and access control, (c) execution records. At minimum, unit tests on server actions + an end-to-end "place order" test. |
| Requirements traceability | ❌ None formal | Maintain a lightweight requirements ↔ test matrix in the dossier |
| Environments | ✅ Separate prod (Vercel); dev local | Document; consider a staging environment for pre-prod validation |
| Configuration / secrets | ✅ Env vars, not committed (`.env*` git-ignored) | OK; document secret-rotation procedure |

---

## 5. Security assessment

### 5.1 Controls in place ✅

- **Transport security:** HTTPS/TLS enforced by Vercel; HSTS available.
- **Authentication:** Supabase Auth (GoTrue) — passwords hashed (bcrypt) server-side, never stored in app; email confirmation on registration; httpOnly session cookies.
- **Authorisation / RBAC:** three roles (`user`, `company_admin`, `piedro_admin`); every admin page and server action re-checks the role server-side.
- **Multi-tenant isolation:** orders are scoped by `user_companies`; regular users see only their own orders, company admins see their companies, Piedro admins see all. *(Hardened 2026-06-04: order creation now validates company membership and forces status server-side.)*
- **Encryption at rest:** Supabase Postgres & Storage encrypted (AES-256) by the provider.
- **Secrets:** service-role key and API keys held in environment variables, server-only; `.env*` git-ignored (verified).
- **Input of elevated state blocked:** users cannot create orders at elevated statuses (server-side enforcement).

### 5.2 Security gaps ⚠️ / ❌ (remediation required)

| # | Severity | Finding | Remediation |
|---|---|---|---|
| S1 | 🔴 High | **Patient health data is sent to Anthropic (US)** by the in-app assistant: chat tools query `patient_name`, clinician, sizes and additions and pass them to the Claude API. This is an **international transfer of Article 9 data**. | Sign Anthropic's **DPA + enable zero-data-retention**; document the transfer (SCCs/DPF) in the ROPA; **or** restrict the assistant so it does not return patient identifiers; **or** make the assistant opt-in per clinic. Until resolved, treat as a transfer risk. |
| S2 | 🔴 High | **Order PDFs containing patient data are emailed via Resend (US)** to a Piedro address. International transfer + the recipient address is a hard-coded fallback. | Sign Resend DPA; confirm transfer mechanism; verify a **Piedro-owned domain** as sender (currently `onboarding@resend.dev`, a sandbox/test sender — not production-grade and may be undeliverable). Ensure the destination address is configured, not a fallback. |
| S3 | 🟠 Med | **Data residency unconfirmed.** EU/UK health data should be stored in an **EU region**. The Supabase project region is not documented. | Confirm and document the Supabase region (recommend **EU — Frankfurt**). If not EU, plan migration. Document Vercel function region too. |
| S4 | 🟠 Med | **No database Row-Level Security (RLS)** as defence-in-depth. The app relies on the service-role key + application checks. The `user_companies` migration did not enable RLS. | **Prepared:** policies written in `migrations/002_rls_policies.sql` — run in staging, test, then apply to production. |
| S5 | 🟠 Med | **No audit/access log** of who viewed or changed patient data. | ISO 13485 record control + GDPR accountability expect this. Add an append-only audit log (who, what, when) for order create/read/update/status changes. |
| S6 | 🟠 Med | **Two unauthenticated API routes:** `/api/orders/send` and `/api/orders/preview`. | **Resolved:** `/api/orders/send` deleted (dead duplicate); `/api/orders/preview` now requires an authenticated session. |
| S7 | 🟡 Low | **Email HTML not escaped** (`patient_name`, `reference`, `full_name` interpolated into email HTML). | **Resolved:** all user/patient values are HTML-escaped; the sender is configurable via `EMAIL_FROM`. |
| S8 | 🟡 Low | **No security headers / CSP.** | **Resolved:** CSP, HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy and Permissions-Policy added in `next.config`; portal set to `noindex` + `robots.txt`. |
| S9 | 🟡 Low | **No rate limiting** on auth and the AI chat endpoint. | Add rate limiting (e.g. Vercel/Upstash) to mitigate brute force and cost-abuse. |
| S10 | 🟡 Low | **MFA not enforced** for privileged (`piedro_admin`) accounts. | Enable Supabase MFA, at least for admins. |
| S11 | 🟡 Low | **Password policy** is min 8 chars, client-side only. | Enforce server-side via Supabase Auth password policy. |

### 5.3 Recommended assurance activities

- Independent **penetration test** before go-live (and annually).
- **Vulnerability monitoring** of dependencies (Dependabot / `npm audit` in CI).
- Document an **incident-response / breach** runbook (detect → contain → assess → notify within 72 h → record).

---

## 6. Backup, recovery & business continuity

| Topic | Current / required | Action |
|---|---|---|
| Database backups | Supabase provides automated daily backups; **Point-in-Time Recovery (PITR)** is available on paid plans | Confirm the plan; **enable PITR**; document **RPO** (e.g. ≤ 24 h, or minutes with PITR) and **RTO** |
| Storage backups (PDFs, images, avatars) | Supabase Storage is durable but **not automatically point-in-time recoverable like the DB** | Define a backup/export job for the `order-pdfs` bucket (orders are records that must survive — see retention) |
| Restore testing | Not documented | **Perform and record a test restore** at least annually — auditors ask for evidence the backup actually works |
| Backup encryption & location | Provider-encrypted, EU region (to confirm — S3) | Document |
| Disaster recovery plan | Not documented | Write a short DR plan: provider outage, data loss, key compromise; include provider status pages and escalation contacts |
| Business continuity | Vercel + Supabase are highly available (multi-AZ) | Document the dependency and SLA expectations |

---

## 7. Data retention & data-subject rights

- **Retention conflict to resolve:** MDR custom-made device documentation must be kept **≥ 10 years**, while GDPR requires **storage limitation** (don't keep PII longer than necessary). Define a **retention schedule** that keeps the *device record* for the legal minimum while minimising/pseudonymising patient identifiers where possible.
- **Right to erasure** is constrained by the medical-record retention obligation — document this exception in the Privacy Policy and the rights procedure.
- Provide processes for **access, rectification, portability, restriction, objection**.
- Consider **pseudonymisation** of patient identifiers in analytics/dashboards (the admin dashboards already aggregate, which is good).

---

## 8. Gap analysis — prioritised action plan

| Priority | Item | Owner | Type |
|---|---|---|---|
| **P0 — before go-live** | S1 Anthropic transfer of health data — DPA + zero-retention or restrict assistant | Eng + DPO | Security/Legal |
| **P0** | S2 Resend transfer + verified production sender domain | Eng + DPO | Security/Legal |
| **P0** | Privacy Policy, Terms, Legal Notice pages + footer | Eng + Legal | Legal |
| **P0** | Sign & file DPAs (Vercel, Supabase, Resend, Anthropic) | DPO | Legal |
| **P0** | DPIA for health-data processing | DPO | Legal |
| **P0** | S3 Confirm EU data residency (Supabase region) | Eng | Security |
| **P1 — soon after** | S5 Audit logging of patient-data access/changes | Eng | Security/ISO |
| **P1** | Software validation: validation plan + test protocols + automated tests | Eng/QA | ISO 13485 §4.1.6 |
| **P1** | S4 Enable RLS; S6 secure/remove unauth API routes | Eng | Security |
| **P1** | ROPA, breach procedure, data-subject-rights procedure, retention schedule | DPO | Legal/ISO |
| **P2** | S7 email escaping, S8 security headers/CSP, S9 rate limiting, S10 admin MFA, S11 password policy | Eng | Security |
| **P2** | CI gate (type-check/lint/build); document SDLC; staging env | Eng | ISO/Quality |
| **P2** | Penetration test; dependency scanning | Eng | Assurance |
| **P3** | WCAG 2.1 AA accessibility pass; cookie notice; UI i18n completeness | Eng | Quality |

---

## 9. Statement for the ISO dossier (summary)

> The Piedro Portal is a private, authenticated B2B ordering application built on a modern, security-reviewed stack (Next.js on Vercel, Supabase, Resend, Anthropic), all of whose infrastructure providers hold **SOC 2 Type II** and **ISO/IEC 27001** certifications. The application enforces role-based access control and per-company data isolation, uses TLS in transit and provider-managed AES-256 encryption at rest, keeps all source code under version control with traceable change history, and deploys through an automated pipeline.
>
> The portal is assessed as **software used within the quality management system (ISO 13485 §4.1.6)** and **not a medical device** (no medical purpose). It generates records relevant to the custom-made-device order process (MDR Annex XIII).
>
> Outstanding items required before production launch are tracked in §8, the most significant being formalisation of international-transfer controls for patient health data (DPAs with US sub-processors), the data-protection documentation set (Privacy Policy, DPIA, ROPA), confirmation of EU data residency, documented software validation/testing, and audit logging. Once these are closed, the portal will meet the technical and organisational measures expected for processing of special-category health data under GDPR and for inclusion in an ISO 13485 quality system.

---

*End of report. Maintain this document under version control; update on each material change to the system or its sub-processors.*
