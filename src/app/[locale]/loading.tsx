import PiedroLogoLoader from '@/components/ui/PiedroLogoLoader'

// Boot / navigation splash — shown by the App Router (Suspense) while any page
// under [locale] that has no more-specific loading.tsx streams in. Gallery and
// order-detail routes provide their own (skeleton) loaders, which take priority.
export default function LocaleLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6 py-24">
      <PiedroLogoLoader size={96} />
    </div>
  )
}
