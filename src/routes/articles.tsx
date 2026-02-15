import { Link, Outlet, createFileRoute, useMatchRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/articles')({
  component: ArticlesLayout,
})

function ArticlesLayout() {
  const matchRoute = useMatchRoute()
  const isDetail = !!matchRoute({ to: '/articles/$slug', fuzzy: true })

  return (
    <div className="min-h-[calc(100vh-4rem)] pt-8">
      <nav
        className="max-w-[96rem] mx-auto px-4 flex items-center gap-2 text-sm text-zinc-400 mb-6"
        aria-label="パンくず"
      >
        <Link to="/" className="hover:text-cyan-400 transition">
          トップ
        </Link>
        <span aria-hidden>›</span>
        <Link
          to="/articles"
          className={isDetail ? 'hover:text-cyan-400 transition' : 'text-cyan-400 font-medium'}
        >
          記事
        </Link>
      </nav>
      <Outlet />
    </div>
  )
}
