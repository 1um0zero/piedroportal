import LoginForm from '@/components/auth/LoginForm'
import { routing } from '@/i18n/routing'

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

type Props = { searchParams: Promise<{ error?: string }> }

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams
  return <LoginForm searchParams={params} />
}
