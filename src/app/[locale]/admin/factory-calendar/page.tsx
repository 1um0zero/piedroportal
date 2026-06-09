import { requirePiedroAdminPage } from '@/lib/admin/scope'
import { createServiceClient } from '@/lib/supabase/service'
import FactoryCalendar from '@/components/admin/FactoryCalendar'

export default async function FactoryCalendarPage() {
  await requirePiedroAdminPage()
  const service = createServiceClient()
  const { data } = await service.from('factory_closures').select('date, kind, note').order('date')
  return <FactoryCalendar closures={data ?? []} />
}
