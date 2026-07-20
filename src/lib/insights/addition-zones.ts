// ─────────────────────────────────────────────────────────────────────────────
// Additions Insights — anatomical zone map
//
// Maps every additions-config field key to a ZONE of the shoe, so an order's
// additions can be painted onto a generic shoe "maquette" as a heat map and
// totalled per region (toe / upper / closure / ankle / heel / joint / sole).
//
// This is the SINGLE SOURCE OF TRUTH for field → zone. It is deliberately kept
// next to (and validated against) `additions-config.ts`: `unmappedFieldKeys()`
// lists any config field that is neither mapped here nor explicitly declared
// non-anatomical, so a newly-added addition can never silently fall off the map.
//
// Curatorial note (for Anabela): the assignment below is the first reviewed cut.
// A few fields are judgement calls (e.g. the Achilles stiffener cutout → upper;
// heel float/wedge → heel rather than sole). Adjust here only — everything
// downstream (heatmap, drill-down, totals) reads from this file.
// ─────────────────────────────────────────────────────────────────────────────

import { SECTIONS } from '@/components/order/additions-config'

export type ShoeZone = 'toe' | 'upper' | 'closure' | 'ankle' | 'heel' | 'joint' | 'sole'

/** Display order — antepé → retropé → base. Used for legends and lists. */
export const SHOE_ZONES: ShoeZone[] = ['toe', 'upper', 'closure', 'ankle', 'heel', 'joint', 'sole']

/** i18n label keys live under `insights.zones.<zone>` in messages/*.json. */
export const ZONE_LABEL_KEY: Record<ShoeZone, string> = {
  toe:     'zones.toe',
  upper:   'zones.upper',
  closure: 'zones.closure',
  ankle:   'zones.ankle',
  heel:    'zones.heel',
  joint:   'zones.joint',
  sole:    'zones.sole',
}

// Field key → zone. Only ANATOMICAL, physical modifications appear here; the
// non-physical global flags (no logo, plastic fitting shoe, urgent) are declared
// in NON_ANATOMICAL below and are intentionally excluded from the shoe map.
const FIELD_ZONE: Record<string, ShoeZone> = {
  // ── Section: additions ─────────────────────────────────────────────────────
  lat_joint_w: 'joint',
  med_joint_w: 'joint',
  lat_heel_w:  'heel',
  med_heel_w:  'heel',
  hammer_toe:  'toe',
  toe_box:     'toe',
  bunionette:  'toe',
  hallux_v:    'toe',
  depth_fore:  'toe',
  depth_toe:   'toe',
  xw_cone:     'joint',
  str_heel:    'heel',
  heel_depth:  'heel',
  haglund:     'heel',
  haglund_h:   'heel',   // child of haglund
  haglund_p:   'heel',   // child of haglund
  xs_med_ank:  'ankle',
  med_ank_h:   'ankle',  // child of xs_med_ank
  xs_lat_ank:  'ankle',
  lat_ank_h:   'ankle',  // child of xs_lat_ank

  // ── Section: upper ─────────────────────────────────────────────────────────
  lining:       'upper',
  cl_laces:     'closure',
  cl_velcro:    'closure',
  stiff_hard:   'upper',
  stiff_cutout: 'upper',  // Achilles cutout in the heel counter — a stiffener/upper mod
  toe_puffs:    'toe',
  toe_puffs_rim:'toe',
  str_leather:  'upper',
  instep_front: 'upper',
  colour_mod:   'upper',
  pad_tongue:   'closure', // padding on the tongue → closure region
  zipper:       'closure',

  // ── Section: sole ──────────────────────────────────────────────────────────
  rocker:       'sole',
  rocker_toes:  'sole',
  rocker_joint: 'sole',
  rocker_heel:  'sole',
  pu_bumper:    'sole',
  pu_type:      'sole',
  amend_sole:   'sole',
  sole_type:    'sole',
  runner_sole:  'sole',
  zsm_prefab:   'sole',
  zsm_prefab_colour: 'sole',
  zsm_sheet:    'sole',
  zsm_sheet_type:   'sole',
  zsm_sheet_colour: 'sole',
  sole_float:   'sole',
  sf_medial:    'sole',
  sf_lateral:   'sole',
  sf_taper:     'sole',
  heel_float:   'heel',
  hf_medial:    'heel',
  hf_lateral:   'heel',
  sole_wedge:   'sole',
  sw_medial:    'sole',
  sw_lateral:   'sole',
  sw_taper:     'sole',
  heel_wedge:   'heel',
  hw_medial:    'heel',
  hw_lateral:   'heel',
  hw_taper:     'heel',
  heel_round:   'heel',
  gen_raise:    'sole',
  gen_raise_add:'sole',
  carb_insole:  'sole',
  carb_sole:    'sole',
  sach_heel:    'heel',
  sep_soles:    'sole',
  sep_sheets:   'sole',
  thomas_med:   'heel',
  thomas_lat:   'heel',

  // ── Section: others ────────────────────────────────────────────────────────
  welt_prot:  'sole',   // welt protector runs around the sole edge
  prot_toe:   'toe',
  xtra_laces: 'closure',
}

/**
 * Fields intentionally NOT placed on the shoe: they are order-level flags, not
 * physical shoe modifications, so they never carry a zone. Kept explicit so the
 * completeness check below can tell "unmapped by omission" from "excluded on
 * purpose".
 */
export const NON_ANATOMICAL = new Set<string>(['no_logo', 'plastic_fit', 'urgent'])

/** The zone a field belongs to, or `null` for non-anatomical order flags. */
export function zoneForField(fieldKey: string): ShoeZone | null {
  return FIELD_ZONE[fieldKey] ?? null
}

/**
 * Config-drift guard: every field in `additions-config.ts` must be either mapped
 * to a zone or listed in NON_ANATOMICAL. Returns the keys that are neither, so a
 * build/dev check (or the metrics layer) can surface a newly-added addition that
 * still needs a zone. Empty array = the map is complete.
 */
export function unmappedFieldKeys(): string[] {
  const missing: string[] = []
  for (const section of SECTIONS) {
    for (const field of section.fields) {
      if (FIELD_ZONE[field.key] == null && !NON_ANATOMICAL.has(field.key)) {
        missing.push(field.key)
      }
    }
  }
  return missing
}
