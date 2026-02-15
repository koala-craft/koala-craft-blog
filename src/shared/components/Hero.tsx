import { ChevronDown } from 'lucide-react'

/**
 * Hero セクション: 動画背景 + サイトタイトル
 * prefers-reduced-motion の場合は動画を非表示（CSS で制御）
 */
export function Hero({
  title,
  subtitle,
  videoSrc = '/videos/191860-891640938_tiny.mp4',
}: {
  title: string
  subtitle: string
  videoSrc?: string
}) {
  return (
    <section
      className="relative w-full overflow-hidden"
      aria-labelledby="hero-title"
    >
      {/* フォールバック背景（常に表示、動画の下層） */}
      <div
        className="absolute inset-0 bg-gradient-to-b from-zinc-900 via-zinc-900/95 to-zinc-950"
        aria-hidden
      />

      {/* 動画背景（prefers-reduced-motion で非表示） */}
      <div className="hero-video-backdrop absolute inset-0">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 h-full w-full object-cover object-[center_75%]"
          aria-hidden
        >
          <source src={videoSrc} type="video/mp4" />
        </video>
        {/* 暗いオーバーレイ（テキスト可読性） */}
        <div
          className="absolute inset-0 bg-gradient-to-b from-zinc-950/80 via-zinc-950/60 to-zinc-950/90"
          aria-hidden
        />
      </div>

      {/* コンテンツ: 左下に配置して動画の中央を空ける */}
      <div className="relative flex min-h-[40vh] sm:min-h-[50vh] items-end justify-start px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12 pb-5 sm:pb-7">
        <div className="max-w-[96rem] w-full">
          <h1
            id="hero-title"
            className="text-xl font-bold tracking-tight text-zinc-100 sm:text-2xl md:text-3xl"
          >
            {title}
          </h1>
          <p className="mt-1.5 text-zinc-400 text-sm sm:text-base">
            {subtitle}
          </p>
        </div>
      </div>

      {/* スクロールインジケーター */}
      <a
        href="#main-content"
        className="hero-scroll-indicator absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-zinc-500 hover:text-zinc-400 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:ring-offset-2 focus:ring-offset-zinc-950 rounded"
        aria-label="コンテンツへスクロール"
      >
        <span className="text-xs tracking-widest uppercase">Scroll</span>
        <ChevronDown className="w-5 h-5 animate-bounce" aria-hidden />
      </a>
    </section>
  )
}
