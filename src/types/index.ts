export type Section = 'KIDS' | 'MEN' | 'WOMEN'
export type Closure = 'LACE' | 'VELCRO' | 'BUCKLE' | 'TWIST LOCK SYSTEM' | 'LACE, ZIPPER'
export type ProductType = 'Boot' | 'Shoes' | 'Sandal'
export type OrderStatus = 'draft' | 'submitted' | 'approved' | 'in_production' | 'shipped' | 'delivered' | 'cancelled'
export type UserRole = 'user' | 'company_admin' | 'piedro_admin' | 'branch_staff'
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
  diabetics: boolean
  info: string | null
  sibling: string | null
  active: boolean
  constructions: Construction[]
  new_until: string | null  // ISO datetime; null = new without expiry; absent = not new
  adds_exclude: string | null  // e.g. "#cr56f_zipper" — additions to hide for this product
  exclusive: string | null
}

export interface Profile {
  id: string
  email: string
  full_name: string
  role: UserRole
  company_id: string | null  // DEPRECATED: Use user_companies table instead
  branch_id: string | null   // Branch office a branch_staff user belongs to
  preferred_locale: Locale
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
