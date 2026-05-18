export type Section = 'KIDS' | 'MEN' | 'WOMEN'
export type Closure = 'LACE' | 'VELCRO' | 'BUCKLE' | 'TWIST LOCK SYSTEM' | 'LACE, ZIPPER'
export type ProductType = 'Boot' | 'Shoes' | 'Sandal'
export type OrderStatus = 'draft' | 'submitted' | 'approved' | 'in_production' | 'shipped' | 'delivered' | 'cancelled'
export type UserRole = 'user' | 'company_admin' | 'piedro_admin'

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
  size_first: number
  size_last: number
  diabetics: boolean
  info: string | null
  sibling: string | null
  active: boolean
  constructions: Construction[]
  new_until: string | null  // ISO datetime; null = new without expiry; absent = not new
}

export interface Profile {
  id: string
  email: string
  full_name: string
  role: UserRole
  company_id: string
}

export interface Company {
  id: string
  name: string
  erp_code: string
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
  created_at: string
  updated_at: string
  lines: OrderLine[]
}
