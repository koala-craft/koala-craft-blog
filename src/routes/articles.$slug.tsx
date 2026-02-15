import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { getArticle } from '~/features/articles/api'
import { MarkdownWithLinkCards } from '~/shared/components/MarkdownWithLinkCards'
import { ArticleAuthorFooter } from '~/shared/components/ArticleAuthorFooter'
import { useSiteAuthor } from '~/shared/hooks/useSiteAuthor'
import { useZennUsername } from '~/shared/hooks/useZennUsername'

const PROSE_BASE =
  'prose prose-invert prose-zinc max-w-none tracking-tight prose-a:text-cyan-400 prose-a:no-underline hover:prose-a:underline prose-p:text-[1.05rem] prose-p:leading-[1.7] prose-li:text-[1.05rem] prose-li:my-0.5 prose-headings:font-semibold'

export const Route = createFileRoute('/articles/$slug')({
  component: ArticleDetail,
  loader: async ({ params }) => {
    const article = await getArticle({ data: { slug: params.slug } })
    if (!article) throw notFound()
    return { article }
  },
})

function ArticleDetail() {
  const { article } = Route.useLoaderData()
  const zennUsername = useZennUsername()
  const authorName = useSiteAuthor()
  const zennArticleUrl =
    zennUsername && article
      ? `https://zenn.dev/${zennUsername}/articles/${article.slug}`
      : null

  return (
    <div className="max-w-[96rem] mx-auto">
    <article className="px-4 py-8 pb-60 sm:px-6">
      {/* ヘッダー: 最適幅で中央配置 */}
      <header className="mx-auto max-w-[100ch]">
        <h1 className="text-2xl font-bold text-zinc-100 leading-tight tracking-tight mb-4">
          {article.title}
        </h1>
        {article.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {article.tags.map((t) => (
              <Link
                key={t}
                to="/articles"
                search={{ tag: t }}
                className="text-sm px-3 py-1.5 rounded-full bg-zinc-700/60 text-zinc-300 hover:bg-zinc-600/60 hover:text-zinc-100 transition"
              >
                {t}
              </Link>
            ))}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-zinc-500">
          <time dateTime={article.createdAt}>{article.createdAt}</time>
          {zennArticleUrl && (
            <a
              href={zennArticleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-400 hover:underline"
            >
              Zenn で見る ↗
            </a>
          )}
        </div>
      </header>

      {/* 本文: 65-70文字/行の最適読書幅、16px基準、行間1.75 */}
      <div className="mx-auto max-w-[100ch]">
        <MarkdownWithLinkCards
          content={article.content}
          proseClass={`${PROSE_BASE} prose-sm`}
          useNativeBr
        />
        <ArticleAuthorFooter authorName={authorName} />
      </div>
    </article>
    </div>
  )
}
