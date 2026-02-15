import { createFileRoute, Link, notFound, useNavigate } from '@tanstack/react-router'
import { useState, useEffect, useCallback } from 'react'
import { getBlogPost } from '~/features/blog/api'
import {
  updateBlogPost,
  deleteBlogPost,
  prepareBlogContentForSave,
  clearBlogTempAssets,
} from '~/features/blog/blogAdminApi'
import { getSession } from '~/features/admin/auth'
import { BlogEditor, type BlogEditorMeta } from '~/features/blog/BlogEditor'
import { validateSlug } from '~/shared/lib/slug'

export const Route = createFileRoute('/admin/blog/$slug')({
  component: AdminBlogEdit,
  loader: async ({ params }) => {
    const post = await getBlogPost({ data: { slug: params.slug } })
    if (!post) throw notFound()
    return { post }
  },
})

function AdminBlogEdit() {
  const { post: initialPost } = Route.useLoaderData()
  const navigate = useNavigate()
  const [meta, setMeta] = useState<BlogEditorMeta>({
    slug: initialPost.slug,
    title: initialPost.title,
    tags: initialPost.tags.join(', '),
    visibility: initialPost.visibility,
    firstView: initialPost.firstView,
  })
  const [content, setContent] = useState(initialPost.content)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    setMeta({
      slug: initialPost.slug,
      title: initialPost.title,
      tags: initialPost.tags.join(', '),
      visibility: initialPost.visibility,
      firstView: initialPost.firstView,
    })
    setContent(initialPost.content)
  }, [initialPost])

  const handleSave = useCallback(async () => {
    setMessage(null)
    const session = await getSession()
    if (!session) {
      setMessage({ type: 'error', text: 'ログインが必要です' })
      return
    }

    setSaving(true)
    const effectiveSlug =
      meta.slug?.trim() && validateSlug(meta.slug.trim())
        ? meta.slug.trim()
        : initialPost.slug
    const prepared = await prepareBlogContentForSave({
      data: {
        accessToken: session.session.access_token,
        providerToken: session.session.provider_token ?? undefined,
        slug: effectiveSlug,
        content,
        firstView: meta.firstView,
      },
    })
    if (!prepared.success) {
      setSaving(false)
      setMessage({ type: 'error', text: prepared.error ?? '画像のアップロードに失敗しました' })
      return
    }

    const result = await updateBlogPost({
      data: {
        accessToken: session.session.access_token,
        providerToken: session.session.provider_token ?? undefined,
        slug: initialPost.slug,
        newSlug: effectiveSlug !== initialPost.slug ? effectiveSlug : undefined,
        title: meta.title.trim() || effectiveSlug,
        content: prepared.content,
        tags: meta.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        visibility: meta.visibility,
        firstView: prepared.firstView,
        previousFirstView: initialPost.firstView,
      },
    })
    setSaving(false)

    if (result.success) {
      setMessage({ type: 'success', text: '保存しました' })
      setContent(prepared.content)
      setMeta((m) => ({ ...m, slug: effectiveSlug, firstView: prepared.firstView }))
      await clearBlogTempAssets({ data: { accessToken: session.session.access_token } })
      if (effectiveSlug !== initialPost.slug) {
        navigate({ to: '/admin/blog/$slug', params: { slug: effectiveSlug } })
      }
    } else {
      setMessage({ type: 'error', text: result.error ?? '保存に失敗しました' })
    }
  }, [initialPost.slug, meta, content, navigate])

  const handleDelete = async () => {
    const session = await getSession()
    if (!session) return

    setDeleting(true)
    const result = await deleteBlogPost({
      data: {
        accessToken: session.session.access_token,
        providerToken: session.session.provider_token ?? undefined,
        slug: initialPost.slug,
      },
    })
    setDeleting(false)
    setShowDeleteConfirm(false)

    if (result.success) {
      window.location.href = '/admin/blog'
    } else {
      setMessage({ type: 'error', text: result.error ?? '削除に失敗しました' })
    }
  }

  return (
    <div className="-mx-4 -mb-8">
      <div className="flex items-center justify-between mb-4 px-4">
        <h1 className="text-xl font-semibold text-zinc-200 truncate">
          編集: {initialPost.slug}
        </h1>
        <div className="flex items-center gap-3 shrink-0">
          <Link
            to="/admin/blog"
            className="text-sm text-zinc-500 hover:text-zinc-300"
          >
            一覧へ
          </Link>
        </div>
      </div>

      <BlogEditor
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
            : initialPost.slug
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
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-zinc-800 rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-2">記事を削除しますか？</h3>
            <p className="text-zinc-400 text-sm mb-4">
              「{initialPost.title}」を削除すると元に戻せません。
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
