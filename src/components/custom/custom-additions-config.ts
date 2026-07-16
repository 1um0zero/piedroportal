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
  | 'image'    // single-select image chips (collapses others once picked)
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
  conditionalOnValues?: { key: string; values: string[] }  // show only when key holds one of these values
  hiddenWhen?:   string                // hide while this sibling key is truthy (inverse conditional)
  dropdown?:     boolean               // 'option': render a <select> instead of chips
  popup?:        string                // toggle: message shown when the value changes (see popupOn)
  popupOn?:      'check' | 'uncheck'   // when to show the popup (default 'check')
  required?:     boolean
  hint?:         CustomI18n            // small helper text (e.g. height label "350 mm", "I")
  picturePending?: boolean             // option needs a Piedro-supplied image (toe shape, soles…)
  thumb?:        string                // small illustration shown beside a toggle label
  thumbWide?:    boolean               // render the thumb in a wide (landscape) box — e.g. shoe profiles
  images?:       Record<string, string>  // for 'image': option value → SVG/png path
  collapse?:     boolean               // single-select chips: hide the others once one is picked
}

export interface CustomGroup {
  key:    string                 // sub-heading within a section
  label:  CustomI18n
  info?:  CustomI18n             // ⓘ note shown on demand next to the group heading
  fields: CustomField[]
  render?: 'measurements'        // special layout: L/R rows with a centred tag, optional diagram
  image?:  string                // reference diagram for the special layout (optional)
  markers?: Record<string, { x: number; y: number }> // tag → position (% of image) to highlight
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
const opt = (en: string, key: string, values: string[], side: CustomSide = 'global'): CustomField =>
  ({ key, type: 'option', side, values, label: { en } })

// Shared option lists (from the Excel prose, Upper/Soles/Stiffener sections)
const LINING   = ['Leather', 'Black Leather', 'Diabetic', 'Fur', 'Anti-Allergic', 'Sympatex']
const REINFORCE = ['Ercoflex 1.5 mm', 'Ercoflex 3 mm', 'Rhenoflex 0.6 mm', 'Rhenoflex 1 mm', 'Rhenoflex 1.2 mm']
const ROCKER_TYPES  = ['Normal Rocker', 'Advancing Rocker', 'Polyphase Rocker', 'Delaying Rocker', '2-Phase Rocker']
const ROCKER_IMAGES = {
  'Normal Rocker': '/rocker/normal.png', 'Advancing Rocker': '/rocker/advancing.png',
  'Polyphase Rocker': '/rocker/polyphase.png', 'Delaying Rocker': '/rocker/delaying.png',
  '2-Phase Rocker': '/rocker/2-phase.png',
}

// ─── Section cs1 — LAST & FITTING SHOES ──────────────────────────────────────
// Last Height is a dropdown (Martin, pptx 30-6-2026 slide 2); picking a height
// makes the Leg & Ankle Circumference row at that height required (see
// CIRC_BY_HEIGHT + the validation in CustomOrderForm).
export const LAST_HEIGHTS = ['Low last', '100 mm', '120 mm', '150 mm', '200 mm', '220 mm', '250 mm', '300 mm', '350 mm']
export const LAST_HEIGHT_KEY = 'cs1.0.01_lf_rf'
export const CIRC_BY_HEIGHT: Record<string, string> = {
  '350 mm': 'cs1.21_lf_rf', '300 mm': 'cs1.22_lf_rf', '250 mm': 'cs1.23_lf_rf',
  '220 mm': 'cs1.circ220_lf_rf', '200 mm': 'cs1.24_lf_rf', '150 mm': 'cs1.25_lf_rf',
  '120 mm': 'cs1.26_lf_rf', '100 mm': 'cs1.circ100_lf_rf',
}
export const FITTING_SHOE_TYPE_KEY = 'cs1.41_type_ch'
export const FITTING_SHOE_WITH_SUPPLEMENT = 'Fitting shoe including supplement'
const SECTION_LAST: CustomSection = {
  key: 'last',
  label: { en: 'Last & Fitting Shoes', nl: 'Leest & Passchoenen' },
  groups: [
    {
      key: 'last_type',
      label: { en: 'Last' },
      fields: [
        yn('Plastercast',  'cs1.0.02_yn'),
        yn('Blueprint',    'cs1.blueprint_yn'),
        { key: 'cs1.blueprint_file', type: 'upload', side: 'global', label: { en: 'Upload blueprint' }, conditionalOn: 'cs1.blueprint_yn' },
        yn('Footscan',     'cs1.footscan_yn'),
        { key: 'cs1.footscan_file', type: 'upload', side: 'global', label: { en: 'Upload footscan' }, conditionalOn: 'cs1.footscan_yn' },
        { key: LAST_HEIGHT_KEY, type: 'option', side: 'both', dropdown: true, required: true,
          label: { en: 'Last Height' }, values: LAST_HEIGHTS },
        { ...mm('Heel Height', 'cs1.0.02_lf_rf'), required: true },
        mm('Toe Jump',    'cs1.0.03_lf_rf'),
        mm('Toe Height',  'cs1.0.04_lf_rf'),
        yn('Sharp Heel Edge', 'cs1.0.03_yn'),
      ],
    },
    {
      key: 'last_measurements',
      label: { en: 'Last measurements' },   // Martin slide 2: heading reads "Last measurements" (was NL "Leestmaten")
      render: 'measurements',
      image: '/custom/measurements/last_measurements.png',
      markers: {
        '1': { x: 86, y: 94 }, '2': { x: 75, y: 50 }, '3': { x: 63, y: 40 }, '4': { x: 36, y: 80 },
        '5': { x: 54, y: 27 }, '6': { x: 11, y: 21 }, '7': { x: 93, y: 71 }, '8': { x: 6, y: 74 },
      },
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
      render: 'measurements',
      image: '/custom/measurements/leg-ankle.png',
      // 8 rings, 100–350 mm (all labels in mm — Martin slide 2); positions match
      // the ring centres measured in leg-ankle.png.
      markers: {
        '350 mm': { x: 49, y: 37.5 }, '300 mm': { x: 49, y: 45.7 },
        '250 mm': { x: 48, y: 54 },   '220 mm': { x: 50, y: 59 },
        '200 mm': { x: 49, y: 62.3 }, '150 mm': { x: 50, y: 71 },
        '120 mm': { x: 53, y: 75.6 }, '100 mm': { x: 50, y: 78.6 },
      },
      fields: [
        { ...mm('Circumference', 'cs1.21_lf_rf'), hint: { en: '350 mm' } },
        { ...mm('Circumference', 'cs1.22_lf_rf'), hint: { en: '300 mm' } },
        { ...mm('Circumference', 'cs1.23_lf_rf'), hint: { en: '250 mm' } },
        { ...mm('Circumference', 'cs1.circ220_lf_rf'), hint: { en: '220 mm' } },
        { ...mm('Circumference', 'cs1.24_lf_rf'), hint: { en: '200 mm' } },
        { ...mm('Circumference', 'cs1.25_lf_rf'), hint: { en: '150 mm' } },
        { ...mm('Circumference', 'cs1.26_lf_rf'), hint: { en: '120 mm' } },
        { ...mm('Circumference', 'cs1.circ100_lf_rf'), hint: { en: '100 mm' } },
      ],
    },
    {
      key: 'toe_height_levels',
      label: { en: 'Toe Height' },
      render: 'measurements',   // no diagram yet — same L/R + centred-tag layout
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
        // Martin slide 3: checking the box asks which kind; "including supplement"
        // makes the Supplement section required (validated in CustomOrderForm).
        { key: FITTING_SHOE_TYPE_KEY, type: 'option', side: 'global', conditionalOn: 'cs1.41_yn',
          label: { en: 'Fitting shoe type' },
          values: ['Fitting shoe of last', FITTING_SHOE_WITH_SUPPLEMENT] },
        { ...mm('Height',      'cs1.41.01_lf_rf'), conditionalOn: 'cs1.41_yn' },
        { ...mm('Heel Height', 'cs1.41.02_lf_rf'), conditionalOn: 'cs1.41_yn' },
      ],
    },
    {
      key: 'toe_shape',
      label: { en: 'Toe Shape' },
      fields: [
        {
          key: 'cs1.5_toe_shape', type: 'image', side: 'global', collapse: true,
          label: { en: 'Toe Shape', nl: 'Neusvorm' },
          values: ['Square', 'Pointed', 'Rounded', 'Nature'],
          images: {
            Square:  '/custom/toe-shape/square.svg',
            Pointed: '/custom/toe-shape/pointed.svg',
            Rounded: '/custom/toe-shape/rounded.svg',
            Nature:  '/custom/toe-shape/nature.svg',
          },
        },
      ],
    },
  ],
}

