/**
 * Tech ルートの search params 型。
 * tech.index の validateSearch と整合させる。
 */
export type TechTab = 'articles' | 'scraps'

export type TechSearchParams = {
  tab: TechTab
  articleTag?: string
  scrapTag?: string
  q?: string
}

/** Footer / HeaderNav などで Tech へリンクする際のデフォルト search（リセット用） */
export const TECH_DEFAULT_SEARCH = {
  tab: 'articles',
} as const satisfies Pick<TechSearchParams, 'tab'>
