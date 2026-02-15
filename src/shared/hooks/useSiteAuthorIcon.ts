import { useLoaderData } from '@tanstack/react-router'
import type { RootLoaderData } from '~/shared/types/rootLoader'

/**
 * ルートローダーで取得した authorIcon を返す。
 */
export function useSiteAuthorIcon(): string {
  const rootData = useLoaderData({ from: '__root__' as const }) as RootLoaderData
  return rootData.authorIcon
}
