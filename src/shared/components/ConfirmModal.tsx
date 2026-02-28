/**
 * 確認用モーダル（削除確認など）
 */

import { useEffect, useRef } from 'react'

type ConfirmModalProps = {
  isOpen: boolean
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'default'
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmModal({
  isOpen,
  title,
  description,
  confirmLabel = '確認',
  cancelLabel = 'キャンセル',
  variant = 'default',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (isOpen) {
      cancelRef.current?.focus()
    }
  }, [isOpen])

  if (!isOpen) return null

  const confirmClass =
    variant === 'danger'
      ? 'px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:ring-offset-2 focus:ring-offset-zinc-900'
      : 'px-4 py-2.5 rounded-lg border border-cyan-500/50 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 hover:border-cyan-500/70 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:ring-offset-2 focus:ring-offset-zinc-900'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      aria-describedby={description ? 'confirm-modal-desc' : undefined}
    >
      <div
        className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm"
        aria-hidden="true"
        onClick={onCancel}
      />
      <div
        className="relative flex w-full max-w-md flex-col rounded-xl border border-zinc-700 bg-zinc-900 shadow-xl shadow-zinc-950/50"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 sm:p-6">
          <h2
            id="confirm-modal-title"
            className="text-lg font-semibold text-zinc-100 mb-1"
          >
            {title}
          </h2>
          {description && (
            <p
              id="confirm-modal-desc"
              className="text-sm text-zinc-400 mt-1 mb-4"
            >
              {description}
            </p>
          )}
        </div>
        <div className="flex gap-3 px-5 sm:px-6 pb-5 sm:pb-6">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-lg border border-zinc-600 bg-zinc-800/80 text-zinc-300 hover:border-zinc-500 hover:text-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-500/50 focus:ring-offset-2 focus:ring-offset-zinc-900"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 ${confirmClass}`}
          >
            {loading ? (
              <>
                <span
                  className="inline-block w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin mr-1.5 align-middle"
                  aria-hidden
                />
                処理中...
              </>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
