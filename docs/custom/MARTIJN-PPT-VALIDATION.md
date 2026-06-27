# CUSTOM — Validation against Martijn's PowerPoint

> Source: `docs/custom/martijn custom.pptx` (Piedro NL, Martijn) — the behaviour
> spec for the Power Pages CUSTOM form (12 slides + form screenshots).
> Compared against our portal build (`src/components/custom/*`,
> `custom-additions-config.ts`). Status: ✅ conforms · ⚠️ partial/differs · ❌ missing.
>
> **Headline:** the *structure* conforms (3 tabs, Lasts→Supplements→Upper, toe
> shape, leg-length). But several **option lists and field types differ** because
> our first build came from the Excel; Martijn's PPT + the supplied images
> (`Supplements/`, `Contreforts/`) are the more authoritative source for the
> actual options and their behaviour. Reconciliation list at the bottom.

## 1. Tabs / flow
| Martijn | Ours | Status |
|---|---|---|
| Tabs: **Customer · Customization · Confirmation** | Tab1 Customer&Product · Tab2 Customization · Tab3 Confirmation | ✅ |
| Landing page "choose your form: Lasts"; sections open in order 1-2-3-4 (bottom/Supplements/Upper/Lining) when a checkbox is clicked | Entry via Gallery → "Custom-made"; sections are accordions in Tab2 | ⚠️ different entry (ours reuses gallery — acceptable); the "open next section in order" stepper idea is NOT replicated |
| "Default pair, you can choose for one side" | `unit` PAIR / LEFT / RIGHT / LEFT_RIGHT | ✅ |

## 2. Tab 1 — Customer (screenshot image5)
| Martijn | Ours | Status |
|---|---|---|
| `0 style_color` (B5713.2500: Beige Suede), `user` | model card (style·colour) | ✅ |
| **Klant\*** (customer), **Clinicist**, **Patiënt**, **Klantreferentie\*** | Customer/Patient, Reference\*, Clinician | ⚠️ we merged Customer↔Patient; Martijn separates **Klant** (the clinic/account) from **Patiënt**. Split them. |

## 3. Lasts form (slides 4-5, screenshot image9)
| Martijn | Ours | Status |
|---|---|---|
| Houten leest / Gipsafdruk (No/Yes) | cs1.0.01/02_yn Wooden/Plaster | ✅ |
| Leesthoogte / Hakhoogte / Teenstoot / Teenhoogte (Lv/Rv) | cs1.0.01-04_lf_rf | ✅ |
| **Toe heights I-V** (mm, L/R) | cs1.31-35_lf_rf_hg | ✅ |
| **Last measurements — Meetpunten 1-8** | cs1.11-18 | ❌ **NAMES DIFFER — must reconcile** |
| Toe shape: Square/Pointed/Rounded/Nature (checkboxes) | cs1.5_toe_shape image chips | ✅ |
| Checkbox **"With supplement (default) / Without supplement"** | — | ❌ missing: a gate that enables/disables the whole Supplement section |

### 3a. ❌ The 8 measurement points differ
Martijn's **Meetpunten** (authoritative, Dutch):
1 Voetlengte · 2 Balomvang · 3 Lage wreef · 4 Hoge wreef · 5 Hielmaat · 6 Enkelmaat · 7 Teensprong · 8 Hielheffing

Our Excel-derived labels: 1 Foot Size · 2 Joint Width · 3 Joint Circumference · 4 Instep Circumference · 5 Long Heel Girth · 6 Heel Circumference · 7 Toe Depth · 8 Heel Height

→ These are **two different measurement sets**. The Piedro Excel and Martijn's PPT disagree. **Needs Piedro to confirm which is canonical** before we relabel cs1.11-18. (NB: this is also the fittr `/osb` measurement panel — Voetlengte/Balomvang/Lage+Hoge wreef etc., which sides with Martijn.)

