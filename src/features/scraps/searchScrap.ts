import type { ScrapComment, ScrapWithSlug } from './types'

function collectCommentText(comment: ScrapComment): string {
  let text = comment.body_markdown ?? ''
  for (const child of comment.children ?? []) {
    text += ' ' + collectCommentText(child)
  }
  return text
}

/**
 * スクラップの検索対象テキストを結合する（タイトル + 全コメント本文）
 */
export function getScrapSearchText(scrap: ScrapWithSlug): string {
  const title = scrap.title
  const commentTexts = scrap.comments.map(collectCommentText).join(' ')
  return `${title} ${commentTexts}`.toLowerCase()
}

/**
 * 最初のコメントからプレビュー用テキストを取得（Markdown 除去、最大 length 文字）
 */
export function getScrapPreview(scrap: ScrapWithSlug, maxLength = 100): string {
  if (!scrap.comments[0]) return ''
  const raw = scrap.comments[0].body_markdown ?? ''
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
 * 検索クエリがスクラップにマッチするか
 */
export function scrapMatchesSearch(
  scrap: ScrapWithSlug,
  query: string
): boolean {
  if (!query.trim()) return true
  const searchText = getScrapSearchText(scrap)
  const terms = query
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  return terms.every((term) => searchText.includes(term))
}
