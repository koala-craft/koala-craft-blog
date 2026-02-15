import { isSafeImageUrl } from './safeUrl'

/**
 * ブログ画像 URL の変換
 * - raw.githubusercontent.com → プロキシ経由（ローカル優先、なければ GitHub）
 * - blog/assets/ 相対パス → プロキシ経由（ローカル優先、なければ GitHub）
 * - /api/blog-assets/ → そのまま（temp や proxy の結果）
 * XSS 対策: javascript:, data:text/html 等の危険な URL はブロック
 */
export function getBlogImageSrc(src: string): string {
  if (!isSafeImageUrl(src)) {
    return 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
  }
  if (src.startsWith('https://raw.githubusercontent.com/')) {
    return `/api/blog-assets/proxy?url=${encodeURIComponent(src)}`
  }
  const normalized = src.replace(/^\/+/, '').replace(/\\/g, '/')
  if (
    (normalized.startsWith('blog/assets/') ||
      normalized.startsWith('content/blog/assets/') ||
      normalized.startsWith('.obsidian-log/author-icon') ||
      normalized.startsWith('.obsidian-log/works/')) &&
    /\.(png|jpg|jpeg|gif|webp)$/i.test(normalized)
  ) {
    const pathParam = normalized.startsWith('content/')
      ? normalized.replace(/^content\//, '')
      : normalized
    return `/api/blog-assets/proxy?path=${encodeURIComponent(pathParam)}`
  }
  if (src.includes(' ') || /[\u3000-\u9FFF]/.test(src)) {
    return encodeURI(src)
  }
  return src
}
