import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { getArticle } from '@/lib/articles'

/** Image with a gradient fallback while real assets aren't wired up. */
function Img({ src, alt, className }: { src: string; alt: string; className?: string }) {
  if (!src) {
    return (
      <div className={`flex items-center justify-center bg-gradient-to-br from-gold/15 via-stone-100 to-gold/5 ${className ?? ''}`}
        aria-label={alt} role="img">
        <svg className="w-10 h-10 text-gold/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 4.5h16.5a1.5 1.5 0 011.5 1.5v12a1.5 1.5 0 01-1.5 1.5H3.75a1.5 1.5 0 01-1.5-1.5V6a1.5 1.5 0 011.5-1.5z" />
        </svg>
      </div>
    )
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className={`object-cover ${className ?? ''}`} />
}

export default async function ArticlePage({ slug }: { slug: string }) {
  const article = getArticle(slug)!
  const t = await getTranslations('articles')
  const a = (key: string) => `${slug}.${key}`

  // Body paragraphs come as an array; t.raw avoids ICU parsing of free text.
  const body = (t.raw(a('body')) as string[]) ?? []

  const related = article.related
    .map((s) => getArticle(s))
    .filter((x): x is NonNullable<typeof x> => Boolean(x))

  return (
    <article className="max-w-7xl mx-auto px-6 py-12 sm:py-16">
      {/* Title + intro */}
      <header className="max-w-3xl">
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-stone-900 tracking-[-0.02em] leading-[1.05]">
          {t(a('title'))}
        </h1>
        <p className="mt-6 text-lg sm:text-xl text-stone-600 leading-relaxed">
          {t(a('subtitle'))}
        </p>
      </header>

      {/* Hero image */}
      <Img src={article.hero} alt={t(a('title'))} className="mt-10 h-72 sm:h-[26rem] w-full rounded-[14px]" />

      {/* Body — first paragraph, then the two images, then the rest */}
      <div className="mx-auto max-w-3xl">
        {body[0] && <p className="mt-12 text-lg text-stone-800 leading-relaxed">{body[0]}</p>}
      </div>

      <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 gap-8">
        <Img src={article.images[0]} alt={t(a('title'))} className="h-72 w-full rounded-[14px]" />
        <Img src={article.images[1]} alt={t(a('title'))} className="h-72 w-full rounded-[14px]" />
      </div>

      <div className="mx-auto max-w-3xl">
        {body.slice(1).map((p, i) => (
          <p key={i} className="mt-8 text-lg text-stone-800 leading-relaxed">{p}</p>
        ))}
      </div>

      {/* Related articles */}
      {related.length > 0 && (
        <section className="mt-20">
          <h2 className="text-3xl sm:text-4xl font-semibold text-stone-900 tracking-[-0.02em] mb-8">
            {t('_ui.related')}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {related.map((r) => (
              <Link key={r.slug} href={`/articles/${r.slug}`} className="group block">
                <Img src={r.cardImage} alt={t(`${r.slug}.title`)}
                  className="h-56 w-full rounded-[14px] mb-5 group-hover:opacity-90 transition-opacity" />
                <h3 className="text-lg font-medium text-stone-900 group-hover:text-gold transition-colors">
                  {t(`${r.slug}.title`)}
                </h3>
                <p className="mt-1 text-base text-stone-400">{t(`${r.slug}.category`)}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </article>
  )
}
