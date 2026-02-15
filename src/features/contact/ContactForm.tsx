import { CheckCircle2, Send } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

const INPUT_STYLES =
  'w-full px-4 py-3 bg-zinc-800/80 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 disabled:opacity-50 disabled:cursor-not-allowed'

const LABEL_STYLES = 'block text-sm font-medium text-zinc-300 mb-1.5'

function isHTMLFormElement(el: EventTarget | null): el is HTMLFormElement {
  return el instanceof HTMLFormElement
}

export function ContactForm() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [result, setResult] = useState<
    { type: 'success' | 'error'; text: string } | null
  >(null)
  const [submitted, setSubmitted] = useState(false)
  const resultRef = useRef<HTMLDivElement>(null)

  const doSubmit = async () => {
    setResult(null)
    setSending(true)
    setShowConfirmModal(false)

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message }),
      })
      const data = (await res.json()) as { success: boolean; error?: string }

      if (data.success) {
        setSubmitted(true)
      } else {
        setResult({
          type: 'error',
          text: data.error ?? '送信に失敗しました。しばらく経ってからお試しください。',
        })
        resultRef.current?.focus()
      }
    } catch {
      setResult({
        type: 'error',
        text: '送信に失敗しました。しばらく経ってからお試しください。',
      })
      resultRef.current?.focus()
    } finally {
      setSending(false)
    }
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const target = e.currentTarget
    if (!isHTMLFormElement(target)) return
    if (!target.checkValidity()) {
      target.reportValidity()
      return
    }
    setShowConfirmModal(true)
  }

  useEffect(() => {
    if (!showConfirmModal) return
    const handleEscape = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') setShowConfirmModal(false)
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [showConfirmModal])

  if (submitted) {
    return <ContactSuccess />
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6"
      noValidate
    >
      <div>
        <label htmlFor="contact-name" className={LABEL_STYLES}>
          お名前 <span className="text-zinc-500" aria-hidden>必須</span>
        </label>
        <input
          id="contact-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={100}
          autoComplete="name"
          className={INPUT_STYLES}
          placeholder="山田 太郎"
          disabled={sending}
          aria-required="true"
          aria-invalid={result?.type === 'error' ? 'true' : undefined}
        />
      </div>

      <div>
        <label htmlFor="contact-email" className={LABEL_STYLES}>
          メールアドレス <span className="text-zinc-500" aria-hidden>必須</span>
        </label>
        <input
          id="contact-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          maxLength={254}
          autoComplete="email"
          className={INPUT_STYLES}
          placeholder="example@email.com"
          disabled={sending}
          aria-required="true"
          aria-invalid={result?.type === 'error' ? 'true' : undefined}
        />
      </div>

      <div>
        <label htmlFor="contact-message" className={LABEL_STYLES}>
          お問い合わせ内容{' '}
          <span className="text-zinc-500" aria-hidden>必須</span>
        </label>
        <textarea
          id="contact-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
          maxLength={5000}
          rows={6}
          className={`${INPUT_STYLES} resize-y min-h-[140px]`}
          placeholder="お問い合わせ内容をご記入ください"
          disabled={sending}
          aria-required="true"
          aria-invalid={result?.type === 'error' ? 'true' : undefined}
          aria-describedby="contact-message-hint"
        />
        <p
          id="contact-message-hint"
          className="text-xs text-zinc-500 mt-1.5 tabular-nums"
        >
          {message.length.toLocaleString()} / 5,000 文字
        </p>
      </div>

      {result?.type === 'error' && (
        <div
          ref={resultRef}
          role="alert"
          tabIndex={-1}
          className="rounded-lg px-4 py-3 text-sm bg-amber-500/10 text-amber-400 border border-amber-500/20"
        >
          {result.text}
        </div>
      )}

      <button
        type="submit"
        disabled={sending}
        className="group inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg border border-zinc-600 bg-zinc-800/80 text-zinc-200 hover:border-cyan-500/50 hover:bg-cyan-500/10 hover:text-cyan-400 disabled:border-zinc-700 disabled:bg-zinc-800/50 disabled:text-zinc-500 disabled:cursor-not-allowed font-medium transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:ring-offset-2 focus:ring-offset-zinc-950 min-w-[140px]"
      >
        {sending ? (
          <>
            <span
              className="inline-block w-4 h-4 border-2 border-zinc-500/30 border-t-cyan-400 rounded-full animate-spin"
              aria-hidden
            />
            送信中
          </>
        ) : (
          <>
            <Send
              className="w-4 h-4 shrink-0 text-zinc-500 group-hover:text-cyan-400 transition-colors"
              aria-hidden
            />
            内容を確認する
          </>
        )}
      </button>

      {showConfirmModal && (
        <ConfirmModal
          name={name}
          email={email}
          message={message}
          onConfirm={doSubmit}
          onCancel={() => setShowConfirmModal(false)}
          sending={sending}
        />
      )}
    </form>
  )
}

