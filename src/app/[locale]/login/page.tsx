import LoginForm from '@/components/auth/LoginForm'

// Dynamic — never cached, always fresh bundle with correct env vars
export const dynamic = 'force-dynamic'

export default function LoginPage() {
  return <LoginForm />
}
