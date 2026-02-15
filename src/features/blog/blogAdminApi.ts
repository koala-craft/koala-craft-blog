/**
 * ブログ CRUD API（管理者専用）
 * GitHub に直接書き込む。provider_token または GITHUB_TOKEN が必要
 */

import { createServerFn } from '@tanstack/react-start'
import { getSupabase } from '~/shared/lib/supabase'
import { getGithubRepoUrlForServer } from '~/shared/lib/contentSource'
import {
  parseRepoUrl,
  isValidGithubRepoUrl,
  getFileSha,
  updateFileOnGitHub,
  deleteFileOnGitHub,
  fetchDirectoryWithSha,
  fetchRawFileBinary,
} from '~/shared/lib/github'
import { validateSlug } from '~/shared/lib/slug'
import { saveTempImage, clearTempAssets, readTempImage } from '~/shared/lib/blogTempAssets'
import type { BlogPost } from './types'

const BLOG_DIR = 'blog'
const RAW_PREFIX = 'https://raw.githubusercontent.com/'

/** raw URL から blog/assets/ 配下のファイルパスを取得。自リポジトリ以外は null */
function getFirstViewPathFromRawUrl(
  rawUrl: string,
  owner: string,
  repo: string
): string | null {
  if (!rawUrl.startsWith(RAW_PREFIX)) return null
  const pathStr = rawUrl.slice(RAW_PREFIX.length)
  const parts = pathStr.split('/')
  if (parts.length < 6) return null
  const [urlOwner, urlRepo, , ...rest] = parts
  if (urlOwner !== owner || urlRepo !== repo) return null
  const filePath = rest.join('/')
  if (!filePath.startsWith('blog/assets/') || filePath.includes('..')) return null
  return filePath
}

function getGitHubUsername(user: { user_metadata?: Record<string, unknown> }): string | null {
  const meta = user.user_metadata
  if (!meta) return null
  const name = (meta.user_name ?? meta.user_login ?? meta.login) as string | undefined
  return typeof name === 'string' ? name : null
}

function buildFrontmatter(post: {
  title: string
  createdAt: string
  updatedAt: string
  tags: string[]
  visibility: 'public' | 'private'
  firstView?: string
}): string {
  const lines = [
    '---',
    `title: ${post.title}`,
    `createdAt: ${post.createdAt}`,
    `updatedAt: ${post.updatedAt}`,
    `tags: [${post.tags.map((t) => `"${t.replace(/"/g, '\\"')}"`).join(', ')}]`,
    `visibility: ${post.visibility}`,
    ...(post.firstView ? [`firstView: ${post.firstView}`] : []),
    '---',
    '',
  ]
  return lines.join('\n')
}

function buildMarkdownContent(post: BlogPost): string {
  const front = buildFrontmatter(post)
  return front + (post.content ?? '')
}

export type CreateBlogPostInput = {
  accessToken: string
  providerToken?: string
  slug: string
  title: string
  content: string
  tags?: string[]
  visibility?: 'public' | 'private'
  firstView?: string
}

export const createBlogPost = createServerFn({ method: 'POST' })
  .inputValidator((data: CreateBlogPostInput) => data)
  .handler(async ({ data }): Promise<{ success: boolean; error?: string }> => {
    const supabase = getSupabase()
    if (!supabase) return { success: false, error: 'Supabase が設定されていません' }

    const { data: { user }, error } = await supabase.auth.getUser(data.accessToken)
    if (error || !user) return { success: false, error: '認証が必要です' }

    const username = getGitHubUsername(user)
    if (!username) return { success: false, error: 'GitHub ユーザー名を取得できません' }

    const { isAdminByUsername } = await import('~/shared/lib/config')
    const isAdmin = await isAdminByUsername(username)
    if (!isAdmin) return { success: false, error: '管理者権限がありません' }

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

    const now = new Date().toISOString().split('T')[0] ?? ''
    const post: BlogPost = {
      slug: data.slug,
      title: data.title.trim() || data.slug,
      content: data.content ?? '',
      createdAt: now,
      updatedAt: now,
      tags: Array.isArray(data.tags) ? data.tags : [],
      visibility: data.visibility === 'private' ? 'private' : 'public',
      firstView: data.firstView?.trim() || undefined,
    }

    const content = buildMarkdownContent(post)
    const path = `${BLOG_DIR}/${data.slug}.md`

    return updateFileOnGitHub(
      parsed.owner,
      parsed.repo,
      path,
      content,
      `blog: add ${data.slug}`,
      token,
      undefined
    )
  })

