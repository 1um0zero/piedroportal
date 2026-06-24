// ─────────────────────────────────────────────────────────────────────────────
// CUSTOM (custom-made shoes) — additions config
//
// Single source of truth for the CUSTOM order form, mirroring the OSB
// `order/additions-config.ts` pattern but for the much larger custom-made set.
// Canonical structure = Piedro's Excel (docs/custom shoes/custom_esquema_inicial.xlsx,
// flattened to docs/custom/custom_esquema_inicial.tsv). Field keys use the
// Excel's `cs<sec>.<grp>_<suffix>` codes. Conditional behaviour mirrors the
// "Orders Custom" webform Customization customjs (docs/custom-orders-jscript/).
//
// STATUS: cs1 (Last & Fitting) + cs2 (Supplement) are fully coded in the Excel
// and modelled here. Upper / Shoe Soles / Stiffeners are prose-only in the Excel
// and are stubbed below — they get filled from the customjs + cr56f_ columns next.
//
// Labels are inline EN now (so the form renders immediately); nl/fr/de come from
// the 51 KB Wpp_orders `array_booleans` map and will be filled progressively.
// ─────────────────────────────────────────────────────────────────────────────

export type CustomFieldType =
  | 'toggle'   // yes/no tickbox            (_yn)
  | 'mm'       // free-fill millimetres     (_lf_rf, _lf, _rf)
  | 'option'   // dropdown / choice         (_ch, _m_ch)
  | 'text'     // free text
  | 'upload'   // file upload (blueprint, footscan)

// 'both'   → independent L/R values { l, r }
// 'global' → one value for the whole order
// 'left' / 'right' → a single explicit side
export type CustomSide = 'both' | 'global' | 'left' | 'right'

export interface CustomI18n { en: string; nl?: string; fr?: string; de?: string }

export interface CustomField {
  key:           string          // Excel cs-code (stable id, also the order_additions.field)
  type:          CustomFieldType
  side:          CustomSide
  label:         CustomI18n
  values?:       (number | string)[]   // for 'option'
  unit?:         string                // e.g. 'mm'
  conditionalOn?: string               // show only when this sibling key is truthy
  required?:     boolean
  hint?:         CustomI18n            // small helper text (e.g. height label "350 mm", "I")
  picturePending?: boolean             // option needs a Piedro-supplied image (toe shape, soles…)
}

export interface CustomGroup {
  key:    string                 // sub-heading within a section
  label:  CustomI18n
  fields: CustomField[]
}

export interface CustomSection {
  key:    string
  label:  CustomI18n
  groups: CustomGroup[]
}

const mm = (en: string, key: string, side: CustomSide = 'both'): CustomField =>
  ({ key, type: 'mm', side, unit: 'mm', label: { en } })
const yn = (en: string, key: string, side: CustomSide = 'global'): CustomField =>
  ({ key, type: 'toggle', side, label: { en } })

