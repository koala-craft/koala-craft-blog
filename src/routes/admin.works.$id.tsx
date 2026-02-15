import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { useState, useEffect, useCallback } from 'react'
import { getWorks, setWorks } from '~/features/works/worksApi'
import { getSession } from '~/features/admin/auth'
import { WorkEditor, type WorkEditorMeta } from '~/features/works/WorkEditor'

export const Route = createFileRoute('/admin/works/$id')({
  component: AdminWorksEdit,
  loader: async ({ params }) => {
    const data = await getWorks()
    const item = data.items.find((i) => i.id === params.id)
    if (!item) throw notFound()
    return { item }
  },
})

function AdminWorksEdit() {
  const { item: initialItem } = Route.useLoaderData()
  const [meta, setMeta] = useState<WorkEditorMeta>({
    title: initialItem.title,
    startDate: initialItem.startDate ?? '',
    endDate: initialItem.endDate ?? '',
    isCurrent: initialItem.isCurrent ?? false,
    comingSoon: initialItem.comingSoon ?? false,
    href: initialItem.href ?? '',
    tags: (initialItem.tags ?? []).join(', '),
    thumbnail: initialItem.thumbnail ?? '',
    category: initialItem.category,
  })
  const [content, setContent] = useState(initialItem.description ?? '')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    setMeta({
      title: initialItem.title,
      startDate: initialItem.startDate ?? '',
      endDate: initialItem.endDate ?? '',
      isCurrent: initialItem.isCurrent ?? false,
      comingSoon: initialItem.comingSoon ?? false,
      href: initialItem.href ?? '',
      tags: (initialItem.tags ?? []).join(', '),
      thumbnail: initialItem.thumbnail ?? '',
      category: initialItem.category,
    })
    setContent(initialItem.description ?? '')
  }, [initialItem])

  const handleSave = useCallback(async () => {
    setMessage(null)
    const session = await getSession()
    if (!session) {
      setMessage({ type: 'error', text: 'ログインが必要です' })
      return
    }

    setSaving(true)
    const data = await getWorks()
    const updatedItems = data.items.map((i) =>
      i.id === initialItem.id
        ? {
            ...i,
            title: meta.title.trim(),
            startDate: meta.startDate.trim() || undefined,
            endDate: meta.endDate.trim() || undefined,
            isCurrent: meta.isCurrent,
            comingSoon: meta.comingSoon,
            description: content.trim() || undefined,
            href: meta.href.trim() || undefined,
            tags: meta.tags
              .split(',')
              .map((t) => t.trim())
              .filter(Boolean),
            thumbnail: meta.thumbnail.trim() || undefined,
            category: meta.category,
          }
        : i
    )
    const result = await setWorks({
      data: {
        accessToken: session.session.access_token,
        providerToken: session.session.provider_token ?? undefined,
        works: { items: updatedItems },
      },
    })
    setSaving(false)

    if (result.success) {
      setMessage({ type: 'success', text: '保存しました' })
    } else {
      setMessage({ type: 'error', text: result.error ?? '保存に失敗しました' })
    }
  }, [initialItem.id, meta, content])

  const handleDelete = async () => {
    const session = await getSession()
    if (!session) return

    setDeleting(true)
    const data = await getWorks()
    const updatedItems = data.items.filter((i) => i.id !== initialItem.id)
    const result = await setWorks({
      data: {
        accessToken: session.session.access_token,
        providerToken: session.session.provider_token ?? undefined,
        works: { items: updatedItems },
      },
    })
    setDeleting(false)
    setShowDeleteConfirm(false)

    if (result.success) {
      window.location.href = '/admin/works'
    } else {
      setMessage({ type: 'error', text: result.error ?? '削除に失敗しました' })
    }
  }

  return (
    <div className="-mx-4 -mb-8">
      <div className="flex items-center justify-between mb-4 px-4">
        <h1 className="text-xl font-semibold text-zinc-200 truncate">
          編集: {initialItem.title}
        </h1>
        <div className="flex items-center gap-3 shrink-0">
          <Link
            to="/admin/works"
            className="text-sm text-zinc-500 hover:text-zinc-300"
          >
            一覧へ
          </Link>
        </div>
      </div>

      <WorkEditor
        meta={meta}
        onMetaChange={setMeta}
        content={content}
        onContentChange={setContent}
        onSave={handleSave}
        saving={saving}
        message={message}
        workId={initialItem.id}
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
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-zinc-800 rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-2">この項目を削除しますか？</h3>
            <p className="text-zinc-400 text-sm mb-4">
              「{initialItem.title}」を削除すると元に戻せません。
            </p>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded transition"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 rounded transition"
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
