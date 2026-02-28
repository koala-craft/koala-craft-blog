/**
 * 記事（Articles）CRUD API（管理者専用）
 * GitHub に直接書き込む。provider_token または GITHUB_TOKEN が必要
 */

import { createServerFn } from '@tanstack/react-start'
import { getGithubRepoUrlForServer } from '~/shared/lib/contentSource'
import { requireAdminAuth } from '~/features/admin/requireAdminAuth'
import {
  parseRepoUrl,
  isValidGithubRepoUrl,
  getFileSha,
  updateFileOnGitHub,
  deleteFileOnGitHub,
} from '~/shared/lib/github'
import { readTempImage } from '~/shared/lib/blogTempAssets'
import { validateSlug } from '~/shared/lib/slug'
import { invalidateContent } from '~/shared/lib/cache'
import type { Article } from './types'

const ARTICLES_DIR = 'articles'

function buildFrontmatter(article: {
  title: string
  createdAt: string
  topics: string[]
  visibility: 'public' | 'private'
  firstView?: string
}): string {
  const lines = [
    '---',
    `title: ${article.title}`,
    `createdAt: ${article.createdAt}`,
    `topics: [${article.topics.map((t) => `"${t.replace(/"/g, '\\"')}"`).join(', ')}]`,
    `visibility: ${article.visibility}`,
    ...(article.firstView ? [`firstView: "${article.firstView.replace(/"/g, '\\"')}"`] : []),
    '---',
    '',
  ]
  return lines.join('\n')
}

function buildMarkdownContent(article: Article): string {
  const front = buildFrontmatter({
    title: article.title,
    createdAt: article.createdAt,
    topics: article.tags,
    visibility: article.visibility,
    firstView: article.firstView,
  })
  return front + (article.content ?? '')
}

export type CreateArticleInput = {
  accessToken: string
  providerToken?: string
  slug: string
  title: string
  content: string
  topics?: string[]
  visibility?: 'public' | 'private'
  firstView?: string
}

export const createArticle = createServerFn({ method: 'POST' })
  .inputValidator((data: CreateArticleInput) => data)
  .handler(async ({ data }): Promise<{ success: boolean; error?: string }> => {
    const auth = await requireAdminAuth(data.accessToken)
    if (!auth.ok) return { success: false, error: auth.error }

    if (!validateSlug(data.slug)) {
      return { success: false, error: 'スラッグは英数字・ハイフン・アンダースコアのみ使用できます' }
    }

    const githubUrl = await getGithubRepoUrlForServer()
    if (!githubUrl || !isValidGithubRepoUrl(githubUrl)) {
      return { success: false, error: 'GitHub リポジトリ URL を設定してください' }
    }

    const parsed = parseRepoUrl(githubUrl)
    if (!parsed) return { success: false, error: 'リポジトリ URL を解析できません' }

    const token = data.providerToken ?? process.env.GITHUB_TOKEN
    if (!token) {
      return { success: false, error: 'GitHub トークンが必要です。ログインし直すか、GITHUB_TOKEN を設定してください' }
    }

    const { getArticle } = await import('./api')
    const existing = await getArticle({ data: { slug: data.slug } })
    if (existing) {
      return { success: false, error: `スラッグ「${data.slug}」は既に使用されています` }
    }

    const now = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
    const article: Article = {
      slug: data.slug,
      title: data.title.trim() || data.slug,
      content: data.content ?? '',
      createdAt: now,
      tags: Array.isArray(data.topics) ? data.topics : [],
      visibility: data.visibility === 'private' ? 'private' : 'public',
      ...(data.firstView?.trim() && { firstView: data.firstView.trim() }),
    }

    const content = buildMarkdownContent(article)
    const path = `${ARTICLES_DIR}/${data.slug}.md`

    const result = await updateFileOnGitHub(
      parsed.owner,
      parsed.repo,
      path,
      content,
      `article: add ${data.slug}`,
      token,
      undefined
    )
    if (result.success) invalidateContent()
    return result
  })

export type UpdateArticleInput = {
  accessToken: string
  providerToken?: string
  slug: string
  newSlug?: string
  title: string
  content: string
  topics?: string[]
  visibility?: 'public' | 'private'
  firstView?: string
}

