/**
 * スクラップ TL 形式エディタ
 * タイトル・タグ・コメント（TL）の編集
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { ImagePlus, Eye, Code } from 'lucide-react'
import { saveBlogImageToTemp } from '~/features/blog/blogAdminApi'
import { getBlogImageSrc } from '~/shared/lib/blogImageUrl'
import { MarkdownWithLinkCards } from '~/shared/components/MarkdownWithLinkCards'
import type { ScrapComment } from './types'

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

export type ScrapEditorMeta = {
  slug?: string
  title: string
  tags: string
  firstView?: string
  closed?: boolean
  closed_reason?: string
}

type ScrapEditorProps = {
  meta: ScrapEditorMeta
  onMetaChange: (meta: ScrapEditorMeta) => void
  comments: ScrapComment[]
  onCommentsChange: (comments: ScrapComment[]) => void
  onSave: () => void | Promise<void>
  saving: boolean
  message: { type: 'success' | 'error'; text: string } | null
  slug: string
  slugEditable?: boolean
  extraActions?: React.ReactNode
}

const PROSE_BASE =
  'prose prose-invert prose-zinc max-w-none prose-a:text-cyan-400 prose-a:no-underline'

export function ScrapEditor({
  meta,
  onMetaChange,
  comments,
  onCommentsChange,
  onSave,
  saving,
  message,
  slug,
  slugEditable = false,
  extraActions,
}: ScrapEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)
  const [commentViewMode, setCommentViewMode] = useState<Record<number, 'editor' | 'preview'>>({})
  const [firstViewUploading, setFirstViewUploading] = useState(false)

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

  const addComment = useCallback(() => {
    const now = new Date().toISOString().slice(0, 10)
    onCommentsChange([
      ...comments,
      {
        author: 'author',
        created_at: now,
        body_markdown: '',
        body_updated_at: now,
        children: [],
      },
    ])
    setExpandedIndex(comments.length)
  }, [comments, onCommentsChange])

  const updateComment = useCallback(
    (index: number, updates: Partial<ScrapComment>) => {
      const next = [...comments]
      next[index] = { ...next[index], ...updates }
      onCommentsChange(next)
    },
    [comments, onCommentsChange]
  )

  const removeComment = useCallback(
    (index: number) => {
      onCommentsChange(comments.filter((_, i) => i !== index))
      setExpandedIndex(null)
      setCommentViewMode({})
    },
    [comments, onCommentsChange]
  )

  return (
    <div className="flex flex-col min-h-[500px] -mx-4">
      <div className="flex items-center justify-between gap-4 px-4 py-2 border-b border-zinc-800 bg-zinc-900/50 shrink-0">
        <span className="text-zinc-500 text-sm truncate">{meta.title || '無題'}</span>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onSave()}
            disabled={saving}
            className="px-3 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 disabled:bg-zinc-600 disabled:cursor-not-allowed text-white text-sm font-medium"
          >
            {saving ? '保存中...' : '保存'}
          </button>
          {extraActions}
        </div>
      </div>

      {message && (
        <div
          className={`px-4 py-2 text-sm shrink-0 ${
            message.type === 'success' ? 'text-green-400' : 'text-amber-400'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="flex-1 px-4 py-6 space-y-6">
        <div className="space-y-3 p-4 rounded-lg bg-zinc-900/40 border border-zinc-800">
          <h3 className="text-sm font-medium text-zinc-400">メタデータ</h3>
          <div className="flex flex-wrap gap-4">
            {slugEditable && (
              <div>
                <label className="block text-xs text-zinc-500 mb-1">スラッグ</label>
                <input
                  type="text"
                  value={meta.slug ?? ''}
                  onChange={(e) => onMetaChange({ ...meta, slug: e.target.value })}
                  placeholder="scrap-slug"
                  className="px-2 py-1.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm w-48"
                />
              </div>
            )}
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs text-zinc-500 mb-1">タイトル</label>
              <input
                type="text"
                value={meta.title}
                onChange={(e) => onMetaChange({ ...meta, title: e.target.value })}
                placeholder="Stream タイトル"
                className="w-full px-2 py-1.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">タグ（カンマ区切り、末尾に [tag] 形式で表示）</label>
              <input
                type="text"
                value={meta.tags}
                onChange={(e) => onMetaChange({ ...meta, tags: e.target.value })}
                placeholder="tag1, tag2"
                className="px-2 py-1.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm w-48"
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={meta.closed ?? false}
                  onChange={(e) => onMetaChange({ ...meta, closed: e.target.checked })}
                  className="rounded border-zinc-600 bg-zinc-800 text-cyan-600 focus:ring-cyan-500"
                />
                <span className="text-xs text-zinc-500">クローズ済み</span>
              </label>
              {meta.closed && (
                <div className="flex-1 min-w-[180px]">
                  <input
                    type="text"
                    value={meta.closed_reason ?? ''}
                    onChange={(e) => onMetaChange({ ...meta, closed_reason: e.target.value })}
                    placeholder="クローズ理由（任意）"
                    className="w-full px-2 py-1.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm"
                  />
                </div>
              )}
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

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-zinc-400">TL（コメント）</h3>
            <button
              type="button"
              onClick={addComment}
              className="px-3 py-1.5 rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-200 text-sm"
            >
              + コメント追加
            </button>
          </div>

          {comments.length === 0 ? (
            <p className="text-zinc-500 text-sm py-4">コメントがありません。追加ボタンで TL を追加してください。</p>
          ) : (
            <div className="space-y-4">
              {comments.map((c, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-zinc-800 bg-zinc-900/40 overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setExpandedIndex(expandedIndex === i ? null : i)}
                    className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-zinc-800/50 transition"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-zinc-500 text-xs shrink-0">{c.created_at}</span>
                      <span className="text-zinc-400 text-sm truncate">by {c.author}</span>
                      <span className="text-zinc-600 text-sm truncate">
                        {c.body_markdown
                          ? c.body_markdown.length > 50
                            ? `${c.body_markdown.slice(0, 50)}...`
                            : c.body_markdown
                          : '(空)'}
                      </span>
                    </div>
                    <span className="text-zinc-500 shrink-0">
                      {expandedIndex === i ? '▲' : '▼'}
                    </span>
                  </button>
                  {expandedIndex === i && (
                    <div className="px-4 py-3 border-t border-zinc-800 space-y-3">
                      <div>
                        <label className="block text-xs text-zinc-500 mb-1">author</label>
                        <input
                          type="text"
                          value={c.author}
                          onChange={(e) => updateComment(i, { author: e.target.value })}
                          className="w-full px-2 py-1.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm"
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <label className="text-xs text-zinc-500">本文（Markdown）</label>
                          <div className="flex rounded-lg overflow-hidden border border-zinc-700">
                            <button
                              type="button"
                              onClick={() => setCommentViewMode((prev) => ({ ...prev, [i]: 'editor' }))}
                              className={`flex items-center gap-1 px-2 py-1 text-xs transition ${
                                (commentViewMode[i] ?? 'editor') === 'editor'
                                  ? 'bg-zinc-700 text-zinc-100'
                                  : 'bg-zinc-800/50 text-zinc-500 hover:text-zinc-300'
                              }`}
                            >
                              <Code className="w-3 h-3" />
                              編集
                            </button>
                            <button
                              type="button"
                              onClick={() => setCommentViewMode((prev) => ({ ...prev, [i]: 'preview' }))}
                              className={`flex items-center gap-1 px-2 py-1 text-xs transition ${
                                (commentViewMode[i] ?? 'editor') === 'preview'
                                  ? 'bg-zinc-700 text-zinc-100'
                                  : 'bg-zinc-800/50 text-zinc-500 hover:text-zinc-300'
                              }`}
                            >
                              <Eye className="w-3 h-3" />
                              プレビュー
                            </button>
                          </div>
                        </div>
                        <div className="flex gap-3 min-h-[180px]">
                          <div
                            className={`flex-1 min-w-0 ${
                              (commentViewMode[i] ?? 'editor') === 'preview' ? 'hidden' : ''
                            }`}
                          >
                            <textarea
                              value={c.body_markdown}
                              onChange={(e) =>
                                updateComment(i, {
                                  body_markdown: e.target.value,
                                  body_updated_at: new Date().toISOString().slice(0, 10),
                                })
                              }
                              rows={6}
                              className="w-full px-2 py-1.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm font-mono resize-y"
                            />
                          </div>
                          <div
                            className={`flex-1 min-w-0 overflow-auto rounded bg-zinc-800/50 border border-zinc-700/80 px-3 py-2 ${
                              (commentViewMode[i] ?? 'editor') === 'editor' ? 'hidden' : ''
                            }`}
                          >
                            <div className={`${PROSE_BASE} text-sm text-zinc-300`}>
                              <MarkdownWithLinkCards
                                content={c.body_markdown || '*プレビューがここに表示されます*'}
                                proseClass={`${PROSE_BASE} prose-sm`}
                                useNativeBr
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => removeComment(i)}
                          className="px-3 py-1.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded"
                        >
                          削除
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
