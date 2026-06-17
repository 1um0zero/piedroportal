/**
 * Stable ERP order export contract.
 *
 * This is the ONLY shape a-shell should depend on — it decouples the ERP from
 * the portal's internal column names so we can refactor the DB without breaking
 * the ERP import. Keep it additive (never rename/remove a field without bumping
 * `contract_version`).
 */
import { explodeAdditions, type ErpAddition } from '@/lib/additions-explode'

export const ERP_CONTRACT_VERSION = 2

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>

export interface ErpOrder {
  contract_version: number
  order_id: string                 // portal UUID (idempotency key for the ERP)
  dataverse_id: string | null      // legacy cross-reference during the transition
  piedro_order_id: string | null   // the ERP's own order number, if already set
  erp_order_ref: string | null     // a-shell console order nº(s), written back by the ERP
  approval_date: string | null
  status: string | null
  approval_state: string | null
  production_state: string | null
  urgent: boolean
  company: { id: string | null; erp_code: string | null; name: string | null }
  product: { id: string | null; style_name: string | null; colour_id: string | null }
  unit: string | null
  clinician: string | null
  patient_name: string | null
  reference_customer: string | null
  quantity: number | null
  size: { left: number | null; right: number | null }
  sizes_pairs: Array<{ size: number; qty: number }> | null   // DIFF_SIZES breakdown
  construction: { left: string | null; right: string | null }
  width: { left: string | null; right: string | null }
  comments: string | null
  comments_pt: string | null        // PT translation (cached); falls back to comments
  pdf_url: string | null            // direct signed URL to the order PDF, read-only (or null)
  tracking: { code: string | null; link: string | null }   // written by the ERP, echoed back
  additions: ErpAddition[]          // normalized 1:N list (only present items)
  created_at: string | null
  updated_at: string | null
  exported_at: string | null
}

export function toErpOrder(row: Row, company?: Row): ErpOrder {
  const product = row.products ?? row.product ?? {}
  const additions = (row.additions ?? null) as Record<string, unknown> | null
  return {
    contract_version: ERP_CONTRACT_VERSION,
    order_id: row.id,
    dataverse_id: row.dataverse_id ?? null,
    piedro_order_id: row.piedro_order_id ?? null,
    erp_order_ref: row.erp_order_ref ?? null,
    approval_date: row.approval_date ?? null,
    status: row.status ?? null,
    approval_state: row.approval_state ?? null,
    production_state: row.production_state ?? null,
    urgent: Boolean(additions?.urgent),
    company: {
      id: row.company_id ?? null,
      erp_code: company?.erp_code ?? null,
      name: company?.name ?? null,
    },
    product: {
      id: row.product_id ?? null,
      style_name: product.style_name ?? null,
      colour_id: product.colour_id ?? null,
    },
    unit: row.unit ?? null,
    clinician: row.clinician ?? null,
    patient_name: row.patient_name ?? null,
    reference_customer: row.reference_customer ?? null,
    quantity: row.quantity ?? null,
    size: { left: row.size_left ?? null, right: row.size_right ?? null },
    sizes_pairs: Array.isArray(row.diff_sizes_pairs) && row.diff_sizes_pairs.length
      ? row.diff_sizes_pairs : null,
    // Pass through if the columns exist; null otherwise (defensive — schema may vary).
    construction: { left: row.construction_left ?? null, right: row.construction_right ?? null },
    width: { left: row.width_left ?? null, right: row.width_right ?? null },
    comments: row.comments ?? null,
    comments_pt: row.comments_pt ?? null,
    pdf_url: row.pdf_signed ?? null,
    tracking: { code: row.tracking_code ?? null, link: row.tracking_link ?? null },
    additions: explodeAdditions(additions),
    created_at: row.created_at ?? null,
    updated_at: row.updated_at ?? null,
    exported_at: row.erp_exported_at ?? null,
  }
}
