import { createFileRoute, Link } from '@tanstack/react-router'
import { FileText, Settings, Briefcase, ChevronRight } from 'lucide-react'

export const Route = createFileRoute('/admin/')({
  component: AdminDashboard,
})

const PANELS = [
  {
    to: '/admin/blog',
    title: 'ブログ',
    description: 'ブログ記事の作成・編集・削除',
    icon: FileText,
    iconBg: 'bg-cyan-500/15',
    iconColor: 'text-cyan-400',
  },
  {
    to: '/admin/works',
    title: 'Work',
    description: 'Author ページのお仕事・制作物の管理',
    icon: Briefcase,
    iconBg: 'bg-emerald-500/15',
    iconColor: 'text-emerald-400',
  },
  {
    to: '/admin/settings',
    title: 'サイト設定',
    description: 'GitHub URL・作者アイコン・Zenn ユーザー名など',
    icon: Settings,
    iconBg: 'bg-amber-500/15',
    iconColor: 'text-amber-400',
  },
] as const

function AdminDashboard() {
  return (
    <div className="max-w-4xl">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-zinc-100 tracking-tight">
          管理ダッシュボード
        </h1>
        <p className="mt-2 text-zinc-500">
          サイトのコンテンツと設定を管理します
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PANELS.map(({ to, title, description, icon: Icon, iconBg, iconColor }) => (
          <Link
            key={to}
            to={to}
            className="group relative flex items-start gap-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 transition-all hover:border-zinc-700 hover:bg-zinc-900/80 hover:shadow-lg hover:shadow-zinc-950/50"
          >
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${iconBg} ${iconColor}`}
            >
              <Icon className="h-5 w-5" strokeWidth={2} />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold text-zinc-100 group-hover:text-cyan-400 transition-colors">
                {title}
              </h2>
              <p className="mt-1 text-sm text-zinc-500 leading-relaxed">
                {description}
              </p>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-zinc-600 group-hover:text-cyan-500/80 group-hover:translate-x-0.5 transition-all" />
          </Link>
        ))}
      </div>
    </div>
  )
}
