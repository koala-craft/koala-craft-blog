import type { Article } from './types'

/**
 * 記事本文からプレビュー用テキストを取得（Markdown 除去、最大 length 文字）
 */
export function getArticlePreview(article: Article, maxLength = 100): string {
  const raw = article.content ?? ''
  const plain = raw
    .replace(/#{1,6}\s+/g, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^[-*]\s+/gm, '')
    .replace(/\n+/g, ' ')
    .trim()
  return plain.length > maxLength ? plain.slice(0, maxLength) + '…' : plain
}

/**
 * 記事の検索対象テキストを結合する（タイトル + 本文）
 */
export function getArticleSearchText(article: Article): string {
  return `${article.title} ${article.content}`.toLowerCase()
}

/**
 * 検索クエリが記事にマッチするか
 */
export function articleMatchesSearch(article: Article, query: string): boolean {
  if (!query.trim()) return true
  const searchText = getArticleSearchText(article)
  const terms = query
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  return terms.every((term) => searchText.includes(term))
}
