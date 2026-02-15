import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { BookOpen, FileText } from 'lucide-react'
import { SiZenn } from 'react-icons/si'
import { getArticles } from '~/features/articles/api'
import { getScraps } from '~/features/scraps/api'
import { getBlogPosts } from '~/features/blog/api'
import { getSiteHeader } from '~/features/admin/siteConfig'
import { parseScrapTitle } from '~/features/scraps/parseScrapTitle'
import { BlogCard } from '~/shared/components/BlogCard'
import { ContactCTA } from '~/shared/components/ContactCTA'
import { Hero } from '~/shared/components/Hero'
import { TopCard } from '~/shared/components/TopCard'

const DEFAULT_TITLE = '気楽に誠実に'
const DEFAULT_SUBTITLE = 'ブログアプリ'

export const Route = createFileRoute('/')({
  component: HomePage,
  loader: async () => {
    const [articles, scraps, blogPosts, header] = await Promise.all([
      getArticles(),
      getScraps(),
      getBlogPosts(),
      getSiteHeader(),
    ])
    return {
      articles,
      scraps,
      blogPosts,
      siteTitle: header.title || DEFAULT_TITLE,
      siteSubtitle: header.subtitle || DEFAULT_SUBTITLE,
    }
  },
})

type ZennTab = 'articles' | 'scraps'

