# Zolen Piedro — sole master (AUTHORITATIVE, supersedes email A1–A8)

Source: `docs/sole-hierarchy/Zolen Piedro.xlsx` (Anabela, 2026-06-15). Parsed by
`scripts/parse-zolen.mjs`. Each group has a **Sole** axis and a **Sole Plate** axis.
Group numbering is **per section** (KIDS Group 1 ≠ ADULTS Group 1).

## KIDS
| Code | Name | Sole | Plate | #models |
|---|---|---|---|---|
| — | No adjustments | — | — | 9 |
| 3/5 | Cup Sole + High & Mid Tops (cupsole nieuw+oud) | EVA Black/White, PU White/Black | Fish Black/Amber | 20 |
| 1 | Stitched Down | EVA Lightweight Black/Off-White, Full Rubber Black/Amber/Blue/Pink/White | — | 17 |
| 4 | Trainers | EVA Runner ×10 (with spoilers) | Fish Black/Amber | 9 |

## ADULTS (Groups 1–12)
| Code | Name | Sole | Plate | #models |
|---|---|---|---|---|
| 1 | Cupsole OUD Ladies | PU Black/White (Ladies) | TR Black/Brown, Fish B/A, Nora Astro Star LW B/A, Nora Astrolight Delta Black/Pale Brown/Jeans Blue, Stone Grey, Vibram | 7 |
| 2 | Cupsole OUD Men | PU Black/White (Men) | (same plate set as G1) | 10 |
| 3 | Runner | "Runner soles all" | Fish Black/Amber | 21 |
| 4 | Sneaker | Sneaker White/Off-White/Beige/Grey/Black | (same plate set as G1) | 15 |
| 5 | Klassiek | EVA Taupe/Brown/Black | — | 4 |
| 6 | Diab Klassiek | EVA Lightweight Taupe/Black | — | 16 |
| 7 | Cupsole (new) Men | EVA Cupsole Men Black/White | (same plate set as G1) | 6 |
| 8 | Klassiek Heren | Lightweight Vibram Black/Brown, Forli Uomo, Full Rubber Montana Black/Brown | — | 13 |
| 9 | Klassiek Heren 2 | — | Nora Astrolight Delta Black/Pale Brown/Jeans Blue, Stone Grey | 4 |
| 10 | No adjustments | — | — | 10 |
| 11 | Diab Group | — | Fish B/A, Nora Astro Star LW B/A, Nora Astrolight Delta ×3, Stone Grey, Vibram | 4 |
| 12 | Livingstone | Lightweight Vibram Black/Brown, Full Rubber Montana Black/Brown | — | 3 |

(Full member lists: run `node scripts/parse-zolen.mjs`.)

## Triage reconciliation (Anabela's returned Excel)
- "SIM" = HAS adjustment (group given); "NAO" = no adjustment. (She inverted the header label.)
- Triage groups map onto Zolen ADULTS groups. EXCEPTION: she wrote 48051→G12, 48951→G13, 48961→G14,
  but **Zolen puts all three in Group 12 (Livingstone)** — Zolen wins (G13/G14 don't exist).
- "NAO" styles = Zolen Group 10 (No adjustments) members.

## ⚠ BLOCKER — option values not in additions-config
Zolen introduces **22 SOLE + 11 PLATE values absent from additions-config** (and renamed):
- Renames: `Piedro TR Sole Black` vs config `Piedro Runner Black`; `Rubber Sole Fish Black` vs `Fish Black`;
  `EVA Nora Astro Star Lightweigth Sole Black` (typo + " Sole") vs `EVA Nora Astro Star Lightweight Black`.
- New plates: `EVA Nora Astrolight Delta Black / Pale Brown / Jeans Blue`, `EVA Nora Astrolight Stone Grey`,
  `Rubber Sole Vibram`.
- New soles: gender-tagged `PU Black/White (Ladies)/(Men)`, `EVA Cupsole Men Black/White`,
  `Sneaker White/Off-White/Beige/Grey/Black`, the 10 `EVA Runner … Spoiler` combos, and the vague
  `Runner soles all`.
- Axis mismatch: Zolen "Sole" maps to DIFFERENT config fields per group (PU/EVA Cupsole→pu_type;
  EVA Taupe/Brown→sole_type; Vibram/Montana→runner_sole; Sneaker→ZSM-style prefab). Zolen "Sole Plate"
  ≈ runner_sole but with new values. So it is NOT a clean filter of existing fields.

DECISIONS NEEDED (Jorge): see chat 2026-06-15 — naming/canonicalisation, ERP/Dataverse impact
(cr56f_6evawedgecolour / 6spoiler / 6runnersole / 6puevabumper), and whether to restructure the
sole-section fields into a clean per-group Sole + Sole Plate model. sole-profiles.ts (built from the
old email A1–A8) is now SUPERSEDED and must be rebuilt from this master once decisions are made.
