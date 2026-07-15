// types.ts — contrato de dados do visualizador PiedroPortal
//
// O visualizador é "controlado": recebe o estado e reflete-o, sem estado próprio.
// O conjunto de campos refletíveis vive em reflect-fields.ts (REFLECT_FIELDS) —
// espelha as adições CUSTOM com tradução geométrica.
//
// ⚠ PROTÓTIPO: ilustrativo, não calibrado por SKU, fora do fluxo do cliente.

/** Pé a representar. */
export type Foot = 'L' | 'R';

/**
 * Estado do viewer: o pé + um mapa `key → mm` (chaves de REFLECT_FIELDS).
 * Ausência de chave = 0.
 */
export interface ViewerState {
  foot: Foot;
  values: Record<string, number>;
}

/** Opções de apresentação do visualizador. */
export interface ViewerOptions {
  /** Colorir as zonas ativas sobre o modelo. Default: true. */
  showZones?: boolean;
  /** Mostrar bandeiras/alfinetes com legenda. Default: true. */
  showFlags?: boolean;
  /** Cor de fundo da cena (hex). Default: 0x0f1419. */
  background?: number;
  /** Callback quando o primeiro render está pronto. */
  onReady?: () => void;
}

/** Estado inicial vazio. */
export const emptyState = (foot: Foot = 'L'): ViewerState => ({ foot, values: {} });
