/**
 * スクラップ（Scraps）CRUD API（管理者専用）
 * GitHub に直接書き込む。TL 形式（comments 配列）
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
import type { Scrap, ScrapComment, ScrapWithSlug } from './types'

const SCRAPS_DIR = 'scraps'

function buildScrapTitle(displayTitle: string, tags: string[]): string {
  if (tags.length === 0) return displayTitle
  return `${displayTitle} ${tags.map((t) => `[${t}]`).join(' ')}`
}

export type CreateScrapInput = {
  accessToken: string
  providerToken?: string
  slug: string
  title: string
  tags?: string[]
  firstView?: string
  comments: { author: string; body_markdown: string }[]
}

export const createScrap = createServerFn({ method: 'POST' })
  .inputValidator((data: CreateScrapInput) => data)
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

    const { getScrap } = await import('./api')
    const existing = await getScrap({ data: { slug: data.slug } })
    if (existing) {
      return { success: false, error: `スラッグ「${data.slug}」は既に使用されています` }
    }

    const now = new Date().toISOString().slice(0, 10)
    const fullTitle = buildScrapTitle(data.title.trim() || data.slug, data.tags ?? [])
    const comments: ScrapComment[] = (data.comments ?? []).map((c, i) => ({
      author: c.author?.trim() || 'author',
      created_at: now,
      body_markdown: c.body_markdown ?? '',
      body_updated_at: now,
      children: [],
    }))

    // firstView が temp URL の場合は GitHub にアップロードして差し替え
    let resolvedFirstView = data.firstView?.trim() || undefined
    if (resolvedFirstView?.startsWith('/api/blog-assets/temp/')) {
      const tempFilename = resolvedFirstView.replace('/api/blog-assets/temp/', '')
      const buffer = readTempImage(tempFilename)
      if (buffer) {
        const base64 = buffer.toString('base64')
        const ext = tempFilename.split('.').pop() ?? 'png'
        const filename = `firstview-${Date.now()}.${ext}`
        const path = `scraps/assets/${data.slug}/${filename}`
        const sha = await getFileSha(parsed.owner, parsed.repo, path, token)
        const uploadResult = await updateFileOnGitHub(
          parsed.owner,
          parsed.repo,
          path,
          base64,
          `scrap: add firstview ${filename}`,
          token,
          sha ?? undefined,
          true
        )
        if (uploadResult.success) {
          const encodedPath = `scraps/assets/${encodeURIComponent(data.slug)}/${encodeURIComponent(filename)}`
          resolvedFirstView = `https://raw.githubusercontent.com/${parsed.owner}/${parsed.repo}/main/${encodedPath}`
        } else {
          return { success: false, error: uploadResult.error ?? 'ヘッダー画像のアップロードに失敗しました' }
        }
      }
    }

    const scrap: Scrap = {
      title: fullTitle,
      closed: false,
      archived: false,
      created_at: now,
      comments,
      ...(resolvedFirstView && { firstView: resolvedFirstView }),
    }

    const content = JSON.stringify(scrap, null, 2)
    const path = `${SCRAPS_DIR}/${data.slug}.json`

    const result = await updateFileOnGitHub(
      parsed.owner,
      parsed.repo,
      path,
      content,
      `scrap: add ${data.slug}`,
      token,
      undefined
    )
    if (result.success) invalidateContent()
    return result
  })

export type UpdateScrapInput = {
  accessToken: string
  providerToken?: string
  slug: string
  newSlug?: string
  title: string
  tags?: string[]
  firstView?: string
  comments: ScrapComment[]
  closed?: boolean
  closed_reason?: string
}

export const updateScrap = createServerFn({ method: 'POST' })
  .inputValidator((data: UpdateScrapInput) => data)
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
      const { getScrap } = await import('./api')
      const existingByNew = await getScrap({ data: { slug: newSlug } })
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

    const oldPath = `${SCRAPS_DIR}/${data.slug}.json`
    const sha = await getFileSha(parsed.owner, parsed.repo, oldPath, token)
    if (!sha) return { success: false, error: 'スクラップが見つかりません' }

    const { getScrap } = await import('./api')
    const existing = await getScrap({ data: { slug: data.slug } })
    const created_at =
      data.comments[0]?.created_at ??
      existing?.created_at ??
      new Date().toISOString().slice(0, 10)

    const fullTitle = buildScrapTitle(data.title.trim() || newSlug, data.tags ?? [])
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
        const path = `scraps/assets/${newSlug}/${filename}`
        const sha = await getFileSha(parsed.owner, parsed.repo, path, token)
        const uploadResult = await updateFileOnGitHub(
          parsed.owner,
          parsed.repo,
          path,
          base64,
          `scrap: add firstview ${filename}`,
          token,
          sha ?? undefined,
          true
        )
        if (uploadResult.success) {
          const encodedPath = `scraps/assets/${encodeURIComponent(newSlug)}/${encodeURIComponent(filename)}`
          resolvedFirstView = `https://raw.githubusercontent.com/${parsed.owner}/${parsed.repo}/main/${encodedPath}`
        } else {
          return { success: false, error: uploadResult.error ?? 'ヘッダー画像のアップロードに失敗しました' }
        }
      }
    }

    const isClosed = data.closed ?? existing?.closed ?? false
    const closedReason = isClosed
      ? (data.closed_reason !== undefined ? (data.closed_reason?.trim() || undefined) : existing?.closed_reason)
      : undefined

    const scrap: Scrap = {
      title: fullTitle,
      closed: isClosed,
      archived: existing?.archived ?? false,
      created_at,
      comments: data.comments,
      ...(resolvedFirstView && { firstView: resolvedFirstView }),
      ...(closedReason && { closed_reason: closedReason }),
    }

    const content = JSON.stringify(scrap, null, 2)

    if (isSlugChange) {
      const newPath = `${SCRAPS_DIR}/${newSlug}.json`
      const scrapContent = JSON.stringify(scrap, null, 2)
      const createResult = await updateFileOnGitHub(
        parsed.owner,
        parsed.repo,
        newPath,
        scrapContent,
        `scrap: add ${newSlug}`,
        token,
        undefined
      )
      if (!createResult.success) return createResult

      const deleteResult = await deleteFileOnGitHub(
        parsed.owner,
        parsed.repo,
        oldPath,
        `scrap: remove ${data.slug} (renamed to ${newSlug})`,
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
        `scrap: update ${data.slug}`,
        token,
        sha
      )
      if (!result.success) return result
    }

    invalidateContent()
    return { success: true }
  })

export type SetScrapClosedInput = {
  accessToken: string
  providerToken?: string
  slug: string
  closed: boolean
  closed_reason?: string
}

export const setScrapClosed = createServerFn({ method: 'POST' })
  .inputValidator((data: SetScrapClosedInput) => data)
  .handler(async ({ data }): Promise<{ success: boolean; error?: string }> => {
    const auth = await requireAdminAuth(data.accessToken)
    if (!auth.ok) return { success: false, error: auth.error }

    if (!validateSlug(data.slug)) {
      return { success: false, error: 'スラッグが不正です' }
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

    const { getScrap } = await import('./api')
    const existing = await getScrap({ data: { slug: data.slug } })
    if (!existing) return { success: false, error: 'スクラップが見つかりません' }

    const closedReason = data.closed
      ? (data.closed_reason?.trim() || undefined)
      : undefined

    const { slug: _slug, ...rest } = existing
    const scrap: Scrap = {
      ...rest,
      closed: data.closed,
      closed_reason: data.closed ? closedReason : undefined,
    }

    const path = `${SCRAPS_DIR}/${data.slug}.json`
    const sha = await getFileSha(parsed.owner, parsed.repo, path, token)
    if (!sha) return { success: false, error: 'スクラップが見つかりません' }

    const content = JSON.stringify(scrap, null, 2)
    const result = await updateFileOnGitHub(
      parsed.owner,
      parsed.repo,
      path,
      content,
      data.closed ? `scrap: close ${data.slug}` : `scrap: reopen ${data.slug}`,
      token,
      sha
    )
    if (result.success) invalidateContent()
    return result
  })

export type DeleteScrapInput = {
  accessToken: string
  providerToken?: string
  slug: string
}

export const deleteScrap = createServerFn({ method: 'POST' })
  .inputValidator((data: DeleteScrapInput) => data)
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

    const filePath = `${SCRAPS_DIR}/${data.slug}.json`
    const sha = await getFileSha(parsed.owner, parsed.repo, filePath, token)
    if (!sha) return { success: false, error: 'スクラップが見つかりません' }

    const result = await deleteFileOnGitHub(
      parsed.owner,
      parsed.repo,
      filePath,
      `scrap: remove ${data.slug}`,
      token,
      sha
    )
    if (result.success) invalidateContent()
    return result
  })
