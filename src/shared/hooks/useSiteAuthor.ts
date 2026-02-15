import { useLoaderData } from '@tanstack/react-router'
import type { RootLoaderData } from '~/shared/types/rootLoader'

/**
 * ルートローダーで取得した authorName を返す。
 * 記事・ブログ・Work の著者表示に使用。
 */
export function useSiteAuthor(): string {
  const rootData = useLoaderData({ from: '__root__' as const }) as RootLoaderData
  return rootData.authorName
}
