import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState, useCallback } from 'react'
import {
  createBlogPost,
  prepareBlogContentForSave,
  clearBlogTempAssets,
} from '~/features/blog/blogAdminApi'
import { getSession } from '~/features/admin/auth'
import { BlogEditor, type BlogEditorMeta } from '~/features/blog/BlogEditor'
import { validateSlug } from '~/shared/lib/slug'

export const Route = createFileRoute('/admin/blog/new')({
  component: AdminBlogNew,
})

function AdminBlogNew() {
  const navigate = useNavigate()
  const [meta, setMeta] = useState<BlogEditorMeta>({
    slug: '',
    title: '',
    tags: '',
    visibility: 'public',
    firstView: '',
  })
  const [content, setContent] = useState('')
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
    const session = await getSession()
    if (!session) {
      setMessage({ type: 'error', text: 'ログインが必要です' })
      return
    }

    setSaving(true)
    const prepared = await prepareBlogContentForSave({
      data: {
        accessToken: session.session.access_token,
        providerToken: session.session.provider_token ?? undefined,
        slug: meta.slug.trim(),
        content,
        firstView: meta.firstView,
      },
    })
    if (!prepared.success) {
      setSaving(false)
      setMessage({ type: 'error', text: prepared.error ?? '画像のアップロードに失敗しました' })
      return
    }

    const result = await createBlogPost({
      data: {
        accessToken: session.session.access_token,
        providerToken: session.session.provider_token ?? undefined,
        slug: meta.slug.trim(),
        title: meta.title.trim() || meta.slug.trim(),
        content: prepared.content,
        tags: meta.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        visibility: meta.visibility,
        firstView: prepared.firstView,
      },
    })
    setSaving(false)

    if (result.success) {
      await clearBlogTempAssets({ data: { accessToken: session.session.access_token } })
      navigate({ to: '/admin/blog/$slug', params: { slug: meta.slug.trim() } })
    } else {
      setMessage({ type: 'error', text: result.error ?? '保存に失敗しました' })
    }
  }, [meta, content, navigate])

  return (
    <div className="-mx-4 -mb-8">
      <div className="flex items-center justify-between mb-4 px-4">
        <h1 className="text-xl font-semibold text-zinc-200">新規作成</h1>
        <Link
          to="/admin/blog"
          className="text-sm text-zinc-500 hover:text-zinc-300"
        >
          ← 一覧へ
        </Link>
      </div>

      <BlogEditor
        meta={meta}
        onMetaChange={setMeta}
        content={content}
        onContentChange={setContent}
        onSave={handleSave}
        saving={saving}
        message={message}
        slug={meta.slug ?? ''}
        slugEditable
      />
    </div>
  )
}
