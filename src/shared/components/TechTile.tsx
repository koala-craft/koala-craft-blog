/**
 * Tech タイル（Bento グリッド用）
 * モダンなタイル表示。記事・スクラップ共通
 */

import { Link, useNavigate } from '@tanstack/react-router'
import { getBlogImageSrc } from '~/shared/lib/blogImageUrl'
import { formatDateForDisplay } from '~/shared/lib/formatDate'
import type { Article } from '~/features/articles/types'
import type { ScrapWithSlug } from '~/features/scraps/types'
import { parseScrapTitle } from '~/features/scraps/parseScrapTitle'

type TechItem = (Article & { type: 'article' }) | (ScrapWithSlug & { type: 'scrap' })

type TechTileProps = {
  item: TechItem
  /** Bento: 大きいタイル（2x2） */
  size?: 'default' | 'large'
}

export function TechTile({ item, size = 'default' }: TechTileProps) {
  const navigate = useNavigate()
  const isArticle = item.type === 'article'
  const to = isArticle ? '/articles/$slug' : '/scraps/$slug'
  const params = { slug: item.slug }
  const title = isArticle ? item.title : parseScrapTitle(item.title).displayTitle || item.title
  const tags = isArticle ? item.tags : parseScrapTitle(item.title).tags
  const date = isArticle ? item.createdAt : item.created_at
  const imageUrl = item.firstView
  const isLarge = size === 'large'

  const handleClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    if (target.closest('a')) return
    navigate({ to, params })
  }

  return (
    <li
      className={`group relative overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/50 backdrop-blur-sm transition-all duration-300 hover:border-cyan-500/30 hover:shadow-lg hover:shadow-cyan-500/5 hover:-translate-y-0.5 ${
        isLarge ? 'col-span-2 row-span-2 min-h-[280px]' : 'min-h-[200px]'
      }`}
    >
      <Link
        to={to}
        params={params}
        className="absolute inset-0 z-0"
        aria-label={isArticle ? `記事「${title}」を読む` : `Stream「${title}」を読む`}
      />
      <div
        className="relative z-10 flex h-full flex-col cursor-pointer"
        onClick={handleClick}
      >
        <div
          className={`relative w-full overflow-hidden ${
            isLarge ? 'flex-1 min-h-[180px]' : 'h-32'
          }`}
        >
          {imageUrl ? (
            <>
              <img
                src={getBlogImageSrc(imageUrl)}
                alt=""
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-zinc-950/20 to-transparent" />
            </>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-900/30 via-zinc-800/50 to-violet-900/30" />
          )}
        </div>
        <div className={`flex flex-col gap-2 p-4 ${isLarge ? 'flex-1 justify-end' : ''}`}>
          <h3
            className={`font-semibold text-zinc-100 group-hover:text-cyan-400 transition-colors line-clamp-2 ${
              isLarge ? 'text-lg lg:text-xl' : 'text-sm'
            }`}
          >
            {title}
          </h3>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-500">
            {tags.slice(0, isLarge ? 4 : 2).map((t) => (
              <Link
                key={t}
                to={isArticle ? '/articles' : '/scraps'}
                search={{ tag: t }}
                onClick={(e) => e.stopPropagation()}
                className="rounded-full px-2.5 py-0.5 bg-zinc-800/80 text-zinc-400 hover:bg-cyan-500/20 hover:text-cyan-400 transition-colors"
              >
                {t}
              </Link>
            ))}
            <span className="text-zinc-600">·</span>
            <span>{formatDateForDisplay(date)}</span>
            {!isArticle && (
              <>
                <span className="text-zinc-600">·</span>
                <span>コメント {item.comments.length}件</span>
              </>
            )}
          </div>
        </div>
      </div>
    </li>
  )
}
