import { createServerFn } from '@tanstack/react-start'

const FETCH_TIMEOUT_MS = 5000
const MAX_HTML_LENGTH = 100_000

/** SSRF対策: プライベート・内部IP・localhost をブロック */
function isBlockedHost(hostname: string): boolean {
  const lower = hostname.toLowerCase()
  if (lower === 'localhost' || lower.endsWith('.localhost')) return true
  if (lower === '0.0.0.0') return true

  // IPv4
  const ipv4Match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (ipv4Match) {
    const [, a, b, c] = ipv4Match.map(Number)
    if (a === 127) return true // 127.0.0.0/8
    if (a === 10) return true // 10.0.0.0/8
    if (a === 172 && b >= 16 && b <= 31) return true // 172.16.0.0/12
    if (a === 192 && b === 168) return true // 192.168.0.0/16
    if (a === 169 && b === 254) return true // 169.254.0.0/16
    if (a === 0) return true
  }

  // IPv6
  if (hostname === '::1' || hostname === '[::1]') return true
  if (hostname.startsWith('fe80:') || hostname.startsWith('[fe80:')) return true // link-local
  if (hostname.startsWith('fd') || hostname.startsWith('[fd')) return true // unique local

  return false
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
}

function extractTitle(html: string): string | null {
  const decode = (s: string) => decodeHtmlEntities(s.trim())

  // og:title を優先
  const ogMatch = html.match(
    /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i
  )
  if (ogMatch) return decode(ogMatch[1])

  // twitter:title
  const twMatch = html.match(
    /<meta[^>]+name=["']twitter:title["'][^>]+content=["']([^"']+)["']/i
  )
  if (twMatch) return decode(twMatch[1])

  // content が先のパターン
  const contentFirstMatch = html.match(
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i
  )
  if (contentFirstMatch) return decode(contentFirstMatch[1])

  // <title>
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  if (titleMatch) {
    const raw = titleMatch[1]
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
    return decode(raw)
  }

  return null
}

function extractImage(html: string, baseUrl: string): string | null {
  const resolve = (path: string) => {
    try {
      return new URL(path, baseUrl).href
    } catch {
      return null
    }
  }

  // og:image を優先
  const ogMatch = html.match(
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i
  )
  if (ogMatch) return resolve(ogMatch[1].trim())

  const ogContentFirst = html.match(
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i
  )
  if (ogContentFirst) return resolve(ogContentFirst[1].trim())

  // twitter:image
  const twMatch = html.match(
    /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i
  )
  if (twMatch) return resolve(twMatch[1].trim())

  const twContentFirst = html.match(
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i
  )
  if (twContentFirst) return resolve(twContentFirst[1].trim())

  return null
}

export const fetchPageMetadata = createServerFn({ method: 'GET' })
  .inputValidator((data: { url: string }) => data)
  .handler(async ({ data }): Promise<{ title: string | null; image: string | null }> => {
    const url = data.url
    try {
      const parsed = new URL(url)
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return { title: null, image: null }
      }
      if (isBlockedHost(parsed.hostname)) {
        return { title: null, image: null }
      }

      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (compatible; ObsidianLog/1.0; +https://github.com)',
        },
        redirect: 'follow',
      })
      clearTimeout(timeout)

      if (!res.ok) return { title: null, image: null }

      const contentType = res.headers.get('content-type') ?? ''
      if (!contentType.includes('text/html')) return { title: null, image: null }

      const html = (await res.text()).slice(0, MAX_HTML_LENGTH)
      const baseUrl = res.url || url
      const title = extractTitle(html)
      let image = extractImage(html, baseUrl)
      if (image) {
        try {
          const imgHost = new URL(image).hostname
          if (isBlockedHost(imgHost)) image = null
        } catch {
          image = null
        }
      }
      return { title, image }
    } catch {
      return { title: null, image: null }
    }
  })
