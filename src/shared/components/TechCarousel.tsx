/**
 * Article / Stream MEMO 用カルーセル
 * 6件/スライド、横スライドで追加表示。CSS scroll-snap で実装（依存なし）
 */

import React, { useRef, useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const ITEMS_PER_SLIDE = 6

type TechCarouselProps = {
  children: React.ReactNode[]
  /** ヘッダー（タイトル）。指定時はナビボタンをヘッダー右端に配置 */
  header?: React.ReactNode
}

function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size))
  }
  return chunks
}

export function TechCarousel({ children, header }: TechCarouselProps) {
  const items = React.Children.toArray(children)
  const slides = chunk(items, ITEMS_PER_SLIDE)
  const showNav = slides.length > 1
  const scrollRef = useRef<HTMLDivElement>(null)
  const [currentSlide, setCurrentSlide] = useState(0)

  const totalItems = items.length

  const updateCurrentSlide = useCallback(() => {
    const el = scrollRef.current
    if (!el || slides.length <= 1) return
    const slideWidth = el.clientWidth
    if (slideWidth <= 0) return
    const index = Math.round(el.scrollLeft / slideWidth)
    setCurrentSlide(Math.min(index, slides.length - 1))
  }, [slides.length])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    updateCurrentSlide()
    el.addEventListener('scroll', updateCurrentSlide)
    const ro = new ResizeObserver(updateCurrentSlide)
    ro.observe(el)
    return () => {
      el.removeEventListener('scroll', updateCurrentSlide)
      ro.disconnect()
    }
  }, [updateCurrentSlide])

  const handlePrev = () => {
    const el = scrollRef.current
    if (!el || currentSlide <= 0) return
    const slideWidth = el.clientWidth
    el.scrollBy({ left: -slideWidth, behavior: 'smooth' })
  }

  const handleNext = () => {
    const el = scrollRef.current
    if (!el || currentSlide >= slides.length - 1) return
    const slideWidth = el.clientWidth
    el.scrollBy({ left: slideWidth, behavior: 'smooth' })
  }

  if (slides.length === 0) return null

  const canGoPrev = currentSlide > 0
  const canGoNext = currentSlide < slides.length - 1
  const startItem = currentSlide * ITEMS_PER_SLIDE + 1
  const endItem = Math.min((currentSlide + 1) * ITEMS_PER_SLIDE, totalItems)

  const navButtons = showNav && (
    <div className="flex items-center gap-3 shrink-0">
      <span className="text-sm text-zinc-400 tabular-nums whitespace-nowrap">
        {startItem}-{endItem} / {totalItems}件
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={handlePrev}
          disabled={!canGoPrev}
          aria-label="前のスライド"
          className="w-8 h-8 rounded-md bg-zinc-800/90 hover:bg-zinc-700 border border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-zinc-800/90 disabled:hover:text-zinc-400"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={handleNext}
          disabled={!canGoNext}
          aria-label="次のスライド"
          className="w-8 h-8 rounded-md bg-zinc-800/90 hover:bg-zinc-700 border border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-zinc-800/90 disabled:hover:text-zinc-400"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )

  return (
    <div>
      {header ? (
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="min-w-0">{header}</div>
          {navButtons}
        </div>
      ) : (
        navButtons && <div className="flex justify-end mb-2">{navButtons}</div>
      )}
      <div
        ref={scrollRef}
        className="overflow-x-auto snap-x snap-mandatory scroll-smooth tech-carousel-scroll"
        aria-label="カード一覧（横スライドで追加表示）"
      >
        <div className="flex">
          {slides.map((slideItems, i) => (
            <div
              key={i}
              className="w-full min-w-full shrink-0 snap-start px-0.5"
            >
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {slideItems}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
