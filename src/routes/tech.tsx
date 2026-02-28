import { Link, Outlet, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/tech')({
  component: TechLayout,
})

function TechLayout() {
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
        <Link to="/tech" className="text-cyan-400 font-medium">
          Tech
        </Link>
      </nav>
      <Outlet />
    </div>
  )
}
