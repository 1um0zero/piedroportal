// reflect-fields.ts — catálogo das adições CUSTOM (em desenvolvimento) que TÊM
// tradução geométrica num sapato e por isso podem ser refletidas no modelo 3D.
//
// Espelha os cs-codes reais do canal CUSTOM (src/components/custom/
// custom-additions-config.ts). Ficam DE FORA todos os campos sem forma —
// forro, fecho, cor, material, reforços, stiffeners — porque não se "veem"
// como deformação.
//
// ⚠ As magnitudes/janelas são ILUSTRATIVAS (não calibradas por horma/SKU).

/** Primitivas de deformação que o motor sabe aplicar. */
export type Effect =
  | 'lift'        // acrescento global sob toda a planta (slab + subida)
  | 'heelRaise'   // acrescento localizado no calcanhar
  | 'toeSpring'   // biqueira/antepé sobe (rocker / toe jump)
  | 'raiseTop'    // sobe o topo (biqueira alta, profundidade)
  | 'widen'       // alarga em ambos os lados
  | 'widenSide'   // alarga só medial OU lateral
  | 'wedge'       // cunha: inclina a largura (varo/valgo)
  | 'arch';       // apoio de arco medial

export interface ReflectField {
  key: string;                 // id no estado do viewer
  label: string;               // rótulo EN (lab é interno)
  section: string;             // agrupamento no painel
  customKey?: string;          // cs-code CUSTOM real que espelha (doc)
  min: number;
  max: number;
  color: number;               // hex da zona/bandeira
  effect: Effect;
  a?: number;                  // janela ao longo do comprimento (0=calcanhar, 1=biqueira)
  b?: number;
  side?: 'medial' | 'lateral' | 'both';
  unit?: string;               // default 'mm'
}

export const REFLECT_FIELDS: ReflectField[] = [
  // ─── Last & Fitting (cs1) ────────────────────────────────────────────────
  { key: 'heelHeight', label: 'Heel height', section: 'Last & Fitting',
    customKey: 'cs1.0.02_lf_rf', min: 0, max: 40, color: 0xff5d6c, effect: 'heelRaise', a: 0, b: 0.34 },
  { key: 'toeJump', label: 'Toe jump (spring)', section: 'Last & Fitting',
    customKey: 'cs1.0.03_lf_rf', min: 0, max: 30, color: 0xff77c8, effect: 'toeSpring', a: 0.8, b: 1 },
  { key: 'toeHeight', label: 'Toe height', section: 'Last & Fitting',
    customKey: 'cs1.0.04_lf_rf', min: 0, max: 18, color: 0xff9f43, effect: 'raiseTop', a: 0.78, b: 1 },

  // ─── Supplement (cs2) ────────────────────────────────────────────────────
  { key: 'suppHeel', label: 'Supplement — heel', section: 'Supplement',
    customKey: 'cs2.31_lt_lf_rf', min: 0, max: 30, color: 0xe0485a, effect: 'heelRaise', a: 0, b: 0.32 },
  { key: 'ballMedial', label: 'Ball supplement — medial', section: 'Supplement',
    customKey: 'cs2.32_lt_lf_rf', min: 0, max: 15, color: 0x18b0c9, effect: 'widenSide', side: 'medial', a: 0.55, b: 0.95 },
  { key: 'ballLateral', label: 'Ball supplement — lateral', section: 'Supplement',
    customKey: 'cs2.32_md_lt_rf', min: 0, max: 15, color: 0x3d8bff, effect: 'widenSide', side: 'lateral', a: 0.55, b: 0.95 },
  { key: 'suppToe', label: 'Supplement — toe', section: 'Supplement',
    customKey: 'cs2.33', min: 0, max: 12, color: 0xffb02e, effect: 'raiseTop', a: 0.85, b: 1 },
  { key: 'wedgeMedial', label: 'Wedge — medial (varus)', section: 'Supplement',
    customKey: 'cs2.42_lt_lf_rf', min: 0, max: 12, color: 0xb06bff, effect: 'wedge', side: 'medial', a: 0.1, b: 0.9 },
  { key: 'wedgeLateral', label: 'Wedge — lateral (valgus)', section: 'Supplement',
    customKey: 'cs2.43_lt_lf_rf', min: 0, max: 12, color: 0x8a5cf0, effect: 'wedge', side: 'lateral', a: 0.1, b: 0.9 },
  { key: 'legLengthLift', label: 'Leg-length lift', section: 'Supplement',
    customKey: 'cs2.51', min: 0, max: 50, color: 0xff5d6c, effect: 'lift' },

  // ─── Shoe Soles (cs4) ────────────────────────────────────────────────────
  { key: 'soleHeight', label: 'Sole height', section: 'Shoe Soles',
    customKey: 'cs4.sole_height', min: 0, max: 40, color: 0x9aa7b3, effect: 'lift' },
  { key: 'rocker', label: 'Rocker (forefoot roll)', section: 'Shoe Soles',
    customKey: 'cs4.rocker_toes_mm', min: 0, max: 25, color: 0x1ab0a0, effect: 'toeSpring', a: 0.62, b: 1 },
  { key: 'forefootWidth', label: 'Extra forefoot width', section: 'Shoe Soles',
    customKey: 'cs1.12_lf_rf', min: 0, max: 20, color: 0x2ec6d6, effect: 'widen', a: 0.58, b: 0.98 },
  { key: 'medialArch', label: 'Medial arch', section: 'Shoe Soles',
    customKey: 'cs2.25.01_md_lt_rf', min: 0, max: 15, color: 0x2ecc71, effect: 'arch', a: 0.3, b: 0.62 },
];

/** Secções na ordem de apresentação. */
export const REFLECT_SECTIONS: string[] = Array.from(
  REFLECT_FIELDS.reduce((set, f) => set.add(f.section), new Set<string>()),
);
