import { createFileRoute, Link } from '@tanstack/react-router'
import { Sparkles, BookOpen, FileText, HelpCircle } from 'lucide-react'

export const Route = createFileRoute('/about')({
  component: AboutPage,
})

function AboutPage() {
  return (
    <div className="max-w-[96rem] mx-auto px-4 py-12 sm:py-16">
      {/* ヒーロー */}
      <div className="text-center mb-16">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 text-cyan-400 text-sm font-medium mb-6 border border-cyan-500/20">
          <Sparkles className="w-4 h-4" aria-hidden />
          Welcome!
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold mb-4 bg-gradient-to-r from-zinc-100 via-cyan-100 to-zinc-100 bg-clip-text text-transparent">
          About this site.
        </h1>
        <p className="text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed">
          ここは、私の<span className="text-cyan-400 font-medium">学び</span>と
          <span className="text-cyan-400 font-medium">発見</span>を溜めていくブログサイトです。
          <br />
          気楽に、でも誠実に、積み上げていきます。
        </p>
      </div>

      {/* メインコンテンツ */}
      <div className="max-w-3xl mx-auto space-y-12">
        <section>
          <h2 className="text-2xl font-semibold text-zinc-100 mb-8 flex items-center gap-2">
            <span className="w-1 h-6 bg-cyan-500 rounded-full" />
            このサイトでできること
          </h2>

          {/* Bento グリッド */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Link
              to="/blog"
              className="group relative overflow-hidden rounded-2xl border border-zinc-700/60 bg-gradient-to-b from-zinc-800/80 to-zinc-900/80 p-6 transition-all duration-300 hover:border-cyan-500/40 hover:shadow-[0_0_30px_-10px_rgba(34,211,238,0.3)]"
            >
              <div className="absolute -right-4 -top-4 text-cyan-500/5 transition-transform duration-300 group-hover:scale-110">
                <BookOpen className="h-24 w-24" strokeWidth={1} />
              </div>
              <BookOpen className="mb-4 h-8 w-8 text-cyan-400" strokeWidth={1.5} />
              <h3 className="mb-2 text-lg font-semibold text-zinc-100 group-hover:text-cyan-300 transition-colors">
                Blog
              </h3>
              <p className="text-sm text-zinc-500 leading-relaxed">
                日記、メモ、思いつき… なんでもあり。そのとき感じたことをそのまま残す場所。
              </p>
              <span className="mt-4 inline-block text-sm font-medium text-cyan-400 opacity-0 -translate-y-1 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0">
                見る →
              </span>
            </Link>

            <Link
              to="/tech"
              className="group relative overflow-hidden rounded-2xl border border-zinc-700/60 bg-gradient-to-b from-zinc-800/80 to-zinc-900/80 p-6 transition-all duration-300 hover:border-cyan-500/40 hover:shadow-[0_0_30px_-10px_rgba(34,211,238,0.3)]"
            >
              <div className="absolute -right-4 -top-4 text-cyan-500/5 transition-transform duration-300 group-hover:scale-110">
                <FileText className="h-24 w-24" strokeWidth={1} />
              </div>
              <FileText className="mb-4 h-8 w-8 text-cyan-400" strokeWidth={1.5} />
              <h3 className="mb-2 text-lg font-semibold text-zinc-100 group-hover:text-cyan-300 transition-colors">
                Tech
              </h3>
              <p className="text-sm text-zinc-500 leading-relaxed">
                記事とスクラップ。Zenn 連携の技術コンテンツ。解説から調査メモまで。
              </p>
              <span className="mt-4 inline-block text-sm font-medium text-cyan-400 opacity-0 -translate-y-1 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0">
                探す →
              </span>
            </Link>

            <div className="relative overflow-hidden rounded-2xl border border-zinc-700/60 bg-gradient-to-b from-zinc-800/80 to-zinc-900/80 p-6">
              <div className="absolute -right-4 -top-4 text-cyan-500/5">
                <HelpCircle className="h-24 w-24" strokeWidth={1} />
              </div>
              <HelpCircle className="mb-4 h-8 w-8 text-zinc-500" strokeWidth={1.5} />
              <h3 className="mb-2 text-lg font-semibold text-zinc-100">
                ?
              </h3>
              <p className="text-sm text-zinc-500 leading-relaxed">
                ？？？
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
