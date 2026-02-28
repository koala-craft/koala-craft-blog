import { useRouterState } from '@tanstack/react-router'
import { useMemo } from 'react'

/**
 * tag パラメータをカンマ区切りで配列に解析
 * ?tag=react,typescript → ['react', 'typescript']
 */
export function parseTagParam(tag: string | undefined): string[] {
  if (!tag || typeof tag !== 'string') return []
  return tag
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
}

/**
 * タグ配列を URL 用の search に変換
 */
export function buildTagSearch(tags: string[]): { tag?: string } {
  if (tags.length === 0) return {}
  return { tag: tags.join(',') }
}

/**
 * タグをトグル（追加 or 削除）した新しい配列を返す
 */
export function toggleTagInFilter(currentTags: string[], tag: string): string[] {
  if (currentTags.includes(tag)) {
    return currentTags.filter((t) => t !== tag)
  }
  return [...currentTags, tag]
}

/**
 * URL の検索パラメータを取得する（validateSearch を使わない場合用）
 * href を監視して検索パラメータ変更時に確実に再計算する
 */
export function useSearchParams(): {
  tag?: string
  tags: string[]
  q?: string
} {
  const href = useRouterState({
    select: (s) => (s.location as { href?: string }).href ?? '',
  })
  return useMemo(() => {
    try {
      const urlStr = href || (typeof window !== 'undefined' ? window.location.href : '')
      const url = new URL(urlStr, 'http://localhost')
      const tag = url.searchParams.get('tag') ?? undefined
      return {
        tag,
        tags: parseTagParam(tag),
        q: url.searchParams.get('q') ?? undefined,
      }
    } catch {
      return { tags: [] }
    }
  }, [href])
}
