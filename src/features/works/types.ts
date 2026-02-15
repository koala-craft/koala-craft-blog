export type WorkCategory = 'personal' | 'professional' | 'sidejob'

export type WorkItem = {
  id: string
  title: string
  /** 開始年月日（YYYY-MM-DD） */
  startDate?: string
  /** 終了年月日（YYYY-MM-DD）。isCurrent の場合は無視 */
  endDate?: string
  /** 終了が「現在」の場合 true */
  isCurrent?: boolean
  /** 個人開発: Coming Soon 表示 */
  comingSoon?: boolean
  /** Markdown 対応 */
  description?: string
  href?: string
  tags?: string[]
  /** サムネイル画像 URL（raw.githubusercontent.com 等） */
  thumbnail?: string
  category: WorkCategory
  /** @deprecated 後方互換用。startDate/endDate/isCurrent を優先 */
  period?: string
}

export type WorksData = {
  items: WorkItem[]
}