export type UpdateBlogPostInput = {
  accessToken: string
  providerToken?: string
  /** 現在のスラッグ（編集対象の記事） */
  slug: string
  /** スラッグ変更時のみ指定。変更後のスラッグ */
  newSlug?: string
  title: string
  content: string
  tags?: string[]
  visibility?: 'public' | 'private'
  firstView?: string
  /** 保存前のファーストビュー URL。削除・差し替え時に旧画像を GitHub から削除するため */
  previousFirstView?: string
}

export const updateBlogPost = createServerFn({ method: 'POST' })
  .inputValidator((data: UpdateBlogPostInput) => data)
  .handler(async ({ data }): Promise<{ success: boolean; error?: string }> => {
    try {
      return await updateBlogPostHandler(data)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      return { success: false, error: msg || '保存に失敗しました' }
    }
  })

async function updateBlogPostHandler(data: UpdateBlogPostInput): Promise<{ success: boolean; error?: string }> {
    const supabase = getSupabase()
    if (!supabase) return { success: false, error: 'Supabase が設定されていません' }

    const { data: { user }, error } = await supabase.auth.getUser(data.accessToken)
    if (error || !user) return { success: false, error: '認証が必要です' }

    const username = getGitHubUsername(user)
    if (!username) return { success: false, error: 'GitHub ユーザー名を取得できません' }

    const { isAdminByUsername } = await import('~/shared/lib/config')
    const isAdmin = await isAdminByUsername(username)
    if (!isAdmin) return { success: false, error: '管理者権限がありません' }

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
      const { getBlogPost } = await import('./api')
      const existingByNew = await getBlogPost({ data: { slug: newSlug } })
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

    const oldPath = `${BLOG_DIR}/${data.slug}.md`
    const sha = await getFileSha(parsed.owner, parsed.repo, oldPath, token)
    if (!sha) return { success: false, error: '記事が見つかりません' }

    const { getBlogPost } = await import('./api')
    const existing = await getBlogPost({ data: { slug: data.slug } })
    const now = new Date().toISOString().split('T')[0] ?? ''

    let contentToSave = data.content ?? ''
    if (isSlugChange) {
      contentToSave = contentToSave
        .split(`blog/assets/${data.slug}/`)
        .join(`blog/assets/${newSlug}/`)
    }

    const post: BlogPost = {
      slug: newSlug,
      title: data.title.trim() || newSlug,
      content: contentToSave,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      tags: Array.isArray(data.tags) ? data.tags : [],
      visibility: data.visibility === 'private' ? 'private' : 'public',
      firstView: data.firstView?.trim() || undefined,
    }

    if (isSlugChange) {
      post.firstView = post.firstView
        ? post.firstView
            .split(`blog/assets/${data.slug}/`)
            .join(`blog/assets/${newSlug}/`)
        : undefined
    }

    const content = buildMarkdownContent(post)

    if (isSlugChange) {
      const newPath = `${BLOG_DIR}/${newSlug}.md`
      const newFileSha = await getFileSha(parsed.owner, parsed.repo, newPath, token)
      if (newFileSha) {
        return { success: false, error: `スラッグ「${newSlug}」は既に使用されています` }
      }

      const createResult = await updateFileOnGitHub(
        parsed.owner,
        parsed.repo,
        newPath,
        content,
        `blog: add ${newSlug} (rename from ${data.slug})`,
        token,
        undefined
      )
      if (!createResult.success) return createResult

      const assetsDir = `blog/assets/${data.slug}`
      const assets = await fetchDirectoryWithSha(
        parsed.owner,
        parsed.repo,
        assetsDir,
        token
      )
      for (const file of assets) {
        const buf = await fetchRawFileBinary(file.download_url)
        if (!buf) continue
        const base64 = Buffer.from(buf).toString('base64')
        const newAssetPath = `blog/assets/${newSlug}/${file.name}`
        const uploadResult = await updateFileOnGitHub(
          parsed.owner,
          parsed.repo,
          newAssetPath,
          base64,
          `blog: move asset to ${newSlug}`,
          token,
          undefined,
          true
        )
        if (!uploadResult.success) continue
        await deleteFileOnGitHub(
          parsed.owner,
          parsed.repo,
          file.path,
          `blog: remove asset from ${data.slug}`,
          token,
          file.sha
        )
      }

      const deleteResult = await deleteFileOnGitHub(
        parsed.owner,
        parsed.repo,
        oldPath,
        `blog: remove ${data.slug} (renamed to ${newSlug})`,
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
        `blog: update ${data.slug}`,
        token,
        sha
      )
      if (!result.success) return result
    }

    // マークダウン更新成功後: 未使用の旧ファーストビュー画像を GitHub から削除
    // スラッグ変更時はアセット移動で既に処理済みのためスキップ
    const newFirstViewPath = post.firstView
      ? getFirstViewPathFromRawUrl(post.firstView, parsed.owner, parsed.repo)
      : null
    const prevPath =
      !isSlugChange &&
      data.previousFirstView?.trim()
        ? getFirstViewPathFromRawUrl(
            data.previousFirstView.trim(),
            parsed.owner,
            parsed.repo
          )
        : null
    if (prevPath && prevPath !== newFirstViewPath) {
      const prevSha = await getFileSha(parsed.owner, parsed.repo, prevPath, token)
      if (prevSha) {
        await deleteFileOnGitHub(
          parsed.owner,
          parsed.repo,
          prevPath,
          'blog: remove unused firstview',
          token,
          prevSha
        )
      }
    }

    return { success: true }
  }

