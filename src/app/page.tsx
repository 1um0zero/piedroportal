import { redirect } from 'next/navigation'

// Root URL — redirect to default locale gallery
export default function RootPage() {
  redirect('/gallery')
}
