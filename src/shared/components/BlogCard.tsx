import { Link, useNavigate } from '@tanstack/react-router'
import { getBlogImageSrc } from '~/shared/lib/blogImageUrl'
import type { BlogPost } from '~/features/blog/types'

type CompactVariant = 'default' | 'wide' | 'square' | 'tall'

type BlogCardProps = {
  post: BlogPost
  /** トップページの注目表示用に大きく表示 */
  featured?: boolean
  /** マガジン風サイドカラム用のコンパクト表示 */
  compact?: boolean | CompactVariant
  /** 管理画面用：編集ページへリンクし、非公開バッジを表示 */
  adminMode?: boolean
}

const COMPACT_ASPECT: Record<CompactVariant, string> = {
  default: 'aspect-[4/3]',
  wide: 'aspect-[16/9]',
  square: 'aspect-square',
  tall: 'aspect-[3/4]',
}

export function BlogCard({
  post,
  featured = false,
  compact = false,
  adminMode = false,
}: BlogCardProps) {
  const navigate = useNavigate()
  const detailPath = adminMode ? '/admin/blog/$slug' : '/blog/$slug'

  const handleClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    if (target.closest('a')) return
    navigate({ to: detailPath, params: { slug: post.slug } })
  }

  if (featured) {
    return (
      <li className="relative group overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-900/40 transition-colors group-hover:border-zinc-700/60 group-hover:bg-zinc-800/50 h-full flex flex-col">
        <Link
          to={detailPath}
          params={{ slug: post.slug }}
          className="absolute inset-0 z-0"
          aria-label={adminMode ? `ブログ「${post.title}」を編集` : `ブログ「${post.title}」を読む`}
        />
        <div
          className="relative z-10 flex flex-col flex-1 min-h-0 cursor-pointer"
          onClick={handleClick}
        >
          <div className="relative w-full flex-1 min-h-[200px] overflow-hidden">
            {post.firstView ? (
              <>
                <img
                  src={getBlogImageSrc(post.firstView)}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-zinc-950/30 to-transparent" />
              </>
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-900/40 via-zinc-800/60 to-violet-900/40" />
            )}
            <div className="absolute bottom-0 left-0 right-0 px-6 py-6 sm:px-8 sm:py-8">
              <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-zinc-100 leading-tight tracking-tight drop-shadow-lg group-hover:text-cyan-400 transition-colors">
                {post.title}
                {adminMode && post.visibility === 'private' && (
                  <span className="ml-2 text-xs font-normal text-zinc-500">(非公開)</span>
                )}
              </h3>
              <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-zinc-300 pointer-events-auto">
                {post.tags.map((t) =>
                  adminMode ? (
                    <span
                      key={t}
                      className="px-2.5 py-1 rounded-md bg-zinc-800/90 text-zinc-300"
                    >
                      {t}
                    </span>
                  ) : (
                    <Link
                      key={t}
                      to="/blog"
                      search={{ tag: t }}
                      onClick={(e) => e.stopPropagation()}
                      className="px-2.5 py-1 rounded-md bg-zinc-800/90 text-zinc-300 hover:bg-zinc-700/80 hover:text-zinc-100"
                    >
                      {t}
                    </Link>
                  )
                )}
                {post.tags.length > 0 && <span className="text-zinc-500">·</span>}
                <span>{post.createdAt}</span>
              </div>
            </div>
          </div>
        </div>
      </li>
    )
  }

  if (compact) {
    const variant: CompactVariant =
      typeof compact === 'string' ? compact : 'default'
    const aspectClass = COMPACT_ASPECT[variant]
    const isBottomRow = variant === 'square' || variant === 'tall'

    return (
      <li className="relative group overflow-hidden rounded-lg border border-zinc-800/80 bg-zinc-900/40 transition-colors group-hover:border-zinc-700/60 group-hover:bg-zinc-800/50 h-full flex flex-col">
        <Link
          to={detailPath}
          params={{ slug: post.slug }}
          className="absolute inset-0 z-0"
          aria-label={adminMode ? `ブログ「${post.title}」を編集` : `ブログ「${post.title}」を読む`}
        />
        <div
          className={`relative z-10 flex flex-col cursor-pointer ${isBottomRow ? 'flex-1 min-h-0' : ''}`}
          onClick={handleClick}
        >
          <div
            className={`relative w-full min-h-[80px] overflow-hidden ${isBottomRow ? 'flex-1' : ''} ${!isBottomRow ? aspectClass : ''}`}
          >
            {post.firstView ? (
              <>
                <img
                  src={getBlogImageSrc(post.firstView)}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-transparent to-transparent" />
              </>
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-900/30 via-zinc-800/50 to-violet-900/30" />
            )}
          </div>
          <div
            className={`flex flex-col gap-1.5 px-3 py-2.5 pointer-events-none flex-shrink-0 ${isBottomRow ? 'min-h-[4.5rem]' : ''}`}
          >
            <h3 className="text-sm font-semibold text-zinc-100 group-hover:text-cyan-400 transition-colors line-clamp-2 leading-snug">
              {post.title}
              {adminMode && post.visibility === 'private' && (
                <span className="ml-1 text-xs font-normal text-zinc-500">(非公開)</span>
              )}
            </h3>
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-zinc-500 pointer-events-auto">
              {post.tags.slice(0, 2).map((t) =>
                adminMode ? (
                  <span key={t} className="px-1.5 py-0.5 rounded bg-zinc-800/80 text-zinc-500">
                    {t}
                  </span>
                ) : (
                  <Link
                    key={t}
                    to="/blog"
                    search={{ tag: t }}
                    onClick={(e) => e.stopPropagation()}
                    className="px-1.5 py-0.5 rounded bg-zinc-800/80 text-zinc-500 hover:bg-zinc-700/60 hover:text-zinc-300"
                  >
                    {t}
                  </Link>
                )
              )}
              {post.tags.length > 0 && <span className="text-zinc-600">·</span>}
              <span>{post.createdAt}</span>
            </div>
          </div>
        </div>
      </li>
    )
  }

  return (
    <li className="relative group overflow-hidden rounded-lg border border-zinc-800/80 bg-zinc-900/40 transition-colors group-hover:border-zinc-700/60 group-hover:bg-zinc-800/50">
      <Link
        to={detailPath}
        params={{ slug: post.slug }}
        className="absolute inset-0 z-0"
        aria-label={adminMode ? `ブログ「${post.title}」を編集` : `ブログ「${post.title}」を読む`}
      />
      <div
        className="relative z-10 flex flex-col cursor-pointer"
        onClick={handleClick}
      >
        {/* ファーストビュー or グラデーション */}
        <div className="relative w-full aspect-[16/9] min-h-[120px] overflow-hidden">
          {post.firstView ? (
            <>
              <img
                src={getBlogImageSrc(post.firstView)}
                alt=""
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/60 via-transparent to-transparent" />
            </>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-900/30 via-zinc-800/50 to-violet-900/30" />
          )}
        </div>
        {/* コンテンツ */}
        <div className="flex flex-col gap-2 px-4 py-3 pointer-events-none">
          <h3 className="text-base font-semibold text-zinc-100 group-hover:text-cyan-400 transition-colors line-clamp-2">
            {post.title}
            {adminMode && post.visibility === 'private' && (
              <span className="ml-1 text-xs font-normal text-zinc-500">(非公開)</span>
            )}
          </h3>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-500 pointer-events-auto">
            {post.tags.map((t) =>
              adminMode ? (
                <span key={t} className="px-2 py-0.5 rounded-md bg-zinc-800/80 text-zinc-500">
                  {t}
                </span>
              ) : (
                <Link
                  key={t}
                  to="/blog"
                  search={{ tag: t }}
                  onClick={(e) => e.stopPropagation()}
                  className="px-2 py-0.5 rounded-md bg-zinc-800/80 text-zinc-500 hover:bg-zinc-700/60 hover:text-zinc-300"
                >
                  {t}
                </Link>
              )
            )}
            {post.tags.length > 0 && <span className="text-zinc-600">·</span>}
            <span>{post.createdAt}</span>
          </div>
        </div>
      </div>
    </li>
  )
}
