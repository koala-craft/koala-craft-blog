import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState, useEffect, useRef } from 'react'
import { getScraps } from '~/features/scraps/api'
import { ScrapComposer } from '~/features/scraps/ScrapComposer'
import { parseScrapTitle } from '~/features/scraps/parseScrapTitle'
import { scrapMatchesSearch } from '~/features/scraps/searchScrap'
import type { ScrapWithSlug } from '~/features/scraps/types'
import { ContentListRow } from '~/shared/components/ContentListRow'
import { useAuth } from '~/features/admin/useAuth'
import {
  useSearchParams,
  buildTagSearch,
  toggleTagInFilter,
} from '~/shared/hooks/useSearchParams'

const SEARCH_DEBOUNCE_MS = 300

export const Route = createFileRoute('/scraps/')({
  component: ScrapsIndex,
  validateSearch: (search: Record<string, unknown>): { tag?: string; q?: string; _refresh?: number } => ({
    tag: typeof search.tag === 'string' ? search.tag : undefined,
    q: typeof search.q === 'string' ? search.q : undefined,
    _refresh: typeof search._refresh === 'number' ? search._refresh : undefined,
  }),
  loaderDeps: ({ search }) => ({ bypassCache: !!search._refresh }),
  loader: ({ deps }) =>
    getScraps({ data: { bypassCache: deps?.bypassCache } }),
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
  const { isAdmin } = useAuth()
  const navigate = useNavigate()
  const routeSearch = Route.useSearch()
  const search = useSearchParams()
  const filterTags = search.tags
  const searchQuery =
    typeof search?.q === 'string' && search.q.trim() ? search.q.trim() : null

  const [searchInput, setSearchInput] = useState(searchQuery ?? '')
  const navigateRef = useRef(navigate)
  navigateRef.current = navigate

  useEffect(() => {
    setSearchInput(searchQuery ?? '')
  }, [searchQuery])

  // 作成後の _refresh を URL から削除
  useEffect(() => {
    if (!routeSearch?._refresh) return
    navigate({
      to: '/scraps',
      search: {
        ...buildTagSearch(filterTags),
        q: searchQuery ?? undefined,
      },
      replace: true,
    })
  }, [routeSearch?._refresh, filterTags, searchQuery, navigate])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const q = searchInput.trim() || undefined
      if (q === (searchQuery ?? '')) return
      navigateRef.current({
        to: '/scraps',
        search: { ...buildTagSearch(filterTags), q },
      })
    }, SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [searchInput, filterTags, searchQuery])

  const effectiveQuery = searchInput.trim() || null
  const filteredScraps = scraps.filter((s) => {
    if (filterTags.length > 0) {
      const { tags } = parseScrapTitle(s.title)
      if (!filterTags.some((t) => tags.includes(t))) return false
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
    navigate({ to: '/scraps', search: buildTagSearch(filterTags) })
  }

  return (
    <div className="max-w-[96rem] mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">SREAM MEMO 一覧</h1>

      {isAdmin && <ScrapComposer />}

      <div className="mb-6">
        <div className="relative flex gap-2">
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="タイトル・本文を検索..."
            className="flex-1 px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            aria-label="SREAM MEMO 検索"
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
          {allTags.map((t) => {
            const toggled = toggleTagInFilter(filterTags, t)
            return (
              <Link
                key={t}
                to="/scraps"
                search={{ ...buildTagSearch(toggled), q: searchQuery ?? undefined }}
                className={`inline-block px-3 py-1 rounded-full text-sm ${
                  filterTags.includes(t)
                    ? 'bg-cyan-500/30 text-cyan-300 ring-1 ring-cyan-500/50'
                    : 'bg-zinc-700/50 text-zinc-400 hover:bg-zinc-600/50'
                }`}
              >
                {t}
              </Link>
            )
          })}
          {filterTags.length > 0 && (
            <Link
              to="/scraps"
              search={{ q: searchQuery ?? undefined }}
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
            ? `「${effectiveQuery}」に該当する SREAM MEMO がありません`
            : filterTags.length > 0
              ? `タグ「${filterTags.join('」「')}」に該当する SREAM MEMO がありません`
              : 'SREAM MEMO がありません'}
        </p>
      ) : (
        <div className="space-y-8">
          {sortedKeys.map((key) => (
            <section key={key}>
              <h2 className="text-lg font-semibold text-zinc-400 mb-4">
                {formatMonthLabel(key)}
              </h2>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {grouped.get(key)!.map((s) => {
                  const { displayTitle, tags } = parseScrapTitle(s.title)
                  return (
                    <ContentListRow
                      key={s.slug}
                      to="/scraps/$slug"
                      params={{ slug: s.slug }}
                      title={displayTitle || s.title}
                      date={s.created_at}
                      tags={tags}
                      tagLinkTo="/scraps"
                      filterTags={filterTags}
                      tagLinkSearch={{ q: searchQuery ?? undefined }}
                      imageUrl={s.firstView}
                      meta={
                        <>
                          {s.closed && (
                            <>
                              <span className="text-zinc-600">·</span>
                              <span className="shrink-0 px-1.5 py-0.5 rounded text-xs font-medium bg-amber-900/50 text-amber-400 border border-amber-700/50">
                                クローズ
                              </span>
                            </>
                          )}
                          <span className="text-zinc-600">·</span>
                          <span>コメント {s.comments.length}件</span>
                        </>
                      }
                      ariaLabel={`Stream「${displayTitle || s.title}」を読む`}
                      variant="tall"
                    />
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
