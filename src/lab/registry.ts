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
  /**
   * 'alternatives' (default) — reviewer marks each option Escolhido/Opção/Recusado.
   * 'approval'              — ONE subject, one sheet-level verdict
   *                           Aprovado/Rejeitado/Em discussão (+ comment).
   */
  kind?: 'alternatives' | 'approval'
  options: LabOptionMeta[]
}

/** Sheet-level verdict labels for the 'approval' kind (PT). */
export const APPROVAL_VERDICTS = [
  { key: 'approved',   label: 'Aprovado',     cls: 'border-green-300 bg-green-50 text-green-600' },
  { key: 'rejected',   label: 'Rejeitado',    cls: 'border-red-300 bg-red-50 text-red-500' },
  { key: 'discussion', label: 'Em discussão', cls: 'border-gold bg-gold/10 text-gold' },
] as const

export type ApprovalVerdict = (typeof APPROVAL_VERDICTS)[number]['key']

export const LAB_META: Record<string, LabMeta> = {
  'mm-fields': {
    key: 'mm-fields',
    title: 'Campos mm — escolha do widget',
    intro:
      'Estamos a rever a forma de introduzir os valores em milímetros (ex.: Tenen/Bal/Hiel do rocker, ' +
      'intervalo 0–60). Experimente cada alternativa — escreva e, onde houver, arraste. Marque a sua ' +
      'preferência em cada uma; o comentário esclarece o resto.',
    options: [
      { key: 'floating', title: 'Campo “0–60” + slider flutuante',
        note: 'O campo definitivo (mm e escala fora) e, ao tocar/focar, aparece um slider flutuante — limpo nos painéis cheios e, no telemóvel, evita o teclado.' },
      { key: 'hint',     title: 'Campo + indicação “0–60”',
        note: 'Campo simples com a unidade “mm” à direita e o intervalo permitido ao lado.' },
      { key: 'slider',   title: 'Slider + número (sempre visível)',
        note: 'A barra mostra o intervalo (0 à esquerda, 60 à direita) e a posição. Escreve-se OU arrasta-se; impossível sair dos limites.' },
      { key: 'stepper',  title: 'Campo com botões ▲▼',
        note: 'Botões − / + para acertar de 1 em 1, além de se poder escrever.' },
      { key: 'datalist', title: 'Atual (lista pendente)',
        note: 'A forma actual: ao clicar abre uma lista com todos os valores. Incluída só para comparação.' },
    ],
  },
  'custom-leather': {
    key: 'custom-leather',
    title: 'Custom — aprovação da pele por peça',
    kind: 'approval',
    intro:
      'Segue a proposta de pele para cada peça da maquete. Confirme se aprova, ' +
      'rejeita ou quer discutir, e deixe um comentário com o que entender.',
    options: [],
  },
}

export function getLabMeta(labKey: string): LabMeta | undefined {
  return LAB_META[labKey]
}

/** A sheet uses the single-subject approval flow when its lab is of kind 'approval'. */
export function isApprovalKind(labKey: string): boolean {
  return getLabMeta(labKey)?.kind === 'approval'
}
