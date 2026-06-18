# ZSM sole dependencies — per-model spec (WORKING DRAFT)

> Source: Anabela e-mail, "initial list" relayed by Jorge 2026-06-15.
> Status (ZSM section): **CONFIRMED 2026-06-17** — second Anabela e-mail (post ZSM meeting)
> restates the exact same model lists (ZSM-1 = 6, ZSM-2 = 36) + prefab colours, and adds two
> firm requirements: (a) ZSM users must see ONLY ZSM models (Piedro catalogue hidden);
> (b) the Sole Sheet is given as ONE FLAT list of "type + colour" (≈129 entries), identical for
> both options. Field labels confirmed: "Amendment Prefab **Sneaker** Sole" (ZSM-1) /
> "Amendment Prefab **Runner** Sole" (ZSM-2) + "Amendment Sole Sheet". NL given; FR/DE still needed.
> ZSM go-live: client tests now (Jun 2026), big launch September 2026.
> (Adults/Kids sections below remain initial/unverified.)
> This is the model→profile map that the legacy portal never had. See
> docs/legacy/additions-builder.js and memory project-sole-hierarchy / project-zsm-additions.

ZSM models are B-prefix styles (`BXXXX`, non-conforming nomenclature — see reference-style-nomenclature).
The codes below are **`style_name`** (CONFIRMED Jorge 2026-06-15) — so the profile maps at the
style level, applying to all colourways of that style. Models come in consecutive pairs (even/odd),
likely two colourways of the same style.

**Additive, not replacing** (CONFIRMED Jorge 2026-06-15): on these models the user still chooses
the regular sole as normal, AND gets prefab + sole-sheet on top. The standard additions sections
stay; prefab+sole-sheet are extra fields.

Each ZSM model gains **two new toggle-gated fields**, both **non-sided** ("equal for both feet"):

1. **Amendment Prefab Sole** — toggle No/Yes; if Yes → pick one of 3 colours.
   Sole *type* (Sneaker vs Runner) is fixed by the model's option group, not chosen by the user.
2. **Amendment Sole Sheet** — toggle No/Yes; if Yes → pick from the type×colour list (§Sole-sheet list).
   This list is **identical** for Option 1 and Option 2.

Legacy mapping: this is exactly `array_ZSM_prefab_sole` (idx 0 = Sneaker, idx 1 = Runner) +
`array_ZSM_sole_sheet_colours` (the 20 type→allowed-colours profiles). Anabela's list below
reconstructs/confirms that table.

---

## Option ZSM 1 — Prefab **Sneaker** Sole

Prefab colours: **White 09 · Light Beige 19 · Black 81**
(pictures to follow)

Models (6):
B5760, B5761, B5715, B5716, B5725, B5726

## Option ZSM 2 — Prefab **Runner** Sole

Prefab colours: **White 09 · Light Grey 56 · Black 81**
(pictures to follow)

Models (36):
B5748, B5749, B5758, B5759, B5746, B5747, B5750, B5751, B5732, B5733,
B5740, B5741, B5762, B5763, B5727, B5728, B5723, B5724, B5744, B5745,
B5734, B5735, B5742, B5743, B5754, B5755, B5713, B5714, B5764, B5765,
B5756, B5757, B5730, B5731, B5752, B5753

---

## Sole-sheet list — type → allowed colours (shared by both options)

20 sole-sheet types, each with its own permitted colour set. Selecting a type should
restrict the colour dropdown to these (legacy: dependent field `cr56f_7zsmsolesheetcolour`).

