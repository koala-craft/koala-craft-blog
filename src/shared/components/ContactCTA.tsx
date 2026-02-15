import { Link } from '@tanstack/react-router'
import { Mail } from 'lucide-react'
import { useEffect, useState } from 'react'
import { getContactAvailable } from '~/features/contact/contactApi'

export function ContactCTA() {
  const [available, setAvailable] = useState<boolean | null>(null)

  useEffect(() => {
    getContactAvailable().then(setAvailable)
  }, [])

  if (available === null) {
    return (
      <section
        className="relative z-10 border-t border-zinc-800"
        aria-hidden="true"
      >
        <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col items-center gap-3">
            <div className="h-4 w-28 animate-pulse rounded bg-zinc-800" />
            <div className="h-3 w-48 animate-pulse rounded bg-zinc-800/60" />
            <div className="h-9 w-32 animate-pulse rounded bg-zinc-800" />
          </div>
        </div>
      </section>
    )
  }

  if (available !== true) return null

  return (
    <section
      className="relative z-10 border-t border-zinc-800 overflow-hidden"
      aria-labelledby="contact-cta-heading"
    >
      {/* 背景グラデーション */}
      <div
        className="absolute inset-0 bg-gradient-to-b from-cyan-950/20 via-transparent to-transparent pointer-events-none"
        aria-hidden="true"
      />
      <div className="relative w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-center gap-4 sm:gap-8">
          <div>
            <h2
              id="contact-cta-heading"
              className="text-lg font-semibold text-zinc-100 tracking-tight"
            >
              Contact Me!
            </h2>
            <p className="text-zinc-500 text-sm mt-0.5">
              お仕事のご依頼・ご要望はこちらから
            </p>
          </div>
          <Link
            to="/contact"
            className="group inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-zinc-300 border border-zinc-600 rounded-md hover:border-cyan-500/50 hover:text-cyan-400 transition-colors focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:ring-offset-2 focus:ring-offset-zinc-950 shrink-0"
          >
            <Mail className="w-4 h-4 shrink-0" aria-hidden />
            お問い合わせ
            <span className="text-zinc-500 group-hover:text-cyan-400 transition-colors" aria-hidden>
              →
            </span>
          </Link>
        </div>
      </div>
    </section>
  )
}