function HomePage() {
  const { articles, scraps, blogPosts, siteTitle, siteSubtitle } =
    Route.useLoaderData()
  const [zennTab, setZennTab] = useState<ZennTab>('articles')

  return (
    <div className="min-h-screen">
      <Hero title={siteTitle} subtitle={siteSubtitle} />

      <div id="main-content" className="max-w-[96rem] mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 scroll-mt-16">
        {/* ブログセクション見出し */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-zinc-200 tracking-tight">Blog</h2>
          <Link
            to="/blog"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-zinc-400 border border-zinc-600 hover:border-cyan-500/50 hover:text-cyan-400 transition-colors"
          >
            See All
            <span aria-hidden>→</span>
          </Link>
        </div>

        {/* マガジン風グリッド: 画像参考レイアウト */}
        {blogPosts.length > 0 ? (
          <div
            className="grid gap-3 sm:gap-4 lg:gap-5 mb-16"
            style={{
              gridTemplateColumns: 'repeat(12, minmax(0, 1fr))',
              gridTemplateRows: 'repeat(2, minmax(0, auto))',
            }}
          >
            {/* 1件目: 大ブロック（左・2行占有・縦幅いっぱい） */}
            {blogPosts[0] && (
              <div className="col-span-12 lg:col-span-8 lg:row-span-2 min-h-[340px] lg:min-h-[65vh]">
                <ul className="list-none p-0 m-0 h-full">
                  <BlogCard key={blogPosts[0].slug} post={blogPosts[0]} featured />
                </ul>
              </div>
            )}

            {/* 2件目: 右上（横長） */}
            {blogPosts[1] && (
              <div className="col-span-12 lg:col-span-4 min-h-0">
                <ul className="list-none p-0 m-0 h-full">
                  <BlogCard
                    key={blogPosts[1].slug}
                    post={blogPosts[1]}
                    compact="wide"
                  />
                </ul>
              </div>
            )}

            {/* 3件目: 右下左（正方形） */}
            {blogPosts[2] && (
              <div className="col-span-12 lg:col-span-2 min-h-0">
                <ul className="list-none p-0 m-0 h-full">
                  <BlogCard
                    key={blogPosts[2].slug}
                    post={blogPosts[2]}
                    compact="square"
                  />
                </ul>
              </div>
            )}

            {/* 4件目: 右下右（縦長） */}
            {blogPosts[3] && (
              <div className="col-span-12 lg:col-span-2 min-h-0">
                <ul className="list-none p-0 m-0 h-full">
                  <BlogCard
                    key={blogPosts[3].slug}
                    post={blogPosts[3]}
                    compact="tall"
                  />
                </ul>
              </div>
            )}

          </div>
        ) : (
          <p className="text-zinc-600 text-sm py-6 mb-16">ブログがありません</p>
        )}

        {/* Zenn 投稿エリア（横幅50%・タブ切り替え） */}
        <div className="w-full lg:w-1/2 lg:max-w-[48rem]">
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 border-b border-zinc-800/80 bg-zinc-900/50">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-[#3ea8ff]/15 text-[#3ea8ff]">
                  <SiZenn className="w-5 h-5" aria-hidden />
                </div>
                <h2 className="text-base font-semibold text-zinc-200">Zenn</h2>
              </div>
              <div
                className="flex rounded-lg bg-zinc-800/80 p-0.5"
                role="tablist"
                aria-label="Zenn コンテンツ切り替え"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={zennTab === 'articles'}
                  aria-controls="zenn-articles-panel"
                  id="zenn-articles-tab"
                  onClick={() => setZennTab('articles')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    zennTab === 'articles'
                      ? 'bg-amber-500/15 text-amber-400'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <BookOpen className="w-4 h-4" aria-hidden />
                  Articles
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={zennTab === 'scraps'}
                  aria-controls="zenn-scraps-panel"
                  id="zenn-scraps-tab"
                  onClick={() => setZennTab('scraps')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    zennTab === 'scraps'
                      ? 'bg-emerald-500/15 text-emerald-400'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <FileText className="w-4 h-4" aria-hidden />
                  Scraps
                </button>
              </div>
            </div>
            <div className="p-4 sm:p-5">
              {zennTab === 'articles' && (
                <div
                  id="zenn-articles-panel"
                  role="tabpanel"
                  aria-labelledby="zenn-articles-tab"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-zinc-500">技術記事</span>
                  </div>
                  <ul className="space-y-2">
                    {articles.slice(0, 5).map((a) => (
                      <TopCard
                        key={a.slug}
                        to="/articles/$slug"
                        params={{ slug: a.slug }}
                        ariaLabel={`記事「${a.title}」を読む`}
                        title={a.title}
                      >
                        {a.tags.map((t) => (
                          <Link
                            key={t}
                            to="/articles"
                            search={{ tag: t }}
                            className="pointer-events-auto px-2 py-0.5 rounded-md bg-zinc-800/80 text-zinc-500 hover:bg-zinc-700/60 hover:text-zinc-300 text-xs"
                          >
                            {t}
                          </Link>
                        ))}
                        {a.tags.length > 0 && <span className="text-zinc-600">·</span>}
                        <span>{a.createdAt}</span>
                      </TopCard>
                    ))}
                    {articles.length === 0 && (
                      <li className="text-zinc-600 text-sm py-6">記事がありません</li>
                    )}
                  </ul>
                  <Link
                    to="/articles"
                    className="mt-4 flex items-center justify-center gap-2 w-full py-2.5 rounded-lg border border-zinc-700 text-sm font-medium text-zinc-400 hover:border-amber-500/50 hover:text-amber-400 transition-colors"
                  >
                    すべての記事を見る
                    <span aria-hidden>→</span>
                  </Link>
                </div>
              )}
              {zennTab === 'scraps' && (
                <div
                  id="zenn-scraps-panel"
                  role="tabpanel"
                  aria-labelledby="zenn-scraps-tab"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-zinc-500">スクラップ</span>
                  </div>
                  <ul className="space-y-2">
                    {scraps.slice(0, 5).map((s) => {
                      const { displayTitle, tags } = parseScrapTitle(s.title)
                      return (
                        <TopCard
                          key={s.slug}
                          to="/scraps/$slug"
                          params={{ slug: s.slug }}
                          ariaLabel={`スクラップ「${displayTitle || s.title}」を読む`}
                          title={displayTitle || s.title}
                        >
                          {tags.map((t) => (
                            <Link
                              key={t}
                              to="/scraps"
                              search={{ tag: t }}
                              className="pointer-events-auto px-2 py-0.5 rounded-md bg-zinc-800/80 text-zinc-500 hover:bg-zinc-700/60 hover:text-zinc-300 text-xs"
                            >
                              {t}
                            </Link>
                          ))}
                          {tags.length > 0 && <span className="text-zinc-600">·</span>}
                          <span>{s.created_at}</span>
                          <span className="text-zinc-600">·</span>
                          <span>コメント {s.comments.length}件</span>
                          {s.comments[0]?.author && (
                            <>
                              <span className="text-zinc-600">·</span>
                              <span>by {s.comments[0].author}</span>
                            </>
                          )}
                        </TopCard>
                      )
                    })}
                    {scraps.length === 0 && (
                      <li className="text-zinc-600 text-sm py-6">スクラップがありません</li>
                    )}
                  </ul>
                  <Link
                    to="/scraps"
                    className="mt-4 flex items-center justify-center gap-2 w-full py-2.5 rounded-lg border border-zinc-700 text-sm font-medium text-zinc-400 hover:border-emerald-500/50 hover:text-emerald-400 transition-colors"
                  >
                    すべてのスクラップを見る
                    <span aria-hidden>→</span>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <ContactCTA />
    </div>
  )
}
