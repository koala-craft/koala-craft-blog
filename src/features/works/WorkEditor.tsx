/**
 * Work 編集エディタ（ブログ編集画面を流用）
 * - フルハイトのエディタ | ライブプレビュー分割
 * - メタデータ（タイトル・期間・リンク・タグ・カテゴリ・サムネイル）は別途入力欄
 * - Ctrl+S で保存
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { MarkdownWithLinkCards } from '~/shared/components/MarkdownWithLinkCards'
import { getBlogImageSrc } from '~/shared/lib/blogImageUrl'
import { getSession } from '~/features/admin/auth'
import { uploadWorkThumbnail } from './worksApi'
import type { WorkCategory } from './types'
import { formatWorkPeriod } from './formatPeriod'

const PROSE_BASE =
  'prose prose-invert prose-zinc max-w-none tracking-tight prose-a:text-cyan-400 prose-a:no-underline hover:prose-a:underline prose-p:text-[1.05rem] prose-p:leading-[1.7] prose-li:text-[1.05rem] prose-li:my-0.5 prose-headings:font-semibold'

const CATEGORY_LABELS: Record<WorkCategory, string> = {
  professional: '実務',
  personal: '個人開発',
  sidejob: '副業',
}

export type WorkEditorMeta = {
  title: string
  startDate: string
  endDate: string
  isCurrent: boolean
  comingSoon: boolean
  href: string
  tags: string
  thumbnail: string
  category: WorkCategory
}

type WorkEditorProps = {
  meta: WorkEditorMeta
  onMetaChange: (meta: WorkEditorMeta) => void
  content: string
  onContentChange: (content: string | ((prev: string) => string)) => void
  onSave: () => void | Promise<void>
  saving: boolean
  message: { type: 'success' | 'error'; text: string } | null
  /** 編集時のみ。サムネイルファイルアップロードに使用 */
  workId?: string
  extraActions?: React.ReactNode
}

const IMAGE_EXTS: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
}

