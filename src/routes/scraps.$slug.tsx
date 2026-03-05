import { useState, useCallback, useRef } from 'react'
import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { ImagePlus, Lock, LockOpen } from 'lucide-react'
import { getScrap } from '~/features/scraps/api'
import { updateScrap, setScrapClosed } from '~/features/scraps/scrapsAdminApi'
import { saveBlogImageToTemp } from '~/features/blog/blogAdminApi'
import { getBlogImageSrc } from '~/shared/lib/blogImageUrl'
import { MarkdownWithLinkCards } from '~/shared/components/MarkdownWithLinkCards'
import { MarkdownEditorWithPreview } from '~/shared/components/MarkdownEditorWithPreview'
import { ArticleAuthorFooter } from '~/shared/components/ArticleAuthorFooter'
import { CommentSection } from '~/shared/components/CommentSection'
import { parseScrapTitle } from '~/features/scraps/parseScrapTitle'
import {
  addCommentAtPath,
  updateCommentAtPath,
  deleteCommentAtPath,
} from '~/features/scraps/scrapCommentUtils'
import { ScrapTLComposer } from '~/features/scraps/ScrapTLComposer'
import type { ScrapComment } from '~/features/scraps/types'
import { useSiteAuthor } from '~/shared/hooks/useSiteAuthor'
import { useSiteAuthorIcon } from '~/shared/hooks/useSiteAuthorIcon'
import { useAuth } from '~/features/admin/useAuth'
import { getSession } from '~/features/admin/auth'

const IMAGE_EXTS: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
}

function toValidImageFilename(original: string | undefined, mimeType: string): string {
  const ext = IMAGE_EXTS[mimeType] ?? 'png'
  if (!original?.trim()) return `firstview-${Date.now()}.${ext}`
  const baseName = original.split(/[/\\]/).pop() ?? original
  const match = baseName.match(/^(.+?)\.([^.]+)$/)
  const extFromName = match && /^png|jpg|jpeg|gif|webp$/i.test(match[2]) ? match[2].toLowerCase() : ext
  const base = match ? match[1] : baseName
  const candidate = `${base}.${extFromName}`
  if (/^[^/\\]+\.(png|jpg|jpeg|gif|webp)$/.test(candidate)) return candidate
  return `firstview-${Date.now()}.${ext}`
}

export const Route = createFileRoute('/scraps/$slug')({
  component: ScrapDetail,
  loader: async ({ params }) => {
    const scrap = await getScrap({ data: { slug: params.slug } })
    if (!scrap) throw notFound()
    return { scrap }
  },
})

function countComments(comments: ScrapComment[]): number {
  return comments.reduce(
    (acc, c) => acc + 1 + (c.children?.length ? countComments(c.children) : 0),
    0
  )
}

