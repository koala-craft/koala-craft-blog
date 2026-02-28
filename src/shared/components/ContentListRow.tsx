/**
 * コンパクトな一覧行（Blog / Tech 共通）
 * サムネイル・タイトル・メタ情報を横並びで表示
 */

import { Link } from '@tanstack/react-router'
import { getBlogImageSrc } from '~/shared/lib/blogImageUrl'
import { formatDateForDisplay } from '~/shared/lib/formatDate'
import { buildTagSearch, toggleTagInFilter } from '~/shared/hooks/useSearchParams'

type ContentListRowProps = {
  to: string
  params?: Record<string, string>
  title: string
  date: string
  tags?: string[]
  tagLinkTo?: string
  /** 一覧ページ用：現在のタグフィルタ。指定時はタグクリックでトグル */
  filterTags?: string[]
  /** 一覧ページ用：タグリンクの search に含める追加パラメータ（q など） */
  tagLinkSearch?: Record<string, string | undefined>
  meta?: React.ReactNode
  imageUrl?: string
  ariaLabel: string
  /** 縦に存在感のあるカード（Article / Stream 用） */
  variant?: 'default' | 'tall'
}

function getTagSearch(
  tag: string,
  filterTags?: string[],
  tagLinkSearch?: Record<string, string | undefined>
) {
  if (filterTags && tagLinkSearch) {
    const toggled = toggleTagInFilter(filterTags, tag)
    return { ...tagLinkSearch, ...buildTagSearch(toggled) }
  }
  return { tag }
}

export function ContentListRow({
  to,
  params,
  title,
  date,
  tags = [],
  tagLinkTo = '/blog',
  filterTags,
  tagLinkSearch,
  meta,
  imageUrl,
  ariaLabel,
  variant = 'default',
}: ContentListRowProps) {
  const isTall = variant === 'tall'
  return (
    <li className="group">
      <Link
        to={to}
        params={params}
        className={`flex items-center gap-3 rounded-lg border border-zinc-800/80 bg-zinc-900/40 transition-colors hover:border-zinc-700/60 hover:bg-zinc-800/50 ${
          isTall ? 'px-4 py-4 gap-4' : 'px-3 py-2.5'
        }`}
        aria-label={ariaLabel}
      >
        <div
          className={`shrink-0 overflow-hidden rounded-md bg-zinc-800/80 ${
            isTall ? 'h-20 w-24' : 'h-12 w-16'
          }`}
        >
          {imageUrl ? (
            <img
              src={getBlogImageSrc(imageUrl)}
              alt=""
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-cyan-900/40 via-zinc-800/60 to-violet-900/40" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <span
            className={`block truncate font-medium text-zinc-100 group-hover:text-cyan-400 transition-colors ${
              isTall ? 'text-base' : 'text-sm'
            }`}
          >
            {title}
          </span>
          <div className={`flex flex-wrap items-center gap-x-1.5 text-sm text-zinc-500 ${isTall ? 'mt-1.5' : 'mt-0.5'}`}>
            {tags.slice(0, 2).map((t) => (
              <Link
                key={t}
                to={tagLinkTo}
                search={getTagSearch(t, filterTags, tagLinkSearch)}
                onClick={(e) => e.stopPropagation()}
                className="hover:text-zinc-300"
              >
                {t}
              </Link>
            ))}
            {tags.length > 0 && <span className="text-zinc-600">·</span>}
            <span>{formatDateForDisplay(date)}</span>
            {meta}
          </div>
        </div>
      </Link>
    </li>
  )
}
