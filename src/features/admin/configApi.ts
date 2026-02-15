/**
 * config.json の取得・更新 API（サーバー関数）
 * config モジュールはハンドラー内で動的 import（クライアントバンドルに fs を含めない）
 */

import { createServerFn } from '@tanstack/react-start'
import type { AppConfig } from '~/shared/lib/config'
import { writeLocalConfig } from '~/shared/lib/config'
import { getSupabase } from '~/shared/lib/supabase'
import {
  parseRepoUrl,
  isValidGithubRepoUrl,
  getFileSha,
  updateFileOnGitHub,
} from '~/shared/lib/github'

const CONFIG_PATH = '.obsidian-log/config.json'

function getGitHubUsername(user: { user_metadata?: Record<string, unknown> }): string | null {
  const meta = user.user_metadata
  if (!meta) return null
  const name = (meta.user_name ?? meta.user_login ?? meta.login) as string | undefined
  return typeof name === 'string' ? name : null
}

export const getConfig = createServerFn({ method: 'GET' }).handler(
  async (): Promise<AppConfig> => {
    const { getConfigForServer } = await import('~/shared/lib/config')
    return getConfigForServer()
  }
)

export type SetConfigInput = {
  accessToken: string
  providerToken?: string
  github_repo_url: string
  zenn_username: string
  author_name?: string
  admins: string[]
  site_title?: string
  site_subtitle?: string
  author_icon?: string
  author_one_liner?: string
}

export const setConfig = createServerFn({ method: 'POST' })
  .inputValidator((data: SetConfigInput) => data)
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

    const { getConfigForServer } = await import('~/shared/lib/config')
    let repoUrl = data.github_repo_url
    if (!repoUrl || !isValidGithubRepoUrl(repoUrl)) {
      const current = await getConfigForServer()
      repoUrl = current.github_repo_url
    }
    if (!repoUrl || !isValidGithubRepoUrl(repoUrl)) {
      const envUrl = process.env.GITHUB_REPO_URL ?? ''
      if (isValidGithubRepoUrl(envUrl)) repoUrl = envUrl
    }
    if (!repoUrl || !isValidGithubRepoUrl(repoUrl)) {
      return { success: false, error: 'GitHub リポジトリ URL を設定してください' }
    }

    const parsed = parseRepoUrl(repoUrl)
    if (!parsed) return { success: false, error: 'リポジトリ URL を解析できません' }

    const token = data.providerToken ?? process.env.GITHUB_TOKEN
    if (!token) return { success: false, error: 'GitHub トークンが必要です。ログインし直すか、GITHUB_TOKEN を設定してください' }

    const current = await getConfigForServer()
    const config: AppConfig = {
      github_repo_url: repoUrl,
      zenn_username: data.zenn_username.trim(),
      author_name: typeof data.author_name === 'string' ? data.author_name.trim() : current.author_name ?? '',
      admins: Array.isArray(data.admins) ? data.admins.filter((a): a is string => typeof a === 'string') : [],
      site_title: typeof data.site_title === 'string' ? data.site_title.trim() : current.site_title ?? '',
      site_subtitle: typeof data.site_subtitle === 'string' ? data.site_subtitle.trim() : current.site_subtitle ?? '',
      author_icon: typeof data.author_icon === 'string' ? data.author_icon.trim() : current.author_icon ?? '',
      author_one_liner: typeof data.author_one_liner === 'string' ? data.author_one_liner.trim() : current.author_one_liner ?? '',
    }

    const content = JSON.stringify(config, null, 2)
    const maxRetries = 3

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const sha = await getFileSha(parsed.owner, parsed.repo, CONFIG_PATH, token)
      const result = await updateFileOnGitHub(
        parsed.owner,
        parsed.repo,
        CONFIG_PATH,
        content,
        'chore: update obsidian-log config',
        token,
        sha
      )

      if (result.success) {
        writeLocalConfig(config)
        return result
      }

      const shaMismatch =
        result.error &&
        (result.error.includes("wasn't supplied") ||
          (result.error.includes('is at') && result.error.includes('but expected')) ||
        result.error.includes('does not match'))

      if (!shaMismatch || attempt === maxRetries - 1) return result
    }

    return { success: false, error: '更新に失敗しました' }
  })

export type UploadAuthorIconInput = {
  accessToken: string
  providerToken?: string
  contentBase64: string
  filename: string
}

/** 作者アイコンを Blog-Repo の .obsidian-log/author-icon.{ext} にアップロード */
export const uploadAuthorIcon = createServerFn({ method: 'POST' })
  .inputValidator((data: UploadAuthorIconInput) => data)
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

      const { getConfigForServer } = await import('~/shared/lib/config')
      const current = await getConfigForServer()
      const repoUrl = current.github_repo_url
      if (!repoUrl || !isValidGithubRepoUrl(repoUrl)) {
        return { success: false, error: 'GitHub リポジトリ URL を設定してください' }
      }

      const parsed = parseRepoUrl(repoUrl)
      if (!parsed) return { success: false, error: 'リポジトリ URL を解析できません' }

      const token = data.providerToken ?? process.env.GITHUB_TOKEN
      if (!token) {
        return { success: false, error: 'GitHub トークンが必要です' }
      }

      const ext = data.filename.split('.').pop()?.toLowerCase() ?? 'png'
      if (!['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) {
        return { success: false, error: 'png, jpg, jpeg, gif, webp のみ対応しています' }
      }

      const path = `.obsidian-log/author-icon.${ext}`
      const sha = await getFileSha(parsed.owner, parsed.repo, path, token)
      const result = await updateFileOnGitHub(
        parsed.owner,
        parsed.repo,
        path,
        data.contentBase64,
        'chore: update author icon',
        token,
        sha ?? undefined,
        true
      )

      if (!result.success) return { success: false, error: result.error ?? 'アップロードに失敗しました' }

      const rawUrl = `https://raw.githubusercontent.com/${parsed.owner}/${parsed.repo}/main/${path}`
      return { success: true, url: rawUrl }
    }
  )
