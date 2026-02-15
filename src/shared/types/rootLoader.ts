/**
 * ルートローダー（__root__）の戻り値の型。
 * routeTree.gen に含まれないため、明示的に定義して useLoaderData で使用する。
 * 管理画面の設定フォームでも root データを利用し、API 呼び出しを 1 回に抑える。
 */
export type RootLoaderData = {
  zennUsername: string
  authorName: string
  authorIcon: string
  siteTitle: string
  siteSubtitle: string
  githubRepoUrl: string
  authorOneLiner: string
}
