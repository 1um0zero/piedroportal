// types.ts — contrato de dados do visualizador PiedroPortal
//
// Estes tipos são o "contrato" entre o formulário de encomenda e o motor 3D.
// Os valores vêm diretamente do estado do formulário; o visualizador é
// "controlado" — não guarda estado próprio das adaptações.
//
// ⚠ PROTÓTIPO: este contrato tem 5 campos ILUSTRATIVOS. O portal real tem ~30
// adições (ver src/components/order/additions-config.ts). Isto NÃO é um espelho
// 1:1 da encomenda nem representa o produto fabricado — é uma ajuda visual.

/** Pé a representar. */
export type Foot = 'L' | 'R';

/**
 * Adaptações aplicadas na encomenda. Todos os valores em milímetros.
 * Mapeiam 1:1 para o JSON que o portal envia para produção.
 */
export interface Adaptations {
  foot: Foot;
  /** Alteamento / compensação de sola (0–50). */
  liftMm: number;
  /** Largura extra no antepé (0–20). */
  forefootWidthMm: number;
  /** Biqueira alta / toe box (0–18). */
  toeBoxMm: number;
  /** Reforço medial de arco (0–15). */
  medialArchMm: number;
  /** Cunha: valor positivo = varo, negativo = valgo (−12…+12). */
  wedgeMm: number;
}

/**
 * Texto das bandeiras (alfinetes). Funções para permitir i18n:
 * o binding React passa strings já traduzidas via next-intl.
 */
export interface FlagLabels {
  lift: (mm: number) => string;
  width: (mm: number) => string;
  toe: (mm: number) => string;
  arch: (mm: number) => string;
  /** mm > 0 = varo, mm < 0 = valgo. */
  wedge: (mm: number) => string;
}

/** Opções de apresentação do visualizador. */
export interface ViewerOptions {
  /** Colorir as zonas ativas sobre o modelo. Default: true. */
  showZones?: boolean;
  /** Mostrar bandeiras/alfinetes com legenda. Default: true. */
  showFlags?: boolean;
  /** Textos das bandeiras (traduzidos). Se omitido, usa inglês. */
  labels?: Partial<FlagLabels>;
  /** Cor de fundo da cena (hex). Default: 0x0f1419. */
  background?: number;
  /** Callback quando o primeiro render está pronto. */
  onReady?: () => void;
}

/** Estado neutro (sem adaptações) — útil como valor inicial. */
export const NEUTRAL_ADAPTATIONS: Adaptations = {
  foot: 'L',
  liftMm: 0,
  forefootWidthMm: 0,
  toeBoxMm: 0,
  medialArchMm: 0,
  wedgeMm: 0,
};

/** Labels por omissão (inglês — locale base do portal). */
export const DEFAULT_LABELS: FlagLabels = {
  lift: (mm) => `Heel lift ${mm} mm`,
  width: (mm) => `Extra width +${mm} mm`,
  toe: (mm) => `Toe box ${mm} mm`,
  arch: (mm) => `Medial arch ${mm} mm`,
  wedge: (mm) => (mm > 0 ? `Varus wedge +${mm} mm` : `Valgus wedge ${mm} mm`),
};
