/**
 * Work エリア - ブログ一覧と同じカード形式で表示
 */

import { useState } from 'react'
import type { WorkItem, WorkCategory } from '~/features/works/types'
import { WorkCard } from './WorkCard'

const CATEGORY_CONFIG: Record<WorkCategory, { label: string }> = {
  personal: { label: '個人開発' },
  professional: { label: '実務' },
  sidejob: { label: '副業' },
}

type WorkSectionProps = {
  personalItems: WorkItem[]
  professionalItems: WorkItem[]
  sidejobItems: WorkItem[]
}

export function WorkSection({ personalItems, professionalItems, sidejobItems }: WorkSectionProps) {
  const [activeTab, setActiveTab] = useState<WorkCategory>('personal')

  const items =
    activeTab === 'personal'
      ? personalItems
      : activeTab === 'professional'
        ? professionalItems
        : sidejobItems

  return (
    <section className="pt-8 mt-8 border-t border-zinc-800">
      <h2 className="text-xl font-semibold text-zinc-200 mb-1">Work</h2>
      <p className="text-sm text-zinc-500 mb-4">
        これまで携わったお仕事や制作物
      </p>

      <div className="flex rounded-lg bg-zinc-900/80 p-0.5 border border-zinc-800 mb-6">
        <button
          type="button"
          onClick={() => setActiveTab('personal')}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'personal'
              ? 'bg-zinc-700 text-zinc-100'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          {CATEGORY_CONFIG.personal.label}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('professional')}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'professional'
              ? 'bg-zinc-700 text-zinc-100'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          {CATEGORY_CONFIG.professional.label}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('sidejob')}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'sidejob'
              ? 'bg-zinc-700 text-zinc-100'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          {CATEGORY_CONFIG.sidejob.label}
        </button>
      </div>

      {items.length === 0 ? (
        <p className="text-zinc-500 text-sm py-4">項目がありません。</p>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <WorkCard key={item.id} item={item} />
          ))}
        </ul>
      )}
    </section>
  )
}
