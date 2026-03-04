import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState, useCallback } from 'react'
import { MessageSquare } from 'lucide-react'
import { getRecentComments } from '~/features/comments/commentsApi'
import type { Comment } from '~/features/comments/types'
import { getSession } from '~/features/admin/auth'

export const Route = createFileRoute('/admin/comments')({
  component: AdminComments,
})

function formatRelativeTime(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 60000) return 'たった今'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}時間前`
  return d.toLocaleString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function contentLabel(c: Comment): { label: string; adminTo: string; publicTo: string } {
  if (c.content_type === 'blog') {
    return {
      label: `Blog / ${c.content_slug}`,
      adminTo: `/admin/blog/${c.content_slug}`,
      publicTo: `/blog/${c.content_slug}`,
    }
  }
  if (c.content_type === 'article') {
    return {
      label: `Article / ${c.content_slug}`,
      adminTo: `/admin/articles/${c.content_slug}`,
      publicTo: `/articles/${c.content_slug}`,
    }
  }
  return {
    label: `Stream / ${c.content_slug}`,
    adminTo: `/admin/scraps/${c.content_slug}`,
    publicTo: `/scraps/${c.content_slug}`,
  }
}

function AdminComments() {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastFetchedAt, setLastFetchedAt] = useState<Date | null>(null)

  const fetchComments = useCallback(async () => {
    try {
      const session = await getSession()
      if (!session) {
        setError('ログインが必要です')
        setLoading(false)
        return
      }
      setError(null)
      setLoading(true)
      const list = await getRecentComments({
        data: { accessToken: session.session.access_token, limit: 50 },
      })
      // 念のため時刻順を保証（新しい順）
      const sorted = [...list].sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      setComments(sorted)
      setLastFetchedAt(new Date())
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(msg || 'コメントの取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchComments()
    const id = window.setInterval(fetchComments, 60000)
    return () => window.clearInterval(id)
  }, [fetchComments])

  const now = Date.now()

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-cyan-400" />
          <h1 className="text-2xl font-bold text-zinc-100">新着コメント</h1>
        </div>
        <button
          type="button"
          onClick={() => fetchComments()}
          className="px-3 py-1.5 text-sm rounded-lg border border-zinc-700 text-zinc-300 hover:border-cyan-500/60 hover:text-cyan-400 transition-colors"
        >
          再読み込み
        </button>
      </div>

      <p className="text-sm text-zinc-500 mb-4">
        Blog / Article / Stream 全体の最新コメントを 50 件まで表示します（60 秒ごとに自動更新）。
      </p>

      {error && (
        <p className="mb-4 text-sm text-amber-400">
          {error}
        </p>
      )}

      {loading && comments.length === 0 ? (
        <p className="text-sm text-zinc-500">読み込み中...</p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-zinc-500">まだコメントはありません。</p>
      ) : (
        <ul className="space-y-3">
          {comments.map((c) => {
            const meta = contentLabel(c)
            const created = new Date(c.created_at).getTime()
            const isNew = now - created < 5 * 60 * 1000 // 5分以内
            return (
              <li
                key={c.id}
                className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-4 py-3 flex flex-col gap-1"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <span
                      className={
                        c.content_type === 'blog'
                          ? 'px-2 py-0.5 rounded-full bg-cyan-900/40 text-cyan-300'
                          : c.content_type === 'article'
                            ? 'px-2 py-0.5 rounded-full bg-violet-900/40 text-violet-300'
                            : 'px-2 py-0.5 rounded-full bg-amber-900/40 text-amber-300'
                      }
                    >
                      {c.content_type.toUpperCase()}
                    </span>
                    <span>{meta.label}</span>
                    <span>· {formatRelativeTime(c.created_at)}</span>
                  </div>
                  {isNew && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                      NEW
                    </span>
                  )}
                </div>
                <div className="text-sm text-zinc-300">
                  <span className="font-medium mr-2">{c.author_name}</span>
                  <span className="text-zinc-500 text-xs">
                    ({c.author_email || 'メールなし'})
                  </span>
                </div>
                <p className="text-sm text-zinc-200 mt-1 line-clamp-3 whitespace-pre-wrap">
                  {c.body}
                </p>
                <div className="mt-2 flex gap-2 text-xs">
                  <Link
                    to={meta.publicTo}
                    className="px-2 py-1 rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100 transition-colors"
                    target="_blank"
                  >
                    公開ページを見る
                  </Link>
                  <Link
                    to={meta.adminTo}
                    className="px-2 py-1 rounded border border-zinc-700 text-zinc-300 hover:border-cyan-500/60 hover:text-cyan-400 transition-colors"
                  >
                    管理画面で開く
                  </Link>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {lastFetchedAt && (
        <p className="mt-4 text-xs text-zinc-600">
          最終更新: {lastFetchedAt.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </p>
      )}
    </div>
  )
}