// ─── Section cs1 — LAST & FITTING SHOES ──────────────────────────────────────
const SECTION_LAST: CustomSection = {
  key: 'last',
  label: { en: 'Last & Fitting Shoes', nl: 'Leest & Passchoenen' },
  groups: [
    {
      key: 'last_type',
      label: { en: 'Last' },
      fields: [
        yn('Wooden Last',  'cs1.0.01_yn'),
        yn('Plastercast',  'cs1.0.02_yn'),
        yn('Blueprint',    'cs1.blueprint_yn'),
        { key: 'cs1.blueprint_file', type: 'upload', side: 'global', label: { en: 'Upload blueprint' }, conditionalOn: 'cs1.blueprint_yn' },
        yn('Footscan',     'cs1.footscan_yn'),
        { key: 'cs1.footscan_file', type: 'upload', side: 'global', label: { en: 'Upload footscan' }, conditionalOn: 'cs1.footscan_yn' },
        mm('Last Height', 'cs1.0.01_lf_rf'),
        mm('Heel Height', 'cs1.0.02_lf_rf'),
        mm('Toe Jump',    'cs1.0.03_lf_rf'),
        mm('Toe Height',  'cs1.0.04_lf_rf'),
        yn('Sharp Heel Edge', 'cs1.0.03_yn'),
      ],
    },
    {
      key: 'last_measurements',
      label: { en: 'Last Measurements', nl: 'Leestmaten' },
      fields: [
        mm('1: Foot Size',            'cs1.11_lf_rf'),
        mm('2: Joint Width',          'cs1.12_lf_rf'),
        mm('3: Joint Circumference',  'cs1.13_lf_rf'),
        mm('4: Instep Circumference', 'cs1.14_lf_rf'),
        mm('5: Long Heel Girth',      'cs1.15_lf_rf'),
        mm('6: Heel Circumference',   'cs1.16_lf_rf'),
        mm('7: Toe Depth',            'cs1.17_lf_rf'),
        mm('8: Heel Height',          'cs1.18_lf_rf'),
      ],
    },
    {
      key: 'leg_ankle_circ',
      label: { en: 'Leg & Ankle Circumference' },
      fields: [
        { ...mm('Circumference', 'cs1.21_lf_rf'), hint: { en: '350 mm' } },
        { ...mm('Circumference', 'cs1.22_lf_rf'), hint: { en: '300 mm' } },
        { ...mm('Circumference', 'cs1.23_lf_rf'), hint: { en: '250 mm' } },
        { ...mm('Circumference', 'cs1.24_lf_rf'), hint: { en: '200 mm' } },
        { ...mm('Circumference', 'cs1.25_lf_rf'), hint: { en: '150 mm' } },
        { ...mm('Circumference', 'cs1.26_lf_rf'), hint: { en: '120 mm' } },
      ],
    },
    {
      key: 'toe_height_levels',
      label: { en: 'Toe Height' },
      fields: [
        { ...mm('Toe Height', 'cs1.31_lf_rf_hg'), hint: { en: 'I' } },
        { ...mm('Toe Height', 'cs1.32_lf_rf_hg'), hint: { en: 'II' } },
        { ...mm('Toe Height', 'cs1.33_lf_rf_hg'), hint: { en: 'III' } },
        { ...mm('Toe Height', 'cs1.34_lf_rf_hg'), hint: { en: 'IV' } },
        { ...mm('Toe Height', 'cs1.35_lf_rf_hg'), hint: { en: 'V' } },
      ],
    },
    {
      key: 'fitting_shoes',
      label: { en: 'Fitting Shoes' },
      fields: [
        yn('Plastic Fitting Shoes', 'cs1.41_yn'),
        { ...mm('Height',      'cs1.41.01_lf_rf'), conditionalOn: 'cs1.41_yn' },
        { ...mm('Heel Height', 'cs1.41.02_lf_rf'), conditionalOn: 'cs1.41_yn' },
      ],
    },
    {
      key: 'toe_shape',
      label: { en: 'Toe Shape' },
      fields: [
        { ...yn('Square',  'cs1.51_yn'), picturePending: true },
        { ...yn('Pointed', 'cs1.52_yn'), picturePending: true },
        { ...yn('Rounded', 'cs1.53_yn'), picturePending: true },
        { ...yn('Nature',  'cs1.54_yn'), picturePending: true },
      ],
    },
  ],
}

// ─── Section cs2 — SUPPLEMENT ─────────────────────────────────────────────────
const MATERIALS = ['Multiform', 'Micro Cork', 'Cork', 'EVA', 'PU']  // TODO confirm material list with Piedro

