import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { useState, useCallback } from 'react'
import { getScrap } from '~/features/scraps/api'
import {
  updateScrap,
  deleteScrap,
} from '~/features/scraps/scrapsAdminApi'
import { getSession } from '~/features/admin/auth'
import { ScrapEditor, type ScrapEditorMeta } from '~/features/scraps/ScrapEditor'
import { parseScrapTitle } from '~/features/scraps/parseScrapTitle'
import { validateSlug } from '~/shared/lib/slug'
import type { ScrapComment } from '~/features/scraps/types'

export const Route = createFileRoute('/admin/scraps/$slug')({
  component: AdminScrapEdit,
  loader: async ({ params }) => {
    const scrap = await getScrap({ data: { slug: params.slug } })
    if (!scrap) throw notFound()
    return { scrap }
  },
})

function AdminScrapEdit() {
  const { scrap: initialScrap } = Route.useLoaderData()
  const { displayTitle, tags } = parseScrapTitle(initialScrap.title)
  const [meta, setMeta] = useState<ScrapEditorMeta>({
    slug: initialScrap.slug,
    title: displayTitle || initialScrap.title,
    tags: tags.join(', '),
    firstView: initialScrap.firstView,
    closed: initialScrap.closed,
    closed_reason: initialScrap.closed_reason,
  })
  const [comments, setComments] = useState<ScrapComment[]>(initialScrap.comments)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const handleSave = useCallback(async () => {
    setMessage(null)
    const session = await getSession()
    if (!session) {
      setMessage({ type: 'error', text: 'ログインが必要です' })
      return
    }

    const newSlug = meta.slug?.trim()
    if (newSlug && newSlug !== initialScrap.slug && !validateSlug(newSlug)) {
      setMessage({ type: 'error', text: 'スラッグは英数字・ハイフン・アンダースコアのみ使用できます' })
      return
    }
    if (comments.length === 0) {
      setMessage({ type: 'error', text: 'コメントを1件以上残してください' })
      return
    }

    setSaving(true)
    const result = await updateScrap({
      data: {
        accessToken: session.session.access_token,
        providerToken: session.session.provider_token ?? undefined,
        slug: initialScrap.slug,
        newSlug: newSlug && newSlug !== initialScrap.slug ? newSlug : undefined,
        title: meta.title.trim() || initialScrap.slug,
        tags: meta.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        firstView: meta.firstView ?? '',
        comments,
        closed: meta.closed,
        closed_reason: meta.closed_reason,
      },
    })
    setSaving(false)

    if (result.success) {
      setMessage({ type: 'success', text: '保存しました' })
    } else {
      setMessage({ type: 'error', text: result.error ?? '保存に失敗しました' })
    }
  }, [initialScrap, meta, comments])

  const handleDelete = useCallback(async () => {
    setMessage(null)
    const session = await getSession()
    if (!session) {
      setMessage({ type: 'error', text: 'ログインが必要です' })
      return
    }

    setDeleting(true)
    const result = await deleteScrap({
      data: {
        accessToken: session.session.access_token,
        providerToken: session.session.provider_token ?? undefined,
        slug: initialScrap.slug,
      },
    })
    setDeleting(false)
    setShowDeleteConfirm(false)

    if (result.success) {
      window.location.href = '/admin/scraps'
    } else {
      setMessage({ type: 'error', text: result.error ?? '削除に失敗しました' })
    }
  }, [initialScrap.slug])

  return (
    <div className="-mx-4 -mb-8">
      <div className="flex items-center justify-between mb-4 px-4">
        <h1 className="text-xl font-semibold text-zinc-200 truncate">
          編集: {initialScrap.slug}
        </h1>
        <div className="flex items-center gap-3 shrink-0">
          <Link
            to="/admin/scraps"
            search={{ _refresh: undefined }}
            className="text-sm text-zinc-500 hover:text-zinc-300"
          >
            一覧へ
          </Link>
        </div>
      </div>

      <ScrapEditor
        meta={meta}
        onMetaChange={setMeta}
        comments={comments}
        onCommentsChange={setComments}
        onSave={handleSave}
        saving={saving}
        message={message}
        slug={
          meta.slug?.trim() && validateSlug(meta.slug.trim())
            ? meta.slug.trim()
            : initialScrap.slug
        }
        slugEditable
        extraActions={
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            disabled={saving || deleting}
            className="px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-900/20 disabled:opacity-50 rounded-lg transition"
          >
            削除
          </button>
        }
      />

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold text-zinc-100 mb-2">Stream を削除しますか？</h3>
            <p className="text-zinc-400 text-sm mb-4">
              「{displayTitle || initialScrap.title}」を削除すると元に戻せません。
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-zinc-200"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white"
              >
                {deleting ? '削除中...' : '削除する'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
