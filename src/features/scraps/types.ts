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
  archived: boolean
  created_at: string
  comments: ScrapComment[]
}

export interface ScrapWithSlug extends Scrap {
  slug: string
}
