import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { getWorks } from '~/features/works/worksApi'
import { getBlogImageSrc } from '~/shared/lib/blogImageUrl'
import { MarkdownWithLinkCards } from '~/shared/components/MarkdownWithLinkCards'
import { ArticleAuthorFooter } from '~/shared/components/ArticleAuthorFooter'
import { formatWorkPeriod } from '~/features/works/formatPeriod'
import type { WorkCategory } from '~/features/works/types'
import { useSiteAuthor } from '~/shared/hooks/useSiteAuthor'

const PROSE_BASE =
  'prose prose-invert prose-zinc max-w-none tracking-tight prose-a:text-cyan-400 prose-a:no-underline hover:prose-a:underline prose-p:text-[1.05rem] prose-p:leading-[1.7] prose-li:text-[1.05rem] prose-li:my-0.5 prose-headings:font-semibold'

const CATEGORY_LABELS: Record<WorkCategory, string> = {
  personal: '個人開発',
  professional: '実務',
  sidejob: '副業',
}

export const Route = createFileRoute('/work/$id')({
  component: WorkDetail,
  loader: async ({ params }) => {
    const works = await getWorks()
    const item = works.items.find((i) => i.id === params.id)
    if (!item) throw notFound()
    return { item }
  },
})

function WorkDetail() {
  const { item } = Route.useLoaderData()
  const authorName = useSiteAuthor()
  const periodStr = formatWorkPeriod(item)

  return (
    <div className="max-w-[96rem] mx-auto">
      <article className="pb-60 sm:px-6">
        {/* ヒーロー: サムネイルあり → 画像、なし → タイトル＋グラデーション */}
        {item.thumbnail ? (
          <div className="relative w-full aspect-[21/9] min-h-[200px] overflow-hidden">
            <img
              src={getBlogImageSrc(item.thumbnail)}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-transparent to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 px-4 py-6 sm:px-6">
              <h1 className="text-2xl sm:text-3xl font-bold text-zinc-100 leading-tight tracking-tight drop-shadow-lg">
                {item.title}
              </h1>
            </div>
          </div>
        ) : (
          <div className="relative w-full min-h-[200px] flex items-center justify-center px-4 py-16 bg-gradient-to-br from-cyan-900/40 via-zinc-900/60 to-violet-900/40">
            <h1 className="text-2xl sm:text-3xl font-bold text-zinc-100 leading-tight tracking-tight text-center">
              {item.title}
            </h1>
          </div>
        )}

        <div className="mx-auto px-4 py-8 max-w-[100ch]">
          <header>
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="text-sm px-3 py-1.5 rounded-full bg-zinc-700/60 text-zinc-300">
                {CATEGORY_LABELS[item.category]}
              </span>
              {item.comingSoon && (
                <span className="text-sm px-3 py-1.5 rounded-full bg-amber-900/50 text-amber-400">
                  Coming Soon
                </span>
              )}
              {item.tags?.map((t) => (
                <span
                  key={t}
                  className="text-sm px-3 py-1.5 rounded-full bg-zinc-700/60 text-zinc-300"
                >
                  {t}
                </span>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-zinc-500">
              {periodStr && <span>{periodStr}</span>}
            </div>
          </header>

          <div className="mx-auto max-w-[100ch]">
            {item.description ? (
              <MarkdownWithLinkCards
                content={item.description}
                proseClass={`${PROSE_BASE} prose-sm`}
                useNativeBr
              />
            ) : (
              <p className="text-zinc-500">説明はありません。</p>
            )}
            {item.href && (
              <p className="mt-6">
                <a
                  href={item.href}
                  target={item.href.startsWith('http') ? '_blank' : undefined}
                  rel={item.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                  className="inline-flex items-center gap-2 text-cyan-400 hover:underline"
                >
                  リンク先を見る
                  <span aria-hidden>↗</span>
                </a>
              </p>
            )}
            <ArticleAuthorFooter authorName={authorName} />
          </div>
        </div>
      </article>
    </div>
  )
}
