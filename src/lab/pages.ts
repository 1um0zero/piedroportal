// ─────────────────────────────────────────────────────────────────────────────
// LAB pages catalogue — every experiment/preview page ever built, current and
// previous. Drives the chip dashboard at /admin/lab. Add a row here when you
// create a new lab page.
// ─────────────────────────────────────────────────────────────────────────────

export type LabPageStatus = 'active' | 'shipped' | 'rejected' | 'parked'

export type LabPage = {
  key: string
  title: string
  href: string
  status: LabPageStatus
  /** Registry lab key, when this page can become an approval sheet. */
  approvableLabKey?: string
  note?: string
}

export const LAB_PAGES: LabPage[] = [
  {
    key: 'mm-fields',
    title: 'Campos numéricos (range)',
    href: '/lab/mm-fields',
    status: 'shipped',
    approvableLabKey: 'mm-fields',
    note: 'Campo + unidade + (range) com slider flutuante. Em produção no OSB (RangeField).',
  },
  {
    key: 'combo-lists',
    title: 'Campos — lista combo',
    href: '/lab/combo-lists',
    status: 'active',
    note: 'Chips de opção a flutuar num popover (vs inline). Casos reais do OSB.',
  },
  {
    key: 'spinner',
    title: 'Spinner (footsteps)',
    href: '/admin/spinner-lab',
    status: 'rejected',
    note: 'Spinner ilustrado — rejeitado (graphic design fica para designers).',
  },
]

export const STATUS_META: Record<LabPageStatus, { label: string; cls: string }> = {
  active:   { label: 'Em estudo',  cls: 'bg-gold/15 text-gold' },
  shipped:  { label: 'Em produção', cls: 'bg-green-50 text-green-600' },
  rejected: { label: 'Rejeitado',   cls: 'bg-red-50 text-red-400' },
  parked:   { label: 'Parado',      cls: 'bg-stone-100 text-stone-500' },
}
