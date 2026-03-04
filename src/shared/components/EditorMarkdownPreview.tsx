import { useMemo, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { isSafeLinkUrl } from '~/shared/lib/safeUrl'
import { getBlogImageSrc } from '~/shared/lib/blogImageUrl'

type EditorMarkdownPreviewProps = {
  content: string
  onContentChange?: (content: string) => void
}

const CHECKBOX_UNCHECKED = /^(\s*[-*+])\s+\[ \]\s*/
const CHECKBOX_CHECKED = /^(\s*[-*+])\s+\[x\]\s*/i

function findCheckboxLines(content: string): number[] {
  const lines: number[] = []
  content.split('\n').forEach((line, i) => {
    if (CHECKBOX_UNCHECKED.test(line) || CHECKBOX_CHECKED.test(line)) {
      lines.push(i)
    }
  })
  return lines
}

function toggleCheckboxAtLine(content: string, lineIndex: number): string {
  const lines = content.split('\n')
  const line = lines[lineIndex]
  if (!line) return content
  if (CHECKBOX_UNCHECKED.test(line)) {
    lines[lineIndex] = line.replace(CHECKBOX_UNCHECKED, '$1 [x] ')
  } else if (CHECKBOX_CHECKED.test(line)) {
    lines[lineIndex] = line.replace(CHECKBOX_CHECKED, '$1 [ ] ')
  }
  return lines.join('\n')
}

export function EditorMarkdownPreview({ content, onContentChange }: EditorMarkdownPreviewProps) {
  const checkboxIndexRef = useRef(0)
  const checkboxLinesRef = useRef<number[]>([])

  const components = useMemo(
    () => ({
      input: (props: React.InputHTMLAttributes<HTMLInputElement> & { node?: unknown }) => {
        if (props.type !== 'checkbox') {
          return <input {...props} />
        }
        const idx = checkboxIndexRef.current++
        const handleClick = (e: React.MouseEvent) => {
          e.preventDefault()
          if (!onContentChange) return
          const lines = checkboxLinesRef.current
          if (idx < lines.length) {
            const newContent = toggleCheckboxAtLine(content, lines[idx])
            onContentChange(newContent)
          }
        }
        const inputEl = (
          <input
            {...props}
            type="checkbox"
            readOnly
            className={onContentChange ? 'cursor-pointer' : undefined}
          />
        )
        return onContentChange ? (
          <span
            role="button"
            tabIndex={0}
            onClick={handleClick}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                handleClick(e as unknown as React.MouseEvent)
              }
            }}
            className="inline-flex cursor-pointer"
          >
            {inputEl}
          </span>
        ) : (
          inputEl
        )
      },
      a: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => {
        const url = href ?? ''
        if (url && isSafeLinkUrl(url)) {
          return (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              {...props}
            >
              {children}
            </a>
          )
        }
        return <a href={url} {...props}>{children}</a>
      },
      img: ({ src, alt, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) => {
        if (!src) return null
        const resolved = getBlogImageSrc(src)
        return (
          // eslint-disable-next-line jsx-a11y/alt-text
          <img
            src={resolved}
            alt={alt}
            className="max-w-full rounded-lg my-2"
            loading="lazy"
            decoding="async"
            {...props}
          />
        )
      },
      table: ({ children, ...props }: React.HTMLAttributes<HTMLTableElement>) => (
        <div className="overflow-x-auto editor-preview-table-wrapper">
          <table {...props}>{children}</table>
        </div>
      ),
    }),
    [content, onContentChange]
  )

  checkboxIndexRef.current = 0
  checkboxLinesRef.current = findCheckboxLines(content)

  return (
    <div className="editor-preview">
      {content ? (
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
          {content}
        </ReactMarkdown>
      ) : (
        <p className="text-zinc-500 text-sm">プレビュー</p>
      )}
    </div>
  )
}