## 4. Supplements form (slides 6-9, screenshot image16 — options shown WITH line-drawings)
| Martijn | Ours | Status |
|---|---|---|
| **Material** L/R **dropdown**: Multiform/cork · Microcork · Multiform. L fills R by default, editable. | cs2.11-13 = 3 separate toggles | ⚠️ should be ONE dropdown per side + L→R default |
| **Choose supplements** L/R **checkboxes, each with an illustration**: Standaard, Lage versteviging lateraal/mediaal/hiel, Hoge Kuip, Ezelsoren, … (+ amputation forefoot, tongue supplement, open achilles variants) | cs2.21-29 (Standard, Lat/Med Low Reinf, Heel Low Reinf, Surrounding/Lat/Med Orthoses, Forefoot Provision) | ⚠️ **option list differs** — adopt Martijn's list + the `Supplements/` images as chips |
| Low reinforcement → **dropdown 10-120 mm (step 5) + Other**, Lateral & Medial | free mm input | ⚠️ change to ranged dropdown + "Other" |
| **Padding on ankle**: Yes/No → dropdown Lat/Med 3/6 mm, *only on high reinforcement* | modelled under Upper (ankle 3/6mm) | ⚠️ move to Supplements + the "high reinforcement only" rule |
| **Leg-length difference** in mm | cs2.51/52 | ✅ |
| No defaults on the supplement checkboxes; client must fill L and R | conditional children appear on toggle | ⚠️ behaviour ok; remove any implicit defaults |

→ The `Supplements/` folder (18 PNGs: Standaard, Low/High reinforcement lat/med/heel, Hoge/Lage Kuip, Ezelsoor, Keerwand, Amputatie…) and `Contreforts/` (20 PNGs: stiffener reinforcements) are the **chip illustrations** — to be wired exactly like Toe Shape.

## 5. Upper form (slides 10-11, screenshots image23 = multi-panel shoe)
| Martijn | Ours | Status |
|---|---|---|
| **Leather per piece** — number of choices = number of pieces in the model picture (e.g. 13); pick leather per piece; L→R default, editable | cs3.leather_1-4 free text | ❌ **the big one** — this is the leather-by-colour selector (request #3) |
| Upper height: L→R default, adjustable | cs3.upper_height_lf_rf | ⚠️ add L→R auto-default |
| **Lining** dropdown, one option | cs3.lining_* | ✅ |
| Closure dropdown 1-7 "production decides"; Velcro passant **medial/lateral × left/right** (split per side); longer/width velcro mm; **Zipper** dropdown (along-laces / side-part × left/right × medial/lateral) | cs3.cl_* (simpler) | ⚠️ expand velcro/zipper to Martijn's per-side options |

## 6. Reconciliation backlog (what to change)
1. ❌ **Confirm the 8 measurement points** (Martijn/fittr vs Excel) → relabel cs1.11-18. *Needs Piedro.*
2. ⚠️ Split **Klant vs Patiënt** in Tab1.
3. ❌ Add **"With/Without supplement"** gate on the Supplement section.
4. ⚠️ **Supplement material** → single dropdown per side + L→R default.
5. ⚠️ Adopt Martijn's **supplement option list** + wire `Supplements/` images as chips.
6. ⚠️ **Low-reinforcement mm** → ranged dropdown (10-120 step 5) + Other; Lateral & Medial.
7. ⚠️ **Padding on ankle** → move to Supplements, "high reinforcement only".
8. ⚠️ Wire **Contreforts/** images to the Stiffener (cs5) options as chips.
9. ❌ **Leather-per-piece selector** (Upper) — the star feature; see leather-selector plan.
10. ⚠️ **L→R auto-default** behaviour (height, leather, material): fill R from L, editable.
11. ⚠️ Expand **velcro passant / zipper** to per-side options.

## 7. What already conforms (no action)
Tabs & 3-step flow · unit pair/side · Lasts (wooden/plaster + 4 last dims) · toe heights I-V · toe shape chips · leg-length difference · lining dropdown · overall section order (Lasts → Supplements → Upper).
