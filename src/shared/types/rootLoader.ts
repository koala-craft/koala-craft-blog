/**
 * ルートローダー（__root__）の戻り値の型。
 * routeTree.gen に含まれないため、明示的に定義して useLoaderData で使用する。
 */
export type RootLoaderData = {
  zennUsername: string
  authorName: string
  authorIcon: string
  siteTitle: string
}