function ConfirmModal({
  name,
  email,
  message,
  onConfirm,
  onCancel,
  sending,
}: {
  name: string
  email: string
  message: string
  onConfirm: () => void
  onCancel: () => void
  sending: boolean
}) {
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    cancelRef.current?.focus()
  }, [])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      aria-describedby="confirm-modal-desc"
    >
      <div
        className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm"
        aria-hidden="true"
        onClick={onCancel}
      />
      <div
        className="relative flex max-h-[90vh] w-full max-w-md flex-col rounded-xl border border-zinc-700 bg-zinc-900 shadow-xl shadow-zinc-950/50"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="overflow-y-auto p-5 sm:p-6 min-h-0">
          <h2
            id="confirm-modal-title"
            className="text-lg font-semibold text-zinc-100 mb-1"
          >
            送信内容の確認
          </h2>
          <p
            id="confirm-modal-desc"
            className="text-sm text-zinc-500 mb-4"
          >
            以下の内容で送信してよろしいですか？
          </p>
          <div className="space-y-3 rounded-lg bg-zinc-800/60 border border-zinc-700/80 p-4 text-sm">
            <div>
              <span className="text-zinc-500 block text-xs mb-0.5">お名前</span>
              <p className="text-zinc-200 break-words">{name}</p>
            </div>
            <div>
              <span className="text-zinc-500 block text-xs mb-0.5">メールアドレス</span>
              <p className="text-zinc-200 break-all">{email}</p>
            </div>
            <div>
              <span className="text-zinc-500 block text-xs mb-0.5">お問い合わせ内容</span>
              <p className="text-zinc-200 whitespace-pre-wrap break-words">{message}</p>
            </div>
          </div>
        </div>
        <div className="flex shrink-0 gap-3 px-5 sm:px-6 pb-5 sm:pb-6">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={sending}
            className="flex-1 px-4 py-2.5 rounded-lg border border-zinc-600 bg-zinc-800/80 text-zinc-300 hover:border-zinc-500 hover:text-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:ring-offset-2 focus:ring-offset-zinc-900"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={sending}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-cyan-500/50 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 hover:border-cyan-500/70 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:ring-offset-2 focus:ring-offset-zinc-900"
          >
            {sending ? (
              <>
                <span
                  className="inline-block w-3.5 h-3.5 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin"
                  aria-hidden
                />
                送信中
              </>
            ) : (
              <>
                <Send className="w-4 h-4 shrink-0" aria-hidden />
                送信する
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

function ContactSuccess() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    containerRef.current?.focus()
  }, [])

  return (
    <div
      ref={containerRef}
      className="max-w-md mx-auto text-center py-12"
      role="status"
      aria-live="polite"
      tabIndex={-1}
    >
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-400 mb-6">
        <CheckCircle2 className="w-10 h-10" aria-hidden />
      </div>
      <h2 className="text-xl font-semibold text-zinc-100 mb-2">
        送信完了
      </h2>
      <p className="text-zinc-500 text-sm leading-relaxed">
        お問い合わせいただきありがとうございます。
        内容を確認のうえ、2〜3営業日以内にご返信いたします。
      </p>
    </div>
  )
}
