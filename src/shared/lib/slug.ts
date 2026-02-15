const SLUG_REGEX = /^[a-zA-Z0-9_-]+$/

export function validateSlug(slug: string): boolean {
  return SLUG_REGEX.test(slug) && !slug.includes('..') && !slug.includes('/')
}
