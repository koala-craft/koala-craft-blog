import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState, useCallback } from 'react'
import { getWorks, setWorks, createWorkItem } from '~/features/works/worksApi'
import { getSession } from '~/features/admin/auth'
import { WorkEditor, type WorkEditorMeta } from '~/features/works/WorkEditor'
import type { WorkCategory } from '~/features/works/types'

export const Route = createFileRoute('/admin/works/new')({
  component: AdminWorksNew,
  validateSearch: (search: Record<string, unknown>) => ({
    category: (search.category as WorkCategory) || 'professional',
  }),
})

function AdminWorksNew() {
  const navigate = useNavigate()
  const { category: initialCategory } = Route.useSearch()
  const [meta, setMeta] = useState<WorkEditorMeta>({
    title: '',
    startDate: '',
    endDate: '',
    isCurrent: false,
    comingSoon: false,
    href: '',
    tags: '',
    thumbnail: '',
    category: initialCategory,
  })
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleSave = useCallback(async () => {
    setMessage(null)
    if (!meta.title.trim()) {
      setMessage({ type: 'error', text: 'タイトルを入力してください' })
      return
    }
    const session = await getSession()
    if (!session) {
      setMessage({ type: 'error', text: 'ログインが必要です' })
      return
    }

    setSaving(true)
    const data = await getWorks()
    const newItem = createWorkItem({
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
    })
    const updated = { items: [...data.items, newItem] }
    const result = await setWorks({
      data: {
        accessToken: session.session.access_token,
        providerToken: session.session.provider_token ?? undefined,
        works: updated,
      },
    })
    setSaving(false)

    if (result.success) {
      navigate({ to: '/admin/works/$id', params: { id: newItem.id } })
    } else {
      setMessage({ type: 'error', text: result.error ?? '保存に失敗しました' })
    }
  }, [meta, content, navigate])

  return (
    <div className="-mx-4 -mb-8">
      <div className="flex items-center justify-between mb-4 px-4">
        <h1 className="text-xl font-semibold text-zinc-200">新規作成</h1>
        <Link
          to="/admin/works"
          className="text-sm text-zinc-500 hover:text-zinc-300"
        >
          ← 一覧へ
        </Link>
      </div>

      <WorkEditor
        meta={meta}
        onMetaChange={setMeta}
        content={content}
        onContentChange={setContent}
        onSave={handleSave}
        saving={saving}
        message={message}
      />
    </div>
  )
}
