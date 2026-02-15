/**
 * 日付文字列の表示用フォーマット
 * createdAt / updatedAt は YYYY-MM-DD または YYYY-MM-DDTHH:mm:ss 形式を想定
 */

/**
 * 日付を表示用に整形（YYYY-MM-DD または YYYY-MM-DD HH:mm）
 */
export function formatDateForDisplay(dateStr: string): string {
  if (!dateStr || typeof dateStr !== 'string') return ''
  const trimmed = dateStr.trim()
  if (!trimmed) return ''
  // YYYY-MM-DDTHH:mm:ss → YYYY-MM-DD HH:mm
  if (trimmed.includes('T')) {
    const [datePart, timePart] = trimmed.split('T')
    if (timePart) {
      const hm = timePart.slice(0, 5) // HH:mm
      return `${datePart} ${hm}`
    }
  }
  return trimmed
}
