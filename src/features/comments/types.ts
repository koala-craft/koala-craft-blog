export type ContentType = 'blog' | 'article' | 'stream'

export interface Comment {
  id: string
  content_type: ContentType
  content_slug: string
  parent_id: string | null
  body: string
  author_name: string
  author_email: string | null
  created_at: string
  updated_at: string
  children?: Comment[]
}
