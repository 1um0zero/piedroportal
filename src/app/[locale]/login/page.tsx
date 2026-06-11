import { redirect } from '@/i18n/navigation'

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ error?: string }>
}

// Login now lives on the homepage (the revised landing embeds the login card).
// Redirect the old /login URL there so everyone enters through one place; carry
// the ?error=1 flag so a failed sign-in still surfaces the error on the card.
export default async function LoginPage({ params, searchParams }: Props) {
  const { locale } = await params
  const { error } = await searchParams
  redirect({ href: error === '1' ? { pathname: '/', query: { error: '1' } } : '/', locale })
}
