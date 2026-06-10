import { getTranslations } from 'next-intl/server'
import CatalogueViewer from '@/components/catalogues/CatalogueViewer'
import { catalogueTypes, getCatalogue, pageUrls, type CatalogueType } from '@/lib/catalogues'

type Props = { params: Promise<{ locale: string }> }

export default async function CataloguesRoute({ params }: Props) {
  const { locale } = await params
  const t = await getTranslations('catalogues')

  // Catalogues exist in EN + NL only; Dutch UI gets the NL book, everyone else EN.
  const lang = locale === 'nl' ? 'nl' : 'en'

  const books = catalogueTypes()
    .map((type) => {
      const cat = getCatalogue(type, lang)
      return cat ? { type, pages: pageUrls(cat) } : null
    })
    .filter((b): b is { type: CatalogueType; pages: string[] } => Boolean(b))

  const tabs = { kids: t('tabs.kids'), adults: t('tabs.adults') } as Record<CatalogueType, string>

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 sm:py-16">
      <header className="mx-auto max-w-2xl text-center">
        <h1 className="text-4xl sm:text-5xl font-bold text-stone-900 tracking-[-0.02em] leading-[1.05]">
          {t('title')}
        </h1>
        <p className="mt-5 text-lg text-stone-600 leading-relaxed">{t('subtitle')}</p>
      </header>

      <div className="mt-12">
        <CatalogueViewer
          books={books}
          labels={{ tabs, prev: t('prev'), next: t('next'), page: t('page') }}
        />
      </div>
    </div>
  )
}
