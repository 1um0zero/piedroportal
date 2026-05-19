import LoginForm from '@/components/auth/LoginForm'
import { routing } from '@/i18n/routing'

// Pre-generate for all locales at build time → served from CDN, no cold start
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export default function LoginPage() {
  return <LoginForm />
}
