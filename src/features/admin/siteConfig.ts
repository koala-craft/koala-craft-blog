/**
 * サイト設定（config.json）
 * 管理者のみ編集可能
 */

import { getConfig, setConfig } from './configApi'
import type { AppConfig } from '~/shared/lib/config'

const GITHUB_REPO_URL_REGEX = /^https:\/\/github\.com\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+\/?$/
const VALUE_MAX_LENGTH = 500

export function validateGithubRepoUrl(value: string): { valid: boolean; error?: string } {
  if (value === '') return { valid: true }
  if (value.length > VALUE_MAX_LENGTH) {
    return { valid: false, error: `500文字以内で入力してください` }
  }
  if (!GITHUB_REPO_URL_REGEX.test(value)) {
    return {
      valid: false,
      error: 'https://github.com/{owner}/{repo} の形式で入力してください',
    }
  }
  return { valid: true }
}

const ZENN_USERNAME_REGEX = /^[a-z0-9_-]*$/

export function validateZennUsername(value: string): { valid: boolean; error?: string } {
  if (value === '') return { valid: true }
  if (value.length > 50) {
    return { valid: false, error: '50文字以内で入力してください' }
  }
  if (!ZENN_USERNAME_REGEX.test(value)) {
    return {
      valid: false,
      error: '小文字英数字・ハイフン・アンダースコアのみ使用できます',
    }
  }
  return { valid: true }
}

const SITE_TITLE_MAX_LENGTH = 100
const SITE_SUBTITLE_MAX_LENGTH = 200

export function validateSiteHeader(title: string, subtitle: string): { valid: boolean; error?: string } {
  if (title.length > SITE_TITLE_MAX_LENGTH) {
    return { valid: false, error: `タイトルは${SITE_TITLE_MAX_LENGTH}文字以内で入力してください` }
  }
  if (subtitle.length > SITE_SUBTITLE_MAX_LENGTH) {
    return { valid: false, error: `説明文は${SITE_SUBTITLE_MAX_LENGTH}文字以内で入力してください` }
  }
  return { valid: true }
}

const AUTHOR_NAME_MAX_LENGTH = 100

export function validateAuthorName(value: string): { valid: boolean; error?: string } {
  if (value.length > AUTHOR_NAME_MAX_LENGTH) {
    return { valid: false, error: `${AUTHOR_NAME_MAX_LENGTH}文字以内で入力してください` }
  }
  return { valid: true }
}

const AUTHOR_ICON_MAX_LENGTH = 2000
const AUTHOR_ONE_LINER_MAX_LENGTH = 200

export function validateAuthorOneLiner(value: string): { valid: boolean; error?: string } {
  if (value.length > AUTHOR_ONE_LINER_MAX_LENGTH) {
    return { valid: false, error: `${AUTHOR_ONE_LINER_MAX_LENGTH}文字以内で入力してください` }
  }
  return { valid: true }
}

export function validateAuthorIcon(url: string): { valid: boolean; error?: string } {
  if (url === '') return { valid: true }
  if (url.length > AUTHOR_ICON_MAX_LENGTH) {
    return { valid: false, error: `${AUTHOR_ICON_MAX_LENGTH}文字以内で入力してください` }
  }
  const trimmed = url.trim()
  if (trimmed.startsWith('https://raw.githubusercontent.com/')) return { valid: true }
  if (trimmed.startsWith('.obsidian-log/') && /\.(png|jpg|jpeg|gif|webp)$/i.test(trimmed)) {
    return { valid: true }
  }
  return { valid: false, error: '有効な画像 URL を入力してください' }
}

/**
 * サイト設定を一括保存（競合を防ぎ、GitHub API 呼び出しを 1 回に抑える）
 */
export async function setSiteConfigAll(params: {
  github_repo_url: string
  zenn_username: string
  author_name: string
  site_title: string
  site_subtitle: string
  author_icon?: string
  author_one_liner?: string
}): Promise<{ success: boolean; error?: string }> {
  const urlValidation = validateGithubRepoUrl(params.github_repo_url)
  if (!urlValidation.valid) {
    return { success: false, error: urlValidation.error }
  }
  const zennValidation = validateZennUsername(params.zenn_username)
  if (!zennValidation.valid) {
    return { success: false, error: zennValidation.error }
  }
  const authorNameValidation = validateAuthorName(params.author_name)
  if (!authorNameValidation.valid) {
    return { success: false, error: authorNameValidation.error }
  }
  const headerValidation = validateSiteHeader(params.site_title, params.site_subtitle)
  if (!headerValidation.valid) {
    return { success: false, error: headerValidation.error }
  }
  if (params.author_icon !== undefined) {
    const iconValidation = validateAuthorIcon(params.author_icon)
    if (!iconValidation.valid) {
      return { success: false, error: iconValidation.error }
    }
  }
  const oneLinerValidation = validateAuthorOneLiner(params.author_one_liner ?? '')
  if (!oneLinerValidation.valid) {
    return { success: false, error: oneLinerValidation.error }
  }
  return setConfigPartial({
    github_repo_url: params.github_repo_url,
    zenn_username: params.zenn_username,
    author_name: params.author_name.trim(),
    site_title: params.site_title.trim(),
    site_subtitle: params.site_subtitle.trim(),
    author_icon: params.author_icon?.trim(),
    author_one_liner: params.author_one_liner?.trim(),
  })
}

async function setConfigPartial(
  partial: Partial<
    Pick<AppConfig, 'github_repo_url' | 'zenn_username' | 'author_name' | 'site_title' | 'site_subtitle' | 'author_icon' | 'author_one_liner'>
  >
): Promise<{ success: boolean; error?: string }> {
  const { getSession } = await import('./auth')
  const session = await getSession()
  if (!session) return { success: false, error: 'ログインが必要です' }

  const current = await getConfig()
  const result = await setConfig({
    data: {
      accessToken: session.session.access_token,
      providerToken: session.session.provider_token ?? undefined,
      github_repo_url: partial.github_repo_url ?? current.github_repo_url,
      zenn_username: partial.zenn_username ?? current.zenn_username,
      author_name: partial.author_name ?? current.author_name ?? '',
      admins: current.admins,
      site_title: partial.site_title ?? current.site_title ?? '',
      site_subtitle: partial.site_subtitle ?? current.site_subtitle ?? '',
      author_icon: partial.author_icon !== undefined ? partial.author_icon : current.author_icon ?? '',
      author_one_liner: partial.author_one_liner !== undefined ? partial.author_one_liner : current.author_one_liner ?? '',
    },
  })
  return result
}
