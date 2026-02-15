import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState, useEffect, useRef } from 'react'
import { BookOpen, FileText } from 'lucide-react'
import { getArticles } from '~/features/articles/api'
import { getScraps } from '~/features/scraps/api'
import { articleMatchesSearch, getArticlePreview } from '~/features/articles/searchArticle'
import { parseScrapTitle } from '~/features/scraps/parseScrapTitle'
import { scrapMatchesSearch, getScrapPreview } from '~/features/scraps/searchScrap'
import type { Article } from '~/features/articles/types'
import type { ScrapWithSlug } from '~/features/scraps/types'
import type { TechSearchParams, TechTab } from '~/shared/types/techSearch'

const SEARCH_DEBOUNCE_MS = 300

const isTab = (value: unknown): value is TechTab =>
  value === 'articles' || value === 'scraps'

export const Route = createFileRoute('/tech/')({
  component: TechIndex,

  validateSearch: (
    search: Record<string, unknown>
  ): TechSearchParams => ({
    tab: isTab(search.tab) ? search.tab : 'articles',

    articleTag:
      typeof search.articleTag === 'string'
        ? search.articleTag
        : undefined,

    scrapTag:
      typeof search.scrapTag === 'string'
        ? search.scrapTag
        : undefined,

    q:
      typeof search.q === 'string'
        ? search.q
        : undefined,
  }),

  loader: async () => {
    const [articles, scraps] = await Promise.all([
      getArticles(),
      getScraps(),
    ])
    return { articles, scraps }
  },
})