const SECTION_SUPPLEMENT: CustomSection = {
  key: 'supplement',
  label: { en: 'Supplement', nl: 'Supplement' },
  groups: [
    {
      key: 'supplement_material',
      label: { en: 'Supplement Material' },
      fields: [
        yn('Multiform + Cork', 'cs2.11_lf_rf_yn', 'both'),
        yn('Micro Cork',       'cs2.12_lf_rf_yn', 'both'),
        yn('Multiform',        'cs2.13_lf_rf_yn', 'both'),
      ],
    },
    {
      key: 'supplement_types',
      label: { en: 'Supplement' },
      fields: [
        // Standard
        { ...yn('Standard', 'cs2.21_yn'), picturePending: true },
        { ...mm('Left',  'cs2.21.01_lf', 'left'),  conditionalOn: 'cs2.21_yn' },
        { ...mm('Right', 'cs2.21.01_rf', 'right'), conditionalOn: 'cs2.21_yn' },
        // Lateral Low Reinforcement
        yn('Lateral Low Reinforcement', 'cs2.22_yn'),
        { ...mm('Left',  'cs2.22.01_lf', 'left'),  conditionalOn: 'cs2.22_yn' },
        { ...mm('Right', 'cs2.22.01_rf', 'right'), conditionalOn: 'cs2.22_yn' },
        { key: 'cs2.21.01_m_ch', type: 'option', side: 'global', label: { en: 'Material' }, values: MATERIALS, conditionalOn: 'cs2.22_yn' },
        // Medial Low Reinforcement
        yn('Medial Low Reinforcement', 'cs2.23_yn'),
        { ...mm('Left',  'cs2.23.01_lf', 'left'),  conditionalOn: 'cs2.23_yn' },
        { ...mm('Right', 'cs2.23.01_rf', 'right'), conditionalOn: 'cs2.23_yn' },
        { key: 'cs2.23.01_m_ch', type: 'option', side: 'global', label: { en: 'Material' }, values: MATERIALS, conditionalOn: 'cs2.23_yn' },
        // Heel Low Reinforcement (medial + lateral both sides)
        yn('Heel Low Reinforcement', 'cs2.24_yn'),
        { ...mm('Lateral', 'cs2.24.01_lt_lf_rf'), conditionalOn: 'cs2.24_yn' },
        { ...mm('Medial',  'cs2.24.01_md_lt_rf'), conditionalOn: 'cs2.24_yn' },
        { key: 'cs2.24.01_m_ch', type: 'option', side: 'global', label: { en: 'Material' }, values: MATERIALS, conditionalOn: 'cs2.24_yn' },
        // Surrounding Orthoses
        yn('Surrounding Orthoses', 'cs2.25_yn'),
        { ...mm('Lateral', 'cs2.25.01_lt_lf_rf'), conditionalOn: 'cs2.25_yn' },
        { ...mm('Medial',  'cs2.25.01_md_lt_rf'), conditionalOn: 'cs2.25_yn' },
        { key: 'cs2.25.01_m_ch', type: 'option', side: 'global', label: { en: 'Material' }, values: MATERIALS, conditionalOn: 'cs2.25_yn' },
        // Lateral and Medial Orthoses
        yn('Lateral and Medial Orthoses', 'cs2.26_yn'),
        { ...mm('Lateral', 'cs2.26.01_lt_lf_rf'), conditionalOn: 'cs2.26_yn' },
        { ...mm('Medial',  'cs2.26.01_md_lt_rf'), conditionalOn: 'cs2.26_yn' },
        { key: 'cs2.26.01_m_ch', type: 'option', side: 'global', label: { en: 'Material' }, values: MATERIALS, conditionalOn: 'cs2.26_yn' },
        // Lateral Orthoses
        yn('Lateral Orthoses', 'cs2.27_yn'),
        { ...mm('Left',  'cs2.27.01_lf', 'left'),  conditionalOn: 'cs2.27_yn' },
        { ...mm('Right', 'cs2.27.01_rf', 'right'), conditionalOn: 'cs2.27_yn' },
        { key: 'cs2.27.01_m_ch', type: 'option', side: 'global', label: { en: 'Material' }, values: MATERIALS, conditionalOn: 'cs2.27_yn' },
        // Medial Orthoses
        yn('Medial Orthoses', 'cs2.28_yn'),
        { ...mm('Left',  'cs2.28.01_lf', 'left'),  conditionalOn: 'cs2.28_yn' },
        { ...mm('Right', 'cs2.28.01_rf', 'right'), conditionalOn: 'cs2.28_yn' },
        { key: 'cs2.28.01_m_ch', type: 'option', side: 'global', label: { en: 'Material' }, values: MATERIALS, conditionalOn: 'cs2.28_yn' },
        // Forefoot Provision
        yn('Forefoot Provision', 'cs2.29_yn'),
        { ...mm('Left',  'cs2.29.01_lf', 'left'),  conditionalOn: 'cs2.29_yn' },
        { ...mm('Right', 'cs2.29.01_rf', 'right'), conditionalOn: 'cs2.29_yn' },
      ],
    },
    {
      key: 'supplement_measurements',
      label: { en: 'Supplement Measurements' },
      fields: [
        mm('Heel — Medial',  'cs2.31_lt_lf_rf'),
        mm('Heel — Lateral', 'cs2.31_md_lt_rf'),
        mm('Ball — Medial',  'cs2.32_lt_lf_rf'),
        mm('Ball — Lateral', 'cs2.32_md_lt_rf'),
        mm('Toe', 'cs2.33', 'global'),
      ],
    },
    {
      key: 'rocker',
      label: { en: 'Rocker' },
      fields: [
        { key: 'cs2.41_ch', type: 'option', side: 'global', label: { en: 'Rocker Type' }, values: ['Normal Rocker', 'Advancing Rocker', 'Polyphase Rocker', 'Delaying Rocker', '2-Phase Rocker'] },
        { ...mm('Rocker', 'cs2.41_lf_rf'), conditionalOn: 'cs2.41_ch' },
        // Flare back
        yn('Flare on the Back', 'cs2.42_yn'),
        { ...mm('Medial',  'cs2.42_lt_lf_rf'), conditionalOn: 'cs2.42_yn' },
        { ...mm('Lateral', 'cs2.42_md_lt_rf'), conditionalOn: 'cs2.42_yn' },
        // Flare front
        yn('Flare on the Front', 'cs2.43_yn'),
        { ...mm('Medial',  'cs2.43_lt_lf_rf'), conditionalOn: 'cs2.43_yn' },
        { ...mm('Lateral', 'cs2.43_md_lt_rf'), conditionalOn: 'cs2.43_yn' },
      ],
    },
    {
      key: 'leg_length',
      label: { en: 'Leg Length Difference' },
      fields: [
        yn('Left leg shorter than right', 'cs2.51_yn'),
        { ...mm('Difference', 'cs2.51', 'global'), conditionalOn: 'cs2.51_yn' },
        yn('Right leg shorter than left', 'cs2.52_yn'),
        { ...mm('Difference', 'cs2.52', 'global'), conditionalOn: 'cs2.52_yn' },
      ],
    },
  ],
}

