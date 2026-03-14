/**
 * 記事（Article）執筆エディタ
 * ブログと同様の UX、topics（タグ）形式
 * 本文への画像ドロップ・貼り付け対応
 */

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ImagePlus } from 'lucide-react'
import { saveBlogImageToTemp } from '~/features/blog/blogAdminApi'
import { getSession } from '~/features/admin/auth'
import { getBlogImageSrc } from '~/shared/lib/blogImageUrl'
import { MarkdownWithLinkCards } from '~/shared/components/MarkdownWithLinkCards'
import { ARTICLE_EDITOR_FILE_DROP, type ArticleEditorFileDropDetail } from '~/features/blog/GlobalDropCapture'

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

/** 本文用画像のファイル名（firstview プレフィックスなし） */
function toBodyImageFilename(original: string | undefined, mimeType: string): string {
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

export type ArticleEditorMeta = {
  slug?: string
  title: string
  topics: string
  visibility: 'public' | 'private'
  firstView?: string
}

type ArticleEditorProps = {
  meta: ArticleEditorMeta
  onMetaChange: (meta: ArticleEditorMeta) => void
  content: string
  onContentChange: (content: string | ((prev: string) => string)) => void
  onSave: () => void | Promise<void>
  saving: boolean
  message: { type: 'success' | 'error'; text: string } | null
  slug: string
  slugEditable?: boolean
  extraActions?: React.ReactNode
}

const PROSE_BASE =
  'prose prose-invert prose-zinc max-w-none tracking-tight prose-a:text-cyan-400 prose-a:no-underline prose-p:text-[1.05rem] prose-p:leading-[1.7] prose-li:text-[1.05rem] prose-li:my-0.5 prose-headings:font-semibold'

export function ArticleEditor({
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
}: ArticleEditorProps) {
  const editorRef = useRef<HTMLTextAreaElement>(null)
  const editorContainerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showMeta, setShowMeta] = useState(false)
  const [viewMode, setViewMode] = useState<'both' | 'editor' | 'preview'>('both')
  const [firstViewUploading, setFirstViewUploading] = useState(false)
  const [pasteError, setPasteError] = useState<string | null>(null)

  const insertImageAtCursor = useCallback(
    (markdown: string, position?: { start: number; end: number }) => {
      const textarea = editorRef.current
      if (textarea && position !== undefined) {
        onContentChange((prev) => prev.slice(0, position.start) + markdown + prev.slice(position.end))
        setTimeout(() => {
          textarea.focus()
          const pos = position.start + markdown.length
          textarea.setSelectionRange(pos, pos)
        }, 0)
      } else if (textarea) {
        const start = textarea.selectionStart
        const end = textarea.selectionEnd
        onContentChange((prev) => prev.slice(0, start) + markdown + prev.slice(end))
        setTimeout(() => {
          textarea.focus()
          const pos = start + markdown.length
          textarea.setSelectionRange(pos, pos)
        }, 0)
      } else {
        onContentChange((prev) => prev + markdown)
      }
    },
    [onContentChange]
  )

  const uploadImageBlob = useCallback(
    async (blob: Blob, mimeType: string, cursorPosition?: { start: number; end: number }) => {
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
      const filename = toBodyImageFilename(originalName, mimeType)
      const reader = new FileReader()
      reader.onload = async () => {
        try {
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
          const markdown = `\n![${filename}](${tempResult.tempUrl})\n`
          insertImageAtCursor(markdown, cursorPosition)
        } catch (err) {
          setPasteError(err instanceof Error ? err.message : '画像の添付に失敗しました')
          setTimeout(() => setPasteError(null), 3000)
        }
      }
      reader.readAsDataURL(blob)
    },
    [insertImageAtCursor, slug]
  )
  const uploadImageBlobRef = useRef(uploadImageBlob)
  uploadImageBlobRef.current = uploadImageBlob

  const uploadFirstViewImage = useCallback(
    async (blob: Blob, mimeType: string, originalName?: string) => {
      setFirstViewUploading(true)
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
        }
      }
      reader.readAsDataURL(blob)
    },
    [meta, onMetaChange]
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

  useLayoutEffect(() => {
    const handleCustomDrop = (e: Event) => {
      const { files, clientX, clientY } = (e as CustomEvent<ArticleEditorFileDropDetail>).detail
      const container = editorContainerRef.current
      if (!container) return
      const rect = container.getBoundingClientRect()
      if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) return
      const file = files.find((f) => f.type.startsWith('image/'))
      if (!file) return
      const textarea = editorRef.current
      const cursorPos =
        textarea != null ? { start: textarea.selectionStart, end: textarea.selectionEnd } : undefined
      uploadImageBlobRef.current(file, file.type, cursorPos)
    }
    window.addEventListener(ARTICLE_EDITOR_FILE_DROP, handleCustomDrop)
    return () => window.removeEventListener(ARTICLE_EDITOR_FILE_DROP, handleCustomDrop)
  }, [])

  useEffect(() => {
    const el = editorContainerRef.current
    if (!el) return
    const handleNativeDragOver = (e: Event) => {
      const ev = e as DragEvent
      if (ev.dataTransfer) {
        ev.preventDefault()
        ev.stopPropagation()
        ev.dataTransfer.dropEffect = 'copy'
      }
    }
    const handleNativeDrop = (e: Event) => {
      const ev = e as DragEvent
      const files = ev.dataTransfer?.files
      if (!files?.length) return
      ev.preventDefault()
      ev.stopPropagation()
      const file = Array.from(files).find((f) => f.type.startsWith('image/'))
      if (!file) return
      const textarea = editorRef.current
      const cursorPos =
        textarea != null ? { start: textarea.selectionStart, end: textarea.selectionEnd } : undefined
      uploadImageBlobRef.current(file, file.type, cursorPos)
    }
    const opts = { capture: true }
    el.addEventListener('dragover', handleNativeDragOver, opts)
    el.addEventListener('drop', handleNativeDrop, opts)
    return () => {
      el.removeEventListener('dragover', handleNativeDragOver, opts)
      el.removeEventListener('drop', handleNativeDrop, opts)
    }
  }, [viewMode])

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return
      const file = Array.from(items).find((item) => item.kind === 'file' && item.type.startsWith('image/'))
      if (!file) return
      const blob = file.getAsFile()
      if (!blob) return
      e.preventDefault()
      const start = editorRef.current?.selectionStart ?? 0
      const end = editorRef.current?.selectionEnd ?? 0
      uploadImageBlob(blob, file.type, { start, end })
    },
    [uploadImageBlob]
  )

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] min-h-[500px] -mx-4">
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
          <span className="text-zinc-500 text-sm truncate">{meta.title || '無題'}</span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {(['both', 'editor', 'preview'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setViewMode(m)}
              className={`px-2 py-1 rounded text-xs ${
                viewMode === m ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {m === 'both' ? '分割' : m === 'editor' ? '編集' : 'プレビュー'}
            </button>
          ))}
          <button
            type="button"
            onClick={() => onSave()}
            disabled={saving}
            className="ml-2 px-3 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 disabled:bg-zinc-600 disabled:cursor-not-allowed text-white text-sm font-medium"
          >
            {saving ? '保存中...' : '保存'}
          </button>
          {extraActions}
        </div>
      </div>

      {showMeta && (
        <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-900/30 shrink-0 space-y-3">
          <div className="flex flex-wrap gap-4">
            {slugEditable && (
              <div>
                <label className="block text-xs text-zinc-500 mb-1">スラッグ</label>
                <input
                  type="text"
                  value={meta.slug ?? ''}
                  onChange={(e) => onMetaChange({ ...meta, slug: e.target.value })}
                  placeholder="article-slug"
                  className="px-2 py-1.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm w-48"
                />
              </div>
            )}
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs text-zinc-500 mb-1">タイトル</label>
              <input
                type="text"
                value={meta.title ?? ''}
                onChange={(e) => onMetaChange({ ...meta, title: e.target.value })}
                placeholder="記事タイトル"
                className="w-full px-2 py-1.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">topics（カンマ区切り）</label>
              <input
                type="text"
                value={meta.topics ?? ''}
                onChange={(e) => onMetaChange({ ...meta, topics: e.target.value })}
                placeholder="react, typescript"
                className="px-2 py-1.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm w-48"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">公開</label>
              <select
                value={meta.visibility}
                onChange={(e) =>
                  onMetaChange({ ...meta, visibility: e.target.value as 'public' | 'private' })
                }
                className="px-2 py-1.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm"
              >
                <option value="public">公開</option>
                <option value="private">非公開</option>
              </select>
            </div>
            <div className="w-full min-w-[200px]">
              <label className="block text-xs text-zinc-500 mb-1.5">ヘッダー画像</label>
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
                {meta.firstView && !firstViewUploading ? (
                  <div className="relative flex items-center gap-2 p-2">
                    <img
                      src={getBlogImageSrc(meta.firstView)}
                      alt=""
                      className="max-h-20 max-w-[120px] object-contain rounded"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        onMetaChange({ ...meta, firstView: undefined })
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
        </div>
      )}

      {(message || pasteError) && (
        <div
          className={`px-4 py-2 text-sm shrink-0 ${
            pasteError ? 'text-amber-400' : message!.type === 'success' ? 'text-green-400' : 'text-amber-400'
          }`}
        >
          {pasteError ?? message!.text}
        </div>
      )}

      <div className="flex-1 flex min-h-0 overflow-hidden">
        {(viewMode === 'both' || viewMode === 'editor') && (
          <div
            ref={editorContainerRef}
            className="flex-1 min-w-0 flex flex-col border-r border-zinc-800"
          >
            <textarea
              ref={editorRef}
              value={content}
              onChange={(e) => onContentChange(e.target.value)}
              onPaste={handlePaste}
              placeholder="本文を Markdown で記述...（画像は Ctrl+V またはドラッグ＆ドロップで追加できます）"
              className="flex-1 w-full px-4 py-4 bg-transparent text-zinc-100 placeholder-zinc-600 resize-none focus:outline-none font-mono text-sm leading-relaxed"
              spellCheck={false}
            />
          </div>
        )}
        {(viewMode === 'both' || viewMode === 'preview') && (
          <div className="flex-1 min-w-0 overflow-auto px-4 py-4">
            <div className={`${PROSE_BASE} max-w-none`}>
              <MarkdownWithLinkCards content={content || '*プレビュー*'} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
