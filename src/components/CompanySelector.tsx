'use client'

import { useState, useEffect } from 'react'
import { useRouter } from '@/i18n/navigation'

type Company = {
  id: string
  name: string
  is_company_admin: boolean
}

type Props = {
  companies: Company[]
  currentCompanyId: string | null
}

export default function CompanySelector({ companies, currentCompanyId }: Props) {
  const router = useRouter()
  const [selected, setSelected] = useState(currentCompanyId ?? companies[0]?.id ?? '')

  useEffect(() => {
    // Sync with prop changes
    if (currentCompanyId && currentCompanyId !== selected) {
      setSelected(currentCompanyId)
    }
  }, [currentCompanyId, selected])

  function handleChange(companyId: string) {
    setSelected(companyId)
    // Save to localStorage
    localStorage.setItem('activeCompanyId', companyId)
    // Refresh page to reload with new company
    router.refresh()
  }

  // Don't show selector if user has only one company
  if (companies.length <= 1) return null

  return (
    <div className="relative">
      <select
        value={selected}
        onChange={(e) => handleChange(e.target.value)}
        className="h-9 pl-3 pr-8 text-sm bg-white border border-stone-200 rounded-lg
                   text-stone-700 appearance-none cursor-pointer
                   focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold
                   hover:border-stone-300 transition-colors">
        {companies.map(c => (
          <option key={c.id} value={c.id}>
            {c.name} {c.is_company_admin ? '(Admin)' : ''}
          </option>
        ))}
      </select>
      <svg className="absolute right-2.5 top-3 w-3.5 h-3.5 text-stone-400 pointer-events-none"
        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  )
}
