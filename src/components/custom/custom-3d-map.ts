// custom-3d-map.ts — ponte entre o estado do formulário CUSTOM e o visualizador 3D.
//
// Lê os valores reais do form (chaves cs-code, sided {l,r} ou global) e produz um
// ViewerState com as chaves do REFLECT_FIELDS. Só entram as adições com tradução
// GEOMÉTRICA; tudo o resto (material, forro, fecho, cor, stiffeners) é ignorado
// porque não se reflete como deformação.
//
// ⚠ Mapeamento ilustrativo — as magnitudes/janelas do viewer não estão calibradas
// por horma/SKU (ver src/components/piedro-visualizer/reflect-fields.ts).

import type { Foot, ViewerState } from '@/components/piedro-visualizer';

interface Bridge {
  viewerKey: string; // chave em REFLECT_FIELDS
  customKey: string; // cs-code real no estado do form
  global?: boolean;  // valor escalar (não sided)
}

// Chaves confirmadas contra custom-additions-config.ts (2026-07-16).
const BRIDGES: Bridge[] = [
  { viewerKey: 'heelHeight', customKey: 'cs1.0.02_lf_rf' },     // Heel Height (Last)
  { viewerKey: 'toeJump', customKey: 'cs1.0.03_lf_rf' },        // Toe Jump
  { viewerKey: 'toeHeight', customKey: 'cs1.0.04_lf_rf' },      // Toe Height
  { viewerKey: 'suppHeel', customKey: 'cs2.31_lt_lf_rf' },      // Supplement — Heel
  { viewerKey: 'ballMedial', customKey: 'cs2.32_lt_lf_rf' },    // Supplement — Ball medial
  { viewerKey: 'ballLateral', customKey: 'cs2.32_md_lt_rf' },   // Supplement — Ball lateral
  { viewerKey: 'suppToe', customKey: 'cs2.33', global: true },  // Supplement — Toe
  { viewerKey: 'rocker', customKey: 'cs4.rocker_toes_mm' },     // Rocker sole (toes)
  { viewerKey: 'legLengthLift', customKey: 'cs2.51', global: true }, // Leg-length difference
  { viewerKey: 'soleHeight', customKey: 'cs4.height_lf_rf' },   // Sole Height
];

type Sided = { l?: number | string; r?: number | string };

/** Constrói o estado do viewer a partir dos valores do form, para o pé pedido. */
export function customValuesToViewer(
  values: Record<string, unknown>,
  foot: Foot,
): ViewerState {
  const side: 'l' | 'r' = foot === 'L' ? 'l' : 'r';
  const out: Record<string, number> = {};
  for (const b of BRIDGES) {
    const raw = values[b.customKey];
    let n = NaN;
    if (b.global) {
      n = Number(raw);
    } else if (raw && typeof raw === 'object') {
      n = Number((raw as Sided)[side]);
    }
    if (Number.isFinite(n) && n > 0) out[b.viewerKey] = n;
  }
  return { foot, values: out };
}

/** Quantas adições refletíveis estão preenchidas (em qualquer pé) — para o badge do botão. */
export function reflectableCount(values: Record<string, unknown>): number {
  const l = customValuesToViewer(values, 'L').values;
  const r = customValuesToViewer(values, 'R').values;
  return new Set([...Object.keys(l), ...Object.keys(r)]).size;
}
