/**
 * XSS 対策: 危険な URL スキームをブロック
 */

/** リンク（a href）用: http/https のみ許可 */
export function isSafeLinkUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false
  const trimmed = url.trim().toLowerCase()
  if (trimmed.startsWith('javascript:')) return false
  if (trimmed.startsWith('data:')) return false
  if (trimmed.startsWith('vbscript:')) return false
  if (trimmed.startsWith('file:')) return false
  return trimmed.startsWith('http://') || trimmed.startsWith('https://')
}

/** 画像（img src）用: http/https、data:image/*、同一オリジンの /api/blog-assets/、blog/assets/ 相対パスのみ許可 */
export function isSafeImageUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false
  const trimmed = url.trim()
  const lower = trimmed.toLowerCase()
  if (lower.startsWith('javascript:')) return false
  if (lower.startsWith('vbscript:')) return false
  if (lower.startsWith('file:')) return false
  if (lower.startsWith('data:')) {
    return lower.startsWith('data:image/')
  }
  if (trimmed.startsWith('/api/blog-assets/')) return true
  const normalized = trimmed.replace(/^\/+/, '').replace(/\\/g, '/')
  if (
    (normalized.startsWith('blog/assets/') ||
      normalized.startsWith('content/blog/assets/') ||
      normalized.startsWith('.obsidian-log/author-icon') ||
      normalized.startsWith('.obsidian-log/works/')) &&
    /\.(png|jpg|jpeg|gif|webp)$/i.test(normalized)
  ) {
    return true
  }
  return lower.startsWith('http://') || lower.startsWith('https://')
}