export function WorkEditor({
  meta,
  onMetaChange,
  content,
  onContentChange,
  onSave,
  saving,
  message,
  workId,
  extraActions,
}: WorkEditorProps) {
  const editorRef = useRef<HTMLTextAreaElement>(null)
  const thumbnailInputRef = useRef<HTMLInputElement>(null)
  const [showMeta, setShowMeta] = useState(true)
  const [viewMode, setViewMode] = useState<'both' | 'editor' | 'preview'>('both')
  const [thumbnailUploading, setThumbnailUploading] = useState(false)

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

  const handleThumbnailUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file || !workId) return
      const mime = file.type
      const ext = IMAGE_EXTS[mime] ?? 'png'
      if (!['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) return
      const session = await getSession()
      if (!session) return
      setThumbnailUploading(true)
      try {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => {
            const dataUrl = reader.result as string
            const match = dataUrl.match(/^data:[^;]+;base64,(.+)$/)
            resolve(match ? match[1] : '')
          }
          reader.onerror = () => reject(reader.error)
          reader.readAsDataURL(file)
        })
        const result = await uploadWorkThumbnail({
          data: {
            accessToken: session.session.access_token,
            providerToken: session.session.provider_token ?? undefined,
            workId,
            contentBase64: base64,
            filename: `thumbnail.${ext}`,
          },
        })
        if (result.success) {
          onMetaChange({ ...meta, thumbnail: result.url })
        }
      } finally {
        setThumbnailUploading(false)
        e.target.value = ''
      }
    },
    [workId, meta, onMetaChange]
  )

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] min-h-[500px] -mx-4">
      {/* ツールバー */}
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
            {meta.title || '無題'} · {CATEGORY_LABELS[meta.category]}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <div className="flex gap-1">
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

      {/* Work 専用メタデータパネル（別途入力欄） */}
      {showMeta && (
        <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-900/30 shrink-0">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="block text-xs text-zinc-500 mb-1">タイトル</label>
              <input
                type="text"
                value={meta.title}
                onChange={(e) => onMetaChange({ ...meta, title: e.target.value })}
                placeholder="プロジェクト名・業務名"
                className="w-full px-3 py-1.5 text-sm bg-zinc-800 border border-zinc-700 rounded text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">開始年月日</label>
              <input
                type="date"
                value={meta.startDate}
                onChange={(e) => onMetaChange({ ...meta, startDate: e.target.value })}
                className="w-full px-3 py-1.5 text-sm bg-zinc-800 border border-zinc-700 rounded text-zinc-100 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">終了年月日</label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={meta.endDate}
                  onChange={(e) => onMetaChange({ ...meta, endDate: e.target.value })}
                  disabled={meta.isCurrent}
                  className="flex-1 px-3 py-1.5 text-sm bg-zinc-800 border border-zinc-700 rounded text-zinc-100 focus:outline-none focus:ring-1 focus:ring-cyan-500 disabled:opacity-50"
                />
                {(meta.category === 'professional' || meta.category === 'sidejob') && (
                  <label className="flex items-center gap-1.5 shrink-0 text-sm text-zinc-400 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={meta.isCurrent}
                      onChange={(e) => onMetaChange({ ...meta, isCurrent: e.target.checked })}
                      className="rounded border-zinc-600 bg-zinc-800 text-cyan-500 focus:ring-cyan-500"
                    />
                    現在
                  </label>
                )}
              </div>
            </div>
            {meta.category === 'personal' && (
              <div className="flex items-center">
                <label className="flex items-center gap-2 text-sm text-zinc-400">
                  <input
                    type="checkbox"
                    checked={meta.comingSoon}
                    onChange={(e) => onMetaChange({ ...meta, comingSoon: e.target.checked })}
                    className="rounded border-zinc-600 bg-zinc-800 text-cyan-500 focus:ring-cyan-500"
                  />
                  Coming Soon
                </label>
              </div>
            )}
            <div>
              <label className="block text-xs text-zinc-500 mb-1">リンク URL</label>
              <input
                type="text"
                value={meta.href}
                onChange={(e) => onMetaChange({ ...meta, href: e.target.value })}
                placeholder="https://..."
                className="w-full px-3 py-1.5 text-sm bg-zinc-800 border border-zinc-700 rounded text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">カテゴリ</label>
              <select
                value={meta.category}
                onChange={(e) => onMetaChange({ ...meta, category: e.target.value as WorkCategory })}
                className="w-full px-3 py-1.5 text-sm bg-zinc-800 border border-zinc-700 rounded text-zinc-100 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              >
                <option value="personal">{CATEGORY_LABELS.personal}</option>
                <option value="professional">{CATEGORY_LABELS.professional}</option>
                <option value="sidejob">{CATEGORY_LABELS.sidejob}</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs text-zinc-500 mb-1">サムネイル画像</label>
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  value={meta.thumbnail}
                  onChange={(e) => onMetaChange({ ...meta, thumbnail: e.target.value })}
                  placeholder="URL またはファイルをアップロード"
                  className="flex-1 px-3 py-1.5 text-sm bg-zinc-800 border border-zinc-700 rounded text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
                {workId && (
                  <>
                    <input
                      ref={thumbnailInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/gif,image/webp"
                      onChange={handleThumbnailUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => thumbnailInputRef.current?.click()}
                      disabled={thumbnailUploading}
                      className="px-3 py-1.5 text-sm bg-zinc-700 hover:bg-zinc-600 rounded text-zinc-200 disabled:opacity-50 shrink-0"
                    >
                      {thumbnailUploading ? 'アップロード中...' : 'ファイル選択'}
                    </button>
                  </>
                )}
                {meta.thumbnail && (
                  <img
                    src={getBlogImageSrc(meta.thumbnail)}
                    alt=""
                    className="w-12 h-12 rounded object-cover border border-zinc-700 shrink-0"
                  />
                )}
              </div>
            </div>
            <div className="sm:col-span-2 lg:col-span-4">
              <label className="block text-xs text-zinc-500 mb-1">タグ（カンマ区切り）</label>
              <input
                type="text"
                value={meta.tags}
                onChange={(e) => onMetaChange({ ...meta, tags: e.target.value })}
                placeholder="React, TypeScript, Spring Boot"
                className="w-full px-3 py-1.5 text-sm bg-zinc-800 border border-zinc-700 rounded text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>
          </div>
        </div>
      )}

      {message && (
        <div
          className={`px-4 py-2 text-sm shrink-0 ${
            message.type === 'success' ? 'text-green-400' : 'text-amber-400'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* エディタ + プレビュー */}
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
            placeholder="# 説明&#10;&#10;ここに Markdown で説明を記述..."
            className="flex-1 w-full px-6 py-5 bg-transparent text-zinc-100 placeholder-zinc-600 focus:outline-none resize-none font-mono text-[15px] leading-[1.8]"
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
            {(meta.startDate || meta.endDate || meta.isCurrent || meta.comingSoon) && (
              <p className="text-sm text-zinc-500 mb-4">
                {formatWorkPeriod({
                  id: '',
                  title: meta.title,
                  startDate: meta.startDate || undefined,
                  endDate: meta.endDate || undefined,
                  isCurrent: meta.isCurrent,
                  comingSoon: meta.comingSoon,
                  category: meta.category,
                })}
              </p>
            )}
            <MarkdownWithLinkCards
              content={content || '*説明を入力するとプレビューが表示されます*'}
              proseClass={`${PROSE_BASE} prose-sm`}
              useNativeBr
            />
          </div>
        </div>
      </div>
    </div>
  )
}