// ─── Section cs2 — SUPPLEMENT ─────────────────────────────────────────────────
// Reinforcement materials per Martin (pptx 30-6-2026 slide 4). Spelling "Renoflex"
// is Martin's — brand is usually "Rhenoflex"; pending confirmation (questões #6).
const MATERIALS = ['Ercoflex', 'Renoflex 1.1', 'Renoflex 1.5', 'Renoflex 1.9']

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
      // Type names + which ones carry a height are Martin's (pptx 30-6-2026 slide 4):
      // "under ankle" types need no height; "over ankle" types do.
      fields: [
        // Standard — no height indication
        { ...yn('Standard', 'cs2.21_yn'), thumb: '/custom/supplement/standard.png' },
        // Lateral under ankle reinforcement — no height indication
        { ...yn('Lateral under ankle reinforcement', 'cs2.22_yn'), thumb: '/custom/supplement/lateral-low-reinforcement.png' },
        { key: 'cs2.21.01_m_ch', type: 'option', side: 'global', label: { en: 'Material' }, values: MATERIALS, conditionalOn: 'cs2.22_yn' },
        // Medial under ankle reinforcement — no height indication
        { ...yn('Medial under ankle reinforcement', 'cs2.23_yn'), thumb: '/custom/supplement/medial-low-reinforcement.png' },
        { key: 'cs2.23.01_m_ch', type: 'option', side: 'global', label: { en: 'Material' }, values: MATERIALS, conditionalOn: 'cs2.23_yn' },
        // Lateral/medial under ankle reinforcement — no height indication
        { ...yn('Lateral/medial under ankle reinforcement', 'cs2.24_yn'), thumb: '/custom/supplement/heel-low-reinforcement.png' },
        { key: 'cs2.24.01_m_ch', type: 'option', side: 'global', label: { en: 'Material' }, values: MATERIALS, conditionalOn: 'cs2.24_yn' },
        // Lateral/medial over ankle reinforcement covering achilles tendon
        yn('Lateral/medial over ankle reinforcement covering achilles tendon', 'cs2.25_yn'),
        { ...mm('Lateral', 'cs2.25.01_lt_lf_rf'), conditionalOn: 'cs2.25_yn' },
        { ...mm('Medial',  'cs2.25.01_md_lt_rf'), conditionalOn: 'cs2.25_yn' },
        { key: 'cs2.25.01_m_ch', type: 'option', side: 'global', label: { en: 'Material' }, values: MATERIALS, conditionalOn: 'cs2.25_yn' },
        // Lateral/medial over ankle reinforcement
        yn('Lateral/medial over ankle reinforcement', 'cs2.26_yn'),
        { ...mm('Lateral', 'cs2.26.01_lt_lf_rf'), conditionalOn: 'cs2.26_yn' },
        { ...mm('Medial',  'cs2.26.01_md_lt_rf'), conditionalOn: 'cs2.26_yn' },
        { key: 'cs2.26.01_m_ch', type: 'option', side: 'global', label: { en: 'Material' }, values: MATERIALS, conditionalOn: 'cs2.26_yn' },
        // Lateral over ankle orthosis
        yn('Lateral over ankle orthosis', 'cs2.27_yn'),
        { ...mm('Left',  'cs2.27.01_lf', 'left'),  conditionalOn: 'cs2.27_yn' },
        { ...mm('Right', 'cs2.27.01_rf', 'right'), conditionalOn: 'cs2.27_yn' },
        { key: 'cs2.27.01_m_ch', type: 'option', side: 'global', label: { en: 'Material' }, values: MATERIALS, conditionalOn: 'cs2.27_yn' },
        // Medial over ankle orthosis
        yn('Medial over ankle orthosis', 'cs2.28_yn'),
        { ...mm('Left',  'cs2.28.01_lf', 'left'),  conditionalOn: 'cs2.28_yn' },
        { ...mm('Right', 'cs2.28.01_rf', 'right'), conditionalOn: 'cs2.28_yn' },
        { key: 'cs2.28.01_m_ch', type: 'option', side: 'global', label: { en: 'Material' }, values: MATERIALS, conditionalOn: 'cs2.28_yn' },
        // Forefoot Provision — unchanged
        yn('Forefoot Provision', 'cs2.29_yn'),
        { ...mm('Left',  'cs2.29.01_lf', 'left'),  conditionalOn: 'cs2.29_yn' },
        { ...mm('Right', 'cs2.29.01_rf', 'right'), conditionalOn: 'cs2.29_yn' },
      ],
    },
    {
      key: 'supplement_measurements',
      label: { en: 'Supplement Measurements' },
      fields: [
        // Heel has no medial/lateral split (Martin slide 5) — a single Heel row.
        mm('Heel', 'cs2.31_lt_lf_rf'),
        mm('Ball — Medial',  'cs2.32_lt_lf_rf'),
        mm('Ball — Lateral', 'cs2.32_md_lt_rf'),
        mm('Toe', 'cs2.33', 'global'),
      ],
    },
    {
      key: 'rocker',
      label: { en: 'Rocker' },
      fields: [
        { key: 'cs2.41_ch', type: 'image', side: 'global', collapse: true, label: { en: 'Rocker Type' }, values: ROCKER_TYPES, images: ROCKER_IMAGES },
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

// ─── Section cs3 — UPPER ──────────────────────────────────────────────────────
// Modelled from the Excel prose (rows 125–228). Conditional behaviour mirrors the
// Customization customjs. Upper-leather lists come from the picked model's product
// sheet (text for now until wired to the catalogue).
export const LEATHER_AS_MODEL_KEY = 'cs3.leather_as_model'
export const CLOSURE_AS_MODEL_KEY = 'cs3.closure_as_model'

// Campos semeados por defeito numa encomenda nova (pedido do Martin, PPT 30-6):
// "as model" ligados, Measurement Back on, toe reinforcement Normal. Não são
// escolhas do utilizador → o contador de secção NÃO os conta enquanto no default.
// O artigo (autofill do modelo) é metadata, nunca conta.
export const CUSTOM_ARTICLE_KEY = 'cs3.article'
export const CUSTOM_SEED_DEFAULTS: Record<string, unknown> = {
  [LEATHER_AS_MODEL_KEY]: true,
  [CLOSURE_AS_MODEL_KEY]: true,
  'cs4.measure_back': true,
  'cs5.toe_option': 'Normal',
}

// Campos mm de ADAPTAÇÃO com limites claros → usam o RangeField (slider + label,
// como no OSB). As MEDIÇÕES livres (circunferências cs1.21-26, medidas da forma
// cs1.11-18, toe heights I-V, alturas de shaft) ficam em texto livre — não têm
// range fixo e não podem ser cortadas. Ranges PROVISÓRIOS: afinar com o Martin.
// Formato: [min, max, step?] (step default 1).
export const CUSTOM_MM_RANGES: Record<string, [number, number, number?]> = {
  'cs1.0.02_lf_rf': [0, 50],   // Heel Height (spec)
  'cs1.0.03_lf_rf': [0, 30],   // Toe Jump
  'cs1.0.04_lf_rf': [0, 20],   // Toe Height
  'cs2.31_lt_lf_rf': [0, 60],  // Supplement — Heel
  'cs2.32_lt_lf_rf': [0, 30],  // Supplement — Ball medial
  'cs2.32_md_lt_rf': [0, 30],  // Supplement — Ball lateral
  'cs2.33': [0, 30],           // Supplement — Toe
  'cs2.41_lf_rf': [0, 60],     // Rocker (supplement)
  'cs2.51': [0, 50],           // Leg-length difference
  'cs2.52': [0, 50],
  'cs4.height_lf_rf': [0, 60], // Sole Height
  'cs4.rocker_heel_mm': [0, 60],
  'cs4.rocker_joint_mm': [0, 60],
  'cs4.rocker_toes_mm': [0, 60],
}
const SURCHARGE_COLOURS  = 'A surcharge may apply if colors other than the standard colors are chosen.'
const SURCHARGE_CLOSURES = 'A surcharge may apply if closures other than the standard closure is chosen.'
const STRETCH_POPUP      = 'Stretch is only possible if the model allows it.'
const SECTION_UPPER: CustomSection = {
  key: 'upper',
  label: { en: 'Upper', nl: 'Schacht' },
  groups: [
    {
      key: 'model',
      label: { en: 'Model' },
      fields: [
        { key: 'cs3.article', type: 'text', side: 'global', required: true, label: { en: 'Article number' } },  // autofilled from the chosen model; can't be emptied
        { ...mm('Upper Height', 'cs3.upper_height_lf_rf'), required: true },
      ],
    },
    {
      key: 'upper_leather',
      label: { en: 'Upper Leather', nl: 'Bovenleer' },
      fields: [
        // Checked by default; unchecking (= picking own colours) warns about surcharge.
        { ...yn('Leathers as model', LEATHER_AS_MODEL_KEY), popup: SURCHARGE_COLOURS, popupOn: 'uncheck' },
        { key: 'cs3.leather_1', type: 'text', side: 'global', label: { en: 'Upper 1' }, hiddenWhen: LEATHER_AS_MODEL_KEY, hint: { en: 'from product sheet' } },
        { key: 'cs3.leather_2', type: 'text', side: 'global', label: { en: 'Upper 2' }, hiddenWhen: LEATHER_AS_MODEL_KEY },
        { key: 'cs3.leather_3', type: 'text', side: 'global', label: { en: 'Upper 3' }, hiddenWhen: LEATHER_AS_MODEL_KEY },
        { key: 'cs3.leather_4', type: 'text', side: 'global', label: { en: 'Upper 4' }, hiddenWhen: LEATHER_AS_MODEL_KEY },
      ],
    },
    {
      key: 'lining',
      label: { en: 'Lining', nl: 'Voering' },
      fields: [
        // Single lining choice — no upper/rest split (Martin slide 6).
        { ...opt('Lining', 'cs3.lining_ch', LINING), required: true },
        // Only for leather linings (Martin slide 6; "and" confirmed as OR, 2026-07-13).
        { ...yn('Anti-slip heel',  'cs3.lining_antislip'),   conditionalOnValues: { key: 'cs3.lining_ch', values: ['Leather', 'Black Leather'] } },
        { ...yn('Perforated lining', 'cs3.lining_perforated'), conditionalOnValues: { key: 'cs3.lining_ch', values: ['Leather', 'Black Leather'] } },
      ],
    },
    {
      key: 'closure',
      label: { en: 'Closure', nl: 'Sluiting' },
      fields: [
        // Checked by default; unchecking (= picking another closure) warns about surcharge.
        { ...yn('Closure as model', CLOSURE_AS_MODEL_KEY), popup: SURCHARGE_CLOSURES, popupOn: 'uncheck' },
        // Laces
        { ...yn('Laces', 'cs3.cl_laces'), hiddenWhen: CLOSURE_AS_MODEL_KEY },
        { ...opt('Laces type', 'cs3.cl_laces_type', ['Standard', 'Elastic', 'Round', 'Flat'], 'global'), conditionalOn: 'cs3.cl_laces', hiddenWhen: CLOSURE_AS_MODEL_KEY },
        // Velcro
        { ...yn('Velcro', 'cs3.cl_velcro'), hiddenWhen: CLOSURE_AS_MODEL_KEY },
        { ...opt('Velcro', 'cs3.cl_velcro_type', ['Velcro Direct', 'Velcro Passant'], 'global'), conditionalOn: 'cs3.cl_velcro', hiddenWhen: CLOSURE_AS_MODEL_KEY },
        { ...opt('Passant side', 'cs3.cl_velcro_passant', ['Medial', 'Lateral'], 'global'), conditionalOn: 'cs3.cl_velcro', hiddenWhen: CLOSURE_AS_MODEL_KEY },
        { ...yn('D-ring', 'cs3.cl_velcro_dring'), conditionalOn: 'cs3.cl_velcro', hiddenWhen: CLOSURE_AS_MODEL_KEY },
        { ...mm('Make velcro longer', 'cs3.cl_velcro_longer', 'global'), conditionalOn: 'cs3.cl_velcro', hiddenWhen: CLOSURE_AS_MODEL_KEY },
        { ...mm('Make velcro wider',  'cs3.cl_velcro_wider', 'global'), conditionalOn: 'cs3.cl_velcro', hiddenWhen: CLOSURE_AS_MODEL_KEY },
        // Zipper (sided, medial/lateral)
        { ...yn('Zipper', 'cs3.cl_zipper'), hiddenWhen: CLOSURE_AS_MODEL_KEY },
        { ...opt('Zipper L', 'cs3.cl_zipper_l', ['Medial', 'Lateral'], 'left'),  conditionalOn: 'cs3.cl_zipper', hiddenWhen: CLOSURE_AS_MODEL_KEY },
        { ...opt('Zipper R', 'cs3.cl_zipper_r', ['Medial', 'Lateral'], 'right'), conditionalOn: 'cs3.cl_zipper', hiddenWhen: CLOSURE_AS_MODEL_KEY },
        // Hooks & Eyelets
        { ...yn('Hooks and Eyelets', 'cs3.cl_hooks'), hiddenWhen: CLOSURE_AS_MODEL_KEY },
        { ...mm('Amount of hooks',   'cs3.cl_hooks_n',   'global'), conditionalOn: 'cs3.cl_hooks', hiddenWhen: CLOSURE_AS_MODEL_KEY },
        { ...mm('Amount of eyelets', 'cs3.cl_eyelets_n', 'global'), conditionalOn: 'cs3.cl_hooks', hiddenWhen: CLOSURE_AS_MODEL_KEY },
        // Twist lock
        { ...yn('Twist Lock System', 'cs3.cl_twist'), hiddenWhen: CLOSURE_AS_MODEL_KEY },
      ],
    },
    {
      key: 'stretch',
      label: { en: 'Stretch' },
      fields: [
        { ...yn('Upper', 'cs3.stretch_upper'), thumb: '/custom/stretch/upper.png', thumbWide: true, popup: STRETCH_POPUP, popupOn: 'check' },
        { ...yn('Medial and Lateral Side', 'cs3.stretch_med_lat'), thumb: '/custom/stretch/medial-lateral.png', thumbWide: true, popup: STRETCH_POPUP, popupOn: 'check' },
      ],
    },
    {
      key: 'collar',
      label: { en: 'Collar' },
      fields: [
        yn('Extra Padding in Collar', 'cs3.collar_padding'),
        { ...opt('Padding', 'cs3.collar_padding_mm', ['4 mm', '6 mm', '10 mm'], 'global'), conditionalOn: 'cs3.collar_padding' },
      ],
    },
    {
      key: 'tongue',
      label: { en: 'Tongue' },
      fields: [
        yn('Extra Padding in Tongue', 'cs3.tongue_padding'),
        { ...opt('Padding', 'cs3.tongue_padding_mm', ['3 mm', '6 mm', '8 mm', '10 mm'], 'global'), conditionalOn: 'cs3.tongue_padding' },
        yn('Tongue Reinforcement', 'cs3.tongue_reinforce'),
        { ...opt('Reinforcement', 'cs3.tongue_reinforce_opt', REINFORCE, 'global'), conditionalOn: 'cs3.tongue_reinforce' },
        yn('Tongue with Velcro', 'cs3.tongue_velcro'),
        { ...yn('Medial (stitched)',  'cs3.tongue_velcro_medial'),  conditionalOn: 'cs3.tongue_velcro' },
        { ...yn('Lateral (stitched)', 'cs3.tongue_velcro_lateral'), conditionalOn: 'cs3.tongue_velcro' },
        yn('Watertongue', 'cs3.watertongue'),
        yn('Tongue incision', 'cs3.tongue_incision'),
      ],
    },
    // Ankle Heel and Quarter, AFO and Busk removed per Martin (slide 7).
    {
      key: 'upper_others',
      label: { en: 'Others' },
      fields: [
        yn('Extra pair of Laces', 'cs3.extra_laces'),
      ],
    },
  ],
}

// ─── Section cs4 — SHOE SOLES ─────────────────────────────────────────────────
// Modelled from the Excel prose (rows 229–286). Heel types are plain toggles —
// the L/R medial/lateral sub-options were dropped per Martin (slide 8). Rocker
// sole sits behind a yes/no toggle. Height autofills from the Last heel height
// (see CustomOrderForm) and is required when it can't be autofilled.
export const SOLE_HEIGHT_KEY = 'cs4.height_lf_rf'
export const HEEL_HEIGHT_KEY = 'cs1.0.02_lf_rf'
const SECTION_SOLES: CustomSection = {
  key: 'soles',
  label: { en: 'Shoe Soles', nl: 'Zolen' },
  groups: [
    {
      key: 'heel_type',
      label: { en: 'Heel Type' },
      fields: [
        { ...yn('Heel', 'cs4.heel'), thumb: '/custom/heel/heel.png', thumbWide: true },
        { ...yn('Hollow Wedge', 'cs4.hollow_wedge'), thumb: '/custom/heel/hollow-wedge.png', thumbWide: true },
        { ...yn('Fully Hollow Wedge', 'cs4.fully_hollow_wedge'), thumb: '/custom/heel/fully-hollow-wedge.png', thumbWide: true },
        { ...yn('Wedge', 'cs4.wedge'), thumb: '/custom/heel/wedge.png', thumbWide: true },
        { ...mm('Height', SOLE_HEIGHT_KEY), required: true },
        yn('Measurement Back', 'cs4.measure_back'),   // default on (Martin slide 8)
        yn('Measurement Side', 'cs4.measure_side'),
      ],
    },
    {
      key: 'rocker_sole',
      label: { en: 'Rocker Sole' },
      fields: [
        // yes/no gate — the rocker block only appears when on (Martin slide 8)
        yn('Rocker sole', 'cs4.rocker_yn'),
        { ...yn('Heel', 'cs4.rocker_heel'), conditionalOn: 'cs4.rocker_yn' },
        { ...mm('Heel', 'cs4.rocker_heel_mm'), conditionalOn: 'cs4.rocker_heel' },
        { ...yn('Joint', 'cs4.rocker_joint'), conditionalOn: 'cs4.rocker_yn' },
        { ...mm('Joint', 'cs4.rocker_joint_mm'), conditionalOn: 'cs4.rocker_joint' },
        { ...yn('Toes', 'cs4.rocker_toes'), conditionalOn: 'cs4.rocker_yn' },
        { ...mm('Toes', 'cs4.rocker_toes_mm'), conditionalOn: 'cs4.rocker_toes' },
        { key: 'cs4.rocker_type', type: 'image', side: 'global', collapse: true, label: { en: 'Rocker Sole Type' }, values: ROCKER_TYPES, images: ROCKER_IMAGES, conditionalOn: 'cs4.rocker_yn' },
        yn('Removable Carbon Insole', 'cs4.carbon_insole'),
        yn('Sole Stiffening', 'cs4.sole_stiffening'),
      ],
    },
    {
      key: 'soles_others',
      label: { en: 'Others' },
      fields: [
        yn('Rounded', 'cs4.rounded'),
        { ...yn('Left',  'cs4.rounded_l'), conditionalOn: 'cs4.rounded' },
        { ...yn('Right', 'cs4.rounded_r'), conditionalOn: 'cs4.rounded' },
        { ...mm('Rounded', 'cs4.rounded_mm', 'global'), conditionalOn: 'cs4.rounded' },
        yn('Flare', 'cs4.flare'),
        { ...yn('Left',  'cs4.flare_l'), conditionalOn: 'cs4.flare' },
        { ...yn('Right', 'cs4.flare_r'), conditionalOn: 'cs4.flare' },
        yn('Inwards', 'cs4.inwards'),
        { ...yn('Left',  'cs4.inwards_l'), conditionalOn: 'cs4.inwards' },
        { ...yn('Right', 'cs4.inwards_r'), conditionalOn: 'cs4.inwards' },
        yn('Sach Heel', 'cs4.sach'),
        { ...yn('Left',  'cs4.sach_l'), conditionalOn: 'cs4.sach' },
        { ...yn('Right', 'cs4.sach_r'), conditionalOn: 'cs4.sach' },
        yn('Thomas Heel', 'cs4.thomas'),
        { ...yn('Medial',  'cs4.thomas_med'), conditionalOn: 'cs4.thomas' },
        { ...yn('Lateral', 'cs4.thomas_lat'), conditionalOn: 'cs4.thomas' },
      ],
    },
  ],
}

// ─── Section cs5 — STIFFENERS & TOE ───────────────────────────────────────────
// Modelled from the Excel prose (rows 287–303). The 20 stiffener options are wired
// as image chips from Piedro's Contreforts/ source set (docs/custom/Contreforts →
// public/custom/stiffener). Each option = a stiffener shape × reinforcement level.
// Values use Piedro's NL source names; EN/FR/DE labels come with the rest of cs5.
const STIFF = '/custom/stiffener'
const STIFFENER_TYPES = [
  'Normaal · Standaard', 'Normaal · Extra',
  'Hoog · Standaard', 'Hoog · Extra', 'Hoog · Dubbele',
  'Binnen Normaal Lateraal Hoog · Standaard', 'Binnen Normaal Lateraal Hoog · Extra', 'Binnen Normaal Lateraal Hoog · Dubbele',
  'Mediaal Hoog Lateraal Normaal · Standaard', 'Mediaal Hoog Lateraal Normaal · Extra', 'Mediaal Hoog Lateraal Normaal · Dubbele',
  'Mediaal en Lateraal Hoog · Standaard', 'Mediaal en Lateraal Hoog · Extra', 'Mediaal en Lateraal Hoog · Dubbele',
  'Hoge Peroneus · Standaard', 'Hoge Peroneus · Extra', 'Hoge Peroneus · Dubbele',
  'Hoge Peroneus Beide Zijde · Standaard', 'Hoge Peroneus Beide Zijde · Extra', 'Hoge Peroneus Beide Zijde · Dubbele',
]
const STIFFENER_IMAGES: Record<string, string> = {
  'Normaal · Standaard': `${STIFF}/normaal-standaard-versteviging.png`,
  'Normaal · Extra': `${STIFF}/normaal-extra-versteviging.png`,
  'Hoog · Standaard': `${STIFF}/hoog-standaard-versteviging.png`,
  'Hoog · Extra': `${STIFF}/hoog-extra-versteviging.png`,
  'Hoog · Dubbele': `${STIFF}/hoog-dubbele-versteviging.png`,
  'Binnen Normaal Lateraal Hoog · Standaard': `${STIFF}/binnen-normaal-lateraal-hoog-standaard-versteviging.png`,
  'Binnen Normaal Lateraal Hoog · Extra': `${STIFF}/binnen-normaal-lateraal-hoog-extra-versteviging.png`,
  'Binnen Normaal Lateraal Hoog · Dubbele': `${STIFF}/binnen-normaal-lateraal-hoog-dubbele-versteviging.png`,
  'Mediaal Hoog Lateraal Normaal · Standaard': `${STIFF}/mediaal-hoog-lateraal-normaal-standaard-versteviging.png`,
  'Mediaal Hoog Lateraal Normaal · Extra': `${STIFF}/mediaal-hoog-lateraal-normaal-extra-versteviging.png`,
  'Mediaal Hoog Lateraal Normaal · Dubbele': `${STIFF}/mediaal-hoog-lateraal-normaal-dubbele-versteviging.png`,
  'Mediaal en Lateraal Hoog · Standaard': `${STIFF}/mediaal-en-lateraal-hoog-standaard-versteviging.png`,
  'Mediaal en Lateraal Hoog · Extra': `${STIFF}/mediaal-en-lateraal-hoog-extra-versteviging.png`,
  'Mediaal en Lateraal Hoog · Dubbele': `${STIFF}/mediaal-en-lateraal-hoog-dubbele-versteviging.png`,
  'Hoge Peroneus · Standaard': `${STIFF}/hoge-peroneus-standaard-versteviging.png`,
  'Hoge Peroneus · Extra': `${STIFF}/hoge-peroneus-extra-versteviging.png`,
  'Hoge Peroneus · Dubbele': `${STIFF}/hoge-peroneus-dubbele-versteviging.png`,
  'Hoge Peroneus Beide Zijde · Standaard': `${STIFF}/hoge-peroneus-beide-zijde-standaard-versteviging.png`,
  'Hoge Peroneus Beide Zijde · Extra': `${STIFF}/hoge-peroneus-beide-zijde-extra-versteviging.png`,
  'Hoge Peroneus Beide Zijde · Dubbele': `${STIFF}/hoge-peroneus-beide-zijde-dubbele-versteviging.png`,
}
// Stiffener material list per Martin (slide 10) — spelling "Renoflex" pending
// confirmation (brand is usually "Rhenoflex"), as is 1.2 vs the supplements' 1.1.
export const STIFFENER_MATERIALS = [
  'Renoflex 1.2', 'Renoflex 1.5', 'Renoflex 1.9',
  'Renoflex 1.2 double', 'Renoflex 1.5 double', 'Renoflex 1.9 double',
  'Ercoflex 2', 'Ercoflex 3',
  'Ercoflex 2/Renoflex 1.2', 'Ercoflex 2/Renoflex 1.5', 'Ercoflex 2/Renoflex 1.9',
  'Ercoflex 3/Renoflex 1.2', 'Ercoflex 3/Renoflex 1.5', 'Ercoflex 3/Renoflex 1.9',
  'Leather',
]
export const STIFFENER_TYPE_L_KEY = 'cs5.stiffener_type_l'
export const STIFFENER_TYPE_R_KEY = 'cs5.stiffener_type_r'
export const STIFFENER_MATERIAL_L_KEY = 'cs5.stiffener_material_l'
export const STIFFENER_MATERIAL_R_KEY = 'cs5.stiffener_material_r'
const SECTION_STIFFENER: CustomSection = {
  key: 'stiffener',
  label: { en: 'Stiffeners & Toe', nl: 'Contreforts & Neus' },
  groups: [
    {
      key: 'stiffener_materials',
      label: { en: 'Stiffeners' },
      // Martin slide 10 — placement note behind an ⓘ button.
      info: { en: 'All requested modifications will be placed between the lining and the upper leather. If this is not possible, the modification will be built up on the lining, after which the upper leather will be made over it. This may incur additional costs.' },
      fields: [
        // Independent stiffener choice per foot; each choice requires a material
        // (validated in CustomOrderForm). The 1st/2nd layer mm table was removed.
        { key: STIFFENER_TYPE_L_KEY, type: 'image', side: 'left', collapse: true, label: { en: 'Stiffener Type — Left' }, values: STIFFENER_TYPES, images: STIFFENER_IMAGES },
        { key: STIFFENER_MATERIAL_L_KEY, type: 'option', side: 'left', dropdown: true, label: { en: 'Material — Left' }, values: STIFFENER_MATERIALS, conditionalOn: STIFFENER_TYPE_L_KEY },
        { key: STIFFENER_TYPE_R_KEY, type: 'image', side: 'right', collapse: true, label: { en: 'Stiffener Type — Right' }, values: STIFFENER_TYPES, images: STIFFENER_IMAGES },
        { key: STIFFENER_MATERIAL_R_KEY, type: 'option', side: 'right', dropdown: true, label: { en: 'Material — Right' }, values: STIFFENER_MATERIALS, conditionalOn: STIFFENER_TYPE_R_KEY },
      ],
    },
    {
      key: 'toe_options',
      label: { en: 'Toe reinforcement options' },
      fields: [
        // 'Normal' is the default (set in CustomOrderForm); 'Front' dropped (slide 11).
        { key: 'cs5.toe_option', type: 'option', side: 'global', collapse: true, required: true,
          label: { en: 'Toe reinforcement' }, values: ['No reinforcement', 'Normal', 'Short', 'Wing'] },
        { key: 'cs5.toe_material', type: 'text', side: 'global', label: { en: 'Toe material' }, conditionalOn: 'cs5.toe_option' },
        yn('External Protective Toe Cap', 'cs5.toe_protective'),
      ],
    },
    // Urgent order removed per Martin (slide 11).
  ],
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
