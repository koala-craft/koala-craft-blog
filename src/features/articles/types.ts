export interface Article {
  slug: string
  title: string
  content: string
  createdAt: string
  tags: string[]
  visibility: 'public' | 'private'
  /** ヘッダー画像 URL。未設定時はグラデーション背景 */
  firstView?: string
}