export type SaveBlogImageToTempInput = {
  filename: string
  contentBase64: string
}

/** 画像を仮保存し、プレビュー用 URL を返す（貼り付け直後に即時表示） */
export const saveBlogImageToTemp = createServerFn({ method: 'POST' })
  .inputValidator((data: SaveBlogImageToTempInput) => data)
  .handler(async ({ data }): Promise<{ success: true; tempUrl: string } | { success: false; error: string }> => {
    const ext = data.filename.split('.').pop()?.toLowerCase() ?? 'png'
    if (!/^(png|jpg|jpeg|gif|webp)$/.test(ext)) {
      return { success: false, error: '対応していない画像形式です' }
    }
    const key = `img-${Date.now()}-${Math.random().toString(36).slice(2)}`
    const tempUrl = saveTempImage(key, data.contentBase64, ext)
    return { success: true, tempUrl }
  })

/** 保存時に仮ディレクトリをクリア（管理者のみ） */
export const clearBlogTempAssets = createServerFn({ method: 'POST' })
  .inputValidator((data: { accessToken: string }) => data)
  .handler(async ({ data }): Promise<{ success: boolean }> => {
    const supabase = getSupabase()
    if (!supabase) return { success: false }

    const { data: { user }, error } = await supabase.auth.getUser(data.accessToken)
    if (error || !user) return { success: false }

    const username = getGitHubUsername(user)
    if (!username) return { success: false }

    const { isAdminByUsername } = await import('~/shared/lib/config')
    const isAdmin = await isAdminByUsername(username)
    if (!isAdmin) return { success: false }

    clearTempAssets()
    return { success: true }
  })

export type PrepareBlogContentForSaveInput = {
  accessToken: string
  providerToken?: string
  slug: string
  content: string
  /** ファーストビュー画像 URL。temp URL の場合は GitHub にアップロードして差し替え */
  firstView?: string
}

/** 保存時: 本文内・firstView の temp URL を GitHub にアップロードして差し替え */
export const prepareBlogContentForSave = createServerFn({ method: 'POST' })
  .inputValidator((data: PrepareBlogContentForSaveInput) => data)
  .handler(
    async ({
      data,
    }): Promise<
      | { success: true; content: string; firstView?: string }
      | { success: false; error: string }
    > => {
      try {
        return await prepareBlogContentForSaveHandler(data)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        return { success: false, error: msg || '画像のアップロードに失敗しました' }
      }
    }
  )

