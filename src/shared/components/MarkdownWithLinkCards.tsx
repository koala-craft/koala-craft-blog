import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useState } from 'react'
import { getBlogImageSrc } from '~/shared/lib/blogImageUrl'
import { isSafeLinkUrl } from '~/shared/lib/safeUrl'
import { LinkCard } from './LinkCard'

interface MarkdownWithLinkCardsProps {
  content: string
  proseClass?: string
  /** br の縦余白（例: "0.25em", "0.5em"）。未指定時は CSS 変数 --prose-br-spacing のデフォルト値 */
  brSpacing?: string
  /** true: br をネイティブのまま（p 内の line-height で余白）。false: br を prose-line-break に置換。デフォルト true で折り返しと同様の行間 */
  useNativeBr?: boolean
  /** temp URL → data URL。本番で /api/blog-assets/temp が 404 になるため、プレビュー用に data URL を渡す */
  tempImageDataUrls?: Record<string, string>
}

const DEFAULT_PROSE =
  'prose prose-invert prose-zinc max-w-none prose-a:text-cyan-400 prose-a:no-underline prose-p:leading-[1.7] prose-li:my-0.5'

// 段落内のテキストノードがベア URL のみかどうか判定するための簡易正規表現
const BARE_URL_REGEX = /^https?:\/\/[^\s\]\)<>]+$/

/** 画像 URL にスペースや日本語が含まれる場合、Markdown が途中で切れるのを防ぐため <url> で囲む */
function fixImageUrls(content: string): string {
  return content.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, url) => {
    const needsWrap = /[\s<>]/.test(url) || /[\u3000-\u9FFF\uFF00-\uFFFF]/.test(url)
    return needsWrap ? `![${alt}](<${url}>)` : `![${alt}](${url})`
  })
}

function ProseLineBreak() {
  return <span className="prose-line-break" aria-hidden="true" />
}

function ZoomableImage({
  src,
  alt,
  className,
  onClick,
  tempImageDataUrls,
  ...props
}: React.ComponentPropsWithoutRef<'img'> & { tempImageDataUrls?: Record<string, string> }) {
  const [open, setOpen] = useState(false)
  if (!src) return null
  const resolved = tempImageDataUrls?.[src] ?? getBlogImageSrc(src)

  const handleClick: React.MouseEventHandler<HTMLImageElement> = (e) => {
    onClick?.(e)
    e.stopPropagation()
    setOpen(true)
  }

  return (
    <>
      <img
        src={resolved}
        alt={alt ?? ''}
        loading="lazy"
        decoding="async"
        className={`${className ?? ''} cursor-zoom-in`}
        onClick={handleClick}
        {...props}
      />
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 cursor-zoom-out"
          onClick={() => setOpen(false)}
        >
          <img
            src={resolved}
            alt={alt ?? ''}
            className="max-w-[90vw] max-h-[90vh] object-contain"
          />
        </div>
      )}
    </>
  )
}

/**
 * 1行（1段落）がリンクのみの場合はリンクカードとして表示、
 * それ以外は通常の Markdown として表示。
 *
 * ReactMarkdown に全文を渡しつつ、p コンポーネントで判定することで
 * コードブロックや複雑な構造を壊さないようにしている。
 */
export function MarkdownWithLinkCards({
  content,
  proseClass = DEFAULT_PROSE,
  brSpacing,
  useNativeBr = true,
  tempImageDataUrls,
}: MarkdownWithLinkCardsProps) {
  if (!content || !String(content).trim()) return null

  const fixedContent = fixImageUrls(content)

  const proseStyle = {
    '--prose-br-spacing': brSpacing ?? '0.25em',
  } as React.CSSProperties

  const markdownComponents = {
    ...(useNativeBr ? {} : { br: () => <ProseLineBreak /> }),
    p: ({
      children,
      node,
      ...props
    }: React.HTMLAttributes<HTMLParagraphElement> & { node?: any }) => {
      const paragraph = node as any
      const childNodes: any[] = paragraph?.children ?? []

      if (paragraph?.type === 'element' && paragraph.tagName === 'p' && Array.isArray(childNodes)) {
        const links: { url: string; text: string }[] = []
        let hasNonLinkContent = false

        for (const child of childNodes) {
          if (child.type === 'element' && child.tagName === 'a') {
            const url = (child.properties?.href ?? '') as string
            const textNode = Array.isArray(child.children) ? child.children[0] : null
            const text =
              textNode && typeof textNode.value === 'string' && textNode.value.trim()
                ? (textNode.value as string)
                : url
            links.push({ url, text })
          } else if (child.type === 'text') {
            const v = typeof child.value === 'string' ? child.value.trim() : ''
            if (!v) continue
            if (BARE_URL_REGEX.test(v)) {
              links.push({ url: v, text: v })
            } else {
              hasNonLinkContent = true
              break
            }
          } else {
            // コードや他の要素が混じっている場合は通常の段落として扱う
            hasNonLinkContent = true
            break
          }
        }

        const safeLinks = links.filter((l) => isSafeLinkUrl(l.url))
        if (!hasNonLinkContent && safeLinks.length > 0) {
          return (
            <div className="space-y-3 mb-4">
              {safeLinks.map((link, idx) => (
                <LinkCard key={`${link.url}-${idx}`} text={link.text} url={link.url} />
              ))}
            </div>
          )
        }
      }

      return <p {...props}>{children}</p>
    },
    a: ({ href, ...props }: React.ComponentPropsWithoutRef<'a'>) =>
      href && isSafeLinkUrl(href) ? (
        <a href={href} rel="noopener noreferrer" target="_blank" {...props} />
      ) : (
        <span {...props} />
      ),
    img: (props: React.ComponentPropsWithoutRef<'img'>) => (
      <ZoomableImage {...props} tempImageDataUrls={tempImageDataUrls} />
    ),
  }

  return (
    <div className={proseClass} style={proseStyle}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {fixedContent}
      </ReactMarkdown>
    </div>
  )
}
