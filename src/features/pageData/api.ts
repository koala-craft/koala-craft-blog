/**
 * ページ単位でデータを一括取得する API
 * クライアント→サーバーのリクエスト回数を最小化
 */

import { createServerFn } from '@tanstack/react-start'
import { getOrSet } from '~/shared/lib/cache'
import { getConfig } from '~/features/admin/configApi'
import { getArticles } from '~/features/articles/api'
import { getScraps } from '~/features/scraps/api'
import { getBlogPosts } from '~/features/blog/api'
import { getWorks } from '~/features/works/worksApi'
import type { Article } from '~/features/articles/types'
import type { ScrapWithSlug } from '~/features/scraps/types'
import type { BlogPost } from '~/features/blog/types'
import type { WorksData } from '~/features/works/types'

const DEFAULT_TITLE = '気楽に誠実に'
const DEFAULT_SUBTITLE = 'ブログアプリ'

export type HomePageData = {
  articles: Article[]
  scraps: ScrapWithSlug[]
  blogPosts: BlogPost[]
  siteTitle: string
  siteSubtitle: string
}

export type TechPageData = {
  articles: Article[]
  scraps: ScrapWithSlug[]
}

export type AuthorPageData = {
  authorIcon: string
  authorName: string
  authorOneLiner: string
  zennUsername: string
  personalItems: WorksData['items']
  professionalItems: WorksData['items']
  sidejobItems: WorksData['items']
}

/** トップページ用: articles, scraps, blogPosts, siteHeader を 1 リクエストで取得 */
export const getHomePageData = createServerFn({ method: 'GET' }).handler(
  async (): Promise<HomePageData> => {
    return getOrSet('page:home', async () => {
      const [articles, scraps, blogPosts, config] = await Promise.all([
        getArticles(),
        getScraps(),
        getBlogPosts(),
        getConfig(),
      ])
      return {
        articles,
        scraps,
        blogPosts,
        siteTitle: config.site_title?.trim() || DEFAULT_TITLE,
        siteSubtitle: config.site_subtitle?.trim() || DEFAULT_SUBTITLE,
      }
    })
  }
)

/** Tech ページ用: articles, scraps を 1 リクエストで取得 */
export const getTechPageData = createServerFn({ method: 'GET' }).handler(
  async (): Promise<TechPageData> => {
    return getOrSet('page:tech', async () => {
      const [articles, scraps] = await Promise.all([getArticles(), getScraps()])
      return { articles, scraps }
    })
  }
)

/** Author ページ用: config, works を 1 リクエストで取得 */
export const getAuthorPageData = createServerFn({ method: 'GET' }).handler(
  async (): Promise<AuthorPageData> => {
    return getOrSet('page:author', async () => {
      const [config, works] = await Promise.all([
        getConfig(),
        getWorks(),
      ])
      return {
        authorIcon: config.author_icon?.trim() ?? '',
        authorName: config.author_name?.trim() ?? '',
        authorOneLiner: config.author_one_liner?.trim() ?? '',
        zennUsername: config.zenn_username?.trim() ?? '',
        personalItems: works.items.filter((i) => i.category === 'personal'),
        professionalItems: works.items.filter((i) => i.category === 'professional'),
        sidejobItems: works.items.filter((i) => i.category === 'sidejob'),
      }
    })
  }
)
