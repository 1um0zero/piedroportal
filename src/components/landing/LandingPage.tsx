import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import LoginCard from '@/components/auth/LoginCard'
import { encodeQuery } from '@/lib/query-cipher'

// Maps an OSB collection card to the gallery section (tab) it opens.
const OSB_SECTION = { women: 'WOMEN', men: 'MEN', kids: 'KIDS' } as const

// Landing imagery — served from /public/landing. Empty string falls back to an
// elegant gradient placeholder (see <Img/> below).
const IMG = {
  hero: '/landing/hero.jpg',
  osbWomen: '/landing/osb_dames.jpg',
  osbMen: '/landing/osb_heren.jpg',
  osbKids: '/landing/osb_kinderen.jpg',
  newsCircle: '/landing/whats_new.jpg',
  didCustom: '/landing/balloon.jpg',
  didCatalogs: '/landing/boy_upsidedown.jpg',
}

/**
 * Image with a tasteful gradient fallback while real assets aren't wired up.
 * `fit="contain"` shows the whole image (no cropping) on a neutral backdrop —
 * use it for landscape product shots that `cover` would crop awkwardly.
 */
function Img({ src, alt, className, fit = 'cover' }: { src: string; alt: string; className?: string; fit?: 'cover' | 'contain' }) {
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
  const fitClass = fit === 'contain' ? 'object-contain bg-stone-50' : 'object-cover'
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className={`${fitClass} ${className ?? ''}`} />
}

// Shared styles — section headings + buttons, matched to the Figma spec
// (48px/600 headings with -0.02em tracking; black primary / grey #E6E6E6 secondary).
const heading = 'text-3xl sm:text-4xl font-semibold text-stone-900 tracking-[-0.02em] mb-8'
const btnPrimary = 'inline-flex h-12 items-center rounded-lg bg-stone-900 px-7 text-base font-medium text-white shadow-sm hover:bg-stone-800 transition-colors'
const btnSecondary = 'inline-flex h-12 items-center rounded-lg bg-[#E6E6E6] px-7 text-base font-medium text-stone-900 shadow-sm hover:bg-stone-300 transition-colors'

export default async function LandingPage() {
  const t = await getTranslations('landing')

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 sm:py-20">
      {/* ── Hero — marketing copy + embedded login ─────────────────────── */}
      <section className="mb-20">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_minmax(0,400px)] gap-10 lg:gap-16 items-center">
          <div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-stone-900 tracking-[-0.02em] leading-[1.05]">
              {t('hero.title')}
            </h1>
            <p className="mt-6 text-lg text-stone-600 leading-relaxed">
              {t('hero.body')}{' '}
              <span className="italic">{t('hero.tagline')}</span>
            </p>
          </div>
          <LoginCard />
        </div>

        <Img src={IMG.hero} alt={t('hero.title')} className="mt-12 h-44 sm:h-72 w-full rounded-[14px]" />
      </section>

      {/* ── OSB collections ────────────────────────────────────────────── */}
      <section className="mb-20">
        <h2 className={heading}>{t('osb.title')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          {([
            { key: 'women', img: IMG.osbWomen },
            { key: 'men', img: IMG.osbMen },
            { key: 'kids', img: IMG.osbKids },
          ] as const).map(({ key, img }) => (
            <Link key={key} href={{ pathname: '/gallery', query: { q: encodeQuery({ section: OSB_SECTION[key] }) } }} className="group block">
              <Img
                src={img}
                fit="contain"
                alt={t(`osb.${key}.title`)}
                className="h-56 w-full rounded-[14px] mb-5 group-hover:opacity-90 transition-opacity"
              />
              <h3 className="text-xl font-medium text-stone-900 group-hover:text-gold transition-colors">
                {t(`osb.${key}.title`)}
              </h3>
              <p className="mt-1.5 text-base text-stone-600 leading-relaxed">{t(`osb.${key}.body`)}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* ── What's new ─────────────────────────────────────────────────── */}
      <section className="mb-20">
        <h2 className={heading}>{t('news.title')}</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
          <div className="space-y-8">
            <div>
              <h3 className="text-xl font-medium text-stone-900">{t('news.new.title')}</h3>
              <p className="mt-2 text-base text-stone-600 leading-relaxed">{t('news.new.body')}</p>
            </div>
            <div>
              <h3 className="text-xl font-medium text-stone-900">{t('news.updates.title')}</h3>
              <p className="mt-2 text-base text-stone-600 leading-relaxed">{t('news.updates.body')}</p>
            </div>
            <div className="flex flex-wrap gap-4 pt-1">
              <Link href="/gallery" className={btnPrimary}>{t('news.cta_products')}</Link>
              <Link href="/gallery" className={btnSecondary}>{t('news.cta_updates')}</Link>
            </div>
          </div>
          <Img src={IMG.newsCircle} alt={t('news.title')} className="h-80 w-full rounded-[14px]" />
        </div>
      </section>

      {/* ── Did you know ───────────────────────────────────────────────── */}
      <section>
        <h2 className={heading}>{t('did.title')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
          {([
            { key: 'custom', img: IMG.didCustom, href: '/articles/aanpasbare-modellen' },
            { key: 'catalogs', img: IMG.didCatalogs, href: '/catalogues' },
          ] as const).map(({ key, img, href }) => {
            const inner = (
              <>
                <Img src={img} alt={t(`did.${key}.title`)}
                  className={`h-64 w-full rounded-[14px] mb-5${href ? ' group-hover:opacity-90 transition-opacity' : ''}`} />
                <h3 className={`text-xl font-medium text-stone-900${href ? ' group-hover:text-gold transition-colors' : ''}`}>
                  {t(`did.${key}.title`)}
                </h3>
                <p className="mt-1.5 text-base text-stone-600 leading-relaxed">{t(`did.${key}.body`)}</p>
              </>
            )
            return href
              ? <Link key={key} href={href} className="group block">{inner}</Link>
              : <div key={key}>{inner}</div>
          })}
        </div>
      </section>
    </div>
  )
}
