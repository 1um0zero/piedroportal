/**
 * Sole profiles — per-model restriction of the sole-amendment options.
 *
 * Background: docs/sole-hierarchy/dependencies.md. Each shoe model (style_name)
 * may belong to a sole PROFILE that restricts which options are available in the
 * sole-amendment fields of the order form. A model WITHOUT a profile keeps the full
 * option lists (general rule = current behaviour) — so unclassified / doubtful models
 * are never broken.
 *
 * This file is the single source of truth for:
 *   1. PROFILE_OPTIONS — what each profile allows, per controlled field.
 *   2. PROFILE_STYLES  — which style_name (base, K/B-insensitive) maps to each profile.
 *
 * Controlled fields (config keys in additions-config.ts §Sole):
 *   pu_type (PU/EVA Bumper) · sole_type (EVA/Sportive/Lightweight Sole) ·
 *   spoiler · runner_sole (Sole Sheet / Prefab / Plate).
 * A controlled field NOT listed in a profile is HIDDEN for that model.
 * Non-controlled sole fields (rocker, floats, wedges, carbon…) are never touched.
 *
 * Values below are the EXACT option strings from additions-config.ts.
 * Kids membership follows the "PIEDRO SOLES KIDS" Excel (adopted source); adults
 * follow Anabela's e-mail profiles A1–A8. ZSM (prefab + sole-sheet→colour cascade)
 * is NOT handled here yet — those fields don't exist in additions-config.
 */

export const SOLE_CONTROLLED_KEYS = ['pu_type', 'sole_type', 'spoiler', 'runner_sole'] as const
export type SoleControlledKey = typeof SOLE_CONTROLLED_KEYS[number]
export type SoleProfileOptions = Partial<Record<SoleControlledKey, string[]>>

// Sole Sheet "A" (adults A1/A2/A3/A6) — mapped to runner_sole config values.
// FLAG: email "Piedro TR Sole" mapped to config 'Piedro Runner …' (TR≈Runner — confirm).
const SHEET_A = [
  'Piedro Runner Black', 'Piedro Runner Amber',
  'Tire Black', 'Tire Amber',
  'Fish Black', 'Fish Amber',
  'EVA Nora Astro Star Lightweight Black', 'EVA Nora Astro Star Lightweight Amber',
]

export const PROFILE_OPTIONS: Record<string, SoleProfileOptions> = {
  // ── KIDS ──────────────────────────────────────────────────────────────────
  NoAdj: {}, // no sole amendment fields

  // Cup Sole (G3). FLAG: Excel sole col also lists EVA Black/White; email K1 only PU.
  K1: { pu_type: ['PU White', 'PU Black'], runner_sole: ['Fish Black', 'Fish Amber'] },

  // Stitched Down (G1). FLAG: Excel omits 'EVA Lightweight Amber' that email K2 includes.
  K2: { sole_type: [
    'EVA Lightweight Black', 'EVA Lightweight Amber', 'EVA Lightweight Off-White',
    'Full Rubber Black', 'Full Rubber Amber', 'Full Rubber Blue', 'Full Rubber Pink', 'Full Rubber White',
  ] },

  // Trainers (G4). FLAG: K3 sole sheet labelled "Piedro"(EN)/"Fish"(NL) — using union pending answer.
  K3: {
    sole_type: ['EVA Black', 'EVA Grey', 'EVA White', 'EVA Brown'],
    runner_sole: ['Piedro Runner Black', 'Piedro Runner Amber', 'Fish Black', 'Fish Amber'],
  },

  // High & Mid Tops (G5).
  K4: {
    pu_type: ['PU White', 'PU Black'],
    runner_sole: [
      'Tire Black', 'Tire Amber', 'Fish Black', 'Fish Amber',
      'EVA Nora Astro Star Lightweight Black', 'EVA Nora Astro Star Lightweight Amber',
    ],
  },

  // ── ADULTS ────────────────────────────────────────────────────────────────
  A1: { pu_type: ['PU White', 'PU Black'], runner_sole: SHEET_A },
  A2: { sole_type: ['EVA Grey', 'EVA White', 'EVA Taupe'], spoiler: ['Black', 'Dark Brown', 'Light Grey', 'Dark Grey', 'Dark Blue', 'Red', 'Amber', 'Cobalt'], runner_sole: SHEET_A },
  A3: { sole_type: ['Sportive White', 'Sportive Black', 'Sportive Beige', 'Sportive Grey'], runner_sole: SHEET_A },
  A4: { sole_type: ['EVA Taupe', 'EVA Black'], runner_sole: ['EVA Nora Astro Star Lightweight Black', 'EVA Nora Astro Star Lightweight Amber'] },
  A5: { sole_type: ['EVA Lightweight Taupe', 'EVA Lightweight Black'] },
  A6: { pu_type: ['EVA White', 'EVA Black'], runner_sole: SHEET_A },
  // A7/A8 "Amendment Sole" → runner_sole. FLAG: header mentioned sole sheet but none listed → no sheet for now.
  A7: { runner_sole: ['Lightweight Vibram Sole Black', 'Lightweight Vibram Sole Brown', 'Lightweight Sole Forli Uomo', 'Full Rubber Sole Montana Black', 'Full Rubber Sole Montana Brown'] },
  A8: { runner_sole: ['Nora Sole Plate Blue with Light Body Colour', 'Nora Sole Plate Black with Light Body Colour', 'Nora Sole Plate Black with Black Body Colour'] },
}

