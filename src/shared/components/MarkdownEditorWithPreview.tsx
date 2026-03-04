/**
 * Markdown 編集 + プレビュー切り替え
 * スクラップ投稿・コメント・編集フォームで共通利用
 *
 * プレビューは MarkdownWithLinkCards を使い、
 * URL だけの行をリンクカードとして表示する。
 */

import { useState } from 'react'
import { Code, Eye } from 'lucide-react'
import { MarkdownWithLinkCards } from './MarkdownWithLinkCards'

const PROSE_BASE =
  'prose prose-invert prose-zinc max-w-none prose-a:text-cyan-400 prose-a:no-underline hover:prose-a:underline prose-sm [&>*:first-child]:!mt-0'

type MarkdownEditorWithPreviewProps = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rows?: number
  maxLength?: number
  /** コンパクト表示（投稿・返信用） */
  compact?: boolean
  /** スクラップ投稿用: 入力・プレビューとも元のフォームスタイルを維持 */
  scrapStyle?: boolean
  /** 縦方向にリサイズ可能にする */
  resizable?: boolean
  /** 文字数表示（メインコメント用） */
  showCharCount?: boolean
  /** テキストエリアにフォーカス */
  autoFocus?: boolean
  id?: string
  className?: string
}

export function MarkdownEditorWithPreview({
  value,
  onChange,
  placeholder = 'Markdown が使えます',
  rows = 4,
  maxLength,
  compact = false,
  scrapStyle = false,
  resizable = false,
  showCharCount = false,
  autoFocus = false,
  id,
  className = '',
}: MarkdownEditorWithPreviewProps) {
  const [viewMode, setViewMode] = useState<'editor' | 'preview'>('editor')

  const resizeClass = resizable ? 'resize-y min-h-0' : 'resize-none'

  const inputBase = scrapStyle
    ? `w-full px-3 py-2 bg-transparent text-zinc-100 text-sm placeholder-zinc-500 ${resizeClass} focus:outline-none border-b border-zinc-800 focus:border-cyan-500/50 transition-colors`
    : compact
      ? 'w-full px-0 py-2 bg-transparent border-0 border-b border-zinc-600 text-zinc-100 text-sm placeholder-zinc-600 focus:outline-none focus:border-cyan-500/70 focus:placeholder-zinc-500 resize-y transition-colors'
      : 'w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 resize-y'

  return (
    <div className={className}>
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex rounded-lg overflow-hidden border border-zinc-700">
          <button
            type="button"
            onClick={() => setViewMode('editor')}
            className={`flex items-center gap-1 px-2 py-1 text-xs transition ${
              viewMode === 'editor'
                ? 'bg-zinc-700 text-zinc-100'
                : 'bg-zinc-800/50 text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Code className="w-3 h-3" />
            編集
          </button>
          <button
            type="button"
            onClick={() => setViewMode('preview')}
            className={`flex items-center gap-1 px-2 py-1 text-xs transition ${
              viewMode === 'preview'
                ? 'bg-zinc-700 text-zinc-100'
                : 'bg-zinc-800/50 text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Eye className="w-3 h-3" />
            プレビュー
          </button>
        </div>
      </div>
      {viewMode === 'editor' ? (
        <div>
          <textarea
            id={id}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows={rows}
            maxLength={maxLength}
            autoFocus={autoFocus}
            className={inputBase}
          />
          {showCharCount && (
            <p
              className={`mt-1 text-xs tabular-nums transition-colors ${
                value.length >= 4500 ? 'text-amber-500/70' : 'text-zinc-600'
              }`}
            >
              {value.length.toLocaleString()} / 5,000
            </p>
          )}
        </div>
      ) : scrapStyle ? (
        <div className="min-h-[80px] overflow-auto border-b border-zinc-800 px-3 py-2">
          <div className={`${PROSE_BASE} text-zinc-300`}>
            <MarkdownWithLinkCards
              content={value || '*プレビューがここに表示されます*'}
              proseClass={`${PROSE_BASE} prose-sm`}
              useNativeBr
            />
          </div>
        </div>
      ) : (
        <div className="rounded-lg bg-zinc-800/50 border border-zinc-700/80 px-3 py-2 min-h-[80px] overflow-auto">
          <div className={`${PROSE_BASE} text-zinc-300`}>
            <MarkdownWithLinkCards
              content={value || '*プレビューがここに表示されます*'}
              proseClass={`${PROSE_BASE} prose-sm`}
              useNativeBr
            />
          </div>
        </div>
      )}
    </div>
  )
}

