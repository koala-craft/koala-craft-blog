import { useRouterState } from '@tanstack/react-router'
import { useMemo } from 'react'

/**
 * URL の検索パラメータを取得する（validateSearch を使わない場合用）
 * href を監視して検索パラメータ変更時に確実に再計算する
 */
export function useSearchParams(): { tag?: string; q?: string } {
  const href = useRouterState({
    select: (s) => (s.location as { href?: string }).href ?? '',
  })
  return useMemo(() => {
    try {
      const urlStr = href || (typeof window !== 'undefined' ? window.location.href : '')
      const url = new URL(urlStr, 'http://localhost')
      return {
        tag: url.searchParams.get('tag') ?? undefined,
        q: url.searchParams.get('q') ?? undefined,
      }
    } catch {
      return {}
    }
  }, [href])
}
