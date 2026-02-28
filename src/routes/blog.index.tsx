import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState, useEffect, useRef } from 'react'
import { getBlogPosts } from '~/features/blog/api'
import { blogPostMatchesSearch } from '~/features/blog/searchArticle'
import type { BlogPost } from '~/features/blog/types'
import { BlogCard } from '~/shared/components/BlogCard'
import {
  useSearchParams,
  buildTagSearch,
  toggleTagInFilter,
} from '~/shared/hooks/useSearchParams'

const SEARCH_DEBOUNCE_MS = 300

export const Route = createFileRoute('/blog/')({
  component: BlogIndex,
  loader: () => getBlogPosts(),
})

function groupByMonth(posts: BlogPost[]): Map<string, BlogPost[]> {
  const map = new Map<string, BlogPost[]>()
  for (const p of posts) {
    const key = formatMonthKey(p.createdAt)
    const list = map.get(key) ?? []
    list.push(p)
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

function BlogIndex() {
  const posts = Route.useLoaderData()
  const search = useSearchParams()
  const filterTags = search.tags
  const searchQuery =
    typeof search?.q === 'string' && search.q.trim() ? search.q.trim() : null

  const navigate = useNavigate()
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
        to: '/blog',
        search: { ...buildTagSearch(filterTags), q },
      })
    }, SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [searchInput, filterTags, searchQuery])

  const effectiveQuery = searchInput.trim() || null
  const filteredPosts = posts.filter((p) => {
    if (filterTags.length > 0) {
      if (!filterTags.some((t) => p.tags.includes(t))) return false
    }
    if (effectiveQuery && !blogPostMatchesSearch(p, effectiveQuery)) return false
    return true
  })

  const allTags = Array.from(new Set(posts.flatMap((p) => p.tags))).sort()
  const grouped = groupByMonth(filteredPosts)
  const sortedKeys = Array.from(grouped.keys()).sort((a, b) => b.localeCompare(a))

  return (
    <div className="max-w-[96rem] mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Blog</h1>

      <div className="mb-6">
        <div className="relative flex gap-2">
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="タイトル・本文を検索..."
            className="flex-1 px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            aria-label="ブログ検索"
            autoComplete="off"
          />
          {searchInput && (
            <Link
              to="/blog"
              search={buildTagSearch(filterTags)}
              className="px-4 py-2 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-zinc-400 text-sm transition"
              aria-label="検索をクリア"
            >
              クリア
            </Link>
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
                to="/blog"
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
              to="/blog"
              search={{ q: searchQuery ?? undefined }}
              className="inline-block px-3 py-1 rounded-full text-sm text-zinc-500 hover:text-zinc-400"
            >
              ✕ フィルタ解除
            </Link>
          )}
        </div>
      )}

      {filteredPosts.length === 0 ? (
        <p className="text-zinc-500">
          {effectiveQuery
            ? `「${effectiveQuery}」に該当する記事がありません`
            : filterTags.length > 0
              ? `タグ「${filterTags.join('」「')}」に該当する記事がありません`
              : '記事がありません'}
        </p>
      ) : (
        <div className="space-y-8">
          {sortedKeys.map((key) => (
            <section key={key}>
              <h2 className="text-lg font-semibold text-zinc-400 mb-4">
                {formatMonthLabel(key)}
              </h2>
              <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {grouped.get(key)!.map((p) => (
                  <BlogCard
                    key={p.slug}
                    post={p}
                    filterTags={filterTags}
                    tagLinkSearch={{ q: searchQuery ?? undefined }}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
