import { createFileRoute, Link } from '@tanstack/react-router'
import { getAdminArticles } from '~/features/articles/api'
import { validateSlug } from '~/shared/lib/slug'
import type { Article } from '~/features/articles/types'

export const Route = createFileRoute('/admin/articles/')({
  component: AdminArticlesIndex,
  loader: () => getAdminArticles(),
})

function groupByMonth(articles: Article[]): Map<string, Article[]> {
  const map = new Map<string, Article[]>()
  for (const a of articles) {
    const key = formatMonthKey(a.createdAt)
    const list = map.get(key) ?? []
    list.push(a)
    map.set(key, list)
  }
  return map
}

function formatMonthKey(dateStr: string): string {
  const base = dateStr.split('T')[0] ?? dateStr
  const [y, m] = base.split('-')
  return `${y}-${m ?? '01'}`
}

function formatMonthLabel(key: string): string {
  const [y, m] = key.split('-')
  const month = m ? parseInt(m, 10) : 1
  return `${y}年${month}月`
}

function AdminArticlesIndex() {
  const articles = Route.useLoaderData()

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">記事（Articles）管理</h1>
        <Link
          to="/admin/articles/new"
          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded transition"
        >
          新規作成
        </Link>
      </div>

      {articles.length === 0 ? (
        <p className="text-zinc-500 mb-4">記事がありません。</p>
      ) : (
        <div className="space-y-8">
          {Array.from(groupByMonth(articles).entries())
            .sort(([a], [b]) => b.localeCompare(a))
            .map(([key, items]) => (
              <section key={key}>
                <h2 className="text-lg font-semibold text-zinc-400 mb-4">
                  {formatMonthLabel(key)}
                </h2>
                <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {items.map((a) => (
                    <li key={a.slug}>
                      <Link
                        to="/admin/articles/$slug"
                        params={{ slug: a.slug }}
                        className="block rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 hover:border-zinc-700 hover:bg-zinc-800/50 transition"
                      >
                        <h3 className="font-semibold text-zinc-100 truncate">{a.title}</h3>
                        <p className="mt-1 text-xs text-zinc-500">{a.slug}</p>
                        {a.tags.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {a.tags.slice(0, 3).map((t) => (
                              <span
                                key={t}
                                className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 text-xs"
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="mt-2 flex items-center gap-2 text-xs">
                          <span className="text-zinc-500">{a.createdAt}</span>
                          {a.visibility === 'private' && (
                            <span className="text-amber-500">非公開</span>
                          )}
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
        </div>
      )}
    </div>
  )
}
