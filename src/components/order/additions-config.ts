// Config-driven additions form — sourced from Power Pages JS + Dataverse picklist metadata

import { soleFieldHidden } from './sole-profiles'
import { ZSM_SHEET_TYPES, ZSM_ALL_SHEET_COLOURS, ZSM_ALL_PREFAB_OPTIONS, ZSM_FIELD_KEY_SET, ZSM_REPLACED_KEYS, type ZsmGroup } from './zsm-profiles'

/** Whether a field should be hidden for this model's ZSM status.
 *  - non-ZSM model: hide all ZSM-specific fields.
 *  - ZSM model: hide the normal sole-amendment fields the ZSM block replaces. */
export function zsmFieldHidden(zsmGroup: ZsmGroup | null, fieldKey: string): boolean {
  if (zsmGroup) return ZSM_REPLACED_KEYS.has(fieldKey)
  return ZSM_FIELD_KEY_SET.has(fieldKey)
}

export type FieldType = 'mm' | 'option' | 'toggle' | 'text' | 'image'
export type SideType  = 'both' | 'global'

export interface AdditionField {
  key:             string         // Maps to additions.field_labels.<key> in messages/*.json
  type:            FieldType
  side:            SideType
  values?:         (number | string)[]
  conditionalOn?:  string         // show only when this sibling key is truthy
  dataverseKey?:   string         // Dataverse column name (without lf/rf suffix)
  dataverse?:      string         // for global (non-sided) fields
  closureOnly?:    'LACE' | 'VELCRO'  // show only when product has this closure
  collapse?:       boolean        // hide other chips once one is selected
  glb?:            { l: string; r: string }  // 3D model filenames in Supabase products/3d/
  images?:         Record<string, string>    // for type 'image': value → /public path of the diagram
}

export interface AdditionSection {
  key:    string                  // Maps to additions.sections.<key> in messages/*.json
  fields: AdditionField[]
}

// ── mm options (shorthand) ────────────────────────────────────────────────────
const mm1to10   = [1,2,3,4,5,6,7,8,9,10]
const mm4to10   = [4,6,8,10]
const mm2to8    = [2,4,6,8]
const mm1to20   = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20]
const mm1to60   = Array.from({ length: 60 }, (_, i) => i + 1)
const mm0to60   = Array.from({ length: 61 }, (_, i) => i)        // Tenen allows 0 (Anabela, 2026-06-26)
const mm5to25   = Array.from({ length: 21 }, (_, i) => i + 5)

