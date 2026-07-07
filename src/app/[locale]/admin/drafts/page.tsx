import { createServiceClient } from '@/lib/supabase/service'
import { requireBackofficePage } from '@/lib/admin/scope'
import DraftsList from '@/components/orders/DraftsList'

const SELECT = `
  id, user_id, unit, patient_name, clinician, reference_customer,
  created_at, updated_at,
  products(id, style_name, colour_id, closure, picture_name),
  companies(id, name, erp_code)
`

// Drafts are a small set (unsubmitted orders), so a single bounded fetch is
// enough — no need for the windowed pagination the main Orders list uses.
export default async function AdminDraftsPage() {
  const scope = await requireBackofficePage()
  const service = createServiceClient()

  const { data } = await service
    .from('orders')
    .select(SELECT)
    .eq('status', 'draft')
    .order('created_at', { ascending: false })
    .limit(2000)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let drafts: any[] = data ?? []

  // Branch staff only see drafts whose product model and company are within their scope.
  if (!scope.allModels) drafts = drafts.filter(o => scope.canModel(o.products?.style_name) && scope.canCompany(o.companies?.id))

  // Attach the creator's email (consultation: whose draft is this).
  const ownerIds = [...new Set(drafts.map(o => o.user_id).filter(Boolean))]
  if (ownerIds.length) {
    const { data: profs } = await service.from('profiles').select('id, email').in('id', ownerIds)
    const emailById = new Map((profs ?? []).map(p => [p.id, p.email]))
    for (const o of drafts) o.owner_email = o.user_id ? (emailById.get(o.user_id) ?? null) : null
  }

  return <DraftsList drafts={drafts} />
}
