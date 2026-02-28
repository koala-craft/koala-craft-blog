import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { useState, useCallback } from 'react'
import { getArticle } from '~/features/articles/api'
import {
  updateArticle,
  deleteArticle,
} from '~/features/articles/articlesAdminApi'
import { getSession } from '~/features/admin/auth'
import { ArticleEditor, type ArticleEditorMeta } from '~/features/articles/ArticleEditor'
import { validateSlug } from '~/shared/lib/slug'

export const Route = createFileRoute('/admin/articles/$slug')({
  component: AdminArticleEdit,
  loader: async ({ params }) => {
    const article = await getArticle({ data: { slug: params.slug } })
    if (!article) throw notFound()
    return { article }
  },
})

function AdminArticleEdit() {
  const { article: initialArticle } = Route.useLoaderData()
  const [meta, setMeta] = useState<ArticleEditorMeta>({
    slug: initialArticle.slug,
    title: initialArticle.title ?? '',
    topics: (initialArticle.tags ?? []).join(', '),
    visibility: initialArticle.visibility ?? 'public',
    firstView: initialArticle.firstView,
  })
  const [content, setContent] = useState(initialArticle.content ?? '')
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
    if (newSlug && newSlug !== initialArticle.slug && !validateSlug(newSlug)) {
      setMessage({ type: 'error', text: 'スラッグは英数字・ハイフン・アンダースコアのみ使用できます' })
      return
    }

    setSaving(true)
    const result = await updateArticle({
      data: {
        accessToken: session.session.access_token,
        providerToken: session.session.provider_token ?? undefined,
        slug: initialArticle.slug,
        newSlug: newSlug && newSlug !== initialArticle.slug ? newSlug : undefined,
        title: (meta.title ?? '').trim() || initialArticle.slug,
        content: content ?? '',
        topics: (meta.topics ?? '')
          .split(',')
          .map((t) => (t ?? '').trim())
          .filter(Boolean),
        visibility: meta.visibility,
        firstView: meta.firstView ?? '',
      },
    })
    setSaving(false)

    if (result.success) {
      setMessage({ type: 'success', text: '保存しました' })
    } else {
      setMessage({ type: 'error', text: result.error ?? '保存に失敗しました' })
    }
  }, [initialArticle, meta, content])

  const handleDelete = useCallback(async () => {
    setMessage(null)
    const session = await getSession()
    if (!session) {
      setMessage({ type: 'error', text: 'ログインが必要です' })
      return
    }

    setDeleting(true)
    const result = await deleteArticle({
      data: {
        accessToken: session.session.access_token,
        providerToken: session.session.provider_token ?? undefined,
        slug: initialArticle.slug,
      },
    })
    setDeleting(false)
    setShowDeleteConfirm(false)

    if (result.success) {
      window.location.href = '/admin/articles'
    } else {
      setMessage({ type: 'error', text: result.error ?? '削除に失敗しました' })
    }
  }, [initialArticle.slug])

  return (
    <div className="-mx-4 -mb-8">
      <div className="flex items-center justify-between mb-4 px-4">
        <h1 className="text-xl font-semibold text-zinc-200 truncate">
          編集: {initialArticle.slug}
        </h1>
        <div className="flex items-center gap-3 shrink-0">
          <Link to="/admin/articles" className="text-sm text-zinc-500 hover:text-zinc-300">
            一覧へ
          </Link>
        </div>
      </div>

      <ArticleEditor
        meta={meta}
        onMetaChange={setMeta}
        content={content}
        onContentChange={setContent}
        onSave={handleSave}
        saving={saving}
        message={message}
        slug={
          meta.slug?.trim() && validateSlug(meta.slug.trim())
            ? meta.slug.trim()
            : initialArticle.slug
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
            <h3 className="text-lg font-semibold text-zinc-100 mb-2">記事を削除しますか？</h3>
            <p className="text-zinc-400 text-sm mb-4">
              「{initialArticle.title}」を削除すると元に戻せません。
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
