/**
 * Work カード - ブログ一覧と同じカード形式
 */

import { Link, useNavigate } from '@tanstack/react-router'
import { getBlogImageSrc } from '~/shared/lib/blogImageUrl'
import type { WorkItem, WorkCategory } from '~/features/works/types'
import { formatWorkPeriod } from '~/features/works/formatPeriod'

const CATEGORY_LABELS: Record<WorkCategory, string> = {
  personal: '個人開発',
  professional: '実務',
  sidejob: '副業',
}

type WorkCardProps = {
  item: WorkItem
}

export function WorkCard({ item }: WorkCardProps) {
  const navigate = useNavigate()
  const detailPath = '/work/$id'

  const handleClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    if (target.closest('a')) return
    navigate({ to: detailPath, params: { id: item.id } })
  }

  const periodStr = formatWorkPeriod(item)

  return (
    <li className="relative group overflow-hidden rounded-lg border border-zinc-800/80 bg-zinc-900/40 transition-colors group-hover:border-zinc-700/60 group-hover:bg-zinc-800/50">
      <Link
        to={detailPath}
        params={{ id: item.id }}
        className="absolute inset-0 z-0"
        aria-label={`Work「${item.title}」の詳細を見る`}
      />
      <div
        className="relative z-10 flex flex-col cursor-pointer"
        onClick={handleClick}
      >
        {/* サムネイル or グラデーション */}
        <div className="relative w-full aspect-[16/9] min-h-[120px] overflow-hidden">
          {item.thumbnail ? (
            <>
              <img
                src={getBlogImageSrc(item.thumbnail)}
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
          <div className="flex items-center gap-2">
            <span className="text-xs px-2 py-0.5 rounded-md bg-zinc-800/80 text-zinc-500">
              {CATEGORY_LABELS[item.category]}
            </span>
            {item.comingSoon && (
              <span className="text-xs px-2 py-0.5 rounded-md bg-amber-900/50 text-amber-400">
                Coming Soon
              </span>
            )}
          </div>
          <h3 className="text-base font-semibold text-zinc-100 group-hover:text-cyan-400 transition-colors line-clamp-2">
            {item.title}
          </h3>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-500 pointer-events-auto">
            {item.tags?.map((t) => (
              <span key={t} className="px-2 py-0.5 rounded-md bg-zinc-800/80 text-zinc-500">
                {t}
              </span>
            ))}
            {item.tags && item.tags.length > 0 && <span className="text-zinc-600">·</span>}
            {periodStr && <span>{periodStr}</span>}
          </div>
        </div>
      </div>
    </li>
  )
}
