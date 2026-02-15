import { useEffect, useState } from 'react'
import type { ParsedLink } from '~/shared/lib/contentLinks'
import { fetchPageMetadata } from '~/shared/api/fetchPageMetadata'
import { isSafeImageUrl } from '~/shared/lib/safeUrl'

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

function getFaviconUrl(domain: string): string {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`
}

export function LinkCard({ text, url }: ParsedLink) {
  const domain = getDomain(url)
  const [metadata, setMetadata] = useState<{
    title: string | null
    image: string | null
  }>({ title: null, image: null })
  const [imageError, setImageError] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetchPageMetadata({ data: { url } }).then(({ title, image }) => {
      if (!cancelled) setMetadata({ title, image })
    })
    return () => {
      cancelled = true
    }
  }, [url])

  const displayText =
    metadata.title ?? (text === url ? domain : text)
  const showImage = metadata.image && isSafeImageUrl(metadata.image) && !imageError

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex w-full items-center gap-3 rounded-md border border-zinc-700/80 border-l-2 border-l-transparent bg-zinc-800/60 px-4 py-2.5 shadow-sm transition hover:border-cyan-500/50 hover:border-l-cyan-500/70 hover:bg-zinc-800/90 hover:shadow-md"
    >
      {showImage ? (
        <img
          src={metadata.image!}
          alt=""
          className="h-12 w-14 shrink-0 rounded-sm object-cover"
          loading="lazy"
          onError={() => setImageError(true)}
        />
      ) : (
        <img
          src={getFaviconUrl(domain)}
          alt=""
          className="h-6 w-6 shrink-0 rounded-sm"
          loading="lazy"
        />
      )}
      <div className="min-w-0 flex-1">
        <span className="block truncate font-medium text-zinc-200">
          {displayText}
        </span>
        <span className="block truncate text-xs text-zinc-500">{domain}</span>
      </div>
      <span
        className="shrink-0 text-zinc-500 opacity-70 transition group-hover:opacity-100 group-hover:text-cyan-400"
        aria-hidden
      >
        ↗
      </span>
    </a>
  )
}
