import { createFileRoute, Link } from '@tanstack/react-router'
import { getScraps } from '~/features/scraps/api'
import { parseScrapTitle } from '~/features/scraps/parseScrapTitle'
import type { ScrapWithSlug } from '~/features/scraps/types'

export const Route = createFileRoute('/admin/scraps/')({
  component: AdminScrapsIndex,
  validateSearch: (s: Record<string, unknown>) => ({
    _refresh: typeof s._refresh === 'number' ? s._refresh : undefined,
  }),
  // _refresh の値ごとにローダーを再実行し、キャッシュを確実にバイパスする
  loaderDeps: ({ search }) => ({ refresh: search._refresh ?? 0 }),
  loader: ({ deps }) =>
    getScraps({ data: { bypassCache: !!deps?.refresh } }),
})

function groupByMonth(scraps: ScrapWithSlug[]): Map<string, ScrapWithSlug[]> {
  const map = new Map<string, ScrapWithSlug[]>()
  for (const s of scraps) {
    const key = formatMonthKey(s.created_at)
    const list = map.get(key) ?? []
    list.push(s)
    map.set(key, list)
  }
  return map
}

function formatMonthKey(dateStr: string): string {
  const [y, m] = dateStr.split('-')
  return `${y}-${m ?? '01'}`
}

function formatMonthLabel(key: string): string {
  const [y, m] = key.split('-')
  const month = m ? parseInt(m, 10) : 1
  return `${y}年${month}月`
}

function AdminScrapsIndex() {
  const scraps = Route.useLoaderData()

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Stream 管理</h1>
        <Link
          to="/admin/scraps/new"
          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded transition"
        >
          新規作成
        </Link>
      </div>

      {scraps.length === 0 ? (
        <p className="text-zinc-500 mb-4">Stream がありません。</p>
      ) : (
        <div className="space-y-8">
          {Array.from(groupByMonth(scraps).entries())
            .sort(([a], [b]) => b.localeCompare(a))
            .map(([key, items]) => (
              <section key={key}>
                <h2 className="text-lg font-semibold text-zinc-400 mb-4">
                  {formatMonthLabel(key)}
                </h2>
                <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {items.map((s) => {
                    const { displayTitle, tags } = parseScrapTitle(s.title)
                    return (
                      <li key={s.slug}>
                        <Link
                          to="/admin/scraps/$slug"
                          params={{ slug: s.slug }}
                          className="block rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 hover:border-zinc-700 hover:bg-zinc-800/50 transition"
                        >
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-zinc-100 truncate">
                              {displayTitle || s.title}
                            </h3>
                            {s.closed && (
                              <span className="shrink-0 px-1.5 py-0.5 rounded text-xs font-medium bg-amber-900/50 text-amber-400 border border-amber-700/50">
                                クローズ
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-xs text-zinc-500">{s.slug}</p>
                          {tags.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {tags.slice(0, 3).map((t) => (
                                <span
                                  key={t}
                                  className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 text-xs"
                                >
                                  {t}
                                </span>
                              ))}
                            </div>
                          )}
                          <div className="mt-2 text-xs text-zinc-500">
                            {s.created_at} · STREAM {s.comments.length}件
                          </div>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </section>
            ))}
        </div>
      )}
    </div>
  )
}
