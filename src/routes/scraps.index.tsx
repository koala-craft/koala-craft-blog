import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState, useEffect, useRef } from 'react'
import { getScraps } from '~/features/scraps/api'
import { parseScrapTitle } from '~/features/scraps/parseScrapTitle'
import { scrapMatchesSearch, getScrapPreview } from '~/features/scraps/searchScrap'
import type { ScrapWithSlug } from '~/features/scraps/types'
import { useSearchParams } from '~/shared/hooks/useSearchParams'

const SEARCH_DEBOUNCE_MS = 300

export const Route = createFileRoute('/scraps/')({
  component: ScrapsIndex,
  loader: () => getScraps(),
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

function ScrapsIndex() {
  const scraps = Route.useLoaderData()
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
        to: '/scraps',
        search: { tag: filterTag ?? undefined, q },
      })
    }, SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [searchInput, filterTag, searchQuery])

  const effectiveQuery = searchInput.trim() || null
  const filteredScraps = scraps.filter((s) => {
    if (filterTag) {
      const { tags } = parseScrapTitle(s.title)
      if (!tags.includes(filterTag)) return false
    }
    if (effectiveQuery && !scrapMatchesSearch(s, effectiveQuery)) return false
    return true
  })

  const allTags = Array.from(
    new Set(scraps.flatMap((s) => parseScrapTitle(s.title).tags))
  ).sort()

  const grouped = groupByMonth(filteredScraps)
  const sortedKeys = Array.from(grouped.keys()).sort((a, b) => b.localeCompare(a))

  const handleClearSearch = () => {
    setSearchInput('')
    navigate({ to: '/scraps', search: { tag: filterTag ?? undefined } })
  }

  return (
    <div className="max-w-[96rem] mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">スクラップ一覧</h1>

      <div className="mb-6">
        <div className="relative flex gap-2">
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="タイトル・本文を検索..."
            className="flex-1 px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            aria-label="スクラップ検索"
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
              to="/scraps"
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
              to="/scraps"
              className="inline-block px-3 py-1 rounded-full text-sm text-zinc-500 hover:text-zinc-400"
            >
              ✕ フィルタ解除
            </Link>
          )}
        </div>
      )}

      {filteredScraps.length === 0 ? (
        <p className="text-zinc-500">
          {effectiveQuery
            ? `「${effectiveQuery}」に該当するスクラップがありません`
            : filterTag
              ? `タグ「${filterTag}」に該当するスクラップがありません`
              : 'スクラップがありません'}
        </p>
      ) : (
        <div className="space-y-8">
          {sortedKeys.map((key) => (
            <section key={key}>
              <h2 className="text-lg font-semibold text-zinc-400 mb-4">
                {formatMonthLabel(key)}
              </h2>
              <ul className="space-y-4">
                {grouped.get(key)!.map((s) => {
                  const { displayTitle, tags } = parseScrapTitle(s.title)
                  const preview = getScrapPreview(s)
                  return (
                    <li key={s.slug} className="relative group">
                      <Link
                        to="/scraps/$slug"
                        params={{ slug: s.slug }}
                        className="absolute inset-0 z-0 rounded-md cursor-pointer"
                        aria-label={`スクラップ「${displayTitle || s.title}」を読む`}
                      />
                      <div className="relative z-10 rounded-md border border-zinc-800/80 bg-zinc-900/40 p-5 pointer-events-none transition-colors group-hover:border-zinc-700/60 group-hover:bg-zinc-800/50">
                        <h3 className="text-lg font-semibold text-zinc-100 group-hover:text-cyan-400 transition-colors">
                          {displayTitle || s.title}
                        </h3>
                        {preview && (
                          <p className="mt-2 line-clamp-2 text-sm text-zinc-400">
                            {preview}
                          </p>
                        )}
                        {tags.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1.5 pointer-events-auto">
                            {tags.map((t) => (
                              <Link
                                key={t}
                                to="/scraps"
                                search={{ tag: t }}
                                className="text-xs px-2 py-0.5 rounded bg-zinc-700/60 text-zinc-400 hover:bg-zinc-600/60 hover:text-zinc-300"
                              >
                                {t}
                              </Link>
                            ))}
                          </div>
                        )}
                        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
                          <span>{s.created_at}</span>
                          <span>コメント {s.comments.length}件</span>
                          {s.comments[0]?.author && (
                            <span>by {s.comments[0].author}</span>
                          )}
                        </div>
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
