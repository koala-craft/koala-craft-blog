/**
 * Tech カード（記事・スクラップ用）
 * BlogCard と同様の表示。ヘッダー画像対応
 */

import { Link, useNavigate } from '@tanstack/react-router'
import { getBlogImageSrc } from '~/shared/lib/blogImageUrl'
import { formatDateForDisplay } from '~/shared/lib/formatDate'
import type { Article } from '~/features/articles/types'
import type { ScrapWithSlug } from '~/features/scraps/types'
import { parseScrapTitle } from '~/features/scraps/parseScrapTitle'

type TechItem = (Article & { type: 'article' }) | (ScrapWithSlug & { type: 'scrap' })

type TechCardProps = {
  item: TechItem
  featured?: boolean
  variant?: 'default' | 'wide' | 'square' | 'tall'
}

const ASPECT_MAP = {
  default: 'aspect-[4/3]',
  wide: 'aspect-[16/9]',
  square: 'aspect-square',
  tall: 'aspect-[3/4]',
}

export function TechCard({ item, featured = false, variant = 'default' }: TechCardProps) {
  const navigate = useNavigate()
  const isArticle = item.type === 'article'
  const to = isArticle ? '/articles/$slug' : '/scraps/$slug'
  const params = { slug: item.slug }
  const title = isArticle ? item.title : parseScrapTitle(item.title).displayTitle || item.title
  const tags = isArticle ? item.tags : parseScrapTitle(item.title).tags
  const date = isArticle ? item.createdAt : item.created_at
  const imageUrl = item.firstView
  const extraMeta = !isArticle ? `コメント ${item.comments.length}件` : null

  const handleClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    if (target.closest('a')) return
    navigate({ to, params })
  }

  if (featured) {
    return (
      <li className="relative group overflow-hidden border rounded-xl border-zinc-800/80 bg-zinc-900/40 transition-colors group-hover:border-zinc-700/60 group-hover:bg-zinc-800/50 h-full flex flex-col">
        <Link to={to} params={params} className="absolute inset-0 z-0" aria-label={isArticle ? `記事「${title}」を読む` : `Stream「${title}」を読む`} />
        <div className="relative z-10 flex flex-col flex-1 min-h-0 cursor-pointer" onClick={handleClick}>
          <div className="relative w-full flex-1 min-h-[200px] rounded-xl overflow-hidden">
            {imageUrl ? (
              <div
                className="w-full h-full will-change-transform transition-transform duration-300 group-hover:scale-105 relative"
                style={{
                  backgroundImage: `url(${getBlogImageSrc(imageUrl)})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              >
                <div className="absolute -inset-1 bg-gradient-to-t from-zinc-950/90 via-zinc-950/30 to-transparent" />
              </div>
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-900/40 via-zinc-800/60 to-violet-900/40" />
            )}
            <div className="absolute bottom-0 left-0 right-0 px-6 py-6 sm:px-8 sm:py-8">
              <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-zinc-100 leading-tight tracking-tight drop-shadow-lg group-hover:text-cyan-400 transition-colors">
                {title}
              </h3>
              <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-zinc-300 pointer-events-auto">
                {tags.slice(0, 3).map((t) => (
                  <Link key={t} to={isArticle ? '/articles' : '/scraps'} search={{ tag: t }} onClick={(e) => e.stopPropagation()} className="px-2.5 py-1 rounded-md bg-zinc-800/90 text-zinc-300 hover:bg-zinc-700/80 hover:text-zinc-100">
                    {t}
                  </Link>
                ))}
                {tags.length > 0 && <span className="text-zinc-500">·</span>}
                <span>{formatDateForDisplay(date)}</span>
                {!isArticle && (
                  <>
                    <span className="text-zinc-500">·</span>
                    <span>コメント {item.comments.length}件</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </li>
    )
  }

  const aspectClass = ASPECT_MAP[variant]

  return (
    <li className="relative group overflow-hidden rounded-lg border border-zinc-800/80 bg-zinc-900/40 transition-colors group-hover:border-zinc-700/60 group-hover:bg-zinc-800/50 h-full flex flex-col">
      <Link
        to={to}
        params={params}
        className="absolute inset-0 z-0"
        aria-label={isArticle ? `記事「${title}」を読む` : `Stream「${title}」を読む`}
      />
      <div
        className="relative z-10 flex flex-col cursor-pointer flex-1 min-h-0"
        onClick={handleClick}
      >
        <div
          className={`relative w-full min-h-[80px] overflow-hidden flex-1 min-h-0 ${aspectClass} max-lg:aspect-auto`}
        >
          {imageUrl ? (
            <>
              <img
                src={getBlogImageSrc(imageUrl)}
                alt=""
                loading="lazy"
                decoding="async"
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-transparent to-transparent" />
            </>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-900/30 via-zinc-800/50 to-violet-900/30" />
          )}
        </div>
        <div className="flex flex-col gap-1.5 px-3 py-2.5 pointer-events-none flex-shrink-0 min-h-[4.5rem]">
          <h3 className="text-sm font-semibold text-zinc-100 group-hover:text-cyan-400 transition-colors line-clamp-2 leading-snug">
            {title}
          </h3>
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-zinc-500 pointer-events-auto">
            {tags.slice(0, 2).map((t) => (
              <Link
                key={t}
                to={isArticle ? '/articles' : '/scraps'}
                search={{ tag: t }}
                onClick={(e) => e.stopPropagation()}
                className="px-1.5 py-0.5 rounded bg-zinc-800/80 text-zinc-500 hover:bg-zinc-700/60 hover:text-zinc-300"
              >
                {t}
              </Link>
            ))}
            {tags.length > 0 && <span className="text-zinc-600">·</span>}
            <span>{formatDateForDisplay(date)}</span>
            {extraMeta && (
              <>
                <span className="text-zinc-600">·</span>
                <span>{extraMeta}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </li>
  )
}
