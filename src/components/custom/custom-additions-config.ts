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
  required?:     boolean
  hint?:         CustomI18n            // small helper text (e.g. height label "350 mm", "I")
  picturePending?: boolean             // option needs a Piedro-supplied image (toe shape, soles…)
  thumb?:        string                // small illustration shown beside a toggle label
  images?:       Record<string, string>  // for 'image': option value → SVG/png path
  collapse?:     boolean               // single-select chips: hide the others once one is picked
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
        { ...yn('Standard', 'cs2.21_yn'), thumb: '/custom/supplement/standard.png' },
        { ...mm('Left',  'cs2.21.01_lf', 'left'),  conditionalOn: 'cs2.21_yn' },
        { ...mm('Right', 'cs2.21.01_rf', 'right'), conditionalOn: 'cs2.21_yn' },
        // Lateral Low Reinforcement
        { ...yn('Lateral Low Reinforcement', 'cs2.22_yn'), thumb: '/custom/supplement/lateral-low-reinforcement.png' },
        { ...mm('Left',  'cs2.22.01_lf', 'left'),  conditionalOn: 'cs2.22_yn' },
        { ...mm('Right', 'cs2.22.01_rf', 'right'), conditionalOn: 'cs2.22_yn' },
        { key: 'cs2.21.01_m_ch', type: 'option', side: 'global', label: { en: 'Material' }, values: MATERIALS, conditionalOn: 'cs2.22_yn' },
        // Medial Low Reinforcement
        { ...yn('Medial Low Reinforcement', 'cs2.23_yn'), thumb: '/custom/supplement/medial-low-reinforcement.png' },
        { ...mm('Left',  'cs2.23.01_lf', 'left'),  conditionalOn: 'cs2.23_yn' },
        { ...mm('Right', 'cs2.23.01_rf', 'right'), conditionalOn: 'cs2.23_yn' },
        { key: 'cs2.23.01_m_ch', type: 'option', side: 'global', label: { en: 'Material' }, values: MATERIALS, conditionalOn: 'cs2.23_yn' },
        // Heel Low Reinforcement (medial + lateral both sides)
        { ...yn('Heel Low Reinforcement', 'cs2.24_yn'), thumb: '/custom/supplement/heel-low-reinforcement.png' },
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
const SECTION_UPPER: CustomSection = {
  key: 'upper',
  label: { en: 'Upper', nl: 'Bovenwerk' },
  groups: [
    {
      key: 'model',
      label: { en: 'Model' },
      fields: [
        { key: 'cs3.article', type: 'text', side: 'global', label: { en: 'Article number' }, hint: { en: 'line drawing & lining info from the product sheet' } },
        mm('Upper Height', 'cs3.upper_height_lf_rf'),
      ],
    },
    {
      key: 'upper_leather',
      label: { en: 'Upper Leather', nl: 'Bovenleer' },
      fields: [
        { key: 'cs3.leather_1', type: 'text', side: 'global', label: { en: 'Upper 1' }, hint: { en: 'from product sheet' } },
        { key: 'cs3.leather_2', type: 'text', side: 'global', label: { en: 'Upper 2' } },
        { key: 'cs3.leather_3', type: 'text', side: 'global', label: { en: 'Upper 3' } },
        { key: 'cs3.leather_4', type: 'text', side: 'global', label: { en: 'Upper 4' } },
      ],
    },
    {
      key: 'lining',
      label: { en: 'Lining', nl: 'Voering' },
      fields: [
        { ...opt('Upper', 'cs3.lining_upper', LINING), required: true },
        { ...opt('Rest',  'cs3.lining_rest',  LINING), required: true },
        yn('Anti-slip heel',  'cs3.lining_antislip'),
        yn('Perforated lining', 'cs3.lining_perforated'),
      ],
    },
    {
      key: 'closure',
      label: { en: 'Closure', nl: 'Sluiting' },
      fields: [
        // Laces
        yn('Laces', 'cs3.cl_laces'),
        { ...opt('Laces type', 'cs3.cl_laces_type', ['Standard', 'Elastic', 'Round', 'Flat'], 'global'), conditionalOn: 'cs3.cl_laces' },
        // Velcro
        yn('Velcro', 'cs3.cl_velcro'),
        { ...opt('Velcro', 'cs3.cl_velcro_type', ['Velcro Direct', 'Velcro Passant'], 'global'), conditionalOn: 'cs3.cl_velcro' },
        { ...opt('Passant side', 'cs3.cl_velcro_passant', ['Medial', 'Lateral'], 'global'), conditionalOn: 'cs3.cl_velcro' },
        { ...yn('D-ring', 'cs3.cl_velcro_dring'), conditionalOn: 'cs3.cl_velcro' },
        { ...mm('Make velcro longer', 'cs3.cl_velcro_longer', 'global'), conditionalOn: 'cs3.cl_velcro' },
        { ...mm('Make velcro wider',  'cs3.cl_velcro_wider', 'global'), conditionalOn: 'cs3.cl_velcro' },
        // Zipper (sided, medial/lateral)
        yn('Zipper', 'cs3.cl_zipper'),
        { ...opt('Zipper L', 'cs3.cl_zipper_l', ['Medial', 'Lateral'], 'left'),  conditionalOn: 'cs3.cl_zipper' },
        { ...opt('Zipper R', 'cs3.cl_zipper_r', ['Medial', 'Lateral'], 'right'), conditionalOn: 'cs3.cl_zipper' },
        // Hooks & Eyelets
        yn('Hooks and Eyelets', 'cs3.cl_hooks'),
        { ...mm('Amount of hooks',   'cs3.cl_hooks_n',   'global'), conditionalOn: 'cs3.cl_hooks' },
        { ...mm('Amount of eyelets', 'cs3.cl_eyelets_n', 'global'), conditionalOn: 'cs3.cl_hooks' },
        // Twist lock
        yn('Twist Lock System', 'cs3.cl_twist'),
      ],
    },
    {
      key: 'stretch',
      label: { en: 'Stretch' },
      fields: [
        yn('Upper', 'cs3.stretch_upper'),
        yn('Medial and Lateral Side', 'cs3.stretch_med_lat'),
      ],
    },
    {
      key: 'ankle_heel_quarter',
      label: { en: 'Ankle Heel and Quarter' },
      fields: [
        // Ankle Heel → medial/lateral × L/R × 3/6 mm
        yn('Ankle Heel', 'cs3.ankle_heel'),
        { ...opt('Medial', 'cs3.ankle_heel_medial', ['3 mm', '6 mm'], 'both'),  conditionalOn: 'cs3.ankle_heel' },
        { ...opt('Lateral', 'cs3.ankle_heel_lateral', ['3 mm', '6 mm'], 'both'), conditionalOn: 'cs3.ankle_heel' },
        // Quarter → same structure
        yn('Quarter', 'cs3.quarter'),
        { ...opt('Medial', 'cs3.quarter_medial', ['3 mm', '6 mm'], 'both'),  conditionalOn: 'cs3.quarter' },
        { ...opt('Lateral', 'cs3.quarter_lateral', ['3 mm', '6 mm'], 'both'), conditionalOn: 'cs3.quarter' },
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
    {
      key: 'afo',
      label: { en: 'AFO' },
      fields: [
        yn('AFO Left', 'cs3.afo_l'),
        { ...mm('Medial',    'cs3.afo_l_medial', 'left'),    conditionalOn: 'cs3.afo_l' },
        { ...mm('Perimeter', 'cs3.afo_l_perimeter', 'left'), conditionalOn: 'cs3.afo_l' },
        yn('AFO Right', 'cs3.afo_r'),
        { ...mm('Medial',    'cs3.afo_r_medial', 'right'),    conditionalOn: 'cs3.afo_r' },
        { ...mm('Perimeter', 'cs3.afo_r_perimeter', 'right'), conditionalOn: 'cs3.afo_r' },
      ],
    },
    {
      key: 'busk',
      label: { en: 'Busk' },
      fields: [
        yn('Busk Left', 'cs3.busk_l'),
        { ...mm('Medial',  'cs3.busk_l_medial', 'left'),  conditionalOn: 'cs3.busk_l' },
        { ...mm('Lateral', 'cs3.busk_l_lateral', 'left'), conditionalOn: 'cs3.busk_l' },
        yn('Busk Right', 'cs3.busk_r'),
        { ...mm('Medial',  'cs3.busk_r_medial', 'right'),  conditionalOn: 'cs3.busk_r' },
        { ...mm('Lateral', 'cs3.busk_r_lateral', 'right'), conditionalOn: 'cs3.busk_r' },
      ],
    },
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
// Modelled from the Excel prose (rows 229–286). Each heel/wedge type reveals L/R
// medial/lateral toggles. Rocker reuses the OSB rocker artwork; soles will get the
// "same as pair-by-pair" photo chips once Piedro delivers the images.
const heelType = (en: string, key: string): CustomField[] => [
  yn(en, key),
  { ...yn('Left — Medial',  `${key}_l_med`), conditionalOn: key },
  { ...yn('Left — Lateral', `${key}_l_lat`), conditionalOn: key },
  { ...yn('Right — Medial', `${key}_r_med`), conditionalOn: key },
  { ...yn('Right — Lateral', `${key}_r_lat`), conditionalOn: key },
]
const SECTION_SOLES: CustomSection = {
  key: 'soles',
  label: { en: 'Shoe Soles', nl: 'Zolen' },
  groups: [
    {
      key: 'heel_type',
      label: { en: 'Heel Type' },
      fields: [
        ...heelType('Heel', 'cs4.heel'),
        ...heelType('Hollow Wedge', 'cs4.hollow_wedge'),
        ...heelType('Fully Hollow Wedge', 'cs4.fully_hollow_wedge'),
        ...heelType('Wedge', 'cs4.wedge'),
        mm('Height', 'cs4.height_lf_rf'),
        yn('Measurement Back', 'cs4.measure_back'),
        yn('Measurement Side', 'cs4.measure_side'),
      ],
    },
    {
      key: 'rocker_sole',
      label: { en: 'Rocker Sole' },
      fields: [
        yn('Heel', 'cs4.rocker_heel'),
        { ...mm('Heel', 'cs4.rocker_heel_mm'), conditionalOn: 'cs4.rocker_heel' },
        yn('Joint', 'cs4.rocker_joint'),
        { ...mm('Joint', 'cs4.rocker_joint_mm'), conditionalOn: 'cs4.rocker_joint' },
        yn('Toes', 'cs4.rocker_toes'),
        { ...mm('Toes', 'cs4.rocker_toes_mm'), conditionalOn: 'cs4.rocker_toes' },
        { key: 'cs4.rocker_type', type: 'image', side: 'global', collapse: true, label: { en: 'Rocker Sole Type' }, values: ROCKER_TYPES, images: ROCKER_IMAGES },
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
const SECTION_STIFFENER: CustomSection = {
  key: 'stiffener',
  label: { en: 'Stiffeners & Toe', nl: 'Contreforts & Neus' },
  groups: [
    {
      key: 'stiffener_materials',
      label: { en: 'Stiffeners Materials' },
      fields: [
        { key: 'cs5.stiffener_type', type: 'image', side: 'global', collapse: true, label: { en: 'Stiffener Type' }, values: STIFFENER_TYPES, images: STIFFENER_IMAGES },
        // First/second layer material heights, sided, back/medial/lateral
        mm('1st layer — Back',    'cs5.l1_back'),
        mm('1st layer — Medial',  'cs5.l1_medial'),
        mm('1st layer — Lateral', 'cs5.l1_lateral'),
        mm('2nd layer — Back',    'cs5.l2_back'),
        mm('2nd layer — Medial',  'cs5.l2_medial'),
        mm('2nd layer — Lateral', 'cs5.l2_lateral'),
      ],
    },
    {
      key: 'toe_options',
      label: { en: 'Toe Options' },
      fields: [
        { key: 'cs5.toe_option', type: 'option', side: 'global', collapse: true,
          label: { en: 'Toe Option' }, values: ['No toe', 'Normal', 'Short', 'Front', 'Wing'] },
        { key: 'cs5.toe_material', type: 'text', side: 'global', label: { en: 'Toe material' }, conditionalOn: 'cs5.toe_option' },
        yn('External Protective Toe Cap', 'cs5.toe_protective'),
      ],
    },
    {
      key: 'order_flags',
      label: { en: 'Order' },
      fields: [
        yn('Urgent order', 'cs5.urgent'),
      ],
    },
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
