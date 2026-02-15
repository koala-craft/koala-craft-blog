export interface BlogPost {
  slug: string
  title: string
  content: string
  createdAt: string
  updatedAt: string
  tags: string[]
  visibility: 'public' | 'private'
  /** ファーストビュー用画像 URL。未設定時はグラデーション背景のヒーローを表示 */
  firstView?: string
}
