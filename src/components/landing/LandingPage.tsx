import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'

// Landing imagery — served from /public/landing. Empty string falls back to an
// elegant gradient placeholder (see <Img/> below).
const IMG = {
  hero: '/landing/hero.png',
  osbWomen: '/landing/osb_dames.png',
  osbMen: '/landing/osb_heren.png',
  osbKids: '/landing/osb_kinderen.png',
  newsCircle: '/landing/whats_new.png',
  didCustom: '/landing/balloon.png',
  didCatalogs: '/landing/boy_upsidedown.png',
}

/** Image with a tasteful gradient fallback while real assets aren't wired up. */
function Img({ src, alt, className }: { src: string; alt: string; className?: string }) {
  if (!src) {
    return (
      <div
        className={`flex items-center justify-center bg-gradient-to-br from-gold/15 via-stone-100 to-gold/5 ${className ?? ''}`}
        aria-label={alt}
        role="img"
      >
        <svg className="w-10 h-10 text-gold/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 4.5h16.5a1.5 1.5 0 011.5 1.5v12a1.5 1.5 0 01-1.5 1.5H3.75a1.5 1.5 0 01-1.5-1.5V6a1.5 1.5 0 011.5-1.5z" />
        </svg>
      </div>
    )
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className={`object-cover ${className ?? ''}`} />
}

export default async function LandingPage() {
  const t = await getTranslations('landing')

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 sm:py-14">
      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section className="mb-14">
        <h1 className="text-4xl sm:text-5xl font-bold text-stone-900 tracking-tight max-w-xl">
          {t('hero.title')}
        </h1>
        <p className="mt-5 text-stone-500 leading-relaxed max-w-2xl">
          {t('hero.body')}{' '}
          <span className="italic">{t('hero.tagline')}</span>
        </p>
        <Link
          href="/login"
          className="inline-flex mt-7 h-11 items-center rounded-lg bg-stone-900 px-6 text-sm font-semibold text-white hover:bg-stone-800 transition-colors"
        >
          {t('hero.cta')}
        </Link>

        <Img src={IMG.hero} alt={t('hero.title')} className="mt-10 h-40 sm:h-64 w-full rounded-[14px]" />
      </section>

      {/* ── OSB collections ────────────────────────────────────────────── */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold text-stone-900 mb-6">{t('osb.title')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {([
            { key: 'women', img: IMG.osbWomen },
            { key: 'men', img: IMG.osbMen },
            { key: 'kids', img: IMG.osbKids },
          ] as const).map(({ key, img }) => (
            <Link key={key} href="/gallery" className="group block">
              <Img
                src={img}
                alt={t(`osb.${key}.title`)}
                className="h-52 w-full rounded-[14px] mb-4 group-hover:opacity-90 transition-opacity"
              />
              <h3 className="text-sm font-semibold text-stone-900 group-hover:text-gold transition-colors">
                {t(`osb.${key}.title`)}
              </h3>
              <p className="mt-1 text-sm text-stone-500 leading-relaxed">{t(`osb.${key}.body`)}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* ── What's new ─────────────────────────────────────────────────── */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold text-stone-900 mb-6">{t('news.title')}</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-stone-900">{t('news.new.title')}</h3>
              <p className="mt-1.5 text-sm text-stone-500 leading-relaxed">{t('news.new.body')}</p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-stone-900">{t('news.updates.title')}</h3>
              <p className="mt-1.5 text-sm text-stone-500 leading-relaxed">{t('news.updates.body')}</p>
            </div>
            <div className="flex flex-wrap gap-3 pt-1">
              <Link href="/gallery" className="inline-flex h-10 items-center rounded-lg bg-stone-900 px-5 text-sm font-medium text-white hover:bg-stone-800 transition-colors">
                {t('news.cta_products')}
              </Link>
              <Link href="/gallery" className="inline-flex h-10 items-center rounded-lg border border-stone-300 px-5 text-sm font-medium text-stone-700 hover:border-gold hover:text-gold transition-colors">
                {t('news.cta_updates')}
              </Link>
            </div>
          </div>
          <Img src={IMG.newsCircle} alt={t('news.title')} className="h-72 w-full rounded-[14px]" />
        </div>
      </section>

      {/* ── Did you know ───────────────────────────────────────────────── */}
      <section>
        <h2 className="text-2xl font-bold text-stone-900 mb-6">{t('did.title')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {([
            { key: 'custom', img: IMG.didCustom },
            { key: 'catalogs', img: IMG.didCatalogs },
          ] as const).map(({ key, img }) => (
            <div key={key}>
              <Img src={img} alt={t(`did.${key}.title`)} className="h-56 w-full rounded-[14px] mb-4" />
              <h3 className="text-sm font-semibold text-stone-900">{t(`did.${key}.title`)}</h3>
              <p className="mt-1 text-sm text-stone-500 leading-relaxed">{t(`did.${key}.body`)}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
