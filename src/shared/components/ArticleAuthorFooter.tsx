import { Link } from '@tanstack/react-router'

interface ArticleAuthorFooterProps {
  authorName: string
}

export function ArticleAuthorFooter({ authorName }: ArticleAuthorFooterProps) {
  if (!authorName) return null

  return (
    <footer className="mt-12 pt-8 border-t border-zinc-700/60 text-sm text-zinc-500">
      This site is maintained by{' '}
      <Link to="/author" className="text-cyan-400 hover:underline">
        {authorName}
      </Link>
    </footer>
  )
}
