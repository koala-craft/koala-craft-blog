import { createRouter, Link } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'
import { DefaultCatchBoundary } from './shared/components/DefaultCatchBoundary'
import { NotFound } from './shared/components/NotFound'

function PendingComponent() {
  return (
    <div className="max-w-[96rem] mx-auto px-4 py-16 flex flex-col items-center gap-4">
      <p className="text-zinc-500">読み込み中...</p>
      <Link
        to="/"
        className="text-sm text-cyan-400 hover:underline"
      >
        トップに戻る
      </Link>
    </div>
  )
}

export function getRouter() {
  const router = createRouter({
    routeTree,
    defaultPreload: 'intent',
    defaultErrorComponent: DefaultCatchBoundary,
    defaultNotFoundComponent: () => <NotFound />,
    defaultPendingComponent: PendingComponent,
    defaultPendingMs: 500,
    scrollRestoration: true,
  })
  return router
}