export const updateArticle = createServerFn({ method: 'POST' })
  .inputValidator((data: UpdateArticleInput) => data)
  .handler(async ({ data }): Promise<{ success: boolean; error?: string }> => {
    const auth = await requireAdminAuth(data.accessToken)
    if (!auth.ok) return { success: false, error: auth.error }

    if (!validateSlug(data.slug)) {
      return { success: false, error: 'スラッグは英数字・ハイフン・アンダースコアのみ使用できます' }
    }

    const isSlugChange = Boolean(
      data.newSlug?.trim() &&
      data.newSlug.trim() !== data.slug &&
      validateSlug(data.newSlug.trim())
    )
    const newSlug = isSlugChange ? data.newSlug!.trim() : data.slug

    if (isSlugChange) {
      const { getArticle } = await import('./api')
      const existingByNew = await getArticle({ data: { slug: newSlug } })
      if (existingByNew) {
        return { success: false, error: `スラッグ「${newSlug}」は既に使用されています` }
      }
    }

    const githubUrl = await getGithubRepoUrlForServer()
    if (!githubUrl || !isValidGithubRepoUrl(githubUrl)) {
      return { success: false, error: 'GitHub リポジトリ URL を設定してください' }
    }

    const parsed = parseRepoUrl(githubUrl)
    if (!parsed) return { success: false, error: 'リポジトリ URL を解析できません' }

    const token = data.providerToken ?? process.env.GITHUB_TOKEN
    if (!token) {
      return { success: false, error: 'GitHub トークンが必要です。ログインし直すか、GITHUB_TOKEN を設定してください' }
    }

    const oldPath = `${ARTICLES_DIR}/${data.slug}.md`
    const sha = await getFileSha(parsed.owner, parsed.repo, oldPath, token)
    if (!sha) return { success: false, error: '記事が見つかりません' }

    const { getArticle } = await import('./api')
    const existing = await getArticle({ data: { slug: data.slug } })
    const createdAt = existing?.createdAt ?? new Date().toISOString().slice(0, 10)

    let resolvedFirstView =
      data.firstView !== undefined
        ? (data.firstView?.trim() || undefined)
        : existing?.firstView

    // firstView が temp URL の場合は GitHub にアップロードして差し替え
    if (resolvedFirstView?.startsWith('/api/blog-assets/temp/')) {
      const tempFilename = resolvedFirstView.replace('/api/blog-assets/temp/', '')
      const buffer = readTempImage(tempFilename)
      if (buffer) {
        const base64 = buffer.toString('base64')
        const ext = tempFilename.split('.').pop() ?? 'png'
        const filename = `firstview-${Date.now()}.${ext}`
        const path = `articles/assets/${newSlug}/${filename}`
        const sha = await getFileSha(parsed.owner, parsed.repo, path, token)
        const uploadResult = await updateFileOnGitHub(
          parsed.owner,
          parsed.repo,
          path,
          base64,
          `article: add firstview ${filename}`,
          token,
          sha ?? undefined,
          true
        )
        if (uploadResult.success) {
          const encodedPath = `articles/assets/${encodeURIComponent(newSlug)}/${encodeURIComponent(filename)}`
          resolvedFirstView = `https://raw.githubusercontent.com/${parsed.owner}/${parsed.repo}/main/${encodedPath}`
        } else {
          return { success: false, error: uploadResult.error ?? 'ヘッダー画像のアップロードに失敗しました' }
        }
      }
    }

    const article: Article = {
      slug: newSlug,
      title: data.title.trim() || newSlug,
      content: data.content ?? '',
      createdAt,
      tags: Array.isArray(data.topics) ? data.topics : [],
      visibility: data.visibility === 'private' ? 'private' : 'public',
      ...(resolvedFirstView && { firstView: resolvedFirstView }),
    }

    const content = buildMarkdownContent(article)

    if (isSlugChange) {
      const newPath = `${ARTICLES_DIR}/${newSlug}.md`
      const createResult = await updateFileOnGitHub(
        parsed.owner,
        parsed.repo,
        newPath,
        content,
        `article: add ${newSlug}`,
        token,
        undefined
      )
      if (!createResult.success) return createResult

      const deleteResult = await deleteFileOnGitHub(
        parsed.owner,
        parsed.repo,
        oldPath,
        `article: remove ${data.slug} (renamed to ${newSlug})`,
        token,
        sha
      )
      if (!deleteResult.success) return deleteResult
    } else {
      const result = await updateFileOnGitHub(
        parsed.owner,
        parsed.repo,
        oldPath,
        content,
        `article: update ${data.slug}`,
        token,
        sha
      )
      if (!result.success) return result
    }

    invalidateContent()
    return { success: true }
  })

export type DeleteArticleInput = {
  accessToken: string
  providerToken?: string
  slug: string
}

export const deleteArticle = createServerFn({ method: 'POST' })
  .inputValidator((data: DeleteArticleInput) => data)
  .handler(async ({ data }): Promise<{ success: boolean; error?: string }> => {
    const auth = await requireAdminAuth(data.accessToken)
    if (!auth.ok) return { success: false, error: auth.error }

    const githubUrl = await getGithubRepoUrlForServer()
    if (!githubUrl || !isValidGithubRepoUrl(githubUrl)) {
      return { success: false, error: 'GitHub リポジトリ URL を設定してください' }
    }

    const parsed = parseRepoUrl(githubUrl)
    if (!parsed) return { success: false, error: 'リポジトリ URL を解析できません' }

    const token = data.providerToken ?? process.env.GITHUB_TOKEN
    if (!token) {
      return { success: false, error: 'GitHub トークンが必要です。ログインし直すか、GITHUB_TOKEN を設定してください' }
    }

    const path = `${ARTICLES_DIR}/${data.slug}.md`
    const sha = await getFileSha(parsed.owner, parsed.repo, path, token)
    if (!sha) return { success: false, error: '記事が見つかりません' }

    const result = await deleteFileOnGitHub(
      parsed.owner,
      parsed.repo,
      path,
      `article: remove ${data.slug}`,
      token,
      sha
    )
    if (result.success) invalidateContent()
    return result
  })