| # | Type | Allowed colours |
|---|------|-----------------|
| 1 | EVA Lavero Soft 6 mm | White, Beige, Light Beige, Mid Brown, Taupe, Brown, Grey, Blue |
| 2 | EVA Lavero Soft 8 mm | Brown, Black |
| 3 | EVA Mandorlo 6 mm | Brown, Black |
| 4 | Optimum 6 mm | White, Beige, Light Beige, Mid Brown, Taupe, Brown, Grey, Black |
| 5 | Vibram 8870 5 mm | Brown, Black |
| 6 | Vibram 8860 6 mm | Brown, Black |
| 7 | EVA Rubber Astro Star 4 mm | White, Beige, Light Beige, Mid Brown, Taupe, Brown, Grey, Blue, Black |
| 8 | EVA Rubber Astro Star 6 mm | White, Beige, Light Beige, Mid Brown, Taupe, Brown, Grey, Blue, Black |
| 9 | EVA Rubber Astrolight Delta 4 mm | White, Beige, Light Beige, Mid Brown, Taupe, Brown, Black |
| 10 | EVA Rubber Astrolight Delta 6 mm | White, Beige, Light Beige, Mid Brown, Taupe, Brown, Black |
| 11 | EVA Rubber Anna 4 mm | White, Beige, Light Beige, Mid Brown, Taupe, Brown, Grey, Blue, Black |
| 12 | EVA Rubber Anna 6 mm | White, Beige, Light Beige, Mid Brown, Taupe, Brown, Grey, Blue, Black |
| 13 | Lavero Flex Rubber 4 mm | White, Beige, Light Beige, Mid Brown, Taupe, Brown, Grey, Blue, Black |
| 14 | Lavero Flex Rubber 6 mm | White, Beige, Light Beige, Mid Brown, Taupe, Brown, Grey, Blue, Black |
| 15 | Rubber Tire 6 mm | Honey, Brown, Black |
| 16 | Vibram 2002 6 mm | Brown, Black |
| 17 | Jony Sole 6 mm | White, Beige, Light Beige, Honey, Brown, Grey, Black |
| 18 | Astrolight Delta 6 mm | Red, Blue |
| 19 | Tire 8 mm | Red, Blue, Orange, Yellow, Brown, Black |
| 20 | Sportflex 8 mm | White, Yellow, Orange, Green, Red, Grey, Blue, Black, Brown |

Colour universe used here (14): White, Beige, Light Beige, Mid Brown, Taupe, Brown, Grey,
Blue, Black, Honey, Red, Orange, Yellow, Green.
(Matches legacy `array_ZSM_colours`: 09/17/19/30/32/34/35/38/41/46/56/78/81/102/103.)

---

---

# ADULTS sole dependencies (non-ZSM)

> Source: Anabela e-mail relayed by Jorge 2026-06-15. Codes assumed `style_name` (TO CONFIRM —
> ZSM was confirmed style_name; adults likely too). 4-digit regular style numbers.

**KEY FINDING:** these 8 Adults profiles ARE the legacy `array_sole_amendments` (the "dead" array
in additions-builder.js L506-518). Cross-checked and they match — the array was the Adults profile
set, just never wired to a model→row map. Anabela's lists below are that missing map.

Each profile = a set of amendment fields, each toggle-gated (No/Yes), each with its own restricted
option list. Note the **field LABEL itself varies per profile** (PU Bumper / EVA Bumper / EVA Sole /
Sportive Sole / EVA Lightweight Sole / Sole), even though legacy collapsed them onto a few generic
Dataverse fields (cr56f_6puevabumper, cr56f_6evawedgecolour, cr56f_6spoiler, cr56f_6runnersole).
**Design question:** do we relabel one generic field per profile, or model distinct fields?

### Shared sole-sheet lists
- **Sheet A** (profiles 1,2,3,6): Piedro TR Sole Black, Piedro TR Sole Amber, Rubber Sole Tire Black,
  Rubber Sole Tire Amber, Rubber Sole Fish Black, Rubber Sole Fish Amber,
  EVA Nora Astro Star Lightweight Sole Black, EVA Nora Astro Star Lightweight Sole Amber (8)
- **Sheet B** (profile 4): EVA Nora Astro Star Lightweight Sole Black,
  EVA Nora Astro Star Lightweight Sole Amber (2)

### Profiles

