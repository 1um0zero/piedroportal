import { getTranslations, getLocale } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import LoginCard from '@/components/auth/LoginCard'
import { encodeQuery } from '@/lib/query-cipher'

// Maps an OSB collection card to the gallery section (tab) it opens.
const OSB_SECTION = { women: 'WOMEN', men: 'MEN', kids: 'KIDS' } as const

// Landing imagery (served from /public/landing).
const IMG = {
  hero: '/landing/hero.jpg',
  osbWomen: '/landing/osb-dames.jpg',
  osbMen: '/landing/osb-heren.jpg',
  osbKids: '/landing/osb-kinderen.jpg', // lifestyle kids shot from the client e-mail
  orthoSoft: '/landing/ortho-soft.jpg',
  evo: '/landing/evo-stock.jpg',
}

function Img({ src, alt, className, fit = 'cover' }: { src: string; alt: string; className?: string; fit?: 'cover' | 'contain' }) {
  const fitClass = fit === 'contain' ? 'object-contain bg-stone-50' : 'object-cover'
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className={`${fitClass} ${className ?? ''}`} />
}

const heading = 'text-3xl sm:text-4xl font-semibold text-stone-900 tracking-[-0.02em]'
const btnPrimary = 'inline-flex h-12 items-center rounded-lg bg-stone-900 px-7 text-base font-medium text-white shadow-sm hover:bg-stone-800 transition-colors'
const ctaLink = 'inline-flex items-center gap-1 text-base font-medium text-gold hover:text-gold-dark transition-colors'

// Feature bullets come as "Lead — description"; show the lead in bold.
function Feature({ text }: { text: string }) {
  const [lead, ...rest] = text.split(' — ')
  const desc = rest.join(' — ')
  return (
    <li className="flex gap-3">
      <svg className="mt-1 h-5 w-5 flex-none text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
      </svg>
      <span className="text-base text-stone-700 leading-relaxed">
        {desc ? <><span className="font-semibold text-stone-900">{lead}</span> — {desc}</> : text}
      </span>
    </li>
  )
}

