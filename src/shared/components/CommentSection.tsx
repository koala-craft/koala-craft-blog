/**
 * 一般ユーザー向けコメント欄
 * Blog / Article / Stream 詳細ページで使用
 */

import { useState, useCallback, useEffect } from 'react'
import { MessageSquare, Send } from 'lucide-react'
import { getComments, createComment, deleteComment } from '~/features/comments/commentsApi'
import { useAuth } from '~/features/admin/useAuth'
import { getSession } from '~/features/admin/auth'
import { MarkdownWithLinkCards } from '~/shared/components/MarkdownWithLinkCards'
import { MarkdownEditorWithPreview } from '~/shared/components/MarkdownEditorWithPreview'
import { ConfirmModal } from '~/shared/components/ConfirmModal'
import type { Comment, ContentType } from '~/features/comments/types'

const PROSE_BASE =
  'prose prose-invert prose-zinc max-w-none prose-a:text-cyan-400 prose-a:no-underline prose-sm'

type CommentSectionProps = {
  contentType: ContentType
  contentSlug: string
  /** スクラップ詳細用: 入力・プレビューのスタイルをフォームに合わせる */
  scrapStyle?: boolean
}

function formatCommentDate(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 60000) return 'たった今'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}時間前`
  return d.toLocaleDateString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric' })
}

function UserAvatar({ name }: { name: string }) {
  const initial = name.trim().slice(0, 1).toUpperCase() || '?'
  return (
    <div
      className="w-8 h-8 rounded-full flex-shrink-0 bg-cyan-600/40 flex items-center justify-center text-sm font-medium text-cyan-300"
      aria-hidden
    >
      {initial}
    </div>
  )
}

export function CommentSection({ contentType, contentSlug, scrapStyle = false }: CommentSectionProps) {
  const { isAdmin } = useAuth()
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [authorName, setAuthorName] = useState('')
  const [body, setBody] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyBody, setReplyBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchComments = useCallback(async () => {
    setLoading(true)
    const list = await getComments({ data: { contentType, contentSlug } })
    setComments(list)
    setLoading(false)
  }, [contentType, contentSlug])

  useEffect(() => {
    fetchComments()
  }, [fetchComments])

  const handleSubmit = async (e: React.FormEvent, parentId?: string) => {
    e.preventDefault()
    setError(null)
    const name = authorName.trim()
    const text = (parentId ? replyBody : body).trim()
    if (!name || !text) {
      setError('名前と本文を入力してください')
      return
    }

    setSubmitting(true)
    const result = await createComment({
      data: {
        contentType,
        contentSlug,
        body: text,
        authorName: name,
        parentId,
      },
    })
    setSubmitting(false)

    if (result.success) {
      setBody('')
      setReplyBody('')
      setReplyingTo(null)
      await fetchComments()
    } else {
      setError(result.error ?? '投稿に失敗しました')
    }
  }

  const handleDelete = async (commentId: string) => {
    const session = await getSession()
    if (!session || !isAdmin) return

    setDeleting(true)
    const result = await deleteComment({
      data: {
        accessToken: session.session.access_token,
        commentId,
      },
    })
    setDeleting(false)
    if (result.success) {
      setDeletingCommentId(null)
      await fetchComments()
    } else {
      setError(result.error ?? '削除に失敗しました')
    }
  }

  return (
    <section className="mt-16 pt-8 border-t border-zinc-800" aria-label="コメント">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-200 mb-6">
        <MessageSquare className="w-5 h-5 text-cyan-400/80" aria-hidden />
        コメント ({comments.length})
      </h2>

      <form
        onSubmit={(e) => handleSubmit(e)}
        className="mb-8 rounded-xl border border-zinc-700/80 bg-zinc-900/40 p-6 shadow-inner shadow-zinc-950/30"
      >
        <div className="space-y-5">
          <div>
            <label htmlFor="comment-author" className="block text-sm text-zinc-500 mb-1.5">
              名前
            </label>
            <input
              id="comment-author"
              type="text"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="表示名を入力"
              maxLength={100}
              className="w-full max-w-sm px-0 py-2.5 bg-transparent border-0 border-b border-zinc-600 text-zinc-100 text-sm placeholder-zinc-600 focus:outline-none focus:border-cyan-500/70 focus:placeholder-zinc-500 transition-colors"
            />
          </div>
          <div>
            <label htmlFor="comment-body" className="block text-sm text-zinc-500 mb-1.5">
              コメント
            </label>
            <MarkdownEditorWithPreview
              id="comment-body"
              value={body}
              onChange={setBody}
              placeholder="Markdown が使えます"
              rows={scrapStyle ? 12 : 4}
              maxLength={5000}
              compact
              scrapStyle={scrapStyle}
              resizable={scrapStyle}
              showCharCount
            />
          </div>
        </div>
        <div className="mt-6 flex items-center gap-3">
          <button
            type="submit"
            disabled={submitting || !authorName.trim() || !body.trim()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:bg-zinc-700 disabled:text-zinc-500 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
          >
            <Send className="w-4 h-4" />
            {submitting ? '送信中...' : '送信'}
          </button>
        </div>
      </form>

      {error && <p className="text-sm text-amber-400 mb-4">{error}</p>}

      <ConfirmModal
        isOpen={deletingCommentId !== null}
        title="このコメントを削除しますか？"
        description="削除すると元に戻せません。"
        confirmLabel="削除する"
        cancelLabel="キャンセル"
        variant="danger"
        loading={deleting}
        onConfirm={() => deletingCommentId && handleDelete(deletingCommentId)}
        onCancel={() => setDeletingCommentId(null)}
      />

      {loading ? (
        <p className="text-zinc-500 text-sm">読み込み中...</p>
      ) : comments.length === 0 ? (
        <p className="text-zinc-500 text-sm">まだコメントはありません。最初のコメントを書いてみませんか？</p>
      ) : (
        <div className="space-y-4">
          {comments.map((c) => (
            <CommentItem
              key={c.id}
              comment={c}
              depth={0}
              isAdmin={isAdmin}
              scrapStyle={scrapStyle}
              replyingTo={replyingTo}
              replyBody={replyBody}
              setReplyingTo={setReplyingTo}
              setReplyBody={setReplyBody}
              onReplySubmit={(parentId, text) =>
                createComment({
                  data: {
                    contentType,
                    contentSlug,
                    body: text,
                    authorName: authorName.trim() || 'ゲスト',
                    parentId,
                  },
                }).then((r) => {
                  if (r.success) {
                    setReplyBody('')
                    setReplyingTo(null)
                    fetchComments()
                  } else {
                    setError(r.error ?? '投稿に失敗しました')
                  }
                })
              }
              onDelete={(id) => setDeletingCommentId(id)}
              onRefresh={fetchComments}
            />
          ))}
        </div>
      )}
    </section>
  )
}

type CommentItemProps = {
  comment: Comment
  depth: number
  isAdmin: boolean
  scrapStyle?: boolean
  replyingTo: string | null
  replyBody: string
  setReplyingTo: (id: string | null) => void
  setReplyBody: (body: string) => void
  onReplySubmit: (parentId: string, body: string) => Promise<void>
  onDelete: (id: string) => void
  onRefresh: () => Promise<void>
}

function CommentItem({
  comment,
  depth,
  isAdmin,
  scrapStyle,
  replyingTo,
  replyBody,
  setReplyingTo,
  setReplyBody,
  onReplySubmit,
  onDelete,
}: CommentItemProps) {
  const [submitting, setSubmitting] = useState(false)
  const isReplying = replyingTo === comment.id

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const text = replyBody.trim()
    if (!text) return
    setSubmitting(true)
    await onReplySubmit(comment.id, text)
    setSubmitting(false)
  }

  return (
    <div className={depth > 0 ? 'ml-6 pl-4 border-l-2 border-zinc-800' : ''}>
      <div className="rounded-lg p-4 bg-zinc-900/40 border border-zinc-800/80">
        <div className="flex items-center gap-3 mb-2">
          <UserAvatar name={comment.author_name} />
          <div className="flex-1 min-w-0">
            <span className="font-medium text-zinc-300">{comment.author_name}</span>
            <time dateTime={comment.created_at} className="ml-2 text-xs text-zinc-500">
              {formatCommentDate(comment.created_at)}
            </time>
          </div>
          {isAdmin && (
            <button
              type="button"
              onClick={() => onDelete(comment.id)}
              className="text-xs text-red-500/80 hover:text-red-400"
            >
              削除
            </button>
          )}
        </div>
        <div className={`${PROSE_BASE} text-zinc-300`}>
          <MarkdownWithLinkCards content={comment.body} proseClass={PROSE_BASE} useNativeBr />
        </div>
        {!isReplying ? (
          <button
            type="button"
            onClick={() => setReplyingTo(comment.id)}
            className="mt-2 text-xs text-zinc-500 hover:text-cyan-400"
          >
            返信
          </button>
        ) : (
          <form onSubmit={handleReplySubmit} className="mt-3 space-y-2 rounded-lg border border-zinc-700/80 bg-zinc-900/30 p-3">
            <MarkdownEditorWithPreview
              value={replyBody}
              onChange={setReplyBody}
              placeholder="返信を書く..."
              rows={scrapStyle ? 9 : 3}
              maxLength={5000}
              compact
              scrapStyle={scrapStyle}
              resizable={scrapStyle}
            />
            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={submitting || !replyBody.trim()}
                className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white text-sm transition-colors"
              >
                {submitting ? '送信中...' : '送信'}
              </button>
              <button
                type="button"
                onClick={() => { setReplyingTo(null); setReplyBody('') }}
                className="px-3 py-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-300 text-sm transition-colors"
              >
                キャンセル
              </button>
            </div>
          </form>
        )}
      </div>
      {comment.children?.length ? (
        <div className="mt-4 space-y-4">
          {comment.children.map((c) => (
            <CommentItem
              key={c.id}
              comment={c}
              depth={depth + 1}
              isAdmin={isAdmin}
              scrapStyle={scrapStyle}
              replyingTo={replyingTo}
              replyBody={replyBody}
              setReplyingTo={setReplyingTo}
              setReplyBody={setReplyBody}
              onReplySubmit={onReplySubmit}
              onDelete={onDelete}
              onRefresh={async () => {}}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}