| # | Amendment field(s) → options | Sole sheet | Models | legacy row |
|---|------------------------------|-----------|--------|-----------|
| A1 | **PU Bumper**: White, Black | Sheet A | 4800, 4318, 4610, 4590, 4580, 4527, 4523, 3614⚠, 3612, 3613, 3611, 3618, 3617, 3627, 3628, 3590, 3591 (17) | row 0 |
| A2 | **EVA Sole**: Grey, White, Taupe · **Spoiler**: Black, Dark Brown, Light Grey, Dark Grey, Dark Blue, Red, Amber, Cobalt | Sheet A | 4807, 4804, 4802, 4323, 4327, 4560, 4550, 4570, 4620, 4326, 4900, 5313, 5303, 5300, 3604, 3603, 3606, 3605, 5200, 3614⚠ (20) | row 4 |
| A3 | **Sportive Sole**: White, Black, Beige, Grey | Sheet A | 4801, 4808, 4810, 4803, 4809, 4901, 5315, 5314, 5305, 5302, 5311, 5316, 5201 (13) | row 5 |
| A4 | **EVA Sole**: Taupe, Black | Sheet B | 3469, 3467, 3485 (3) | row 6 |
| A5 | **EVA Lightweight Sole**: Taupe, Black | — (none) | 3345, 3340, 3337, 3341, 3346, 3370, 3371, 3335, 3330 (9) | row 7 |
| A6 | **EVA Bumper**: White, Black | Sheet A | 5312, 5304, 5301, 5310, 5308, 5309 (6) | row 8 |
| A7 | **Sole**: Lightweight Vibram Sole Black, Lightweight Vibram Sole Brown, Lightweight Sole Forli Uomo, Full Rubber Sole Montana Black, Full Rubber Sole Montana Brown | (header says sheet, none listed ⚠) | 3542, 3543, 3540, 3541, 3599, 3597, 3598, 3595, 3596, 3520, 3521, 3524, 5306 (13) | row 9 |
| A8 | **Sole**: Nora Sole Plate Blue with Light Body Colour, Nora Sole Plate Black with Light Body Colour, Nora Sole Plate Black with Black Body Colour | (header says sheet, none listed ⚠) | 3502, 3506, 3504, 3508 (4) | row 10 |

**All other shoes: no adjustable soles** (explicit in email).

### Adults conflicts / gaps to resolve
- ⚠ **3614 appears in BOTH A1 and A2.** Need Anabela to say which (or if intentional dual).
- ⚠ **A7 & A8** headers say "sola e sole sheet" but only the sole list is given — is there a sole
  sheet for these, or just the sole? (legacy rows 9/10 have empty sheet → likely just the sole.)
- EVA Sole has TWO different option sets (A2: Grey/White/Taupe vs A4: Taupe/Black) — confirm distinct.
- FR/DE labels still needed for all amendment field names.

---

# KIDS sole dependencies

> Source: Anabela e-mail relayed by Jorge 2026-06-15. Codes assumed `style_name`. These map to
> the original "PIEDRO SOLES KIDS" Excel (Cup Sole / Stitched Down / Trainers / High & Mid Tops).
> Maps to legacy `array_sole_amendments` rows 0-3.

**No adjustment** (no sole section at all): 2299, 2301, 2309
(NB: Excel image showed more no-adjust codes — 2212, 2213, 1700-1702, 1800 — but the e-mail only
lists these 3. Confirm whether the others are also no-adjust or just not yet covered.)

### Profiles

| # | Amendment field(s) → options | Sole sheet | Models | legacy row |
|---|------------------------------|-----------|--------|-----------|
| K1 | **PU Bumper**: White, Black | Fish Black, Fish Amber | 2210, 2211, 2267 (3) | row 0 |
| K2 | **Sole** → first pick category, then colour (NESTED): EVA Lightweight → {Black, Amber, Off-White} · Full Rubber Sole → {Black, Amber, Blue, Pink, White} | — | 2303, 2307, 2310, 2510, 2311, 2480, 2406, 2407, 2451, 2460, 2482, 2483, 2484, 2488, 2489, 2492, 2504, 2508 (18) | row 1 |
| K3 | **EVA Sole Unit**: Black, Grey, White, Brown | Piedro Black, Piedro Amber ⚠(NL says Fish Black/Amber) | 2034, 2038, 2060, 2089 (4) | row 2 |
| K4 | **PU Bumper**: White, Black | Rubber Sole Tire Black, Rubber Sole Tire Amber, Rubber Sole Fish Black, Rubber Sole Fish Amber, EVA Nora Astro Star Lightweight Black, EVA Nora Astro Star Lightweight Amber (6) | 2105, 2115, 2118, 2123, 2126, 2133, 2137, 2151, 2160, 2189 (10) | row 3 |

