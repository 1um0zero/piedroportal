import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { requirePiedroAdminPage } from '@/lib/admin/scope'
import BranchCreateForm from '@/components/admin/BranchCreateForm'

export default async function NewBranchPage() {
  await requirePiedroAdminPage()
  const t = await getTranslations('admin.branches')

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/branches" className="text-sm text-stone-400 hover:text-stone-700">← {t('title')}</Link>
        <h1 className="text-xl font-bold text-stone-900">{t('new_branch')}</h1>
      </div>
      <BranchCreateForm />
    </div>
  )
}
