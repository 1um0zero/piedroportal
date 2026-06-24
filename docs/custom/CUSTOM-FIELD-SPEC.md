# CUSTOM Orders — Field Spec & Build Plan

> Canonical reference for building the CUSTOM (custom-made shoes) order channel.
> Source of truth = Piedro's Excel [`custom_esquema_inicial.xlsx`](custom_esquema_inicial.xlsx)
> (flattened to [`custom_esquema_inicial.tsv`](custom_esquema_inicial.tsv)).
> Cross-referenced with the live Dataverse table `cr56f_wpp_custom_orders` (402
> cols) and the "Orders Custom" webform **Customization** customjs (30 KB
> conditional engine) — see [`../custom-orders-jscript/`](../custom-orders-jscript/).

## Goal

**Replicate the OSB (pair-by-pair) ordering flow for CUSTOM.** Same machine —
Gallery model pick → **Tab1** (overview, fewer fields) → **Tab2** (additions) →
**Tab3** (confirmation) — with Draft / PDF / Email identical. What changes: the
**form** (a much larger additions set) and, behind it, the **data structure**
(additions move to the 1:N `order_additions` table — migration 042). After CUSTOM
ships, OSB's wide-JSONB additions get converted into the same 1:N structure.

> "OSB" = our agreed shorthand for the existing pair-by-pair channel.

## Reuse from OSB (maximise)

The project literally began this way (jscript + Dataverse read from Power Pages);
the only difference now is **no data to import** (Dev env) → freedom to do it
right. Reuse the portal-side machinery wherever useful:

- Gallery → order entry (the "Order" button / `/gallery/[id]/order`).
- Tab1/Tab2/Tab3 shell, draft autosave (userId-scoped sessionStorage), validation.
- `AdditionsForm` config-driven engine (sections, sided L/R, conditional children,
  mm inputs with snap + " mm" suffix, toggle-title behaviour).
- `insertOrderAction` / status flow / dispatch counter / PDF / email / orders list.
- The 51 KB `Wpp_orders` `array_booleans[...] = [EN,NL,FR,DE]` map for i18n labels.

## Coding convention (from the Excel)

`cs<section>.<group>[.<sub>]_<suffix>` — e.g. `cs1.0.01_yn`, `cs2.24.01_lt_lf_rf`.

| Suffix | Meaning | Our config type / side |
|---|---|---|
| `_yn` | yes/no tickbox | `toggle`, side `g` (or sided when L/R) |
| `_lf_rf` | both feet, free-fill mm | `mm`, sided `{l,r}` |
| `_lf` / `_rf` | single side mm | `mm`, one side |
| `_hg_ch` | height label/choice (350mm…, I/II…) | option / row label |
| `_lf_rf_hg` | sided + height row | `mm` sided within a height row |
| `_m_ch` | material dropdown | `option` |
| `_ch` | generic dropdown | `option` |
| `_lt` / `_md` | lateral / medial qualifier | sub-key on the field |
| `.01`, `.02` | conditional child ("if yes, … appears") | `conditionalOn` parent |

101 cs-codes coded so far (cs1 = 44, cs2 = 57). UPPER / SHOE SOLES / Stiffeners
are **described in prose only** in the Excel — their conditional logic must be
lifted from the **Customization customjs** (`array_fields_trigger` + handlers) and
the `cr56f_` columns.

## Sections (= Tab2 collapsible groups)

| # | Section | Code | Excel rows | Status |
|---|---|---|---|---|
| 1 | **Overview** (Tab1, not additions) | — | 1–12 | Same as OSB: Customer*, Reference*, Type (Ladies/Men/Children), Pair/Left/Right |
| 2 | **Last & Fitting Shoes** | `cs1.*` | 13–59 | ✅ coded: last type, blueprint/footscan upload, 8 last measurements, leg/ankle circ. (6 heights), toe height (I–V), plastic fitting shoes, toe shape (4) |
| 3 | **Supplement** | `cs2.*` | 60–124 | ✅ coded: materials (multiform/cork), 9 orthoses types (M/L + material), heel/ball measurements, toe, rocker, flare back/front, leg-length diff |
| 4 | **Upper** | *(prose)* | 125–228 | ⚠️ model/article (line drawing), upper leather 1..n (linked to product sheet), lining* (dropdowns), closure* (laces/velcro/zipper/hooks/twist), stretch, ankle-heel/quarter (3/6mm), collar padding (4/6/10mm), tongue (padding/reinforcement/velcro/incision), AFO, busk, extra laces |
| 5 | **Shoe Soles** | *(prose)* | 229–286 | ⚠️ heel/hollow-wedge/wedge (M/L), height, rocker sole (heel/joint/toes mm), carbon insole, sole stiffening, soles (pics), rounded/flare/inwards/sach/thomas |
| 6 | **Stiffeners & Toe** | *(prose)* | 287–303 | ⚠️ stiffener type (20 options, 1st/2nd layer heights back/medial/lateral), toe options (normal/short/front/wing + material, protective cap) |
| — | Urgent order | *(prose)* | 304 | placement TBD (OSB has urgent flag) |

\* = OBLIGED (required).

## Notable details / open items

- **Pictures pending**: toe shape, supplement options, soles, stiffener 20 options
  — "WILL SEND YOU LATER ON". Build with placeholders; wire images when delivered.
- **Upper leather** is linked to the product sheet (catalogue) → dropdown sourced
  from the model picked in Gallery. Confirms the "parts from base model" decision.
- **Lining & Closure are OBLIGED** — Tab2 validation must enforce.
- Rocker / soles say "same as pair-by-pair" → reuse OSB's sole logic & profiles.
- "Excel may have drifted from the DB" (Jorge) → Excel wins on *organization*;
  the customjs + `cr56f_` columns win on *exact conditional behaviour*. Reconcile
  per field when building each section.

## Build sequence (mirrors OSB)

1. **Run migration 042** (Supabase) — `order_type` + `order_additions`. ⟵ Jorge.
2. **`custom-additions-config.ts`** — the CUSTOM field config (sections above,
   cs-codes as keys, types/sides/conditionalOn, i18n). Build section by section:
   cs1 → cs2 (coded) first, then Upper/Soles/Stiffener from customjs.
3. **Custom explode** — writer that turns the config + values into `order_additions`
   rows (reuse the `explodeAdditions` shape; type-aware value columns).
4. **Route + form** — `/custom` entry from Gallery, Tab1/Tab2/Tab3 reusing the OSB
   shell, `CustomAdditionsForm` driven by the new config.
5. **List / detail / PDF / email** — surface CUSTOM (order_type badge), reuse OSB.
6. **Validate** with Anabela → later: company/model gating, then convert OSB
   additions into `order_additions` too.
