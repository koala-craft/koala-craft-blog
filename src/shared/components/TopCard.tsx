import { useRef } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'

type TopCardProps = {
  to: string
  params?: Record<string, string>
  ariaLabel: string
  title: string
  children: React.ReactNode
}

export function TopCard({ to, params, ariaLabel, title, children }: TopCardProps) {
  const navigate = useNavigate()
  const scrollRef = useRef<HTMLDivElement>(null)

  const handleWheel = (e: React.WheelEvent) => {
    const el = scrollRef.current
    if (!el || el.scrollWidth <= el.clientWidth) return
    e.preventDefault()
    el.scrollLeft += e.deltaY
  }

  const handleScrollAreaClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    if (target.closest('a')) return
    navigate({ to, params })
  }

  return (
    <li className="relative group">
      <Link
        to={to}
        params={params}
        className="absolute inset-0 z-0 rounded-md cursor-pointer transition-colors"
        aria-label={ariaLabel}
      />
      <div className="relative z-10 flex min-h-[72px] flex-col justify-center rounded-md border border-zinc-800/80 bg-zinc-900/40 px-4 py-3.5 pointer-events-none transition-colors group-hover:border-zinc-700/60 group-hover:bg-zinc-800/50">
        <span className="truncate text-base font-medium text-zinc-100 group-hover:text-cyan-400 transition-colors">
          {title}
        </span>
        <div
          ref={scrollRef}
          className="topcard-scroll mt-2 overflow-x-auto overflow-y-hidden pointer-events-auto cursor-pointer"
          onWheel={handleWheel}
          onClick={handleScrollAreaClick}
        >
          <div className="flex min-w-max flex-nowrap items-center gap-x-2 text-xs text-zinc-500">
            {children}
          </div>
        </div>
      </div>
    </li>
  )
}
