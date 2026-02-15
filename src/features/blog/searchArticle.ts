import type { BlogPost } from './types'

export function getBlogPostSearchText(post: BlogPost): string {
  return `${post.title} ${post.content}`.toLowerCase()
}

export function blogPostMatchesSearch(post: BlogPost, query: string): boolean {
  if (!query.trim()) return true
  const searchText = getBlogPostSearchText(post)
  const terms = query
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  return terms.every((term) => searchText.includes(term))
}
