/**
 * ブログ執筆 UX 最適化エディタ
 * - フルハイトのエディタ | ライブプレビュー分割
 * - メタデータはコンパクトなバーに集約
 * - Ctrl+S で保存
 * - 画像の貼り付け対応（クリップボード → GitHub アップロード → Markdown 挿入）
 * - 執筆に集中できるレイアウト
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { saveBlogImageToTemp } from '~/features/blog/blogAdminApi'
import { getAdminBlogPosts } from '~/features/blog/api'
import { getSession } from '~/features/admin/auth'
import { MarkdownWithLinkCards } from '~/shared/components/MarkdownWithLinkCards'
import { getBlogImageSrc } from '~/shared/lib/blogImageUrl'

const PROSE_BASE =
  'prose prose-invert prose-zinc max-w-none tracking-tight prose-a:text-cyan-400 prose-a:no-underline hover:prose-a:underline prose-p:text-[1.05rem] prose-p:leading-[1.7] prose-li:text-[1.05rem] prose-li:my-0.5 prose-headings:font-semibold'

export type BlogEditorMeta = {
  slug?: string
  title: string
  tags: string
  visibility: 'public' | 'private'
  /** ファーストビュー用画像 URL */
  firstView?: string
}

type BlogEditorProps = {
  meta: BlogEditorMeta
  onMetaChange: (meta: BlogEditorMeta) => void
  content: string
  onContentChange: (content: string | ((prev: string) => string)) => void
  onSave: () => void | Promise<void>
  saving: boolean
  message: { type: 'success' | 'error'; text: string } | null
  /** 記事の slug（画像アップロード先 blog/assets/{slug}/ に使用） */
  slug: string
  /** 新規作成時は slug 編集可、編集時は表示のみ */
  slugEditable?: boolean
  /** 編集画面用の追加アクション（削除ボタン等） */
  extraActions?: React.ReactNode
}

const IMAGE_EXTS: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
}

/** 元のファイル名を保持。パス区切り・無効な拡張子のみ正規化（日本語対応） */
function toValidImageFilename(original: string | undefined, mimeType: string): string {
  const ext = IMAGE_EXTS[mimeType] ?? 'png'
  if (!original?.trim()) return `${Date.now()}.${ext}`

  const baseName = original.split(/[/\\]/).pop() ?? original
  const match = baseName.match(/^(.+?)\.([^.]+)$/)
  const extFromName = match && /^png|jpg|jpeg|gif|webp$/i.test(match[2]) ? match[2].toLowerCase() : ext
  const base = match ? match[1] : baseName
  const candidate = `${base}.${extFromName}`
  if (/^[^/\\]+\.(png|jpg|jpeg|gif|webp)$/.test(candidate)) return candidate
  return `${Date.now()}.${ext}`
}

