import { createFileRoute, Link } from '@tanstack/react-router'
import { BookOpen, Cpu, Radio } from 'lucide-react'
import { getHomePageData } from '~/features/pageData/api'
import { parseScrapTitle } from '~/features/scraps/parseScrapTitle'
import { BlogCard } from '~/shared/components/BlogCard'
import { ContactCTA } from '~/shared/components/ContactCTA'
import { ContentListRow } from '~/shared/components/ContentListRow'
import { TechCarousel } from '~/shared/components/TechCarousel'
import { Hero } from '~/shared/components/Hero'
import { HomePageBackground } from '~/shared/components/HomePageBackground'

export const Route = createFileRoute('/')({
  component: HomePage,
  loader: () => getHomePageData(),
})

function HomePage() {
  const { articles, scraps, blogPosts, siteTitle, siteSubtitle } =
    Route.useLoaderData()
  const blogListItems = blogPosts.slice(0, 20)

  return (
    <div className="min-h-screen">
      <HomePageBackground />
      <Hero title={siteTitle} subtitle={siteSubtitle} />

      <div id="main-content" className="max-w-[96rem] mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 scroll-mt-16">
        {/* ========== Blog セクション ========== */}
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

        {/* マガジン風グリッド */}
        {blogPosts.length > 0 ? (
          <div
            className="grid gap-3 sm:gap-4 lg:gap-5 mb-8"
            style={{
              gridTemplateColumns: 'repeat(12, minmax(0, 1fr))',
              gridTemplateRows: 'repeat(2, minmax(0, auto))',
            }}
          >
            {blogPosts[0] && (
              <div className="col-span-12 lg:col-span-8 lg:row-span-2 h-[320px] min-h-[320px] lg:h-auto lg:min-h-[65vh]">
                <ul className="list-none p-0 m-0 h-full">
                  <BlogCard key={blogPosts[0].slug} post={blogPosts[0]} featured />
                </ul>
              </div>
            )}
            {blogPosts[1] && (
              <div className="col-span-12 lg:col-span-4 h-[320px] min-h-[320px] lg:h-auto lg:min-h-0">
                <ul className="list-none p-0 m-0 h-full">
                  <BlogCard key={blogPosts[1].slug} post={blogPosts[1]} compact="wide" />
                </ul>
              </div>
            )}
            {blogPosts[2] && (
              <div className="col-span-12 lg:col-span-2 h-[320px] min-h-[320px] lg:h-auto lg:min-h-0">
                <ul className="list-none p-0 m-0 h-full">
                  <BlogCard key={blogPosts[2].slug} post={blogPosts[2]} compact="square" />
                </ul>
              </div>
            )}
            {blogPosts[3] && (
              <div className="col-span-12 lg:col-span-2 h-[320px] min-h-[320px] lg:h-auto lg:min-h-0">
                <ul className="list-none p-0 m-0 h-full">
                  <BlogCard key={blogPosts[3].slug} post={blogPosts[3]} compact="tall" />
                </ul>
              </div>
            )}
          </div>
        ) : (
          <p className="text-zinc-600 text-sm py-6 mb-8">ブログがありません</p>
        )}

        {/* Blog 直近20件一覧（コンパクト）※スマホでは非表示 */}
        {blogListItems.length > 0 && (
          <div className="hidden md:block mb-16">
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {blogListItems.map((post) => (
                <ContentListRow
                  key={post.slug}
                  to="/blog/$slug"
                  params={{ slug: post.slug }}
                  title={post.title}
                  date={post.createdAt}
                  tags={post.tags}
                  imageUrl={post.firstView}
                  tagLinkTo="/blog"
                  ariaLabel={`ブログ「${post.title}」を読む`}
                />
              ))}
            </ul>
          </div>
        )}

        {/* ========== Tech セクション（Article | Stream 2カラム） ========== */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-cyan-500/15 text-cyan-400">
              <Cpu className="w-5 h-5" aria-hidden />
            </div>
            <h2 className="text-lg font-semibold text-zinc-200 tracking-tight">Tech</h2>
          </div>
          <Link
            to="/tech"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-zinc-400 border border-zinc-600 hover:border-cyan-500/50 hover:text-cyan-400 transition-colors"
          >
            See All
            <span aria-hidden>→</span>
          </Link>
        </div>

        <div className="space-y-10 mb-16">
          {/* Article */}
          <section>
            {articles.length > 0 ? (
              <TechCarousel
                header={
                  <div className="flex items-center justify-between w-full">
                    <h3 className="flex items-center gap-2 text-sm font-medium text-zinc-400 uppercase tracking-wider">
                      <BookOpen className="w-4 h-4 text-amber-400/80" aria-hidden />
                      Article
                    </h3>
                    <Link
                      to="/articles"
                      className="text-xs text-zinc-500 hover:text-cyan-400 transition"
                    >
                      See All
                    </Link>
                  </div>
                }
              >
                {articles.slice(0, 12).map((a) => (
                  <ContentListRow
                    key={`article-${a.slug}`}
                    to="/articles/$slug"
                    params={{ slug: a.slug }}
                    title={a.title}
                    date={a.createdAt}
                    tags={a.tags}
                    tagLinkTo="/articles"
                    imageUrl={a.firstView}
                    ariaLabel={`記事「${a.title}」を読む`}
                    variant="tall"
                  />
                ))}
              </TechCarousel>
            ) : (
              <>
                <h3 className="flex items-center gap-2 mb-3 text-sm font-medium text-zinc-400 uppercase tracking-wider">
                  <BookOpen className="w-4 h-4 text-amber-400/80" aria-hidden />
                  Article
                </h3>
                <p className="text-zinc-600 text-sm py-4">記事がありません</p>
              </>
            )}
          </section>

          {/* Stream MEMO */}
          <section>
            {scraps.length > 0 ? (
              <TechCarousel
                header={
                  <div className="flex items-center justify-between w-full">
                    <h3 className="flex items-center gap-2 text-sm font-medium text-zinc-400 uppercase tracking-wider">
                      <Radio className="w-4 h-4 text-emerald-400/80" aria-hidden />
                      Stream MEMO
                    </h3>
                    <Link
                      to="/scraps"
                      className="text-xs text-zinc-500 hover:text-cyan-400 transition"
                    >
                      See All
                    </Link>
                  </div>
                }
              >
                {scraps.slice(0, 12).map((s) => {
                  const { displayTitle, tags } = parseScrapTitle(s.title)
                  return (
                    <ContentListRow
                      key={`scrap-${s.slug}`}
                      to="/scraps/$slug"
                      params={{ slug: s.slug }}
                      title={displayTitle || s.title}
                      date={s.created_at}
                      tags={tags}
                      tagLinkTo="/scraps"
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
              </TechCarousel>
            ) : (
              <>
                <h3 className="flex items-center gap-2 mb-3 text-sm font-medium text-zinc-400 uppercase tracking-wider">
                  <Radio className="w-4 h-4 text-emerald-400/80" aria-hidden />
                  Stream MEMO
                </h3>
                <p className="text-zinc-600 text-sm py-4">Stream MEMO がありません</p>
              </>
            )}
          </section>
        </div>
      </div>
      <ContactCTA />
    </div>
  )
}
