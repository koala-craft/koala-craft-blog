import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/about')({
  component: AboutPage,
})

function AboutPage() {
  return (
    <div className="max-w-[96rem] mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">About this site.</h1>
      <div className="prose prose-invert prose-zinc max-w-none space-y-6">
        <p className="text-lg text-zinc-300 leading-relaxed">
          Obsidian Log は、学習の記録と技術ナレッジを残すためのサイトです。<br />
          日々の気づきや試したこと、調べたことをメモとして蓄積し、
          後から振り返れるようにしています。
        </p>

        <h2 className="text-xl font-semibold text-zinc-100 mt-10 mb-4">
          このサイトについて
        </h2>
        <p className="text-zinc-400 leading-relaxed">
          <strong className="text-zinc-200">blog</strong> では、日記やメモ、思いつきなど
          気軽に書ける内容を投稿しています。技術に限らず、日々の出来事や考えたことを
          そのまま残す場所です。
        </p>
        <p className="text-zinc-400 leading-relaxed">
          <strong className="text-zinc-200">Articles</strong> と <strong className="text-zinc-200">Scraps</strong> は
          Zenn と連携した技術系コンテンツです。記事はまとまった技術解説、
          スクラップはメモや調査の断片を置いています。
        </p>

        <h2 className="text-xl font-semibold text-zinc-100 mt-10 mb-4">
          コンテンツ一覧
        </h2>
        <ul className="space-y-2 text-zinc-400">
          <li>
            <Link to="/blog" className="text-cyan-400 hover:underline">
              blog
            </Link>
            <span className="text-zinc-600 ml-2">— 日記・メモ</span>
          </li>
          <li>
            <Link to="/articles" className="text-cyan-400 hover:underline">
              Articles
            </Link>
            <span className="text-zinc-600 ml-2">— 技術記事</span>
          </li>
          <li>
            <Link to="/scraps" className="text-cyan-400 hover:underline">
              Scraps
            </Link>
            <span className="text-zinc-600 ml-2">— 技術メモ・スクラップ</span>
          </li>
        </ul>
      </div>
    </div>
  )
}
