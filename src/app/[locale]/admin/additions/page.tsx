import { requirePiedroAdminPage } from '@/lib/admin/scope'
import { listAdditionOptions } from '@/app/actions/admin-additions'
import AdditionsTablesManager from '@/components/admin/AdditionsTablesManager'

/**
 * /admin/additions — "Additions – Tabelas": editable option lists for the
 * sole-amendment additions fields (PU/EVA Bumper, Sole, Runner sole).
 *
 * PHASE 1: editable source only; the order form still reads additions-config.ts
 * at runtime, so edits here do not yet change the customer experience.
 */
export default async function AdminAdditionsPage() {
  await requirePiedroAdminPage()
  const groups = await listAdditionOptions()
  return <AdditionsTablesManager groups={groups} />
}
