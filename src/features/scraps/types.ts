export interface ScrapComment {
  author: string
  created_at: string
  body_markdown: string
  body_updated_at?: string
  children?: ScrapComment[]
}

export interface Scrap {
  title: string
  closed: boolean
  /** クローズ理由。closed が true のとき表示 */
  closed_reason?: string
  archived: boolean
  created_at: string
  comments: ScrapComment[]
  /** ヘッダー画像 URL。未設定時はグラデーション背景 */
  firstView?: string
}

export interface ScrapWithSlug extends Scrap {
  slug: string
}
