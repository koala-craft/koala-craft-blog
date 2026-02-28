import { useLoaderData } from '@tanstack/react-router'
import type { RootLoaderData } from '~/shared/types/rootLoader'

/**
 * ルートローダーで取得した techUsername を返す。
 * Author ページの Tech リンク生成に使用。
 */
export function useTechUsername(): string {
  const rootData = useLoaderData({ from: '__root__' as const }) as RootLoaderData
  return rootData.techUsername
}
