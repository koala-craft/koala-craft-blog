import { useState } from 'react'
import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { getScrap } from '~/features/scraps/api'
import { MarkdownWithLinkCards } from '~/shared/components/MarkdownWithLinkCards'
import { ArticleAuthorFooter } from '~/shared/components/ArticleAuthorFooter'
import { parseScrapTitle } from '~/features/scraps/parseScrapTitle'
import type { ScrapComment } from '~/features/scraps/types'
import { useSiteAuthor } from '~/shared/hooks/useSiteAuthor'
import { useZennUsername } from '~/shared/hooks/useZennUsername'

export const Route = createFileRoute('/scraps/$slug')({
  component: ScrapDetail,
  loader: async ({ params }) => {
    const scrap = await getScrap({ data: { slug: params.slug } })
    if (!scrap) throw notFound()
    return { scrap }
  },
})

function countComments(comments: ScrapComment[]): number {
  return comments.reduce(
    (acc, c) => acc + 1 + (c.children?.length ? countComments(c.children) : 0),
    0
  )
}

function ScrapDetail() {
  const { scrap } = Route.useLoaderData()
  const zennUsername = useZennUsername()
  const authorName = useSiteAuthor()
  const { displayTitle, tags } = parseScrapTitle(scrap.title)
  const zennScrapUrl = zennUsername
    ? `https://zenn.dev/${zennUsername}/scraps/${scrap.slug}`
    : null
  const totalComments = countComments(scrap.comments)

  return (
    <div className="max-w-[96rem] mx-auto">
    <article className="max-w-[100ch] mx-auto px-4 pb-60">
      {/* ヘッダー: タイトル・メタ・タグを一覧で把握 */}
      <header className="mb-10">
        <h1 className="text-2xl font-bold text-zinc-100 leading-tight tracking-tight">
          {displayTitle || scrap.title}
        </h1>
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-zinc-500">
          <time dateTime={scrap.created_at}>{scrap.created_at}</time>
          <span>コメント {totalComments}件</span>
          {zennScrapUrl && (
            <a
              href={zennScrapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-400 hover:underline"
            >
              Zenn で見る ↗
            </a>
          )}
          {(scrap.closed || scrap.archived) && (
            <span className="flex gap-2">
              {scrap.closed && (
                <span className="rounded px-2 py-0.5 bg-amber-500/20 text-amber-400/90 text-xs">
                  クローズ済
                </span>
              )}
              {scrap.archived && (
                <span className="rounded px-2 py-0.5 bg-zinc-600/60 text-zinc-400 text-xs">
                  アーカイブ
                </span>
              )}
            </span>
          )}
        </div>
        {tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {tags.map((t) => (
              <Link
                key={t}
                to="/scraps"
                search={{ tag: t }}
                className="rounded-full px-3 py-1 text-xs font-medium bg-zinc-700/60 text-zinc-300 hover:bg-zinc-600/60 hover:text-zinc-100 transition"
              >
                {t}
              </Link>
            ))}
          </div>
        )}
      </header>

      {/* コメントスレッド */}
      <section aria-label="コメント">
        <div className="space-y-6">
          {scrap.comments.map((c, i) => (
            <CommentBlock key={i} comment={c} depth={0} />
          ))}
        </div>
      </section>

      <ArticleAuthorFooter authorName={authorName} />
    </article>
    </div>
  )
}

const PROSE_BASE =
  'prose prose-invert prose-zinc max-w-none tracking-tight prose-a:text-cyan-400 prose-a:no-underline hover:prose-a:underline prose-p:text-[1.05rem] prose-p:leading-[1.7] prose-li:text-[1.05rem] prose-li:my-0.5 prose-headings:font-semibold'

function GitHubAvatar({ username }: { username: string }) {
  const [failed, setFailed] = useState(false)
  if (failed) return null
  return (
    <img
      src={`https://avatars.githubusercontent.com/${encodeURIComponent(username)}?s=64`}
      alt=""
      className="w-8 h-8 rounded-full flex-shrink-0 bg-zinc-700/60"
      onError={() => setFailed(true)}
    />
  )
}

function CommentBlock({
  comment,
  depth,
}: {
  comment: ScrapComment
  depth?: number
}) {
  const proseClass = `${PROSE_BASE} prose-sm`

  const isParent = (depth ?? 0) === 0

  return (
    <div
      className={
        isParent
          ? 'rounded-lg p-5'
          : 'ml-4 pl-5 py-4 bg-zinc-900/40'
      }
    >
      <div className="flex items-center gap-3 text-sm text-zinc-500 mb-3">
        <GitHubAvatar username={comment.author} />
        <div className="flex items-baseline gap-2">
          <span className="font-medium text-zinc-300">{comment.author}</span>
          <time dateTime={comment.created_at} className="text-xs">
            {comment.created_at}
          </time>
        </div>
      </div>
      <MarkdownWithLinkCards
        content={comment.body_markdown}
        proseClass={proseClass}
        useNativeBr
      />
      {comment.children?.length ? (
        <div className="mt-4 space-y-4">
          {comment.children.map((c, i) => (
            <CommentBlock key={i} comment={c} depth={(depth ?? 0) + 1} />
          ))}
        </div>
      ) : null}
    </div>
  )
}
