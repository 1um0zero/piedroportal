/**
 * Stable ERP order export contract.
 *
 * This is the ONLY shape a-shell should depend on — it decouples the ERP from
 * the portal's internal column names so we can refactor the DB without breaking
 * the ERP import. Keep it additive (never rename/remove a field without bumping
 * `contract_version`).
 */
export const ERP_CONTRACT_VERSION = 1

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>

export interface ErpOrder {
  contract_version: number
  order_id: string                 // portal UUID (idempotency key for the ERP)
  dataverse_id: string | null      // legacy cross-reference during the transition
  piedro_order_id: string | null   // the ERP's own order number, if already set
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
  construction: { left: string | null; right: string | null }
  width: { left: string | null; right: string | null }
  comments: string | null
  additions: Record<string, unknown> | null
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
    // Pass through if the columns exist; null otherwise (defensive — schema may vary).
    construction: { left: row.construction_left ?? null, right: row.construction_right ?? null },
    width: { left: row.width_left ?? null, right: row.width_right ?? null },
    comments: row.comments ?? null,
    additions,
    created_at: row.created_at ?? null,
    updated_at: row.updated_at ?? null,
    exported_at: row.erp_exported_at ?? null,
  }
}
