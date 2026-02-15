import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { getBlogPost } from '~/features/blog/api'
import { getBlogImageSrc } from '~/shared/lib/blogImageUrl'
import { MarkdownWithLinkCards } from '~/shared/components/MarkdownWithLinkCards'
import { ArticleAuthorFooter } from '~/shared/components/ArticleAuthorFooter'
import { useSiteAuthor } from '~/shared/hooks/useSiteAuthor'

const PROSE_BASE =
  'prose prose-invert prose-zinc max-w-none tracking-tight prose-a:text-cyan-400 prose-a:no-underline hover:prose-a:underline prose-p:text-[1.05rem] prose-p:leading-[1.7] prose-li:text-[1.05rem] prose-li:my-0.5 prose-headings:font-semibold'

export const Route = createFileRoute('/blog/$slug')({
  component: BlogDetail,
  loader: async ({ params }) => {
    const post = await getBlogPost({ data: { slug: params.slug } })
    if (!post) throw notFound()
    return { post }
  },
})

function BlogDetail() {
  const { post } = Route.useLoaderData()
  const authorName = useSiteAuthor()

  return (
    <div className="max-w-[96rem] mx-auto">
    <article className="pb-60 sm:px-6">
      {/* ファーストビュー: firstView あり → 画像、なし → タイトル＋グラデーション */}
      {post.firstView ? (
        <div className="relative w-full aspect-[21/9] min-h-[200px] overflow-hidden">
          <img
            src={getBlogImageSrc(post.firstView)}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-transparent to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 px-4 py-6 sm:px-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-zinc-100 leading-tight tracking-tight drop-shadow-lg">
              {post.title}
            </h1>
          </div>
        </div>
      ) : (
        <div className="relative w-full min-h-[200px] flex items-center justify-center px-4 py-16 bg-gradient-to-br from-cyan-900/40 via-zinc-900/60 to-violet-900/40">
          <h1 className="text-2xl sm:text-3xl font-bold text-zinc-100 leading-tight tracking-tight text-center">
            {post.title}
          </h1>
        </div>
      )}

      <div className="mx-auto px-4 py-8 max-w-[100ch]">
        <header>
        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {post.tags.map((t) => (
              <Link
                key={t}
                to="/blog"
                search={{ tag: t }}
                className="text-sm px-3 py-1.5 rounded-full bg-zinc-700/60 text-zinc-300 hover:bg-zinc-600/60 hover:text-zinc-100 transition"
              >
                {t}
              </Link>
            ))}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-zinc-500">
          <time dateTime={post.createdAt}>{post.createdAt}</time>
          {post.updatedAt !== post.createdAt && (
            <span>更新: {post.updatedAt}</span>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-[100ch]">
        <MarkdownWithLinkCards
          content={post.content}
          proseClass={`${PROSE_BASE} prose-sm`}
          useNativeBr
        />
        <ArticleAuthorFooter authorName={authorName} />
      </div>
      </div>
    </article>
    </div>
  )
}
