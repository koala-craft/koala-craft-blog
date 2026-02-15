import { createFileRoute, Link } from '@tanstack/react-router'
import { getAdminBlogPosts } from '~/features/blog/api'
import type { BlogPost } from '~/features/blog/types'
import { BlogCard } from '~/shared/components/BlogCard'

export const Route = createFileRoute('/admin/blog/')({
  component: AdminBlogIndex,
  loader: () => getAdminBlogPosts(),
})

function groupByMonth(posts: BlogPost[]): Map<string, BlogPost[]> {
  const map = new Map<string, BlogPost[]>()
  for (const p of posts) {
    const key = formatMonthKey(p.createdAt)
    const list = map.get(key) ?? []
    list.push(p)
    map.set(key, list)
  }
  return map
}

function formatMonthKey(dateStr: string): string {
  const base = dateStr.split('T')[0] ?? dateStr
  const [y, m] = base.split('-')
  return `${y}-${m ?? '01'}`
}

function formatMonthLabel(key: string): string {
  const [y, m] = key.split('-')
  const month = m ? parseInt(m, 10) : 1
  return `${y}年${month}月`
}

function AdminBlogIndex() {
  const posts = Route.useLoaderData()
  const grouped = groupByMonth(posts)
  const sortedKeys = Array.from(grouped.keys()).sort((a, b) => b.localeCompare(a))

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">ブログ管理</h1>
        <Link
          to="/admin/blog/new"
          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded transition"
        >
          新規作成
        </Link>
      </div>

      {posts.length === 0 ? (
        <p className="text-zinc-500 mb-4">記事がありません。</p>
      ) : (
        <div className="space-y-8">
          {sortedKeys.map((key) => (
            <section key={key}>
              <h2 className="text-lg font-semibold text-zinc-400 mb-4">
                {formatMonthLabel(key)}
              </h2>
              <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {grouped.get(key)!.map((p) => (
                  <BlogCard key={p.slug} post={p} adminMode />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
