import { createFileRoute, Link } from '@tanstack/react-router'
import { BookOpen, Radio } from 'lucide-react'
import { getTechPageData } from '~/features/pageData/api'

export const Route = createFileRoute('/tech/')({
  component: TechIndex,
  loader: () => getTechPageData({ data: {} }),
})

function TechIndex() {
  const { articles, scraps } = Route.useLoaderData()

  return (
    <div className="max-w-[96rem] mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Tech</h1>
        <p className="text-zinc-500 text-sm mt-2">
          技術的な記事や走り書き、アイデア帳です。
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link
          to="/articles"
          className="flex items-center gap-4 p-6 rounded-xl border border-zinc-800/80 bg-zinc-900/40 transition-colors hover:border-zinc-700/60 hover:bg-zinc-800/50 group"
        >
          <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-cyan-500/15 text-cyan-400 group-hover:bg-cyan-500/25 transition-colors">
            <BookOpen className="w-7 h-7" aria-hidden />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-zinc-100 group-hover:text-cyan-400 transition-colors">
              Article
            </h2>
            <p className="text-sm text-zinc-500 mt-0.5">
              記事 {articles.length}件
            </p>
          </div>
          <span aria-hidden className="ml-auto text-zinc-500 group-hover:text-cyan-400 transition-colors">
            →
          </span>
        </Link>

        <Link
          to="/scraps"
          search={{}}
          className="flex items-center gap-4 p-6 rounded-xl border border-zinc-800/80 bg-zinc-900/40 transition-colors hover:border-zinc-700/60 hover:bg-zinc-800/50 group"
        >
          <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-emerald-500/15 text-emerald-400 group-hover:bg-emerald-500/25 transition-colors">
            <Radio className="w-7 h-7" aria-hidden />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-zinc-100 group-hover:text-emerald-400 transition-colors">
              SREAM MEMO
            </h2>
            <p className="text-sm text-zinc-500 mt-0.5">
              SREAM MEMO {scraps.length}件
            </p>
          </div>
          <span aria-hidden className="ml-auto text-zinc-500 group-hover:text-emerald-400 transition-colors">
            →
          </span>
        </Link>
      </div>
    </div>
  )
}