async function prepareBlogContentForSaveHandler(
  data: PrepareBlogContentForSaveInput
): Promise<
  | { success: true; content: string; firstView?: string }
  | { success: false; error: string }
> {
      const supabase = getSupabase()
      if (!supabase) return { success: false, error: 'Supabase が設定されていません' }

      const { data: { user }, error } = await supabase.auth.getUser(data.accessToken)
      if (error || !user) return { success: false, error: '認証が必要です' }

      const username = getGitHubUsername(user)
      if (!username) return { success: false, error: 'GitHub ユーザー名を取得できません' }

      const { isAdminByUsername } = await import('~/shared/lib/config')
      const isAdmin = await isAdminByUsername(username)
      if (!isAdmin) return { success: false, error: '管理者権限がありません' }

      const githubUrl = await getGithubRepoUrlForServer()
      if (!githubUrl || !isValidGithubRepoUrl(githubUrl)) {
        return { success: false, error: 'GitHub リポジトリ URL を設定してください' }
      }

      const parsed = parseRepoUrl(githubUrl)
      if (!parsed) return { success: false, error: 'リポジトリ URL を解析できません' }

      const token = data.providerToken ?? process.env.GITHUB_TOKEN
      if (!token) {
        return {
          success: false,
          error: 'GitHub トークンが必要です。ログインし直すか、GITHUB_TOKEN を設定してください',
        }
      }

      if (!validateSlug(data.slug)) {
        return { success: false, error: 'スラッグが不正です' }
      }

      const tempUrlRegex = /!\[([^\]]*)\]\((\/api\/blog-assets\/temp\/[^)]+)\)/g
      let updatedContent = data.content
      let match: RegExpExecArray | null

      while ((match = tempUrlRegex.exec(data.content)) !== null) {
        const alt = match[1]
        const tempUrl = match[2]
        const tempFilename = tempUrl.replace('/api/blog-assets/temp/', '')
        const buffer = readTempImage(tempFilename)
        if (!buffer) continue

        const base64 = buffer.toString('base64')
        const filename = alt?.trim() && /^[^/\\]+\.(png|jpg|jpeg|gif|webp)$/i.test(alt)
          ? alt
          : `image-${Date.now()}.${tempFilename.split('.').pop() ?? 'png'}`

        const path = `blog/assets/${data.slug}/${filename}`
        const sha = await getFileSha(parsed.owner, parsed.repo, path, token)
        const result = await updateFileOnGitHub(
          parsed.owner,
          parsed.repo,
          path,
          base64,
          `blog: add image ${filename}`,
          token,
          sha ?? undefined,
          true
        )
        if (!result.success) {
          return { success: false, error: result.error ?? `画像 ${filename} のアップロードに失敗しました` }
        }
        const encodedPath = `blog/assets/${encodeURIComponent(data.slug)}/${encodeURIComponent(filename)}`
        const rawUrl = `https://raw.githubusercontent.com/${parsed.owner}/${parsed.repo}/main/${encodedPath}`
        updatedContent = updatedContent.split(tempUrl).join(rawUrl)
      }

      let resolvedFirstView = data.firstView?.trim() || undefined
      if (resolvedFirstView?.startsWith('/api/blog-assets/temp/')) {
        const tempFilename = resolvedFirstView.replace('/api/blog-assets/temp/', '')
        const buffer = readTempImage(tempFilename)
        if (buffer) {
          const base64 = buffer.toString('base64')
          const ext = tempFilename.split('.').pop() ?? 'png'
          const filename = `firstview-${Date.now()}.${ext}`
          const path = `blog/assets/${data.slug}/${filename}`
          const sha = await getFileSha(parsed.owner, parsed.repo, path, token)
          const result = await updateFileOnGitHub(
            parsed.owner,
            parsed.repo,
            path,
            base64,
            `blog: add firstview ${filename}`,
            token,
            sha ?? undefined,
            true
          )
          if (result.success) {
            const encodedPath = `blog/assets/${encodeURIComponent(data.slug)}/${encodeURIComponent(filename)}`
            resolvedFirstView = `https://raw.githubusercontent.com/${parsed.owner}/${parsed.repo}/main/${encodedPath}`
          } else {
            return { success: false, error: result.error ?? 'ファーストビュー画像のアップロードに失敗しました' }
          }
        }
      }

      return { success: true, content: updatedContent, firstView: resolvedFirstView }
  }

