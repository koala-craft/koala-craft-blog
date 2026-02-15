import { Link, Outlet, createFileRoute, useLocation } from '@tanstack/react-router'
import { useAuth } from '~/features/admin/useAuth'
import { AuthDebugInfo } from '~/features/admin/AuthDebugInfo'
import { ForbiddenMessage } from '~/features/admin/ForbiddenMessage'
import { LoginForm, LoginFormPlaceholder } from '~/features/admin/LoginForm'

export const Route = createFileRoute('/admin')({
  component: AdminLayout,
  pendingComponent: AdminLoginPending,
  pendingMs: 0, // 即座にログイン画面を表示（読み込み中...を出さない）
  ssr: false, // useAuth は sessionStorage 等のブラウザ API に依存
})

/** ルート読み込み中も「管理画面にログイン」を即表示。読み込み中...を出さない */
function AdminLoginPending() {
  return (
    <div className="max-w-[96rem] mx-auto px-4 py-8">
      <nav className="mb-8">
        <Link to="/" className="text-zinc-500 hover:underline">
          ← サイトに戻る
        </Link>
      </nav>
      <LoginFormPlaceholder loading />
    </div>
  )
}

function AdminLayout() {
  const { user, isAdmin, loading, signIn, signOut } = useAuth()
  const { pathname } = useLocation()

  if (!user) {
    return (
      <div className="max-w-[96rem] mx-auto px-4 py-8">
        <nav className="mb-8">
          <Link to="/" className="text-zinc-500 hover:underline">
            ← サイトに戻る
          </Link>
        </nav>
        <LoginForm onSignIn={signIn} loading={loading} />
      </div>
    )
  }

  if (loading) {
    return (
      <div className="max-w-[96rem] mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
          <div className="h-8 w-8 rounded-full border-2 border-zinc-600 border-t-cyan-500 animate-spin" />
          <p className="text-zinc-500 text-sm">認証を確認しています。少々お待ちください。</p>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="max-w-[96rem] mx-auto px-4 py-8">
        <nav className="mb-8">
          <Link to="/" className="text-zinc-500 hover:underline">
            ← サイトに戻る
          </Link>
        </nav>
        <ForbiddenMessage onSignOut={signOut} />
      </div>
    )
  }

  const displayName =
    user.user_metadata?.user_name ??
    user.user_metadata?.full_name ??
    user.email ??
    '管理者'

  const isBlogEditor = /^\/admin\/blog\/(new|[^/]+)$/.test(pathname)
  const isWorkEditor = /^\/admin\/works\/(new|[^/]+)$/.test(pathname)
  const isEditor = isBlogEditor || isWorkEditor

  return (
    <div
      className={
        isEditor
          ? 'w-full max-w-[96rem] mx-auto px-4 py-4'
          : 'max-w-[96rem] mx-auto px-4 py-8'
      }
    >
      <nav className={`flex gap-4 items-center flex-wrap ${isEditor ? 'mb-4' : 'mb-8'}`}>
        <Link to="/admin" className="text-cyan-400 hover:underline">
          ダッシュボード
        </Link>
        <Link to="/admin/blog" className="text-cyan-400 hover:underline">
          ブログ
        </Link>
        <Link to="/admin/settings" className="text-cyan-400 hover:underline">
          サイト設定
        </Link>
        <Link to="/admin/works" className="text-cyan-400 hover:underline">
          Work
        </Link>
        <Link to="/" className="text-zinc-500 hover:underline ml-auto">
          サイトに戻る
        </Link>
        <span className="text-zinc-500 text-sm">{displayName}</span>
        <button
          type="button"
          onClick={signOut}
          className="text-zinc-500 hover:text-zinc-300 text-sm"
        >
          ログアウト
        </button>
      </nav>
      <Outlet />
      <AuthDebugInfo className={isEditor ? 'fixed bottom-4 right-4 z-10 max-w-xs' : 'mt-6'} />
    </div>
  )
}
