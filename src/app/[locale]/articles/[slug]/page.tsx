import { notFound } from 'next/navigation'
import ArticlePage from '@/components/articles/ArticlePage'
import { ARTICLES, getArticle } from '@/lib/articles'

export function generateStaticParams() {
  return ARTICLES.map((a) => ({ slug: a.slug }))
}

type Props = { params: Promise<{ slug: string }> }

export default async function ArticleRoute({ params }: Props) {
  const { slug } = await params
  if (!getArticle(slug)) notFound()
  return <ArticlePage slug={slug} />
}
