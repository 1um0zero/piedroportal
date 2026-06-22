// Shared order status constants — no 'use server' directive, safe to import anywhere

export const APPROVAL_STATES = [
  { value: 'registered',       label: 'Registered',       color: 'bg-stone-100 text-stone-500' },
  { value: 'under_analysis',   label: 'Under Analysis',   color: 'bg-yellow-50 text-yellow-700' },
  { value: 'approved',         label: 'Approved',         color: 'bg-green-50 text-green-700' },
  { value: 'refused',          label: 'Refused',          color: 'bg-red-50 text-red-600' },
  { value: 'need_attention',   label: 'Need Attention',   color: 'bg-orange-50 text-orange-600' },
  { value: 'awaiting_payment', label: 'Awaiting Payment', color: 'bg-blue-50 text-blue-600' },
] as const

export const PRODUCTION_STATES = [
  { value: 'order_received', label: 'Order Received' },
  { value: 'in_preparation', label: 'In Preparation' },
  { value: 'cutting',        label: 'Cutting' },
  { value: 'stitching',      label: 'Stitching' },
  { value: 'mounting',       label: 'Mounting' },
  { value: 'finishing',      label: 'Finishing' },
  { value: 'fitting',        label: 'Fitting' },
  { value: 'modeling',       label: 'Modeling' },
  { value: 'preparing',      label: 'Preparing' },
  { value: 'delivered',      label: 'Delivered' },
] as const

export type ApprovalState   = (typeof APPROVAL_STATES)[number]['value']
export type ProductionState = (typeof PRODUCTION_STATES)[number]['value']

// Ordered factory journey, used by the /orders production trail. This is the
// canonical linear flow an order travels through the VSI shop floor. States
// outside this list (e.g. 'fitting' from external production) are shown as a
// plain chip instead — they're branches, not steps on the main path.
export const PRODUCTION_SEQUENCE = [
  'order_received',
  'in_preparation',
  'modeling',
  'preparing',
  'cutting',
  'stitching',
  'mounting',
  'finishing',
] as const

// 'delivered' lives in the Delivery column (tracking), not as a trail step —
// but a delivered order still renders the whole trail as complete.
export const isOnProductionTrail = (state: string | null | undefined): boolean =>
  !!state && ((PRODUCTION_SEQUENCE as readonly string[]).includes(state) || state === 'delivered')

// Regular clients see a simplified 3-step journey — the detailed shop-floor
// stages are collapsed into "in preparation". (Staff keep the full sequence.)
export const USER_PRODUCTION_SEQUENCE = [
  'order_received',
  'in_preparation',
  'finishing',
] as const

// Map a real production state onto the simplified client trail, returning the
// current index within USER_PRODUCTION_SEQUENCE (or its length when delivered).
export const userTrailIndex = (state: string | null | undefined): number => {
  switch (state) {
    case 'order_received': return 0
    case 'in_preparation':
    case 'modeling':
    case 'preparing':
    case 'cutting':
    case 'stitching':
    case 'mounting':       return 1
    case 'finishing':      return 2
    case 'delivered':      return USER_PRODUCTION_SEQUENCE.length
    default:               return -1
  }
}
