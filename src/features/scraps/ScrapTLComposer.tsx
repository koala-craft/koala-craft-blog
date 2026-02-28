/**
 * スクラップ TL 用コンポーザー（新規投稿・リプライ）
 * Twitter 風のインライン投稿
 */

import { useState } from 'react'
import { MarkdownEditorWithPreview } from '~/shared/components/MarkdownEditorWithPreview'

type ScrapTLComposerProps = {
  placeholder?: string
  onSubmit: (body: string) => Promise<void>
  onCancel?: () => void
  showCancel?: boolean
  initialFocus?: boolean
}

export function ScrapTLComposer({
  placeholder = '投稿を書く...',
  onSubmit,
  onCancel,
  showCancel = false,
  initialFocus = false,
}: ScrapTLComposerProps) {
  const [body, setBody] = useState('')
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!body.trim()) {
      setError('本文を入力してください')
      return
    }

    setPosting(true)
    try {
      await onSubmit(body.trim())
      setBody('')
    } catch (err) {
      setError(err instanceof Error ? err.message : '投稿に失敗しました')
    } finally {
      setPosting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
      <MarkdownEditorWithPreview
        value={body}
        onChange={setBody}
        placeholder={placeholder}
        rows={9}
        maxLength={5000}
        compact
        scrapStyle
        resizable
        autoFocus={initialFocus}
      />
      {error && <p className="mt-2 text-sm text-amber-400">{error}</p>}
      <div className="mt-3 flex justify-end gap-2">
        {showCancel && onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 text-sm text-zinc-500 hover:text-zinc-300"
          >
            キャンセル
          </button>
        )}
        <button
          type="submit"
          disabled={posting || !body.trim()}
          className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:bg-zinc-600 disabled:cursor-not-allowed text-white text-sm font-medium transition"
        >
          {posting ? '投稿中...' : '投稿'}
        </button>
      </div>
    </form>
  )
}
