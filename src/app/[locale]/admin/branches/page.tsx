import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { createServiceClient } from '@/lib/supabase/service'
import { requirePiedroAdminPage } from '@/lib/admin/scope'
import type { Branch } from '@/types'

export default async function AdminBranchesPage() {
  await requirePiedroAdminPage()
  const t = await getTranslations('admin.branches')

  const service = createServiceClient()
  const [{ data: branches }, { data: models }, { data: staff }] = await Promise.all([
    service.from('branches').select('id, name, code, sees_full_catalogue').order('name'),
    service.from('branch_models').select('branch_id'),
    service.from('profiles').select('branch_id').eq('role', 'branch_staff'),
  ])

  const modelCount = new Map<string, number>()
  for (const m of models ?? []) modelCount.set(m.branch_id, (modelCount.get(m.branch_id) ?? 0) + 1)
  const staffCount = new Map<string, number>()
  for (const s of staff ?? []) if (s.branch_id) staffCount.set(s.branch_id, (staffCount.get(s.branch_id) ?? 0) + 1)

  const rows = (branches ?? []) as Branch[]

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-stone-900">{t('title')}</h1>
        <Link href="/admin/branches/new" className="rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-white hover:bg-gold-dark">{t('new_branch')}</Link>
      </div>

      {rows.length === 0 ? (
        <div className="bg-white rounded-[14px] p-10 text-center text-sm text-stone-400" style={{ boxShadow: 'var(--shadow-card)' }}>
          {t('empty')}
        </div>
      ) : (
        <div className="bg-white rounded-[14px] overflow-hidden" style={{ boxShadow: 'var(--shadow-card)' }}>
          <table className="w-full text-sm">
            <thead className="bg-stone-50">
              <tr>
                {[t('col_name'), t('col_code'), t('col_catalogue'), t('col_models'), t('col_staff'), ''].map((c, i) =>
                  <th key={i} className="px-4 py-2 text-left text-[11px] font-semibold text-stone-400 uppercase">{c}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {rows.map(b => (
                <tr key={b.id}>
                  <td className="px-4 py-3 font-medium text-stone-800">{b.name}</td>
                  <td className="px-4 py-3 text-stone-500">{b.code ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${b.sees_full_catalogue ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'}`}>
                      {b.sees_full_catalogue ? t('mode_full') : t('mode_limited')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-stone-500">
                    {b.sees_full_catalogue
                      ? t('excludes_n', { n: modelCount.get(b.id) ?? 0 })
                      : t('includes_n', { n: modelCount.get(b.id) ?? 0 })}
                  </td>
                  <td className="px-4 py-3 text-stone-500">{staffCount.get(b.id) ?? 0}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/admin/branches/${b.id}`} className="text-sm font-medium text-gold hover:text-gold-dark">{t('manage')}</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
