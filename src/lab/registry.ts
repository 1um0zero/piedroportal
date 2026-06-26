// ─────────────────────────────────────────────────────────────────────────────
// LAB registry · METADATA (server-safe, no React/client code).
// Each "lab" is a set of design ALTERNATIVES presented for approval. The metadata
// here drives DB seeding (an approval sheet copies these options into lab_options)
// and back-office listing. Rendering of the live widgets lives in `components.tsx`,
// keyed by the same (labKey, optKey) pair.
// ─────────────────────────────────────────────────────────────────────────────

export type LabOptionMeta = {
  key: string
  title: string
  subtitle?: string
  /** Author's note shown above the live widget on the approval sheet. */
  note?: string
}

export type LabMeta = {
  key: string
  title: string
  intro?: string
  options: LabOptionMeta[]
}

export const LAB_META: Record<string, LabMeta> = {
  'mm-fields': {
    key: 'mm-fields',
    title: 'Campos mm — escolha do widget',
    intro:
      'Estamos a rever a forma de introduzir os valores em milímetros (ex.: Tenen/Bal/Hiel do rocker, ' +
      'intervalo 0–60). Experimente cada alternativa — escreva e, onde houver, arraste. Marque a sua ' +
      'preferência em cada uma; o comentário esclarece o resto.',
    options: [
      { key: 'slider',   title: 'Slider + número',
        note: 'A barra mostra o intervalo (0 à esquerda, 60 à direita) e a posição. Escreve-se OU arrasta-se; impossível sair dos limites.' },
      { key: 'hint',     title: 'Campo + indicação “0–60”',
        note: 'Campo simples com a unidade “mm” à direita e o intervalo permitido ao lado.' },
      { key: 'stepper',  title: 'Campo com botões ▲▼',
        note: 'Botões − / + para acertar de 1 em 1, além de se poder escrever.' },
      { key: 'datalist', title: 'Atual (lista pendente)',
        note: 'A forma actual: ao clicar abre uma lista com todos os valores. Incluída só para comparação.' },
    ],
  },
}

export function getLabMeta(labKey: string): LabMeta | undefined {
  return LAB_META[labKey]
}
