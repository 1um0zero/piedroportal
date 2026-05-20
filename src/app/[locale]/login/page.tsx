import LoginForm from '@/components/auth/LoginForm'

export const dynamic = 'force-dynamic'

type Props = { searchParams: Promise<{ error?: string }> }

export default async function LoginPage({ searchParams }: Props) {
  const { error } = await searchParams
  return <LoginForm hasError={error === '1'} />
}
