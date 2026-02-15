/**
 * 開発時のみ表示。セッション有効期限と自動リフレッシュの確認用。
 * 管理画面に配置して、トークン有効期限とリフレッシュ状況を確認できる。
 */
import { useEffect, useState } from 'react'
import { getSupabase } from '~/shared/lib/supabase'

export function AuthDebugInfo({ className = '' }: { className?: string }) {
  const [sessionInfo, setSessionInfo] = useState<{
    expiresAt: string | null
    lastRefreshAt: string | null
  } | null>(null)

  useEffect(() => {
    if (!import.meta.env.DEV) return

    const supabase = getSupabase()
    if (!supabase) return

    const updateSessionInfo = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setSessionInfo(null)
        return
      }
      setSessionInfo({
        expiresAt: session.expires_at
          ? new Date(session.expires_at * 1000).toLocaleString()
          : null,
        lastRefreshAt: null, // TOKEN_REFRESHED で更新する場合は別途 state が必要
      })
    }

    updateSessionInfo()
    const interval = setInterval(updateSessionInfo, 30_000)

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'TOKEN_REFRESHED' && session) {
          setSessionInfo({
            expiresAt: session.expires_at
              ? new Date(session.expires_at * 1000).toLocaleString()
              : null,
            lastRefreshAt: new Date().toLocaleString(),
          })
        } else if (event === 'SIGNED_IN' && session) {
          setSessionInfo({
            expiresAt: session.expires_at
              ? new Date(session.expires_at * 1000).toLocaleString()
              : null,
            lastRefreshAt: null,
          })
        } else if (event === 'SIGNED_OUT') {
          setSessionInfo(null)
        }
      }
    )

    return () => {
      clearInterval(interval)
      subscription.unsubscribe()
    }
  }, [])

  if (!import.meta.env.DEV || !sessionInfo) return null

  return (
    <div
      className={`p-4 rounded-lg bg-zinc-800/50 border border-zinc-700 text-xs text-zinc-400 space-y-1 ${className}`}
    >
      <p className="font-medium text-zinc-300">[開発] 認証デバッグ</p>
      <p>トークン有効期限: {sessionInfo.expiresAt ?? '—'}</p>
      {sessionInfo.lastRefreshAt && (
        <p className="text-cyan-400">最終リフレッシュ: {sessionInfo.lastRefreshAt}</p>
      )}
      <p className="text-zinc-500 mt-1">
        自動リフレッシュは有効期限の約1時間前に実行されます。コンソールに「[Auth] トークン自動リフレッシュ完了」が表示されれば動作しています。
      </p>
    </div>
  )
}
