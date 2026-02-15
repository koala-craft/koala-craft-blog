/**
 * WorkItem の期間表示用フォーマット
 */

import type { WorkItem } from './types'

/** YYYY-MM-DD を 2024年1月15日 形式に変換 */
function formatDateJa(dateStr: string): string {
  const m = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (!m) return dateStr
  const [, y, month, day] = m
  const mNum = parseInt(month, 10)
  const dNum = parseInt(day, 10)
  return `${y}年${mNum}月${dNum}日`
}

export function formatWorkPeriod(item: WorkItem): string {
  if (item.period) return item.period
  if (item.comingSoon) return 'Coming Soon'
  const startRaw = item.startDate ?? ''
  const endRaw = item.isCurrent ? '' : (item.endDate ?? '')
  const start = startRaw ? formatDateJa(startRaw) : ''
  const end = item.isCurrent ? '現在' : (endRaw ? formatDateJa(endRaw) : '')
  if (!start && !end) return ''
  if (!end) return start
  return `${start} - ${end}`
}
