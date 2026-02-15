/**
 * タイトル末尾の [tag1] [tag2] 形式でタグをパースする。
 * 末尾に連続する [xxx] のみをタグとして扱い、それ以外は表示用タイトルとする。
 */
export function parseScrapTitle(
  title: string
): { displayTitle: string; tags: string[] } {
  const match = title.match(/^(.*?)((?:\[[^\]]+\]\s*)+)$/s)
  if (!match) {
    return { displayTitle: title.trim(), tags: [] }
  }
  const displayTitle = match[1].trim()
  const tagPart = match[2]
  const tags = [...tagPart.matchAll(/\[([^\]]+)\]/g)].map((m) => m[1])
  return { displayTitle, tags }
}
