import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import { extractLinks, isContentOnlyLinks } from '~/shared/lib/contentLinks'
import { getBlogImageSrc } from '~/shared/lib/blogImageUrl'
import { isSafeLinkUrl } from '~/shared/lib/safeUrl'
import { LinkCard } from './LinkCard'

interface MarkdownWithLinkCardsProps {
  content: string
  proseClass?: string
  /** br の縦余白（例: "0.25em", "0.5em"）。未指定時は CSS 変数 --prose-br-spacing のデフォルト値 */
  brSpacing?: string
  /** true: br をネイティブのまま（p 内の line-height で余白）。false: br を prose-line-break に置換 */
  useNativeBr?: boolean
}

const DEFAULT_PROSE =
  'prose prose-invert prose-zinc max-w-none prose-a:text-cyan-400 prose-a:no-underline hover:prose-a:underline prose-p:leading-[1.7] prose-li:my-0.5'

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

/**
 * 1行がリンクのみの場合はリンクカードとして表示、
 * それ以外は通常の Markdown として表示
 *
 * 改行の構造（remarkBreaks）:
 * - 単一改行 → mdast Break → hast br（同一 p 内）
 * - 空行 → 段落区切り → 別 p タグ
 * prose-line-break（span）の挿入箇所:
 * 1. br の置換: components.br で p 内の br を span に置き換え（hasLinkOnlyLine でない場合）
 * 2. 空行の表現: hasLinkOnlyLine 時、空行を span で表現（ReactMarkdown 外）
 */
export function MarkdownWithLinkCards({
  content,
  proseClass = DEFAULT_PROSE,
  brSpacing,
  useNativeBr = false,
}: MarkdownWithLinkCardsProps) {
  if (!content.trim()) return null

  const fixedContent = fixImageUrls(content)
  const lines = fixedContent.split('\n')
  const hasLinkOnlyLine = lines.some((line) => isContentOnlyLinks(line))

  const proseStyle = {
    '--prose-br-spacing': brSpacing ?? '0.25em',
  } as React.CSSProperties

  // remarkBreaks: 単一改行→br（p 内）、空行→段落区切り（別 p）。useNativeBr 時は br をそのまま、否則は prose-line-break に置換
  const markdownComponents = {
    ...(useNativeBr ? {} : { br: () => <ProseLineBreak /> }),
    a: ({ href, ...props }: React.ComponentPropsWithoutRef<'a'>) =>
      href && isSafeLinkUrl(href) ? (
        <a href={href} rel="noopener noreferrer" target="_blank" {...props} />
      ) : (
        <span {...props} />
      ),
    img: ({ src, alt, ...props }: React.ComponentPropsWithoutRef<'img'>) =>
      src ? (
        <img
          src={getBlogImageSrc(src)}
          alt={alt ?? ''}
          loading="lazy"
          decoding="async"
          {...props}
        />
      ) : null,
  }

  if (!hasLinkOnlyLine) {
    return (
      <div className={proseClass} style={proseStyle}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkBreaks]}
          components={markdownComponents}
        >
          {fixedContent}
        </ReactMarkdown>
      </div>
    )
  }

  return (
    <div className="space-y-4" style={proseStyle}>
      {lines.map((line, i) => {
        const trimmed = line.trim()
        if (!trimmed) {
          return <ProseLineBreak key={i} />
        }
        if (isContentOnlyLinks(trimmed)) {
          const links = extractLinks(trimmed).filter((l) => isSafeLinkUrl(l.url))
          if (links.length === 0) return <ProseLineBreak key={i} />
          return (
            <div key={i} className="space-y-3">
              {links.map((link, j) => (
                <LinkCard
                  key={`${link.url}-${j}`}
                  text={link.text}
                  url={link.url}
                />
              ))}
            </div>
          )
        }
        return (
          <div key={i} className={proseClass}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkBreaks]}
              components={markdownComponents}
            >
              {fixImageUrls(line)}
            </ReactMarkdown>
          </div>
        )
      })}
    </div>
  )
}