export function BlogEditor({
  meta,
  onMetaChange,
  content,
  onContentChange,
  onSave,
  saving,
  message,
  slug,
  slugEditable = false,
  extraActions,
}: BlogEditorProps) {
  const editorRef = useRef<HTMLTextAreaElement>(null)
  const tagPickerRef = useRef<HTMLDivElement>(null)

  const [showMeta, setShowMeta] = useState(false)
  const [viewMode, setViewMode] = useState<'both' | 'editor' | 'preview'>('both')
  const [showArticlePreview, setShowArticlePreview] = useState(false)
  const [pasteError, setPasteError] = useState<string | null>(null)
  const [firstViewUploading, setFirstViewUploading] = useState(false)
  const [existingTags, setExistingTags] = useState<string[]>([])
  const [showTagPicker, setShowTagPicker] = useState(false)

  useEffect(() => {
    if (showMeta) {
      getAdminBlogPosts().then((posts) => {
        const tags = new Set<string>()
        for (const p of posts) {
          for (const t of p.tags) {
            if (t.trim()) tags.add(t.trim())
          }
        }
        setExistingTags([...tags].sort())
      })
    }
  }, [showMeta])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (tagPickerRef.current && !tagPickerRef.current.contains(e.target as Node)) {
        setShowTagPicker(false)
      }
    }
    if (showTagPicker) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showTagPicker])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        onSave()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onSave])

  const insertImageAtCursor = useCallback(
    (markdown: string) => {
      const textarea = editorRef.current
      if (textarea) {
        const start = textarea.selectionStart
        const end = textarea.selectionEnd
        const newContent = content.slice(0, start) + markdown + content.slice(end)
        onContentChange(newContent)
        setTimeout(() => {
          textarea.focus()
          const pos = start + markdown.length
          textarea.setSelectionRange(pos, pos)
        }, 0)
      } else {
        onContentChange(content + markdown)
      }
    },
    [content, onContentChange]
  )

  const uploadImageBlob = useCallback(
    async (blob: Blob, mimeType: string) => {
      if (!slug.trim()) {
        setPasteError('画像を貼り付けるには先にスラッグを入力してください')
        setTimeout(() => setPasteError(null), 3000)
        return
      }

      setPasteError(null)

      const session = await getSession()
      if (!session) {
        setPasteError('ログインが必要です')
        setTimeout(() => setPasteError(null), 3000)
        return
      }

      const originalName = blob instanceof File ? blob.name : undefined
      const filename = toValidImageFilename(originalName, mimeType)

      const reader = new FileReader()
      reader.onload = async () => {
        const dataUrl = reader.result as string
        if (!dataUrl.startsWith('data:')) return

        const base64 = dataUrl.split(',')[1]
        if (!base64) return

        const tempResult = await saveBlogImageToTemp({ data: { filename, contentBase64: base64 } })
        if (!tempResult.success) {
          setPasteError(tempResult.error ?? '仮保存に失敗しました')
          setTimeout(() => setPasteError(null), 3000)
          return
        }

        const tempUrl = tempResult.tempUrl
        const markdown = `\n![${filename}](${tempUrl})\n`
        insertImageAtCursor(markdown)
      }
      reader.readAsDataURL(blob)
    },
    [insertImageAtCursor, onContentChange, slug]
  )

  const handlePaste = useCallback(
    async (e: React.ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return

      const file = Array.from(items).find((item) => item.kind === 'file' && item.type.startsWith('image/'))
      if (!file) return

      const blob = file.getAsFile()
      if (!blob) return

      e.preventDefault()
      await uploadImageBlob(blob, file.type)
    },
    [uploadImageBlob]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('Files')) {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'copy'
    }
  }, [])

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      const files = e.dataTransfer?.files
      if (!files?.length) return

      const file = Array.from(files).find((f) => f.type.startsWith('image/'))
      if (!file) return

      e.preventDefault()
      await uploadImageBlob(file, file.type)
    },
    [uploadImageBlob]
  )

  const uploadFirstViewImage = useCallback(
    async (blob: Blob, mimeType: string) => {
      const session = await getSession()
      if (!session) {
        setPasteError('ログインが必要です')
        setTimeout(() => setPasteError(null), 3000)
        return
      }

      setPasteError(null)
      setFirstViewUploading(true)

      const originalName = blob instanceof File ? blob.name : undefined
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
          onMetaChange({ ...meta, firstView: result.tempUrl })
        } else {
          setPasteError(result.error ?? '仮保存に失敗しました')
          setTimeout(() => setPasteError(null), 3000)
        }
      }
      reader.readAsDataURL(blob)
    },
    [meta, onMetaChange]
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
      await uploadFirstViewImage(file, file.type)
    },
    [uploadFirstViewImage]
  )

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] min-h-[500px] -mx-4">
      {/* コンパクトツールバー */}
      <div className="flex items-center justify-between gap-4 px-4 py-2 border-b border-zinc-800 bg-zinc-900/50 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => setShowMeta((s) => !s)}
            className="shrink-0 px-2 py-1.5 rounded text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition"
            title={showMeta ? 'メタデータを閉じる' : 'メタデータを開く'}
          >
            {showMeta ? '▲' : '▼'} メタ
          </button>
          <span className="text-zinc-500 text-sm truncate">
            {meta.title || '無題'}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* 記事プレビュートグル */}
          <button
            type="button"
            onClick={() => setShowArticlePreview((s) => !s)}
            title={showArticlePreview ? '編集に戻る' : '記事プレビュー'}
            className={`p-2 rounded transition ${
              showArticlePreview
                ? 'bg-cyan-600/30 text-cyan-300'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
            }`}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="20" x="5" y="2" rx="2"/><path d="M9 6h6"/><path d="M9 10h6"/><path d="M9 14h4"/></svg>
          </button>
          <div className={`h-5 w-px bg-zinc-600/60 ${showArticlePreview ? 'hidden' : ''}`} />
          {/* 表示切替（全画面幅） */}
          <div className={`flex gap-1 ${showArticlePreview ? 'hidden' : ''}`}>
            <button
              type="button"
              onClick={() => setViewMode('both')}
              title="両方表示"
              className={`p-2 rounded transition ${
                viewMode === 'both'
                  ? 'bg-cyan-600/30 text-cyan-300'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
              }`}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="18" x="3" y="3" rx="1"/><rect width="7" height="18" x="14" y="3" rx="1"/></svg>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('editor')}
              title="編集のみ"
              className={`p-2 rounded transition ${
                viewMode === 'editor'
                  ? 'bg-cyan-600/30 text-cyan-300'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
              }`}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('preview')}
              title="プレビューのみ"
              className={`p-2 rounded transition ${
                viewMode === 'preview'
                  ? 'bg-cyan-600/30 text-cyan-300'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
              }`}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
          </div>
          {extraActions}
          <button
            type="button"
            onClick={() => onSave()}
            disabled={saving}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-zinc-600 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition"
          >
            {saving ? '保存中...' : '保存 (Ctrl+S)'}
          </button>
        </div>
      </div>

      {/* メタデータパネル（折りたたみ） */}
      {showMeta && (
        <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-900/30 shrink-0 flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {slugEditable && (
              <div>
                <label className="block text-xs text-zinc-500 mb-1">スラッグ</label>
                <input
                  type="text"
                  value={meta.slug ?? ''}
                  onChange={(e) => onMetaChange({ ...meta, slug: e.target.value })}
                  placeholder="my-post"
                  className="w-full px-3 py-1.5 text-sm bg-zinc-800 border border-zinc-700 rounded text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>
            )}
            <div>
              <label className="block text-xs text-zinc-500 mb-1">タイトル</label>
              <input
                type="text"
                value={meta.title}
                onChange={(e) => onMetaChange({ ...meta, title: e.target.value })}
                placeholder="記事のタイトル"
                className="w-full px-3 py-1.5 text-sm bg-zinc-800 border border-zinc-700 rounded text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>
            <div className="relative" ref={tagPickerRef}>
              <label className="block text-xs text-zinc-500 mb-1">タグ</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={meta.tags}
                  onChange={(e) => onMetaChange({ ...meta, tags: e.target.value })}
                  placeholder="カンマ区切り or 既存から選択"
                  className="flex-1 min-w-0 px-3 py-1.5 text-sm bg-zinc-800 border border-zinc-700 rounded text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
                <button
                  type="button"
                  onClick={() => setShowTagPicker((s) => !s)}
                  className="shrink-0 px-2 py-1.5 text-xs bg-zinc-700 hover:bg-zinc-600 rounded text-zinc-300"
                >
                  選択
                </button>
              </div>
              {showTagPicker && existingTags.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 py-1 bg-zinc-800 border border-zinc-700 rounded shadow-lg z-10 max-h-40 overflow-auto">
                  {existingTags.map((t) => {
                    const currentTags = meta.tags.split(',').map((x) => x.trim()).filter(Boolean)
                    const isSelected = currentTags.includes(t)
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => {
                          const next = isSelected
                            ? currentTags.filter((x) => x !== t)
                            : [...currentTags, t]
                          onMetaChange({ ...meta, tags: next.join(', ') })
                        }}
                        className={`w-full text-left px-3 py-1.5 text-sm hover:bg-zinc-700/80 ${
                          isSelected ? 'text-cyan-400' : 'text-zinc-300'
                        }`}
                      >
                        {isSelected ? '✓ ' : ''}{t}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">公開</label>
              <select
                value={meta.visibility}
                onChange={(e) =>
                  onMetaChange({
                    ...meta,
                    visibility: e.target.value as 'public' | 'private',
                  })
                }
                className="w-fit min-w-[100px] px-3 py-1.5 text-sm bg-zinc-800 border border-zinc-700 rounded text-zinc-100 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              >
                <option value="public">公開</option>
                <option value="private">非公開</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">ファーストビュー画像</label>
            <div
              onDragOver={handleFirstViewDragOver}
              onDrop={handleFirstViewDrop}
              className={`flex items-center justify-center gap-2 rounded border border-dashed transition min-h-[140px] max-w-[200px] ${
                firstViewUploading
                  ? 'border-cyan-500/50 bg-cyan-900/20'
                  : 'border-zinc-700/80 bg-zinc-800/50 hover:border-zinc-600/80'
              }`}
            >
              {meta.firstView && !firstViewUploading ? (
                <>
                  <img
                    src={getBlogImageSrc(meta.firstView!)}
                    alt=""
                    className="max-w-full max-h-[120px] object-contain rounded shrink-0"
                  />
                  <button
                    type="button"
                    onClick={() => onMetaChange({ ...meta, firstView: undefined })}
                    className="text-xs text-zinc-500 hover:text-red-400 transition"
                  >
                    削除
                  </button>
                </>
              ) : firstViewUploading ? (
                <span className="text-sm text-cyan-400">仮保存中...</span>
              ) : (
                <span className="text-sm text-zinc-500">画像をドロップ</span>
              )}
            </div>
          </div>
        </div>
      )}

      {(message || pasteError) && !showArticlePreview && (
        <div
          className={`px-4 py-2 text-sm shrink-0 ${
            pasteError ? 'text-amber-400' : message!.type === 'success' ? 'text-green-400' : 'text-amber-400'
          }`}
        >
          {pasteError ?? message!.text}
        </div>
      )}

      {/* 記事プレビュー（トグル ON 時） */}
      {showArticlePreview ? (
        <div className="flex-1 overflow-auto -mx-4">
          <ArticlePreview
            title={meta.title || '無題'}
            content={content}
            tags={meta.tags}
            firstView={meta.firstView}
            createdAt=""
            updatedAt=""
          />
        </div>
      ) : (
      /* エディタ + プレビュー */
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        <div
          className={`flex-1 flex flex-col min-w-0 min-h-[200px] ${
            viewMode === 'preview' ? 'hidden' : ''
          }`}
        >
          <textarea
            ref={editorRef}
            value={content}
            onChange={(e) => onContentChange(e.target.value)}
            onPaste={handlePaste}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            placeholder="# 見出し&#10;&#10;ここから書き始めてください...&#10;&#10;画像は Ctrl+V またはドラッグ＆ドロップで追加できます"
            className="blog-editor-textarea flex-1 w-full px-6 py-5 bg-transparent text-zinc-100 placeholder-zinc-600 focus:outline-none resize-none font-mono text-[15px] leading-[1.8]"
            style={{ tabSize: 2 }}
            spellCheck={false}
          />
        </div>

        <div
          className={`flex-1 flex flex-col min-w-0 min-h-[200px] overflow-auto border-t lg:border-t-0 lg:border-l border-zinc-800 ${
            viewMode === 'editor' ? 'hidden' : ''
          }`}
        >
          <div className="px-6 py-5 max-w-[100ch] mx-auto w-full">
            <h1 className="text-2xl font-bold text-zinc-100 mb-4">
              {meta.title || '無題'}
            </h1>
            <MarkdownWithLinkCards
              content={content || '*本文を入力するとプレビューが表示されます*'}
              proseClass={`${PROSE_BASE} prose-sm`}
              useNativeBr
            />
          </div>
        </div>
      </div>
      )}
    </div>
  )
}

/** ブログ記事プレビュー（blog.$slug と同じレイアウト） */
function ArticlePreview({
  title,
  content,
  tags,
  firstView,
  createdAt,
  updatedAt,
}: {
  title: string
  content: string
  tags: string
  firstView?: string
  createdAt: string
  updatedAt: string
}) {
  const tagList = tags
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)

  return (
    <div className="max-w-[96rem] mx-auto">
      <article className="pb-60 sm:px-6">
        {firstView ? (
          <div className="relative w-full aspect-[21/9] min-h-[200px] overflow-hidden">
            <img
              src={getBlogImageSrc(firstView)}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-transparent to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 px-4 py-6 sm:px-6">
              <h1 className="text-2xl sm:text-3xl font-bold text-zinc-100 leading-tight tracking-tight drop-shadow-lg">
                {title}
              </h1>
            </div>
          </div>
        ) : (
          <div className="relative w-full min-h-[200px] flex items-center justify-center px-4 py-16 bg-gradient-to-br from-cyan-900/40 via-zinc-900/60 to-violet-900/40">
            <h1 className="text-2xl sm:text-3xl font-bold text-zinc-100 leading-tight tracking-tight text-center">
              {title}
            </h1>
          </div>
        )}

        <div className="mx-auto px-4 py-8 max-w-[100ch]">
          <header>
            {tagList.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {tagList.map((t) => (
                  <span
                    key={t}
                    className="text-sm px-3 py-1.5 rounded-full bg-zinc-700/60 text-zinc-300"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}
            {(createdAt || updatedAt) && (
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-zinc-500">
                {createdAt && <time dateTime={createdAt}>{createdAt}</time>}
                {updatedAt !== createdAt && updatedAt && (
                  <span>更新: {updatedAt}</span>
                )}
              </div>
            )}
          </header>

          <div className="mx-auto max-w-[100ch]">
            <MarkdownWithLinkCards
              content={content || '*本文を入力するとプレビューが表示されます*'}
              proseClass={`${PROSE_BASE} prose-sm`}
              useNativeBr
            />
          </div>
        </div>
      </article>
    </div>
  )
}