function ScrapDetail() {
  const { scrap: initialScrap } = Route.useLoaderData()
  const authorName = useSiteAuthor()
  const authorIcon = useSiteAuthorIcon()
  const { isAdmin } = useAuth()
  const { displayTitle, tags } = parseScrapTitle(initialScrap.title)
  const totalComments = countComments(initialScrap.comments)

  const [scrap, setScrap] = useState(initialScrap)
  const [replyingTo, setReplyingTo] = useState<number[] | null>(null)
  const [editingPath, setEditingPath] = useState<number[] | null>(null)
  const [editingBody, setEditingBody] = useState('')
  const [saving, setSaving] = useState(false)
  const [closing, setClosing] = useState(false)
  const [showCloseModal, setShowCloseModal] = useState(false)
  const [closeReasonInput, setCloseReasonInput] = useState('')
  const [error, setError] = useState<string | null>(null)

  const persistScrap = useCallback(
    async (nextComments: ScrapComment[]) => {
      const session = await getSession()
      if (!session) {
        setError('ログインが必要です')
        return
      }

      setSaving(true)
      setError(null)
      const result = await updateScrap({
        data: {
          accessToken: session.session.access_token,
          providerToken: session.session.provider_token ?? undefined,
          slug: scrap.slug,
          title: displayTitle || scrap.title,
          tags,
          firstView: scrap.firstView,
          comments: nextComments,
        },
      })
      setSaving(false)

      if (result.success) {
        setScrap((prev) => ({ ...prev, comments: nextComments }))
        setReplyingTo(null)
        setEditingPath(null)
      } else {
        setError(result.error ?? '保存に失敗しました')
      }
    },
    [scrap.slug, scrap.title, scrap.firstView, displayTitle, tags]
  )

  const handleAddPost = useCallback(
    async (body: string) => {
      const session = await getSession()
      const author =
        session?.user.user_metadata?.user_name ??
        session?.user.user_metadata?.full_name ??
        'author'
      const now = new Date().toISOString().slice(0, 10)
      const newComment: ScrapComment = {
        author,
        created_at: now,
        body_markdown: body,
        body_updated_at: now,
        children: [],
      }
      const nextComments = addCommentAtPath(scrap.comments, [], newComment)
      await persistScrap(nextComments)
    },
    [scrap.comments, persistScrap]
  )

  const handleReply = useCallback(
    async (path: number[], body: string) => {
      const session = await getSession()
      const author =
        session?.user.user_metadata?.user_name ??
        session?.user.user_metadata?.full_name ??
        'author'
      const now = new Date().toISOString().slice(0, 10)
      const newComment: ScrapComment = {
        author,
        created_at: now,
        body_markdown: body,
        body_updated_at: now,
        children: [],
      }
      const nextComments = addCommentAtPath(scrap.comments, path, newComment)
      await persistScrap(nextComments)
    },
    [scrap.comments, persistScrap]
  )

  const handleEdit = useCallback(
    async (path: number[], newBody: string) => {
      const now = new Date().toISOString().slice(0, 10)
      const nextComments = updateCommentAtPath(scrap.comments, path, (c) => ({
        ...c,
        body_markdown: newBody,
        body_updated_at: now,
      }))
      await persistScrap(nextComments)
    },
    [scrap.comments, persistScrap]
  )

  const handleDelete = useCallback(
    async (path: number[]) => {
      const nextComments = deleteCommentAtPath(scrap.comments, path)
      await persistScrap(nextComments)
    },
    [scrap.comments, persistScrap]
  )

  const [firstViewUploading, setFirstViewUploading] = useState(false)
  const [firstViewSaving, setFirstViewSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const persistFirstView = useCallback(
    async (newFirstView: string | undefined) => {
      const session = await getSession()
      if (!session) {
        setError('ログインが必要です')
        return
      }

      setFirstViewSaving(true)
      setError(null)
      // 削除時は undefined だと API でキーが省略され既存値が維持されるため、空文字を明示的に送る
      const result = await updateScrap({
        data: {
          accessToken: session.session.access_token,
          providerToken: session.session.provider_token ?? undefined,
          slug: scrap.slug,
          title: displayTitle || scrap.title,
          tags,
          firstView: newFirstView ?? '',
          comments: scrap.comments,
        },
      })
      setFirstViewSaving(false)

      if (result.success) {
        setScrap((prev) => ({ ...prev, firstView: newFirstView || undefined }))
      } else {
        setError(result.error ?? '画像の保存に失敗しました')
      }
    },
    [scrap.slug, scrap.title, scrap.comments, displayTitle, tags]
  )

  const uploadFirstViewImage = useCallback(
    async (blob: Blob, mimeType: string, originalName?: string) => {
      setFirstViewUploading(true)
      setError(null)
      const filename = toValidImageFilename(originalName, mimeType)
      const reader = new FileReader()
      reader.onload = async () => {
        const dataUrl = reader.result as string
        if (!dataUrl.startsWith('data:')) {
          setFirstViewUploading(false)
          return
        }
        const base64 = dataUrl.split(',')[1]
        if (!base64) {
          setFirstViewUploading(false)
          return
        }
        const result = await saveBlogImageToTemp({ data: { filename, contentBase64: base64 } })
        setFirstViewUploading(false)
        if (result.success) {
          await persistFirstView(result.tempUrl)
        } else {
          setError(result.error ?? '画像の仮保存に失敗しました')
        }
      }
      reader.readAsDataURL(blob)
    },
    [persistFirstView]
  )

  const handleFirstViewFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file?.type.startsWith('image/')) return
      uploadFirstViewImage(file, file.type, file.name)
      e.target.value = ''
    },
    [uploadFirstViewImage]
  )

  const handleFirstViewDragOver = useCallback((e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('Files')) {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'copy'
    }
  }, [])

  const handleFirstViewDrop = useCallback(
    async (e: React.DragEvent) => {
      const files = e.dataTransfer?.files
      if (!files?.length) return
      const file = Array.from(files).find((f) => f.type.startsWith('image/'))
      if (!file) return
      e.preventDefault()
      await uploadFirstViewImage(file, file.type, file.name)
    },
    [uploadFirstViewImage]
  )

  const handleDeleteFirstView = useCallback(async () => {
    await persistFirstView(undefined)
  }, [persistFirstView])

  const handleSetClosed = useCallback(
    async (closed: boolean, closed_reason?: string) => {
      const session = await getSession()
      if (!session) {
        setError('ログインが必要です')
        return
      }
      setClosing(true)
      setError(null)
      const result = await setScrapClosed({
        data: {
          accessToken: session.session.access_token,
          providerToken: session.session.provider_token ?? undefined,
          slug: scrap.slug,
          closed,
          closed_reason,
        },
      })
      setClosing(false)
      setShowCloseModal(false)
      setCloseReasonInput('')
      if (result.success) {
        setScrap((prev) => ({ ...prev, closed, closed_reason: closed ? closed_reason : undefined }))
      } else {
        setError(result.error ?? '更新に失敗しました')
      }
    },
    [scrap.slug]
  )

  return (
    <div className="max-w-[96rem] mx-auto">
      <article className="pb-60 sm:px-6">
        {/* ファーストビュー: firstView あり → 画像、なし → タイトル＋グラデーション */}
        {scrap.firstView ? (
          <div className="relative w-full aspect-[21/9] min-h-[200px] overflow-hidden">
            <img
              src={getBlogImageSrc(scrap.firstView)}
              alt=""
              fetchPriority="high"
              decoding="async"
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-transparent to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 px-4 py-6 sm:px-6">
              <h1 className="text-2xl sm:text-3xl font-bold text-zinc-100 leading-tight tracking-tight drop-shadow-lg">
                {displayTitle || scrap.title}
              </h1>
            </div>
          </div>
        ) : (
          <div className="relative w-full min-h-[200px] flex items-center justify-center px-4 py-16 bg-gradient-to-br from-cyan-900/40 via-zinc-900/60 to-violet-900/40">
            <h1 className="text-2xl sm:text-3xl font-bold text-zinc-100 leading-tight tracking-tight text-center">
              {displayTitle || scrap.title}
            </h1>
          </div>
        )}

        {scrap.closed && (
          <div className="max-w-[100ch] mx-auto px-4 py-4">
            <div className="rounded-lg border border-amber-800/60 bg-amber-900/20 px-4 py-3 flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5 text-amber-400 font-medium">
                <Lock className="w-4 h-4" aria-hidden />
                クローズ済み
              </span>
              {scrap.closed_reason && (
                <span className="text-amber-200/90 text-sm">{scrap.closed_reason}</span>
              )}
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => handleSetClosed(false)}
                  disabled={closing}
                  className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 text-zinc-200 text-sm transition"
                >
                  <LockOpen className="w-3.5 h-3.5" />
                  {closing ? '処理中...' : 'オープンにする'}
                </button>
              )}
            </div>
          </div>
        )}

        {isAdmin && !scrap.closed && (
          <div className="max-w-[100ch] mx-auto px-4 pt-2">
            <button
              type="button"
              onClick={() => setShowCloseModal(true)}
              disabled={closing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-700 bg-zinc-800/50 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-300 text-sm transition"
            >
              <Lock className="w-3.5 h-3.5" />
              クローズする
            </button>
          </div>
        )}

        {isAdmin && (
          <div className="max-w-[100ch] mx-auto px-4 pt-4">
            <details className="rounded-lg border border-zinc-800 bg-zinc-900/40">
              <summary className="px-4 py-3 cursor-pointer text-sm font-medium text-zinc-400 hover:text-zinc-300">
                ヘッダー画像を編集
              </summary>
              <div className="px-4 pb-4 pt-2 border-t border-zinc-800">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                  onChange={handleFirstViewFileChange}
                  className="hidden"
                />
                <div
                  onDragOver={handleFirstViewDragOver}
                  onDrop={handleFirstViewDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex items-center justify-center gap-2 rounded-lg border border-dashed transition min-h-[100px] cursor-pointer mb-2 ${
                    firstViewUploading || firstViewSaving
                      ? 'border-cyan-500/50 bg-cyan-900/20'
                      : 'border-zinc-700/80 bg-zinc-800/50 hover:border-zinc-600/80'
                  }`}
                >
                  {scrap.firstView && !firstViewUploading && !firstViewSaving ? (
                    <div className="relative flex items-center gap-2 p-2">
                      <img
                        src={getBlogImageSrc(scrap.firstView)}
                        alt=""
                        className="max-h-20 max-w-[120px] object-contain rounded"
                      />
                      <div className="flex flex-col gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            fileInputRef.current?.click()
                          }}
                          className="text-xs text-zinc-500 hover:text-cyan-400 transition"
                        >
                          変更
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteFirstView()
                          }}
                          className="text-xs text-zinc-500 hover:text-red-400 transition"
                        >
                          削除
                        </button>
                      </div>
                    </div>
                  ) : firstViewUploading || firstViewSaving ? (
                    <span className="text-sm text-cyan-400">
                      {firstViewUploading ? 'アップロード中...' : '保存中...'}
                    </span>
                  ) : (
                    <span className="text-sm text-zinc-500 flex items-center gap-2">
                      <ImagePlus className="w-4 h-4" />
                      画像を選択またはドロップ
                    </span>
                  )}
                </div>
              </div>
            </details>
          </div>
        )}

        <div className="max-w-[100ch] mx-auto px-4 py-8">
          <header className="mb-10">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-zinc-500">
              <time dateTime={scrap.created_at}>{scrap.created_at}</time>
              <span>コメント {countComments(scrap.comments)}件</span>
            </div>
            {tags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {tags.map((t) => (
                  <Link
                    key={t}
                    to="/scraps"
                    search={{ tag: t }}
                    className="rounded-full px-3 py-1 text-xs font-medium bg-zinc-700/60 text-zinc-300 hover:bg-zinc-600/60 hover:text-zinc-100 transition"
                    >
                    {t}
                  </Link>
                ))}
              </div>
            )}
          </header>

        <section aria-label="コメント">
          <div className="space-y-6">
            {scrap.comments.map((c, i) => (
              <CommentBlock
                key={`${i}-${c.created_at}-${c.body_markdown?.slice(0, 20)}`}
                comment={c}
                depth={0}
                path={[i]}
                isAdmin={isAdmin}
                authorIconUrl={authorIcon}
                onReply={(path) => setReplyingTo(path)}
                onCancelReply={() => setReplyingTo(null)}
                onEdit={handleEdit}
                onDelete={handleDelete}
                replyingTo={replyingTo}
                editingPath={editingPath}
                editingBody={editingBody}
                onEditingBodyChange={setEditingBody}
                onEditStart={(path, body) => {
                  setEditingPath(path)
                  setEditingBody(body)
                }}
                onEditCancel={() => {
                  setEditingPath(null)
                  setEditingBody('')
                }}
                onReplySubmit={handleReply}
                saving={saving}
              />
            ))}
          </div>
        </section>

        {isAdmin && (
          <div className="mt-8">
            <h3 className="text-sm font-medium text-zinc-400 mb-3">投稿を追加</h3>
            <ScrapTLComposer
              placeholder="新しい投稿を書く..."
              onSubmit={handleAddPost}
            />
          </div>
        )}

        {error && (
          <p className="mt-4 text-sm text-amber-400">{error}</p>
        )}

        {showCloseModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80">
            <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 max-w-md mx-4">
              <h3 className="text-lg font-semibold text-zinc-100 mb-2">Stream をクローズしますか？</h3>
              <p className="text-zinc-400 text-sm mb-4">
                クローズすると、この Stream がクローズ済みであることが表示されます。
              </p>
              <div className="mb-4">
                <label htmlFor="close-reason" className="block text-sm text-zinc-500 mb-1.5">
                  クローズ理由（任意）
                </label>
                <input
                  id="close-reason"
                  type="text"
                  value={closeReasonInput}
                  onChange={(e) => setCloseReasonInput(e.target.value)}
                  placeholder="例: 解決済み、終了しました"
                  className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => { setShowCloseModal(false); setCloseReasonInput('') }}
                  className="px-4 py-2 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-zinc-200"
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  onClick={() => handleSetClosed(true, closeReasonInput.trim() || undefined)}
                  disabled={closing}
                  className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white"
                >
                  {closing ? '処理中...' : 'クローズする'}
                </button>
              </div>
            </div>
          </div>
        )}

        <CommentSection contentType="stream" contentSlug={scrap.slug} scrapStyle />
        <ArticleAuthorFooter authorName={authorName} />
        </div>
      </article>
    </div>
  )
}

const PROSE_BASE =
  'prose prose-invert prose-zinc max-w-none tracking-tight prose-a:text-cyan-400 prose-a:no-underline prose-p:text-[1.05rem] prose-p:leading-[1.7] prose-li:text-[1.05rem] prose-li:my-0.5 prose-headings:font-semibold'

function GitHubAvatar({ username }: { username: string }) {
  const [failed, setFailed] = useState(false)
  if (failed) return null
  return (
    <img
      src={`https://avatars.githubusercontent.com/${encodeURIComponent(username)}?s=64`}
      alt=""
      width={32}
      height={32}
      loading="lazy"
      decoding="async"
      className="w-8 h-8 rounded-full flex-shrink-0 bg-zinc-700/60"
      onError={() => setFailed(true)}
    />
  )
}

type CommentBlockProps = {
  comment: ScrapComment
  depth: number
  path: number[]
  isAdmin: boolean
  /** サイト設定の author 画像。指定時は GitHub アバターの代わりに表示 */
  authorIconUrl?: string
  onReply: (path: number[]) => void
  onCancelReply: () => void
  onEdit: (path: number[], body: string) => Promise<void>
  onDelete: (path: number[]) => Promise<void>
  replyingTo: number[] | null
  editingPath: number[] | null
  editingBody: string
  onEditingBodyChange: (body: string) => void
  onEditStart: (path: number[], body: string) => void
  onEditCancel: () => void
  onReplySubmit: (path: number[], body: string) => Promise<void>
  saving: boolean
}

function CommentBlock({
  comment,
  depth,
  path,
  isAdmin,
  authorIconUrl,
  onReply,
  onCancelReply,
  onEdit,
  onDelete,
  replyingTo,
  editingPath,
  editingBody,
  onEditingBodyChange,
  onEditStart,
  onEditCancel,
  onReplySubmit,
  saving,
}: CommentBlockProps) {
  const proseClass = `${PROSE_BASE} prose-sm`
  const isParent = depth === 0
  const isEditing = editingPath?.length === path.length && editingPath.every((p, i) => p === path[i])
  const isReplyingToThis = replyingTo?.length === path.length && replyingTo.every((p, i) => p === path[i])

  return (
    <div
      className={
        isParent
          ? 'rounded-lg p-5 border border-zinc-800/80 bg-zinc-900/40'
          : 'ml-4 pl-5 py-4 bg-zinc-900/40 rounded-lg'
      }
    >
      <div className="flex items-center gap-3 text-sm text-zinc-500 mb-3">
        {authorIconUrl ? (
          <img
            src={getBlogImageSrc(authorIconUrl)}
            alt=""
            width={32}
            height={32}
            loading="lazy"
            decoding="async"
            className="w-8 h-8 rounded-full flex-shrink-0 bg-zinc-700/60 object-cover"
          />
        ) : (
          <GitHubAvatar username={comment.author} />
        )}
        <div className="flex items-baseline gap-2 flex-1">
          <span className="font-medium text-zinc-300">{comment.author}</span>
          <time dateTime={comment.created_at} className="text-xs">
            {comment.created_at}
          </time>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onReply(path)}
              disabled={saving}
              className="text-xs text-zinc-500 hover:text-cyan-400 disabled:opacity-50"
            >
              リプライ
            </button>
            <button
              type="button"
              onClick={() => onEditStart(path, comment.body_markdown)}
              disabled={saving}
              className="text-xs text-zinc-500 hover:text-cyan-400 disabled:opacity-50"
            >
              編集
            </button>
            <button
              type="button"
              onClick={() => {
                if (window.confirm('この投稿を削除しますか？')) {
                  onDelete(path)
                }
              }}
              disabled={saving}
              className="text-xs text-red-500/80 hover:text-red-400 disabled:opacity-50"
            >
              削除
            </button>
          </div>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-2">
          <MarkdownEditorWithPreview
            value={editingBody}
            onChange={onEditingBodyChange}
            placeholder="Markdown で記述..."
            rows={4}
            maxLength={5000}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onEdit(path, editingBody)}
              disabled={saving || !editingBody.trim()}
              className="px-3 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 disabled:bg-zinc-600 text-white text-sm"
            >
              {saving ? '保存中...' : '保存'}
            </button>
            <button
              type="button"
              onClick={onEditCancel}
              className="px-3 py-1.5 rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-sm"
            >
              キャンセル
            </button>
          </div>
        </div>
      ) : (
        <MarkdownWithLinkCards
          content={comment.body_markdown ?? ''}
          proseClass={proseClass}
          useNativeBr
        />
      )}

      {isReplyingToThis && (
        <div className="mt-4">
          <ScrapTLComposer
            placeholder="リプライを書く..."
            onSubmit={(body) => onReplySubmit(path, body)}
            onCancel={onCancelReply}
            showCancel
            initialFocus
          />
        </div>
      )}

      {comment.children?.length ? (
        <div className="mt-4 space-y-4">
          {comment.children.map((c, i) => (
            <CommentBlock
              key={`${i}-${c.created_at}`}
              comment={c}
              depth={depth + 1}
              path={[...path, i]}
              isAdmin={isAdmin}
              authorIconUrl={authorIconUrl}
              onReply={onReply}
              onCancelReply={onCancelReply}
              onEdit={onEdit}
              onDelete={onDelete}
              replyingTo={replyingTo}
              editingPath={editingPath}
              editingBody={editingBody}
              onEditingBodyChange={onEditingBodyChange}
              onEditStart={onEditStart}
              onEditCancel={onEditCancel}
              onReplySubmit={onReplySubmit}
              saving={saving}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}
