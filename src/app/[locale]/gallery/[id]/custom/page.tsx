import { notFound } from 'next/navigation'
import { createClient as createPublicClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { getUserCompanies } from '@/lib/user-companies'
import { getBranchAdminCompanies } from '@/lib/branch-admin'
import { isPiedroAdmin } from '@/lib/roles'
import { isCustomBetaEvaluator } from '@/lib/custom-beta'
import CustomOrderForm from '@/components/custom/CustomOrderForm'
import { getOsbOptionOverrides } from '@/lib/additions/option-seed'
import type { Product } from '@/types'

async function getProduct(id: string): Promise<Product | null> {
  const sb = createPublicClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  const { data } = await sb
    .from('products')
    .select('id,style_name,colour_id,color_name,closure,picture_name,constructions,size_first,size_last,size_unit,section,adds_exclude,exclusive')
    .eq('id', id).single()
  return (data as unknown as Product) ?? null
}

type Company = { id: string; name: string; erp_code: string }
type Props = { params: Promise<{ locale: string; id: string }> }

export default async function CustomOrderPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()  // CUSTOM ordering requires login, same as OSB

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const admin = isPiedroAdmin(profile?.role)
  // Named Piedro-side evaluators (src/lib/custom-beta.ts) may open the beta in
  // EVALUATION mode: full form + 3D preview, saving/submitting disabled.
  const evaluator = !admin && isCustomBetaEvaluator(user.email)

  // CUSTOM is a BETA under construction — admin-only until promoted (plus the
  // evaluator allowlist). Guard the route server-side so nobody else can reach
  // it by typing the URL.
  if (!admin && !evaluator) notFound()

  let companies: Company[] = []
  let userCompany: Company | null = null
  if (admin || evaluator) {
    // Evaluators get the same company picker as admins: they carry no company
    // of their own, and Tab 1 needs one to advance. Harmless — they cannot save.
    const { data } = await supabase.from('companies').select('id,name,erp_code').order('name')
    companies = (data ?? []) as Company[]
  } else {
    const [own, branch] = await Promise.all([getUserCompanies(user.id), getBranchAdminCompanies(user.id)])
    const byId = new Map<string, Company>()
    for (const c of [...own, ...branch]) byId.set(c.id, { id: c.id, name: c.name, erp_code: c.erp_code })
    const merged = [...byId.values()].sort((a, b) => a.name.localeCompare(b.name))
    if (merged.length === 1) userCompany = merged[0]
    else if (merged.length > 1) companies = merged
  }

  const [product, optionOverrides] = await Promise.all([getProduct(id), getOsbOptionOverrides()])
  if (!product) notFound()

  return <CustomOrderForm product={product} userCompany={userCompany} companies={companies} isAdmin={admin} evaluationOnly={evaluator} optionOverrides={optionOverrides} />
}