export default async function LandingPageNew({ hasError, loggedIn }: { hasError?: boolean; loggedIn?: boolean }) {
  const t = await getTranslations('homenew')
  const locale = await getLocale()
  // After signing in from the embedded card, stay on the homepage (not the
  // gallery) — the locale-prefixed home path; `en` is prefix-free.
  const homePath = locale === 'en' ? '/' : `/${locale}`
  const heroBody = t.raw('hero.body') as string[]
  const orthoBody = t.raw('orthosoft.body') as string[]
  const portalFeatures = t.raw('portal.features') as string[]
  const evoFeatures = t.raw('evo.features') as string[]

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 sm:py-20">
      {/* ── Hero — marketing copy + embedded login ─────────────────────── */}
      <section className="mb-24">
        <div className={`grid grid-cols-1 gap-10 lg:gap-16 items-center ${loggedIn ? '' : 'lg:grid-cols-[1fr_minmax(0,400px)]'}`}>
          <div>
            {/* Full brand lockup (feet + PIEDRO + strapline) — shown large here,
                where the strapline is actually readable; the navbar carries the
                compact box mark. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/piedro-logo.svg"
              alt="Piedro International — always one step ahead"
              className="h-32 sm:h-40 w-auto mb-10"
            />
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-stone-900 tracking-[-0.02em] leading-[1.05]">
              {t('hero.title')}
            </h1>
            {heroBody.map((p, i) => (
              <p key={i} className="mt-5 text-lg text-stone-600 leading-relaxed">{p}</p>
            ))}
          </div>
          {/* Login card for guests only. Signed-in users already have these
              destinations in the top nav, so we don't duplicate them here —
              the hero collapses to a single column above. */}
          {!loggedIn && (
            <div id="login" className="scroll-mt-24">
              <LoginCard hasError={hasError} redirectTo={homePath} />
            </div>
          )}
        </div>

        <Img src={IMG.hero} alt={t('hero.title')} className="mt-12 h-44 sm:h-72 w-full rounded-[14px]" />
      </section>

      {/* ── OSB collections ────────────────────────────────────────────── */}
      <section className="mb-24">
        <h2 className={`${heading} mb-8`}>{t('osb.title')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          {([
            { key: 'women', img: IMG.osbWomen },
            { key: 'men', img: IMG.osbMen },
            { key: 'kids', img: IMG.osbKids },
          ] as const).map(({ key, img }) => (
            <div key={key} className="flex flex-col">
              <Link href={{ pathname: '/gallery', query: { q: encodeQuery({ section: OSB_SECTION[key] }) } }} className="group block">
                <Img src={img} alt={t(`osb.${key}.title`)}
                  className="h-60 w-full rounded-[14px] mb-5 group-hover:opacity-90 transition-opacity" />
                <h3 className="text-xl font-medium text-stone-900 group-hover:text-gold transition-colors">
                  {t(`osb.${key}.title`)}
                </h3>
              </Link>
              <p className="mt-1.5 text-base text-stone-600 leading-relaxed flex-1">{t(`osb.${key}.body`)}</p>
              <Link href={{ pathname: '/gallery', query: { q: encodeQuery({ section: OSB_SECTION[key] }) } }} className={`${ctaLink} mt-4`}>
                {t(`osb.${key}.cta`)}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ── New at Piedro — Ortho Soft Collection ──────────────────────── */}
      <section className="mb-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <div>
            <h2 className={heading}>{t('orthosoft.title')}</h2>
            {orthoBody.map((p, i) => (
              <p key={i} className="mt-5 text-lg text-stone-600 leading-relaxed">{p}</p>
            ))}
            {/* Ortho Soft collection = men's diabetic sneaker styles 5206/5207/5208. */}
            <Link href={{ pathname: '/gallery', query: { q: encodeQuery({ section: 'MEN', styles: '5206,5207,5208' }) } }} className={`${ctaLink} mt-6`}>
              {t('orthosoft.cta')}
            </Link>
          </div>
          <Img src={IMG.orthoSoft} fit="contain" alt={t('orthosoft.title')} className="h-72 sm:h-96 w-full rounded-[14px]" />
        </div>
      </section>

      {/* ── New portal — features ──────────────────────────────────────── */}
      <section className="mb-24 rounded-[14px] bg-stone-50 px-6 sm:px-10 py-10 sm:py-14">
        <div className="max-w-3xl">
          <h2 className={heading}>{t('portal.title')}</h2>
          <p className="mt-5 text-lg text-stone-600 leading-relaxed">{t('portal.intro')}</p>
          <ul className="mt-8 space-y-4">
            {portalFeatures.map((f, i) => <Feature key={i} text={f} />)}
          </ul>
          <p className="mt-8 text-base text-stone-600 leading-relaxed">{t('portal.note')}</p>
          {/* Login is embedded above — this CTA scrolls back up to it. */}
          <a href="#login" className={`${ctaLink} mt-6`}>{t('portal.cta')}</a>
        </div>
      </section>

      {/* ── New in stock — Piedro EVO ──────────────────────────────────── */}
      <section className="mb-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <Img src={IMG.evo} fit="contain" alt={t('evo.title')} className="order-last lg:order-first h-72 sm:h-96 w-full rounded-[14px]" />
          <div>
            <h2 className={heading}>{t('evo.title')}</h2>
            <p className="mt-5 text-lg text-stone-600 leading-relaxed">{t('evo.intro')}</p>
            <p className="mt-4 text-base font-medium text-stone-800">{t('evo.sub')}</p>
            <ul className="mt-4 space-y-4">
              {evoFeatures.map((f, i) => <Feature key={i} text={f} />)}
            </ul>
            {/* In-stock area: EVO range, own refs, no additions, limited sizes/qty. */}
            <Link href="/stock" className={`${btnPrimary} mt-7`}>{t('evo.cta')}</Link>
          </div>
        </div>
      </section>

      {/* ── Catalogues (kept reachable; not part of the e-mail proposal) ── */}
      <section>
        <Link href="/catalogues" className="group grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-6 items-center rounded-[14px] border border-stone-200 p-6 hover:border-gold transition-colors">
          <Img src="/landing/boy_upsidedown.jpg" alt={t('catalogues_card.title')} className="h-40 w-full rounded-[10px]" />
          <div>
            <h3 className="text-xl font-medium text-stone-900 group-hover:text-gold transition-colors">{t('catalogues_card.title')}</h3>
            <p className="mt-1.5 text-base text-stone-600 leading-relaxed">{t('catalogues_card.body')}</p>
            <span className={`${ctaLink} mt-4`}>{t('catalogues_card.cta')}</span>
          </div>
        </Link>
      </section>
    </div>
  )
}
