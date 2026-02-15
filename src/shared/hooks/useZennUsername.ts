import { useLoaderData } from '@tanstack/react-router'
import type { RootLoaderData } from '~/shared/types/rootLoader'

/**
 * ルートローダーで取得した zennUsername を返す。
 * Zenn リンク（記事・スクラップの「Zenn で見る」）の生成に使用。
 */
export function useZennUsername(): string {
  const rootData = useLoaderData({ from: '__root__' as const }) as RootLoaderData
  return rootData.zennUsername
}
