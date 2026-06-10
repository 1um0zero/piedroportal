/**
 * Editorial articles (the "Wist u dat?" / "Wat is er nieuw?" detail pages).
 *
 * Single source of truth for article *structure* (slug, images, related links).
 * The *text* (title, subtitle, body paragraphs) lives in the i18n `articles`
 * namespace keyed by slug, so every article is translated in all 4 locales.
 *
 * Images are /public paths; '' falls back to a gradient placeholder until the
 * real assets are wired up.
 */
export type Article = {
  slug: string
  hero: string          // large image under the title
  images: [string, string] // the two side-by-side images mid-article
  cardImage: string     // thumbnail used when this article is listed as "related"
  related: string[]     // slugs shown in the "Related articles" section
}

export const ARTICLES: Article[] = [
  {
    slug: 'aanpasbare-modellen',
    hero: '',
    images: ['', ''],
    cardImage: '',
    related: ['innovatie-pasvormoptimalisatie', 'responsieve-zolen', 'precisie-ondersteuning'],
  },
  {
    slug: 'innovatie-pasvormoptimalisatie',
    hero: '',
    images: ['', ''],
    cardImage: '',
    related: ['responsieve-zolen', 'precisie-ondersteuning', 'aanpasbare-modellen'],
  },
  {
    slug: 'responsieve-zolen',
    hero: '',
    images: ['', ''],
    cardImage: '',
    related: ['precisie-ondersteuning', 'aanpasbare-modellen', 'innovatie-pasvormoptimalisatie'],
  },
  {
    slug: 'precisie-ondersteuning',
    hero: '',
    images: ['', ''],
    cardImage: '',
    related: ['aanpasbare-modellen', 'innovatie-pasvormoptimalisatie', 'responsieve-zolen'],
  },
]

export const getArticle = (slug: string): Article | undefined =>
  ARTICLES.find((a) => a.slug === slug)
