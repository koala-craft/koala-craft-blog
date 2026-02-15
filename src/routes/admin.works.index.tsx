import { createFileRoute, Link } from '@tanstack/react-router'
import { getWorks } from '~/features/works/worksApi'
import { formatWorkPeriod } from '~/features/works/formatPeriod'
import type { WorkCategory } from '~/features/works/types'

export const Route = createFileRoute('/admin/works/')({
  component: AdminWorksIndex,
  loader: () => getWorks(),
})

const CATEGORY_LABELS: Record<WorkCategory, string> = {
  personal: '個人開発',
  professional: '実務',
  sidejob: '副業',
}

function AdminWorksIndex() {
  const { items } = Route.useLoaderData()
  const professionalItems = items.filter((i) => i.category === 'professional')
  const personalItems = items.filter((i) => i.category === 'personal')
  const sidejobItems = items.filter((i) => i.category === 'sidejob')

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Work 管理</h1>
        <div className="flex gap-2 flex-wrap">
          <Link
            to="/admin/works/new"
            search={{ category: 'personal' }}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded transition"
          >
            個人開発を新規作成
          </Link>
          <Link
            to="/admin/works/new"
            search={{ category: 'professional' }}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded transition"
          >
            実務を新規作成
          </Link>
          <Link
            to="/admin/works/new"
            search={{ category: 'sidejob' }}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-medium rounded transition"
          >
            副業を新規作成
          </Link>
        </div>
      </div>

      <p className="text-zinc-500 mb-6">
        Author ページの「お仕事・制作物」を管理します。説明は Markdown で記述できます。
      </p>

      <div className="space-y-8 max-w-2xl">
        {(['personal', 'professional', 'sidejob'] as const).map((cat) => {
          const list =
            cat === 'professional'
              ? professionalItems
              : cat === 'personal'
                ? personalItems
                : sidejobItems
          return (
            <section key={cat}>
              <h2 className="text-lg font-semibold text-zinc-200 mb-4">
                {CATEGORY_LABELS[cat]}
              </h2>
              {list.length === 0 ? (
                <p className="text-zinc-500 text-sm py-4">項目がありません。</p>
              ) : (
                <ul className="space-y-3">
                  {list.map((item) => (
                    <li key={item.id}>
                      <Link
                        to="/admin/works/$id"
                        params={{ id: item.id }}
                        className="block p-4 rounded-lg border border-zinc-800 bg-zinc-900/50 hover:border-zinc-700 hover:bg-zinc-900/80 transition"
                      >
                        <h3 className="font-medium text-zinc-100">{item.title}</h3>
                        {formatWorkPeriod(item) && (
                          <span className="text-xs text-zinc-500 ml-2">
                            {formatWorkPeriod(item)}
                          </span>
                        )}
                        {item.description && (
                          <p className="mt-2 text-sm text-zinc-400 line-clamp-2">
                            {item.description.replace(/#{1,6}\s/g, '').replace(/\n/g, ' ').slice(0, 120)}
                            {item.description.length > 120 ? '...' : ''}
                          </p>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )
        })}
      </div>
    </div>
  )
}