/**
 * Style → profile membership (base style_name, K/B-insensitive).
 * Kids: "PIEDRO SOLES KIDS" Excel groups. Adults: Anabela e-mail A1–A8.
 * EXCLUDED (doubts → general rule / see-all): 3614 (in both A1 & A2).
 */
export const PROFILE_STYLES: Record<string, string[]> = {
  // Kids — from Excel
  NoAdj: ['2299', '2301', '2309', '2212', '2213', '1700', '1701', '1702', '1800'],
  K1: ['2269', '2270', '2272', '1906', '1900', '1903', '1901', '1902', '1904', '1905'],
  K2: ['2303', '2312', '2314', '2315', '2310', '2316', '2504', '2482', '2492', '2488', '2407', '2483', '2484', '2480', '2489', '2601', '2604'],
  K3: ['2089', '2034', '2134', '2090', '2038', '2138', '2060', '2091', '2092'],
  K4: ['2160', '2123', '2133', '2105', '2115', '2151', '2189', '2118', '2137', '2126'],
  // Adults — from e-mail (3614 omitted: ambiguous A1/A2)
  A1: ['4800', '4318', '4610', '4590', '4580', '4527', '4523', '3612', '3613', '3611', '3618', '3617', '3627', '3628', '3590', '3591'],
  A2: ['4807', '4804', '4802', '4323', '4327', '4560', '4550', '4570', '4620', '4326', '4900', '5313', '5303', '5300', '3604', '3603', '3606', '3605', '5200'],
  A3: ['4801', '4808', '4810', '4803', '4809', '4901', '5315', '5314', '5305', '5302', '5311', '5316', '5201'],
  A4: ['3469', '3467', '3485'],
  A5: ['3345', '3340', '3337', '3341', '3346', '3370', '3371', '3335', '3330'],
  A6: ['5312', '5304', '5301', '5310', '5308', '5309'],
  A7: ['3542', '3543', '3540', '3541', '3599', '3597', '3598', '3595', '3596', '3520', '3521', '3524', '5306'],
  A8: ['3502', '3506', '3504', '3508'],
}

// Reverse index: base style_name → profile key.
const STYLE_TO_PROFILE: Record<string, string> = {}
for (const [profile, styles] of Object.entries(PROFILE_STYLES))
  for (const s of styles) STYLE_TO_PROFILE[s] = profile

/** Normalise a style_name to its base code (strip trailing K/B scale-variant suffix). */
export function baseStyle(styleName: string | null | undefined): string {
  return (styleName ?? '').replace(/[KB]$/, '')
}

/** The sole profile key for a model, or null (→ general rule, full options). */
export function soleProfileFor(styleName: string | null | undefined): string | null {
  if (!styleName) return null
  return STYLE_TO_PROFILE[styleName] ?? STYLE_TO_PROFILE[baseStyle(styleName)] ?? null
}

/**
 * Filter a controlled field's option list by the active profile.
 * - no profile, or non-controlled field → returns the full list unchanged.
 * - controlled field listed in the profile → intersection (preserves config order).
 * - controlled field NOT in the profile → [] (caller hides the field).
 */
export function allowedSoleValues(profileKey: string | null, fieldKey: string, fullValues: string[]): string[] {
  if (!profileKey) return fullValues
  if (!(SOLE_CONTROLLED_KEYS as readonly string[]).includes(fieldKey)) return fullValues
  const allowed = PROFILE_OPTIONS[profileKey]?.[fieldKey as SoleControlledKey]
  if (!allowed) return []
  return fullValues.filter(v => allowed.includes(v))
}
