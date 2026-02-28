/**
 * スクラップ新規作成コンポーザー（Twitter風）
 * SREAM MEMO 一覧ページで表示（管理者のみ）
 */

import { useState, useCallback, useRef } from 'react'
import { ImagePlus } from 'lucide-react'
import { createScrap } from './scrapsAdminApi'
import { saveBlogImageToTemp } from '~/features/blog/blogAdminApi'
import { getBlogImageSrc } from '~/shared/lib/blogImageUrl'
import { getSession } from '~/features/admin/auth'
import { validateSlug } from '~/shared/lib/slug'
import { useRouter } from '@tanstack/react-router'
import { useSearchParams } from '~/shared/hooks/useSearchParams'

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

export function ScrapComposer() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [tags, setTags] = useState('')
  const [slug, setSlug] = useState('')
  const [firstView, setFirstView] = useState<string | null>(null)
  const [firstViewUploading, setFirstViewUploading] = useState(false)
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)

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
          setFirstView(result.tempUrl)
        } else {
          setError(result.error ?? '画像の仮保存に失敗しました')
        }
      }
      reader.readAsDataURL(blob)
    },
    []
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!body.trim()) {
      setError('本文を入力してください')
      return
    }

    const session = await getSession()
    if (!session) {
      setError('ログインが必要です')
      return
    }

    const author =
      session.user.user_metadata?.user_name ??
      session.user.user_metadata?.full_name ??
      'author'
    const slugToUse = slug.trim() || `scrap-${Date.now().toString(36)}`
    if (slug.trim() && !validateSlug(slugToUse)) {
      setError('スラッグは英数字・ハイフン・アンダースコアのみ使用できます')
      return
    }

    setPosting(true)
    const result = await createScrap({
      data: {
        accessToken: session.session.access_token,
        providerToken: session.session.provider_token ?? undefined,
        slug: slugToUse,
        title: title.trim() || '新しい Stream',
        tags: tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        firstView: firstView ?? undefined,
        comments: [{ author, body_markdown: body.trim() }],
      },
    })
    setPosting(false)

    if (result.success) {
      setTitle('')
      setBody('')
      setTags('')
      setSlug('')
      setFirstView(null)
      setExpanded(false)
      // キャッシュバイパスで再取得し、一覧に新規スクラップを表示
      router.navigate({
        to: '/scraps',
        search: {
          tag: searchParams?.tag,
          q: searchParams?.q,
          _refresh: Date.now(),
        },
        replace: true,
      })
    } else {
      setError(result.error ?? '投稿に失敗しました')
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 mb-6"
    >
      <div className="flex gap-3">
        <div className="flex-1 min-w-0">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onFocus={() => setExpanded(true)}
            placeholder="新しい SREAM MEMO を書く..."
            rows={expanded ? 4 : 2}
            className="w-full px-4 py-3 bg-transparent text-zinc-100 placeholder-zinc-500 resize-none focus:outline-none border-b border-zinc-800 focus:border-cyan-500/50 transition-colors"
          />
          {expanded && (
            <div className="mt-3 space-y-2">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="タイトル（任意）"
                className="w-full px-3 py-2 rounded-lg bg-zinc-800/80 border border-zinc-700 text-zinc-100 text-sm placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              />
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="スラッグ（空なら自動生成）"
                className="w-full px-3 py-2 rounded-lg bg-zinc-800/80 border border-zinc-700 text-zinc-100 text-sm placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              />
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="タグ（カンマ区切り、任意）"
                className="w-full px-3 py-2 rounded-lg bg-zinc-800/80 border border-zinc-700 text-zinc-100 text-sm placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              />
              <div>
                <label className="block text-xs text-zinc-500 mb-1.5">ヘッダー画像（任意）</label>
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
                  className={`flex items-center justify-center gap-2 rounded-lg border border-dashed transition min-h-[100px] cursor-pointer ${
                    firstViewUploading
                      ? 'border-cyan-500/50 bg-cyan-900/20'
                      : 'border-zinc-700/80 bg-zinc-800/50 hover:border-zinc-600/80'
                  }`}
                >
                  {firstView && !firstViewUploading ? (
                    <div className="relative flex items-center gap-2 p-2">
                      <img
                        src={getBlogImageSrc(firstView)}
                        alt=""
                        className="max-h-20 max-w-[120px] object-contain rounded"
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setFirstView(null)
                        }}
                        className="text-xs text-zinc-500 hover:text-red-400 transition"
                      >
                        削除
                      </button>
                    </div>
                  ) : firstViewUploading ? (
                    <span className="text-sm text-cyan-400">アップロード中...</span>
                  ) : (
                    <span className="text-sm text-zinc-500 flex items-center gap-2">
                      <ImagePlus className="w-4 h-4" />
                      画像を選択またはドロップ
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between">
        {error && (
          <p className="text-sm text-amber-400">{error}</p>
        )}
        <div className="ml-auto flex gap-2">
          {expanded && (
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="px-3 py-1.5 text-sm text-zinc-500 hover:text-zinc-300"
            >
              キャンセル
            </button>
          )}
          <button
            type="submit"
            disabled={posting || firstViewUploading || !body.trim()}
            className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:bg-zinc-600 disabled:cursor-not-allowed text-white text-sm font-medium transition"
          >
            {posting ? '投稿中...' : '投稿'}
          </button>
        </div>
      </div>
    </form>
  )
}