// ─── Sections cs3+ — UPPER / SHOE SOLES / STIFFENERS (stubs) ──────────────────
// Prose-only in the Excel; conditional logic to be lifted from the Customization
// customjs + cr56f_ columns. Stubbed with a marker so the form shows the section.
const SECTION_UPPER: CustomSection = {
  key: 'upper',
  label: { en: 'Upper', nl: 'Bovenwerk' },
  groups: [{ key: 'upper_todo', label: { en: 'Upper (coming next)' }, fields: [] }],
}
const SECTION_SOLES: CustomSection = {
  key: 'soles',
  label: { en: 'Shoe Soles', nl: 'Zolen' },
  groups: [{ key: 'soles_todo', label: { en: 'Shoe Soles (coming next)' }, fields: [] }],
}
const SECTION_STIFFENER: CustomSection = {
  key: 'stiffener',
  label: { en: 'Stiffeners & Toe', nl: 'Contreforts & Neus' },
  groups: [{ key: 'stiffener_todo', label: { en: 'Stiffeners & Toe (coming next)' }, fields: [] }],
}

export const CUSTOM_SECTIONS: CustomSection[] = [
  SECTION_LAST,
  SECTION_SUPPLEMENT,
  SECTION_UPPER,
  SECTION_SOLES,
  SECTION_STIFFENER,
]

/** Flat list of every field across all sections/groups. */
export function allCustomFields(): CustomField[] {
  return CUSTOM_SECTIONS.flatMap(s => s.groups.flatMap(g => g.fields))
}

/** Localised label helper. */
export function customLabel(l: CustomI18n, locale: string): string {
  return (l as unknown as Record<string, string>)[locale] || l.en
}
