import { useState, useCallback, useRef } from 'react'
import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { ImagePlus } from 'lucide-react'
import { getArticle } from '~/features/articles/api'
import { updateArticle } from '~/features/articles/articlesAdminApi'
import { saveBlogImageToTemp } from '~/features/blog/blogAdminApi'
import { getBlogImageSrc } from '~/shared/lib/blogImageUrl'
import { MarkdownWithLinkCards } from '~/shared/components/MarkdownWithLinkCards'
import { ArticleAuthorFooter } from '~/shared/components/ArticleAuthorFooter'
import { CommentSection } from '~/shared/components/CommentSection'
import { useSiteAuthor } from '~/shared/hooks/useSiteAuthor'
import { useAuth } from '~/features/admin/useAuth'
import { getSession } from '~/features/admin/auth'

const PROSE_BASE =
  'prose prose-invert prose-zinc max-w-none tracking-tight prose-a:text-cyan-400 prose-a:no-underline prose-p:text-[1.05rem] prose-p:leading-[1.7] prose-li:text-[1.05rem] prose-li:my-0.5 prose-headings:font-semibold'

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

export const Route = createFileRoute('/articles/$slug')({
  component: ArticleDetail,
  loader: async ({ params }) => {
    const article = await getArticle({ data: { slug: params.slug } })
    if (!article) throw notFound()
    return { article }
  },
})

function ArticleDetail() {
  const { article: initialArticle } = Route.useLoaderData()
  const [article, setArticle] = useState(initialArticle)
  const authorName = useSiteAuthor()
  const { isAdmin } = useAuth()
  const [firstViewUploading, setFirstViewUploading] = useState(false)
  const [firstViewSaving, setFirstViewSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
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
      const result = await updateArticle({
        data: {
          accessToken: session.session.access_token,
          providerToken: session.session.provider_token ?? undefined,
          slug: article.slug,
          title: article.title,
          content: article.content,
          topics: article.tags,
          visibility: article.visibility,
          firstView: newFirstView ?? '',
        },
      })
      setFirstViewSaving(false)

      if (result.success) {
        setArticle((prev) => ({ ...prev, firstView: newFirstView || undefined }))
      } else {
        setError(result.error ?? '画像の保存に失敗しました')
      }
    },
    [article.slug, article.title, article.content, article.tags, article.visibility]
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

  return (
    <div className="max-w-[96rem] mx-auto">
    <article className="pb-60 sm:px-6">
      {/* ファーストビュー: firstView あり → 画像、なし → タイトル＋グラデーション */}
      {article.firstView ? (
        <div className="relative w-full aspect-[21/9] min-h-[200px] overflow-hidden">
          <img
            src={getBlogImageSrc(article.firstView!)}
            alt=""
            fetchPriority="high"
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-transparent to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 px-4 py-6 sm:px-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-zinc-100 leading-tight tracking-tight drop-shadow-lg">
              {article.title}
            </h1>
          </div>
        </div>
      ) : (
        <div className="relative w-full min-h-[200px] flex items-center justify-center px-4 py-16 bg-gradient-to-br from-cyan-900/40 via-zinc-900/60 to-violet-900/40">
          <h1 className="text-2xl sm:text-3xl font-bold text-zinc-100 leading-tight tracking-tight text-center">
            {article.title}
          </h1>
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
                {article.firstView && !firstViewUploading && !firstViewSaving ? (
                  <div className="relative flex items-center gap-2 p-2">
                    <img
                      src={getBlogImageSrc(article.firstView)}
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
              {error && <p className="text-sm text-amber-400 mt-2">{error}</p>}
            </div>
          </details>
        </div>
      )}

      <div className="mx-auto px-4 py-8 max-w-[100ch]">
        <header>
        {article.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {article.tags.map((t) => (
              <Link
                key={t}
                to="/articles"
                search={{ tag: t }}
                className="text-sm px-3 py-1.5 rounded-full bg-zinc-700/60 text-zinc-300 hover:bg-zinc-600/60 hover:text-zinc-100 transition"
              >
                {t}
              </Link>
            ))}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-zinc-500">
          <time dateTime={article.createdAt}>{article.createdAt}</time>
        </div>
      </header>

      {/* 本文: 65-70文字/行の最適読書幅、16px基準、行間1.75 */}
      <div className="mx-auto max-w-[100ch]">
        <MarkdownWithLinkCards
          content={article.content}
          proseClass={`${PROSE_BASE} prose-sm`}
          useNativeBr
        />
        <CommentSection contentType="article" contentSlug={article.slug} scrapStyle />
        <ArticleAuthorFooter authorName={authorName} />
      </div>
      </div>
    </article>
    </div>
  )
}
