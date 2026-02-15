/**
 * Markdown コンテンツからリンクを抽出し、「リンクのみ」かどうかを判定する
 */

export interface ParsedLink {
  text: string
  url: string
}

/** [text](url) 形式の Markdown リンクを抽出 */
const MD_LINK_REGEX = /\[([^\]]*)\]\(([^)\s]+)\)/g

/** ベア URL を抽出（Markdown リンク内を除く） */
const BARE_URL_REGEX = /https?:\/\/[^\s\]\)<>]+/g

export function extractLinks(content: string): ParsedLink[] {
  const links: ParsedLink[] = []
  const trimmed = content.trim()
  if (!trimmed) return links

  // [text](url) 形式
  let m: RegExpExecArray | null
  MD_LINK_REGEX.lastIndex = 0
  while ((m = MD_LINK_REGEX.exec(trimmed)) !== null) {
    links.push({
      text: m[1].trim() || m[2],
      url: m[2],
    })
  }

  // ベア URL（Markdown リンクを除去した残りから）
  const withoutMdLinks = trimmed.replace(/\[[^\]]*\]\([^)\s]+\)/g, '')
  BARE_URL_REGEX.lastIndex = 0
  while ((m = BARE_URL_REGEX.exec(withoutMdLinks)) !== null) {
    links.push({
      text: m[0],
      url: m[0],
    })
  }

  return links
}

/** コンテンツがリンクのみで構成されているか */
export function isContentOnlyLinks(content: string): boolean {
  const trimmed = content.trim()
  if (!trimmed) return false

  const withoutLinks = trimmed
    .replace(/\[[^\]]*\]\([^)\s]+\)/g, '')
    .replace(/https?:\/\/[^\s\]\)<>]+/g, '')
  const remaining = withoutLinks.replace(/\s/g, '')
  return remaining.length === 0
}