export type UploadBlogImageInput = {
  accessToken: string
  providerToken?: string
  slug: string
  filename: string
  contentBase64: string
}

/** 拡張子は png/jpg/jpeg/gif/webp、パス区切り文字は禁止（日本語ファイル名対応） */
const IMAGE_EXT_REGEX = /^[^/\\]+\.(png|jpg|jpeg|gif|webp)$/

export const uploadBlogImage = createServerFn({ method: 'POST' })
  .inputValidator((data: UploadBlogImageInput) => data)
  .handler(
    async ({
      data,
    }): Promise<{ success: true; url: string } | { success: false; error: string }> => {
      const supabase = getSupabase()
      if (!supabase) return { success: false, error: 'Supabase が設定されていません' }

      const { data: { user }, error } = await supabase.auth.getUser(data.accessToken)
      if (error || !user) return { success: false, error: '認証が必要です' }

      const username = getGitHubUsername(user)
      if (!username) return { success: false, error: 'GitHub ユーザー名を取得できません' }

      const { isAdminByUsername } = await import('~/shared/lib/config')
      const isAdmin = await isAdminByUsername(username)
      if (!isAdmin) return { success: false, error: '管理者権限がありません' }

      if (!validateSlug(data.slug)) {
        return { success: false, error: 'スラッグが不正です' }
      }
      if (!IMAGE_EXT_REGEX.test(data.filename)) {
        return {
          success: false,
          error: 'ファイル名に / または \\ は使用できません。拡張子は png, jpg, jpeg, gif, webp のみです',
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
        return {
          success: false,
          error: 'GitHub トークンが必要です。ログインし直すか、GITHUB_TOKEN を設定してください',
        }
      }

      const path = `blog/assets/${data.slug}/${data.filename}`
      const sha = await getFileSha(parsed.owner, parsed.repo, path, token)

      const result = await updateFileOnGitHub(
        parsed.owner,
        parsed.repo,
        path,
        data.contentBase64,
        `blog: add image ${data.filename}`,
        token,
        sha ?? undefined,
        true
      )

      if (!result.success) return { success: false, error: result.error ?? 'アップロードに失敗しました' }

      const encodedPath = `blog/assets/${encodeURIComponent(data.slug)}/${encodeURIComponent(data.filename)}`
      const rawUrl = `https://raw.githubusercontent.com/${parsed.owner}/${parsed.repo}/main/${encodedPath}`
      return { success: true, url: rawUrl }
    }
  )

export type DeleteBlogPostInput = {
  accessToken: string
  providerToken?: string
  slug: string
}

export const deleteBlogPost = createServerFn({ method: 'POST' })
  .inputValidator((data: DeleteBlogPostInput) => data)
  .handler(async ({ data }): Promise<{ success: boolean; error?: string }> => {
    const supabase = getSupabase()
    if (!supabase) return { success: false, error: 'Supabase が設定されていません' }

    const { data: { user }, error } = await supabase.auth.getUser(data.accessToken)
    if (error || !user) return { success: false, error: '認証が必要です' }

    const username = getGitHubUsername(user)
    if (!username) return { success: false, error: 'GitHub ユーザー名を取得できません' }

    const { isAdminByUsername } = await import('~/shared/lib/config')
    const isAdmin = await isAdminByUsername(username)
    if (!isAdmin) return { success: false, error: '管理者権限がありません' }

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

    const path = `${BLOG_DIR}/${data.slug}.md`
    const sha = await getFileSha(parsed.owner, parsed.repo, path, token)
    if (!sha) return { success: false, error: '記事が見つかりません' }

    return deleteFileOnGitHub(
      parsed.owner,
      parsed.repo,
      path,
      `blog: delete ${data.slug}`,
      token,
      sha
    )
  })