export const SECTIONS: AdditionSection[] = [
  // ── Section 1: Additions ──────────────────────────────────────────────────
  {
    key: 'additions',
    fields: [
      { key: 'lat_joint_w',  type: 'mm',  side: 'both',  values: mm1to10,  dataverseKey: 'cr56f_lateraljointwidth',     glb: { l: 'joint_lateral_l.glb',   r: 'joint_lateral_r.glb' } },
      { key: 'med_joint_w',  type: 'mm',  side: 'both',  values: mm1to10,  dataverseKey: 'cr56f_medialjointwidth',      glb: { l: 'joint_medial_l.glb',    r: 'joint_medial_r.glb' } },
      { key: 'lat_heel_w',   type: 'mm',  side: 'both',  values: mm1to10,  dataverseKey: 'cr56f_lateralheelwidth',      glb: { l: 'heel_lateral_l.glb',    r: 'heel_lateral_r.glb' } },
      { key: 'med_heel_w',   type: 'mm',  side: 'both',  values: mm1to10,  dataverseKey: 'cr56f_medialheelwidth',       glb: { l: 'heel_medial_l.glb',     r: 'heel_medial_r.glb' } },
      { key: 'hammer_toe',   type: 'mm',  side: 'both',  values: mm4to10,  dataverseKey: 'cr56f_2hammertoe',            glb: { l: 'hammer_toe_l.glb',      r: 'hammer_toe_r.glb' } },
      { key: 'toe_box',      type: 'mm',  side: 'both',  values: mm1to10,  dataverseKey: 'cr56f_2toebox',               glb: { l: 'toe_box_l.glb',         r: 'toe_box_r.glb' } },
      { key: 'bunionette',   type: 'mm',  side: 'both',  values: mm4to10,  dataverseKey: 'cr56f_2bunionette',           glb: { l: 'bunionette_l.glb',      r: 'bunionette_r.glb' } },
      // NOTE: the hallux_valgus _l/_r GLBs are swapped at source — each shows the
      // bump on the LATERAL side instead of medial. A render audit (vs the correct
      // ankle/joint/bunionette models) confirmed this; cross-referencing l→_r and
      // r→_l puts the bump back on the medial side. (tracker §20.x)
      { key: 'hallux_v',     type: 'mm',  side: 'both',  values: mm4to10,  dataverseKey: 'cr56f_2halluxvalgus',         glb: { l: 'hallux_valgus_r.glb',   r: 'hallux_valgus_l.glb' } },
      { key: 'depth_fore',   type: 'mm',  side: 'both',  values: mm2to8,   dataverseKey: 'cr56f_2depthtoforepart',      glb: { l: 'depth_forefoot_l.glb',  r: 'depth_forefoot_r.glb' } },
      { key: 'depth_toe',    type: 'mm',  side: 'both',  values: mm2to8,   dataverseKey: 'cr56f_2depthtotoeheel',       glb: { l: 'depth_plantair_l.glb',  r: 'depth_plantair_r.glb' } },
      { key: 'xw_cone',      type: 'mm',  side: 'both',  values: mm1to20,  dataverseKey: 'cr56f_2extrawidthoncone',     glb: { l: 'width_cone_l.glb',      r: 'width_cone_r.glb' } },
      { key: 'str_heel',     type: 'mm',  side: 'both',  values: mm2to8,   dataverseKey: 'cr56f_2straightenheelclip',   glb: { l: 'straighten_heel_l.glb', r: 'straighten_heel_r.glb' } },
      { key: 'heel_depth',   type: 'mm',  side: 'both',  values: mm2to8,   dataverseKey: 'cr56f_2heeldepthonly',        glb: { l: 'heel_depth_l.glb',      r: 'heel_depth_r.glb' } },
      // Haglund + conditionals
      { key: 'haglund',      type: 'mm',  side: 'both',  values: mm4to10,  dataverseKey: 'cr56f_2haglundheelexostosis', glb: { l: 'heel_exostosis_l.glb',  r: 'heel_exostosis_r.glb' } },
      { key: 'haglund_h',    type: 'mm',  side: 'both',  values: mm4to10,  conditionalOn: 'haglund', dataverseKey: 'cr56f_3haglund_height_conditional' },
      { key: 'haglund_p',    type: 'mm',  side: 'both',  values: mm4to10,  conditionalOn: 'haglund', dataverseKey: 'cr56f_3haglund_position_conditional' },
      // Medial Ankle + conditional height
      { key: 'xs_med_ank',   type: 'text', side: 'both', dataverseKey: 'cr56f_3extraspacemedialankle', glb: { l: 'ankle_medial_l.glb',    r: 'ankle_medial_r.glb' } },
      { key: 'med_ank_h',    type: 'text', side: 'both', conditionalOn: 'xs_med_ank', dataverseKey: 'cr56f_3mankle_height_conditional' },
      // Lateral Ankle + conditional height
      { key: 'xs_lat_ank',   type: 'text', side: 'both', dataverseKey: 'cr56f_3extraspacelateralankle', glb: { l: 'ankle_lateral_l.glb',   r: 'ankle_lateral_r.glb' } },
      { key: 'lat_ank_h',    type: 'text', side: 'both', conditionalOn: 'xs_lat_ank', dataverseKey: 'cr56f_3ankle_height_conditional' },
    ],
  },

  // ── Section 2: Upper Adaptions ────────────────────────────────────────────
  {
    key: 'upper',
    fields: [
      { key: 'lining',        type: 'option', side: 'both', collapse: true, values: ['Leather','Synthetic Fur','Real Fur','Sympatex','Diabetic','Microfiber'], dataverseKey: 'cr56f_lining' },
      { key: 'cl_laces',      type: 'option', side: 'both', collapse: true, closureOnly: 'LACE', values: ['Eyelets','Hooks','D-Rings','Blind Eyelets','Buckle & Strap','BOA Closure'], dataverseKey: 'cr56f_closurelaces' },
      { key: 'cl_velcro',     type: 'option', side: 'both', collapse: true, closureOnly: 'VELCRO', values: ['Return Velcro','Lap-Over Velcro','Single Hand Velcro','Velcro Seperate'], dataverseKey: 'cr56f_closurevelcrostraps' },
      { key: 'stiff_hard',    type: 'option', side: 'both', collapse: true, values: ['Soft','Standard','Hard','Double','Extra padding'], dataverseKey: 'cr56f_stiffenerhardness' },
      { key: 'toe_puffs',     type: 'option', side: 'both', collapse: true, values: ['Soft','Standard','Hard'], dataverseKey: 'cr56f_toepuffs' },
      { key: 'toe_puffs_rim', type: 'toggle', side: 'both', dataverseKey: 'cr56f_toepuffsrim' },
      { key: 'str_leather',   type: 'toggle', side: 'both', dataverseKey: 'cr56f_stretchleather' },
      { key: 'instep_front',  type: 'mm',     side: 'both', values: mm5to25, dataverseKey: 'cr56f_instepmoretothefront' },
      { key: 'colour_mod',    type: 'text',   side: 'both', dataverseKey: 'cr56f_colourmodifications' },
      { key: 'pad_tongue',    type: 'mm',     side: 'both', values: mm4to10, dataverseKey: 'cr56f_extrapaddingontongue' },
      // Values mirror the Dataverse global option set cr56f_wpp_zipper (numeric-prefixed
      // labels) so they match migrated orders and cross-reference the ERP codes 9795800xx.
      { key: 'zipper',        type: 'option', side: 'both', collapse: true, values: ['1 Medial Zipper Next to closure','2 Medial Zipper Side','3 Lateral Zipper Next to closure','4 Lateral Zipper Next to closure + medial lace'], dataverseKey: 'cr56f_zipper' },
    ],
  },

  // ── Section 3: Sole & Heel ────────────────────────────────────────────────
  {
    key: 'sole',
    fields: [
      // Rocker + sub-options
      { key: 'rocker',       type: 'image',  side: 'both', collapse: true, values: ['Normal Rocker','Advancing Rocker','Polyphase Rocker','Delaying Rocker','2-Phase Rocker'], dataverseKey: 'cr56f_2rockersoletypes',
        images: {
          'Normal Rocker':    '/rocker/normal.png',
          'Advancing Rocker': '/rocker/advancing.png',
          'Polyphase Rocker': '/rocker/polyphase.png',
          'Delaying Rocker':  '/rocker/delaying.png',
          '2-Phase Rocker':   '/rocker/2-phase.png',
        } },
      { key: 'rocker_toes',  type: 'mm',     side: 'both', values: mm0to60, conditionalOn: 'rocker', dataverseKey: 'cr56f_2toes' },
      { key: 'rocker_joint', type: 'mm',     side: 'both', values: mm1to60, conditionalOn: 'rocker', dataverseKey: 'cr56f_2joint' },
      { key: 'rocker_heel',  type: 'mm',     side: 'both', values: mm1to60, conditionalOn: 'rocker', dataverseKey: 'cr56f_2heel' },
      // Amendment PU/EVA Bumper
      { key: 'pu_bumper',    type: 'toggle', side: 'both', dataverseKey: 'cr56f_6soleamendement2' },
      { key: 'pu_type',      type: 'option', side: 'both', collapse: true, values: ['PU Black','PU White','EVA Black','EVA White'], conditionalOn: 'pu_bumper', dataverseKey: 'cr56f_6puevabumper' },
      // Amendment Sole
      { key: 'amend_sole',   type: 'toggle', side: 'both', dataverseKey: 'cr56f_6soleamendement1' },
      { key: 'sole_type',    type: 'option', side: 'both', collapse: true, conditionalOn: 'amend_sole', values: ['EVA Black','EVA Taupe','EVA Grey','EVA White','EVA Lightweight Black','EVA Lightweight Taupe','Sportive Black','Sportive Beige','Sportive Grey','Sportive White','EVA Lightweight Amber','EVA Lightweight Off-White','Full Rubber Black','Full Rubber Amber','Full Rubber Blue','Full Rubber Pink','Full Rubber White','EVA Brown'], dataverseKey: 'cr56f_6evawedgecolour' },
      { key: 'spoiler',      type: 'option', side: 'both', collapse: true, conditionalOn: 'amend_sole', values: ['Black','Dark Brown','Light Grey','Dark Grey','Dark Blue','Red','Amber','Cobalt'], dataverseKey: 'cr56f_6spoiler' },
      { key: 'runner_sole',  type: 'option', side: 'both', collapse: true, conditionalOn: 'amend_sole', values: ['Piedro Runner Black','Piedro Runner Amber','Rubber Black','Rubber Amber','Fish Black','Fish Amber','Tire Black','Tire Amber','EVA Nora Astro Star Lightweight Black','EVA Nora Astro Star Lightweight Amber','EVA Lightweight Port Flex Black','EVA Lightweight Port Flex Amber','Lightweight Vibram Sole Black','Lightweight Vibram Sole Brown','Lightweight Sole Forli Uomo','Full Rubber Sole Montana Black','Full Rubber Sole Montana Brown','Nora Sole Plate Blue with Light Body Colour','Nora Sole Plate Black with Light Body Colour','Nora Sole Plate Black with Black Body Colour'], dataverseKey: 'cr56f_6runnersole' },
      // ZSM Prefab Sole + Sole Sheet — ZSM (B-prefix) models ONLY; these REPLACE the
      // PU/EVA Bumper + Amendment Sole fields above (which AdditionsForm hides on ZSM
      // models). Option lists are model/selection-dependent (see zsm-profiles.ts), so
      // the `values` here are the full superset for config/PDF; the form narrows them.
      { key: 'zsm_prefab',        type: 'toggle', side: 'both', dataverseKey: 'cr56f_7zsmprefabsoleamendement' },
      { key: 'zsm_prefab_colour', type: 'option', side: 'both', collapse: true, conditionalOn: 'zsm_prefab', values: ZSM_ALL_PREFAB_OPTIONS, dataverseKey: 'cr56f_7zsmprefabsole' },
      { key: 'zsm_sheet',         type: 'toggle', side: 'both', dataverseKey: 'cr56f_7zsmsolesheetamendement' },
      { key: 'zsm_sheet_type',    type: 'option', side: 'both', collapse: true, conditionalOn: 'zsm_sheet', values: ZSM_SHEET_TYPES, dataverseKey: 'cr56f_7zsmsolesheet' },
      { key: 'zsm_sheet_colour',  type: 'option', side: 'both', collapse: true, conditionalOn: 'zsm_sheet', values: ZSM_ALL_SHEET_COLOURS, dataverseKey: 'cr56f_7zsmsolesheetcolour' },
      // Float & Wedge with L/R sub-options
      { key: 'sole_float',   type: 'toggle', side: 'both', dataverseKey: 'cr56f_3solefloat' },
      { key: 'sf_medial',    type: 'mm',     side: 'both', values: mm1to20, conditionalOn: 'sole_float', dataverseKey: 'cr56f_3sf_medial' },
      { key: 'sf_lateral',   type: 'mm',     side: 'both', values: mm1to20, conditionalOn: 'sole_float', dataverseKey: 'cr56f_3sf_lateral' },
      { key: 'heel_float',   type: 'toggle', side: 'both', dataverseKey: 'cr56f_3heelfloat' },
      { key: 'hf_medial',    type: 'mm',     side: 'both', values: mm1to20, conditionalOn: 'heel_float', dataverseKey: 'cr56f_3hf_medial' },
      { key: 'hf_lateral',   type: 'mm',     side: 'both', values: mm1to20, conditionalOn: 'heel_float', dataverseKey: 'cr56f_3hf_lateral' },
      { key: 'sole_wedge',   type: 'toggle', side: 'both', dataverseKey: 'cr56f_4solewedge' },
      { key: 'sw_medial',    type: 'mm',     side: 'both', values: mm1to20, conditionalOn: 'sole_wedge', dataverseKey: 'cr56f_4sw_medial' },
      { key: 'sw_lateral',   type: 'mm',     side: 'both', values: mm1to20, conditionalOn: 'sole_wedge', dataverseKey: 'cr56f_4sw_lateral' },
      { key: 'heel_wedge',   type: 'toggle', side: 'both', dataverseKey: 'cr56f_4heelwedge' },
      { key: 'hw_medial',    type: 'mm',     side: 'both', values: mm1to20, conditionalOn: 'heel_wedge', dataverseKey: 'cr56f_4hw_medial' },
      { key: 'hw_lateral',   type: 'mm',     side: 'both', values: mm1to20, conditionalOn: 'heel_wedge', dataverseKey: 'cr56f_4hw_lateral' },
      // Others
      { key: 'carb_insole',  type: 'toggle', side: 'both', dataverseKey: 'cr56f_6removablecarboninsole' },
      { key: 'carb_sole',    type: 'toggle', side: 'both', dataverseKey: 'cr56f_6fullcarbonsoleplate' },
      { key: 'sach_heel',    type: 'toggle', side: 'both', dataverseKey: 'cr56f_6sachheel' },
      { key: 'sep_soles',    type: 'toggle', side: 'both', dataverseKey: 'cr56f_6separatesoles' },
      { key: 'sep_sheets',   type: 'toggle', side: 'both', dataverseKey: 'cr56f_6separatesheets' },
      { key: 'thomas_med',   type: 'toggle', side: 'both', dataverseKey: 'cr56f_6thomasheelmedial' },
      { key: 'thomas_lat',   type: 'toggle', side: 'both', dataverseKey: 'cr56f_6thomasheellateral' },
    ],
  },

  // ── Section 4: Others ─────────────────────────────────────────────────────
  {
    key: 'others',
    fields: [
      { key: 'welt_prot',   type: 'toggle', side: 'both',   dataverseKey: 'cr56f_7weltprotector' },
      { key: 'prot_toe',    type: 'toggle', side: 'both',   dataverseKey: 'cr56f_7protectivetoecap' },
      { key: 'xtra_laces',  type: 'toggle', side: 'global', dataverse: 'cr56f_7extrapairoflaces' },
      { key: 'no_logo',     type: 'toggle', side: 'global', dataverse: 'cr56f_nopiedrologo' },
      { key: 'plastic_fit', type: 'toggle', side: 'global', dataverse: 'cr56f_7plasticfittingshoes' },
      { key: 'urgent',      type: 'toggle', side: 'global', dataverse: 'cr56f_7urgent' },
    ],
  },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Build initial empty additions state from config */
export function emptyAdditions() {
  const out: Record<string, { l: unknown; r: unknown } | boolean | null> = {}
  for (const section of SECTIONS) {
    for (const field of section.fields) {
      if (field.side === 'global') {
        out[field.key] = false
      } else if (field.type === 'toggle') {
        out[field.key] = { l: false, r: false }
      } else if (field.type === 'text') {
        out[field.key] = { l: '', r: '' }
      } else {
        out[field.key] = { l: null, r: null }
      }
    }
  }
  return out
}

/** Count filled fields in a section (for the accordion badge) */
export function countFilled(
  additions: Record<string, unknown>,
  sectionKey: string,
): number {
  const section = SECTIONS.find(s => s.key === sectionKey)
  if (!section) return 0
  let count = 0
  for (const field of section.fields) {
    const val = additions[field.key]
    if (val == null) continue
    if (field.side === 'global') { if (val === true) count++; continue }
    const sv = val as { l: unknown; r: unknown }
    if (sv?.l != null && sv.l !== false && sv.l !== '') count++
    if (sv?.r != null && sv.r !== false && sv.r !== '') count++
  }
  return count
}

// ── adds_exclude (Power Pages parity) ──────────────────────────────────────────
// The product's `adds_exclude` column is a single string of Dataverse field ids,
// each prefixed with `#`, separated by `,`, and some carrying a trailing `=value`
// (e.g. `#cr56f_zipper,#cr56f_checkboxsection6,#cr56f_2heeldepthonly=1`).
// In Power Pages the match was a raw substring `indexOf("#<id>")`; we tokenise and
// match exactly to avoid prefix collisions (e.g. `cr56f_2heel` ⊂ `cr56f_2heeldepthonly`).

// Section-collapse triggers from the Power Pages form → our section keys, by the
// index order of `array_sections_trigger` / `array_fields_by_section` there.
const SECTION_EXCLUDE_TRIGGER: Record<string, string> = {
  cr56f_checkboxsection4: 'additions',
  cr56f_checkboxsection5: 'upper',
  cr56f_checkboxsection6: 'sole',
  cr56f_checkboxsection7: 'others',
}

/** Parse an adds_exclude string into a set of excluded Dataverse ids (lowercased, no `#`, no `=value`). */
export function parseAddsExclude(addsExclude: string | null | undefined): Set<string> {
  const out = new Set<string>()
  if (!addsExclude) return out
  for (const raw of addsExclude.split(',')) {
    const m = raw.trim().match(/^#?([a-z0-9_]+)/i)   // grab the id, drop leading # and any =value
    if (m) out.add(m[1].toLowerCase())
  }
  return out
}

/** Whether an entire section is excluded for this product (e.g. `#cr56f_checkboxsection6`). */
export function isSectionExcluded(sectionKey: string, addsExclude: string | null | undefined): boolean {
  const ids = parseAddsExclude(addsExclude)
  if (ids.size === 0) return false
  return Object.entries(SECTION_EXCLUDE_TRIGGER)
    .some(([trigger, sk]) => sk === sectionKey && ids.has(trigger))
}

// ── Required-child validation ───────────────────────────────────────────────────
// Every conditional child (a field with `conditionalOn`) is mandatory once its
// parent is active — these are the fields rendered with a red `*` in the form
// (their labels are `↳`-prefixed). This mirrors the Power Pages "show + require"
// behaviour. Returns the list of missing (sectionKey, fieldKey, side) tuples so
// the caller can block navigation and point the user at what's missing.
export type MissingRequired = { sectionKey: string; fieldKey: string; side: 'l' | 'r' }

/** Which foot columns are in play for a given unit. */
function activeSidesFor(unit: string): ('l' | 'r')[] {
  if (unit === 'LEFT_RIGHT') return ['l', 'r']
  if (unit === 'RIGHT') return ['r']
  return ['l']   // PAIR / LEFT / DIFF_SIZES → single 'l' column
}

function isSidedParentActive(
  additions: Record<string, unknown>, conditionalOn: string, side: 'l' | 'r',
): boolean {
  const parent = additions[conditionalOn]
  if (parent === null || parent === undefined) return false
  if (typeof parent === 'boolean') return parent
  const sv = parent as { l: unknown; r: unknown }
  const v = side === 'l' ? sv.l : sv.r
  return v != null && v !== '' && v !== false
}

function isChildFilled(
  additions: Record<string, unknown>, key: string, side: 'l' | 'r',
): boolean {
  const sv = additions[key] as { l: unknown; r: unknown } | null | undefined
  if (!sv) return false
  const v = side === 'l' ? sv.l : sv.r
  return v != null && v !== '' && v !== false
}

/** Find required conditional children that are visible + active but left empty. */
export function getMissingRequiredAdditions(
  additions: Record<string, unknown>,
  unit: string,
  addsExclude: string | null | undefined,
  soleProfile: string | null = null,
  zsmGroup: ZsmGroup | null = null,
): MissingRequired[] {
  const sides = activeSidesFor(unit)
  const missing: MissingRequired[] = []

  for (const section of SECTIONS) {
    if (isSectionExcluded(section.key, addsExclude)) continue
    const fields = filterExcluded(section.fields, addsExclude)
    for (const field of fields) {
      if (!field.conditionalOn || field.side === 'global') continue
      // Hidden by the model's sole profile → never required (would block submit invisibly).
      if (soleFieldHidden(soleProfile, field.key, (field.values ?? []) as string[])) continue
      // Hidden by ZSM status (ZSM fields on non-ZSM, or replaced fields on ZSM) → not required.
      if (zsmFieldHidden(zsmGroup, field.key)) continue
      for (const side of sides) {
        if (!isSidedParentActive(additions, field.conditionalOn, side)) continue
        if (!isChildFilled(additions, field.key, side)) {
          missing.push({ sectionKey: section.key, fieldKey: field.key, side })
        }
      }
    }
  }
  return missing
}

/** Filter fields that are excluded for this product, cascading to conditional children. */
export function filterExcluded(fields: AdditionField[], addsExclude: string | null | undefined): AdditionField[] {
  const ids = parseAddsExclude(addsExclude)
  if (ids.size === 0) return fields

  // First pass: fields whose own Dataverse id is excluded.
  const excludedKeys = new Set<string>()
  for (const f of fields) {
    const dv = (f.dataverseKey ?? f.dataverse ?? '').toLowerCase()
    if (dv && ids.has(dv)) excludedKeys.add(f.key)
  }

  // Cascade: a conditional child whose parent is excluded is excluded too.
  let changed = true
  while (changed) {
    changed = false
    for (const f of fields) {
      if (f.conditionalOn && excludedKeys.has(f.conditionalOn) && !excludedKeys.has(f.key)) {
        excludedKeys.add(f.key)
        changed = true
      }
    }
  }

  return fields.filter(f => !excludedKeys.has(f.key))
}
