export type Section = 'KIDS' | 'MEN' | 'WOMEN'
export type Closure = 'LACE' | 'VELCRO' | 'BUCKLE' | 'TWIST LOCK SYSTEM' | 'LACE, ZIPPER'
export type ProductType = 'Boot' | 'Shoes' | 'Sandal'
export type OrderStatus = 'draft' | 'submitted' | 'approved' | 'in_production' | 'shipped' | 'delivered' | 'cancelled'
export type UserRole = 'user' | 'company_admin' | 'piedro_admin' | 'branch_staff' | 'super_admin'
export type Locale = 'en' | 'nl' | 'fr' | 'de'

export interface ColorNameI18n {
  nl?: string
  fr?: string
  de?: string
}

export interface Construction {
  construction: string
  widths: string[]
}

export interface Product {
  id: string
  style_name: string
  colour_id: string
  picture_name: string
  section: Section
  closure: Closure
  type: ProductType
  color_basic: string
  color_name: string
  color_name_i18n: ColorNameI18n | null
  size_first: number
  size_last: number
  size_unit?: 'EU' | 'UK' | null   // size scale unit; null treated as 'EU'
  diabetics: boolean
  info: string | null
  sibling: string | null
  active: boolean
  constructions: Construction[]
  new_until: string | null  // ISO datetime; null = new without expiry; absent = not new
  adds_exclude: string | null  // e.g. "#cr56f_zipper" — additions to hide for this product
  exclusive: string | null
  is_stock?: boolean  // STOCK product (buy-as-is); see docs/PROJECT-TRACKER.md §23
}

export interface Profile {
  id: string
  email: string
  full_name: string
  role: UserRole
  company_id: string | null  // DEPRECATED: Use user_companies table instead
  branch_id: string | null   // Branch office a branch_staff user belongs to
  preferred_locale: Locale
  must_set_password?: boolean // migrated users must set their own password on first login
}

/**
 * Branch office (regional office: NL, UK, …) with model-scoped back-office access.
 * `sees_full_catalogue` true → branch_models are exclusions (everything except them);
 * false → branch_models are inclusions (only them).
 */
export interface Branch {
  id: string
  name: string
  code: string | null
  sees_full_catalogue: boolean
  notify_email: string | null   // where this branch's order copies are sent
  notify_locale: string | null  // language for this branch's copies (en/nl/fr/de)
  created_at?: string
}

export interface BranchModel {
  branch_id: string
  style_name: string
}

export interface Company {
  id: string
  name: string
  erp_code: string
  default_locale: Locale
  exclusive_label: string | null  // UPPERCASE sigla; models with products.exclusive == this are exclusive to this company
  country_code?: string | null    // ISO 3166-1 alpha-2 (normalised from Dataverse), e.g. 'NL'
  country?: string | null         // canonical English country name
  country_raw?: string | null     // original Dataverse country value (audit)
  city?: string | null
  address_line1?: string | null
}

export interface OrderLine {
  id: string
  order_id: string
  product_id: string
  config: Record<string, unknown>
  feet: 'both' | 'left' | 'right'
}

export interface Order {
  id: string
  user_id: string
  company_id: string
  status: OrderStatus
  locale: Locale
  created_at: string
  updated_at: string
  lines: OrderLine[]
}

// ── STOCK products (buy-as-is from stock) — see docs/PROJECT-TRACKER.md §23 ──

/** Physical stock on hand per (product, size). The portal never decrements this
 *  in-app; available = qty_on_hand − reserved (computed). */
export interface ProductStock {
  product_id: string
  size: number
  qty_on_hand: number
  updated_at: string
}

/** A STOCK product row enriched with per-size availability for the grid.
 *  `available` is already qty_on_hand − reserved, and only sizes with
 *  available > 0 are present. */
export interface StockProduct extends Product {
  sizes: StockSize[]
}

export interface StockSize {
  size: number
  available: number
}

export interface StockOrderItem {
  id: string
  stock_order_id: string
  product_id: string
  size: number
  qty: number
}

/** STOCK orders reuse the OrderStatus enum but never use 'draft' — they reserve
 *  on submit. */
export interface StockOrder {
  id: string
  user_id: string
  company_id: string | null
  status: OrderStatus
  locale: Locale
  comments: string | null
  expected_dispatch_date: string | null
  created_at: string
  updated_at: string
  items: StockOrderItem[]
}

export interface Translation {
  key: string
  en: string
  nl: string | null
  fr: string | null
  de: string | null
  category: string
  description: string | null
  created_at: string
  updated_at: string
}

export interface AdditionOption {
  id: number
  key: string
  category: string
  value: string // EN (base)
  value_nl: string | null
  value_fr: string | null
  value_de: string | null
  sort_order: number
  active: boolean
  created_at: string
  updated_at: string
}
