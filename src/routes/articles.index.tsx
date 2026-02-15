import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState, useEffect, useRef } from 'react'
import { getArticles } from '~/features/articles/api'
import { articleMatchesSearch, getArticlePreview } from '~/features/articles/searchArticle'
import type { Article } from '~/features/articles/types'
import { useSearchParams } from '~/shared/hooks/useSearchParams'

const SEARCH_DEBOUNCE_MS = 300

export const Route = createFileRoute('/articles/')({
  component: ArticlesIndex,
  loader: () => getArticles(),
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

function ArticlesIndex() {
  const articles = Route.useLoaderData()
  const navigate = useNavigate()
  const search = useSearchParams()
  const filterTag =
    typeof search?.tag === 'string' && search.tag.trim() ? search.tag.trim() : null
  const searchQuery =
    typeof search?.q === 'string' && search.q.trim() ? search.q.trim() : null

  const [searchInput, setSearchInput] = useState(searchQuery ?? '')
  const navigateRef = useRef(navigate)
  navigateRef.current = navigate

  useEffect(() => {
    setSearchInput(searchQuery ?? '')
  }, [searchQuery])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const q = searchInput.trim() || undefined
      if (q === (searchQuery ?? '')) return
      navigateRef.current({
        to: '/articles',
        search: { tag: filterTag ?? undefined, q },
      })
    }, SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [searchInput, filterTag, searchQuery])

  const effectiveQuery = searchInput.trim() || null
  const filteredArticles = articles.filter((a) => {
    if (filterTag) {
      if (!a.tags.includes(filterTag)) return false
    }
    if (effectiveQuery && !articleMatchesSearch(a, effectiveQuery)) return false
    return true
  })

  const allTags = Array.from(
    new Set(articles.flatMap((a) => a.tags))
  ).sort()

  const grouped = groupByMonth(filteredArticles)
  const sortedKeys = Array.from(grouped.keys()).sort((a, b) => b.localeCompare(a))

  const handleClearSearch = () => {
    setSearchInput('')
    navigate({ to: '/articles', search: { tag: filterTag ?? undefined } })
  }

  return (
    <div className="max-w-[96rem] mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">記事一覧</h1>

      <div className="mb-6">
        <div className="relative flex gap-2">
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="タイトル・本文を検索..."
            className="flex-1 px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            aria-label="記事検索"
            autoComplete="off"
          />
          {searchInput && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="px-4 py-2 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-zinc-400 text-sm transition"
              aria-label="検索をクリア"
            >
              クリア
            </button>
          )}
        </div>
      </div>

      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {allTags.map((t) => (
            <Link
              key={t}
              to="/articles"
              search={filterTag === t ? {} : { tag: t }}
              className={`inline-block px-3 py-1 rounded-full text-sm ${
                filterTag === t
                  ? 'bg-cyan-500/30 text-cyan-300 ring-1 ring-cyan-500/50'
                  : 'bg-zinc-700/50 text-zinc-400 hover:bg-zinc-600/50'
              }`}
            >
              {t}
            </Link>
          ))}
          {filterTag && (
            <Link
              to="/articles"
              className="inline-block px-3 py-1 rounded-full text-sm text-zinc-500 hover:text-zinc-400"
            >
              ✕ フィルタ解除
            </Link>
          )}
        </div>
      )}

      {filteredArticles.length === 0 ? (
        <p className="text-zinc-500">
          {effectiveQuery
            ? `「${effectiveQuery}」に該当する記事がありません`
            : filterTag
              ? `タグ「${filterTag}」に該当する記事がありません`
              : '記事がありません'}
        </p>
      ) : (
        <div className="space-y-8">
          {sortedKeys.map((key) => (
            <section key={key}>
              <h2 className="text-lg font-semibold text-zinc-400 mb-4">
                {formatMonthLabel(key)}
              </h2>
              <ul className="space-y-4">
                {grouped.get(key)!.map((a) => {
                  const preview = getArticlePreview(a)
                  return (
                    <li key={a.slug} className="relative">
                      <Link
                        to="/articles/$slug"
                        params={{ slug: a.slug }}
                        className="absolute inset-0 z-0 rounded-lg cursor-pointer"
                        aria-label={`記事「${a.title}」を読む`}
                      />
                      <div className="relative z-10 rounded-lg bg-zinc-800/50 p-5 pointer-events-none">
                        <h3 className="text-lg font-semibold text-cyan-400">
                          {a.title}
                        </h3>
                        {preview && (
                          <p className="mt-2 line-clamp-2 text-sm text-zinc-400">
                            {preview}
                          </p>
                        )}
                        {a.tags.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1.5 pointer-events-auto">
                            {a.tags.map((t) => (
                              <Link
                                key={t}
                                to="/articles"
                                search={{ tag: t }}
                                className="text-xs px-2 py-0.5 rounded bg-zinc-700/60 text-zinc-400 hover:bg-zinc-600/60 hover:text-zinc-300"
                              >
                                {t}
                              </Link>
                            ))}
                          </div>
                        )}
                        <p className="mt-3 text-xs text-zinc-500">{a.createdAt}</p>
                      </div>
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