function formatMonthKey(dateStr: string): string {
  const cleaned = String(dateStr ?? '').replace(/^["'\s\u201C\u201D]+|["'\s\u201C\u201D]+$/g, '')
  const base = cleaned.split('T')[0] ?? cleaned.split('-').slice(0, 2).join('-')
  const parts = base.split('-')
  const y = (parts[0] ?? '').replace(/^["'\s\u201C\u201D]+|["'\s\u201C\u201D]+$/g, '')
  const m = (parts[1] ?? '01').replace(/^["'\s\u201C\u201D]+|["'\s\u201C\u201D]+$/g, '')
  return `${y}-${m || `01`}`
}

function formatMonthLabel(key: string): string {
  const parts = key.split('-')
  const y = (parts[0] ?? '').replace(/^["'\s\u201C\u201D]+|["'\s\u201C\u201D]+$/g, '')
  const m = parts[1] ?? '01'
  const month = m ? parseInt(m, 10) : 1
  return `${y}年${month}月`
}

function TechIndex() {
  const { articles, scraps } = Route.useLoaderData()
  const search = Route.useSearch()
  const tab = search?.tab ?? 'articles'
  const articleTag = search?.articleTag
  const scrapTag = search?.scrapTag
  const q = search?.q
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<TechTab>(tab ?? 'articles')
  const [searchInput, setSearchInput] = useState(q ?? '')
  const navigateRef = useRef(navigate)
  navigateRef.current = navigate

  useEffect(() => {
    setActiveTab(tab ?? 'articles')
  }, [tab])

  useEffect(() => {
    setSearchInput(q ?? '')
  }, [q])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const newQ = searchInput.trim() || undefined
      if (newQ === (q ?? '')) return
      navigate({
        to: '/tech',
        search: {
          tab: activeTab,
          articleTag: activeTab === 'articles' ? articleTag : undefined,
          scrapTag: activeTab === 'scraps' ? scrapTag : undefined,
          q: newQ,
        },
      })
    }, SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [searchInput, activeTab, articleTag, scrapTag, q, navigate])

  const filterArticleTag = activeTab === 'articles' && articleTag ? articleTag : null
  const filterScrapTag = activeTab === 'scraps' && scrapTag ? scrapTag : null

  const filteredArticles = articles.filter((a) => {
    if (filterArticleTag && !a.tags.includes(filterArticleTag)) return false
    if (searchInput.trim() && !articleMatchesSearch(a, searchInput.trim())) return false
    return true
  })
  const filteredScraps = scraps.filter((s) => {
    const { tags } = parseScrapTitle(s.title)
    if (filterScrapTag && !tags.includes(filterScrapTag)) return false
    if (searchInput.trim() && !scrapMatchesSearch(s, searchInput.trim())) return false
    return true
  })

  const articleTags = Array.from(new Set(articles.flatMap((a) => a.tags))).sort()
  const scrapTags = Array.from(
    new Set(scraps.flatMap((s) => parseScrapTitle(s.title).tags))
  ).sort()

  const articlesByMonth = new Map<string, Article[]>()
  for (const a of filteredArticles) {
    const key = formatMonthKey(a.createdAt)
    const list = articlesByMonth.get(key) ?? []
    list.push(a)
    articlesByMonth.set(key, list)
  }
  const articlesKeys = Array.from(articlesByMonth.keys()).sort((a, b) => b.localeCompare(a))

  const scrapsByMonth = new Map<string, ScrapWithSlug[]>()
  for (const s of filteredScraps) {
    const key = formatMonthKey(s.created_at)
    const list = scrapsByMonth.get(key) ?? []
    list.push(s)
    scrapsByMonth.set(key, list)
  }
  const scrapsKeys = Array.from(scrapsByMonth.keys()).sort((a, b) => b.localeCompare(a))

  return (
    <div className="max-w-[96rem] mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Tech</h1>
        <p className="text-zinc-500 text-sm mt-2">
          Zennの投稿記事をGithubから取得しています。
        </p>
      </div>

      <div className="mb-6">
        <input
          type="search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="タイトル・本文を検索..."
          className="w-full px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
          aria-label="Tech コンテンツ検索"
          autoComplete="off"
        />
      </div>

      <div className="flex rounded-lg bg-zinc-900/80 p-0.5 border border-zinc-800 mb-6">
        <button
          type="button"
          onClick={() => {
            setActiveTab('articles')
            navigate({
              to: '/tech',
              search: { tab: 'articles', articleTag: articleTag ?? undefined, scrapTag: undefined, q: searchInput.trim() || undefined },
            })
          }}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'articles'
              ? 'bg-zinc-700 text-zinc-100'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          記事 ({articles.length})
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab('scraps')
            navigate({
              to: '/tech',
              search: { tab: 'scraps', articleTag: undefined, scrapTag: scrapTag ?? undefined, q: searchInput.trim() || undefined },
            })
          }}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'scraps'
              ? 'bg-zinc-700 text-zinc-100'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <FileText className="w-4 h-4" />
          スクラップ ({scraps.length})
        </button>
      </div>

      {activeTab === 'articles' && articleTags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {articleTags.map((t) => (
            <Link
              key={t}
              to="/tech"
              search={{
                tab: 'articles',
                articleTag: filterArticleTag === t ? undefined : t,
                scrapTag: undefined,
                q: searchInput.trim() || undefined,
              }}
              className={`inline-block px-3 py-1 rounded-full text-sm ${
                filterArticleTag === t
                  ? 'bg-cyan-500/30 text-cyan-300 ring-1 ring-cyan-500/50'
                  : 'bg-zinc-700/50 text-zinc-400 hover:bg-zinc-600/50'
              }`}
            >
              {t}
            </Link>
          ))}
          {filterArticleTag && (
            <Link
              to="/tech"
              search={{ tab: 'articles', articleTag: undefined, scrapTag: undefined, q: searchInput.trim() || undefined }}
              className="inline-block px-3 py-1 rounded-full text-sm text-zinc-500 hover:text-zinc-400"
            >
              ✕ フィルタ解除
            </Link>
          )}
        </div>
      )}

      {activeTab === 'scraps' && scrapTags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {scrapTags.map((t) => (
            <Link
              key={t}
              to="/tech"
              search={{
                tab: 'scraps',
                articleTag: undefined,
                scrapTag: filterScrapTag === t ? undefined : t,
                q: searchInput.trim() || undefined,
              }}
              className={`inline-block px-3 py-1 rounded-full text-sm ${
                filterScrapTag === t
                  ? 'bg-cyan-500/30 text-cyan-300 ring-1 ring-cyan-500/50'
                  : 'bg-zinc-700/50 text-zinc-400 hover:bg-zinc-600/50'
              }`}
            >
              {t}
            </Link>
          ))}
          {filterScrapTag && (
            <Link
              to="/tech"
              search={{ tab: 'scraps', articleTag: undefined, scrapTag: undefined, q: searchInput.trim() || undefined }}
              className="inline-block px-3 py-1 rounded-full text-sm text-zinc-500 hover:text-zinc-400"
            >
              ✕ フィルタ解除
            </Link>
          )}
        </div>
      )}

      {activeTab === 'articles' && (
        <>
          {filteredArticles.length === 0 ? (
            <p className="text-zinc-500">
              {searchInput.trim()
                ? `「${searchInput.trim()}」に該当する記事がありません`
                : filterArticleTag
                  ? `タグ「${filterArticleTag}」に該当する記事がありません`
                  : '記事がありません'}
            </p>
          ) : (
            <div className="space-y-8">
              {articlesKeys.map((key) => (
                <section key={key}>
                  <h2 className="text-lg font-semibold text-zinc-400 mb-4">
                    {formatMonthLabel(key)}
                  </h2>
                  <ul className="space-y-4">
                    {articlesByMonth.get(key)!.map((a) => {
                      const preview = getArticlePreview(a)
                      return (
                        <li key={a.slug} className="relative group">
                          <Link
                            to="/articles/$slug"
                            params={{ slug: a.slug }}
                            className="absolute inset-0 z-0 rounded-lg cursor-pointer"
                            aria-label={`記事「${a.title}」を読む`}
                          />
                          <div className="relative z-10 rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-5 pointer-events-none transition-colors group-hover:border-zinc-700/60 group-hover:bg-zinc-800/50">
                            <h3 className="text-lg font-semibold text-zinc-100 group-hover:text-cyan-400 transition-colors">
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
                                    to="/tech"
                                    search={{
                                      tab: 'articles',
                                      articleTag: filterArticleTag === t ? undefined : t,
                                      scrapTag: undefined,
                                      q: searchInput.trim() || undefined,
                                    }}
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
        </>
      )}

      {activeTab === 'scraps' && (
        <>
          {filteredScraps.length === 0 ? (
            <p className="text-zinc-500">
              {searchInput.trim()
                ? `「${searchInput.trim()}」に該当するスクラップがありません`
                : filterScrapTag
                  ? `タグ「${filterScrapTag}」に該当するスクラップがありません`
                  : 'スクラップがありません'}
            </p>
          ) : (
            <div className="space-y-8">
              {scrapsKeys.map((key) => (
                <section key={key}>
                  <h2 className="text-lg font-semibold text-zinc-400 mb-4">
                    {formatMonthLabel(key)}
                  </h2>
                  <ul className="space-y-4">
                    {scrapsByMonth.get(key)!.map((s) => {
                      const { displayTitle, tags } = parseScrapTitle(s.title)
                      const preview = getScrapPreview(s)
                      return (
                        <li key={s.slug} className="relative group">
                          <Link
                            to="/scraps/$slug"
                            params={{ slug: s.slug }}
                            className="absolute inset-0 z-0 rounded-lg cursor-pointer"
                            aria-label={`スクラップ「${displayTitle || s.title}」を読む`}
                          />
                          <div className="relative z-10 rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-5 pointer-events-none transition-colors group-hover:border-zinc-700/60 group-hover:bg-zinc-800/50">
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
                                    to="/tech"
                                    search={{
                                      tab: 'scraps',
                                      articleTag: undefined,
                                      scrapTag: filterScrapTag === t ? undefined : t,
                                      q: searchInput.trim() || undefined,
                                    }}
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
        </>
      )}
    </div>
  )
}
