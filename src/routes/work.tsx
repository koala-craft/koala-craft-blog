import { Link, Outlet, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/work')({
  component: WorkLayout,
})

function WorkLayout() {
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
        <Link to="/author" className="hover:text-cyan-400 transition">
          Author
        </Link>
        <span aria-hidden>›</span>
        <span className="text-cyan-400 font-medium">Work</span>
      </nav>
      <Outlet />
    </div>
  )
}
