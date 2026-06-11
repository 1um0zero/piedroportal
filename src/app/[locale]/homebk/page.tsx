import LandingPage from '@/components/landing/LandingPage'

// Backup of the previous homepage, kept reachable for validation after the
// revised landing (formerly /homenew) was promoted to `/`. Public; shown even
// when logged in so it can be reviewed.
export default function HomeBackupRoute() {
  return <LandingPage />
}
