export interface Article {
  slug: string
  title: string
  content: string
  createdAt: string
  tags: string[]
  visibility: 'public' | 'private'
}