### Kids notes / gaps
- ⚠ **K2 is a two-level conditional**: Sole=Yes → choose EVA Lightweight vs Full Rubber → then a
  colour set that DIFFERS per category. More complex than a flat option list — design must support
  nested dependency (category → colour).
- ⚠ **K3 EN/NL mismatch**: sole sheet labelled "Piedro Black – Piedro Amber" (EN) but
  "Fish Black – Fish Amber" (NL). Confirm canonical values.
- This completes the legacy `array_sole_amendments` cross-check: rows 0-3 = Kids K1-K4,
  rows 4-10 = Adults A2-A8. (Adults A1 has no exact legacy row — PU bumper but full Sheet A.)

---

# Tab2 sole selector — design (DECIDED 2026-06-15)

Decision (Jorge): **swatch cards with loupe**. Replace text chips for the sole-amendment
fields (pu_type, sole_type, spoiler, runner_sole) with an image-based swatch grid:
- Card = sole photo + name below; selected → gold ring + check; hover → lift + loupe affordance.
- Loupe reuses the gallery magnifier to inspect tread detail.
- K2 nested: step 1 material (EVA Lightweight | Full Rubber) → step 2 colour swatches.
- Pattern already exists: `rocker` field uses ImageChips (type:'image' + images map). Extend that.

### Source images
docs/solas_type/solas/ADULTS/ — 16 PNGs, 2 semantic groups:
- Side-profile (bumpers/wedges): Cupsole PU/EVA Black/White (Ladies + Mens), Sneaker ×5 colours.
- Bottom-tread (sheets/plates): Rubber Sole Fish Black/Amber, Soleplate TR Piedro Black/Brown.
Maps: Cupsole→pu_type, Sneaker→ZSM prefab, Fish/TR Piedro→runner_sole.

### Image prep TODO (independent of Anabela — can start anytime)
1. Normalize via existing pipeline ([[project_image_pipeline]]): uniform white bg + trim + center,
   downscale ~700px / <150KB (currently 1.5–3MB each).
2. Soft shadow / light neutral plinth so all-black soles (Cupsole PU Black, TR Black) read.
3. Consistent canvas/scale per group (bumpers = wide rail, footprints = portrait tile).
4. Cupsole is gender-specific (Ladies vs Mens) → pick by product.section.
5. Upload to a Supabase bucket + map option value → image path (mirror rocker images approach).
6. Photos still missing (Anabela "will follow"): EVA/Sportive/Lightweight sole colours, spoilers,
   Vibram/Montana/Forli, Nora plates, ZSM prefab colours. Selector must degrade gracefully
   (fallback to name-only chip when no image yet).

---

## Open questions (for Anabela / Jorge)

1. ~~Are the model codes `style_name` or `colour_id`?~~ → **`style_name`** (Jorge 2026-06-15).
2. ~~Replace the regular sole section, or additive?~~ → **Additive** — user picks regular sole
   AND gets prefab+sole-sheet on top (Jorge 2026-06-15).
3. Prefab Sole "No" — is Yes/No mandatory, or default No?
4. Sole sheet: confirm the type→colour table is final (20 types). Any models that allow a
   *subset* of these 20 types, or do all ZSM models get all 20?
5. i18n: NL labels given (Aanpassing Prefab …Zool, Aanpassing Zoolplaat). Need FR/DE too.
6. Any ZSM models NOT in either list (i.e. ZSM models with no prefab/sole-sheet option)?
