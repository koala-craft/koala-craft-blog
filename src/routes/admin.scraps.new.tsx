import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState, useCallback } from 'react'
import { createScrap } from '~/features/scraps/scrapsAdminApi'
import { getSession } from '~/features/admin/auth'
import { ScrapEditor, type ScrapEditorMeta } from '~/features/scraps/ScrapEditor'
import { validateSlug } from '~/shared/lib/slug'
import type { ScrapComment } from '~/features/scraps/types'

export const Route = createFileRoute('/admin/scraps/new')({
  component: AdminScrapNew,
})

function AdminScrapNew() {
  const navigate = useNavigate()
  const [meta, setMeta] = useState<ScrapEditorMeta>({
    slug: '',
    title: '',
    tags: '',
  })
  const [comments, setComments] = useState<{ author: string; body_markdown: string }[]>([
    { author: 'author', body_markdown: '' },
  ])
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleSave = useCallback(async () => {
    setMessage(null)
    if (!meta.slug?.trim()) {
      setMessage({ type: 'error', text: 'スラッグを入力してください' })
      return
    }
    if (!validateSlug(meta.slug.trim())) {
      setMessage({ type: 'error', text: 'スラッグは英数字・ハイフン・アンダースコアのみ使用できます' })
      return
    }
    const validComments = comments.filter((c) => c.body_markdown.trim())
    if (validComments.length === 0) {
      setMessage({ type: 'error', text: '本文が入力されたコメントを1件以上追加してください' })
      return
    }
    const session = await getSession()
    if (!session) {
      setMessage({ type: 'error', text: 'ログインが必要です' })
      return
    }

    setSaving(true)
    const result = await createScrap({
      data: {
        accessToken: session.session.access_token,
        providerToken: session.session.provider_token ?? undefined,
        slug: meta.slug.trim(),
        title: meta.title.trim() || meta.slug.trim(),
        tags: meta.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        firstView: meta.firstView,
        comments: validComments,
      },
    })
    setSaving(false)

    if (result.success) {
      navigate({
        to: '/admin/scraps',
        search: { _refresh: Date.now() },
      })
    } else {
      setMessage({ type: 'error', text: result.error ?? '保存に失敗しました' })
    }
  }, [meta, comments, navigate])

  const commentsAsScrapFormat: ScrapComment[] = comments.map((c) => ({
    author: c.author,
    created_at: new Date().toISOString().slice(0, 10),
    body_markdown: c.body_markdown,
    body_updated_at: new Date().toISOString().slice(0, 10),
    children: [],
  }))

  const setCommentsAsScrapFormat = (next: typeof commentsAsScrapFormat) => {
    setComments(
      next.map((c) => ({
        author: c.author,
        body_markdown: c.body_markdown,
      }))
    )
  }

  return (
    <div className="-mx-4 -mb-8">
      <div className="flex items-center justify-between mb-4 px-4">
        <h1 className="text-xl font-semibold text-zinc-200">新規作成</h1>
        <Link
          to="/admin/scraps"
          search={{ _refresh: undefined }}
          className="text-sm text-zinc-500 hover:text-zinc-300"
        >
          ← 一覧へ
        </Link>
      </div>

      <ScrapEditor
        meta={meta}
        onMetaChange={setMeta}
        comments={commentsAsScrapFormat}
        onCommentsChange={setCommentsAsScrapFormat}
        onSave={handleSave}
        saving={saving}
        message={message}
        slug={meta.slug ?? ''}
        slugEditable
      />
    </div>
  )
}
