/**
 * Works（お仕事・制作物）の取得・更新 API
 */

import { createServerFn } from '@tanstack/react-start'
import { getSupabase } from '~/shared/lib/supabase'
import {
  parseRepoUrl,
  isValidGithubRepoUrl,
  getFileSha,
  updateFileOnGitHub,
} from '~/shared/lib/github'
import {
  getWorksForServer,
  writeLocalWorks,
} from './worksStorage'
import type { WorksData, WorkItem } from './types'

const WORKS_PATH = '.obsidian-log/works.json'

function getGitHubUsername(user: { user_metadata?: Record<string, unknown> }): string | null {
  const meta = user.user_metadata
  if (!meta) return null
  const name = (meta.user_name ?? meta.user_login ?? meta.login) as string | undefined
  return typeof name === 'string' ? name : null
}

export const getWorks = createServerFn({ method: 'GET' }).handler(
  async (): Promise<WorksData> => getWorksForServer()
)

export type SetWorksInput = {
  accessToken: string
  providerToken?: string
  works: WorksData
}

export const setWorks = createServerFn({ method: 'POST' })
  .inputValidator((data: SetWorksInput) => data)
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
    const config = await getConfigForServer()
    const repoUrl = config.github_repo_url
    if (!repoUrl || !isValidGithubRepoUrl(repoUrl)) {
      return { success: false, error: 'GitHub リポジトリ URL を設定してください' }
    }

    const parsed = parseRepoUrl(repoUrl)
    if (!parsed) return { success: false, error: 'リポジトリ URL を解析できません' }

    const token = data.providerToken ?? process.env.GITHUB_TOKEN
    if (!token) return { success: false, error: 'GitHub トークンが必要です' }

    const content = JSON.stringify(data.works, null, 2)
    const sha = await getFileSha(parsed.owner, parsed.repo, WORKS_PATH, token)
    const result = await updateFileOnGitHub(
      parsed.owner,
      parsed.repo,
      WORKS_PATH,
      content,
      'chore: update works',
      token,
      sha ?? undefined
    )

    if (result.success) {
      writeLocalWorks(data.works)
    }
    return result
  })

export type WorkItemInput = Omit<WorkItem, 'id'> & { id?: string }

export function createWorkItem(input: WorkItemInput): WorkItem {
  return {
    id: input.id ?? `work-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    title: input.title,
    startDate: input.startDate,
    endDate: input.endDate,
    isCurrent: input.isCurrent,
    comingSoon: input.comingSoon,
    description: input.description,
    href: input.href,
    tags: input.tags,
    thumbnail: input.thumbnail,
    category: input.category,
  }
}

export type UploadWorkThumbnailInput = {
  accessToken: string
  providerToken?: string
  workId: string
  contentBase64: string
  filename: string
}

/** Work サムネイルを .obsidian-log/works/{workId}/thumbnail.{ext} にアップロード */
export const uploadWorkThumbnail = createServerFn({ method: 'POST' })
  .inputValidator((data: UploadWorkThumbnailInput) => data)
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

      const safeId = data.workId.replace(/[^a-zA-Z0-9-_]/g, '')
      if (!safeId) return { success: false, error: '無効な workId です' }

      const path = `.obsidian-log/works/${safeId}/thumbnail.${ext}`
      const sha = await getFileSha(parsed.owner, parsed.repo, path, token)
      const result = await updateFileOnGitHub(
        parsed.owner,
        parsed.repo,
        path,
        data.contentBase64,
        'chore: update work thumbnail',
        token,
        sha ?? undefined,
        true
      )

      if (!result.success) return { success: false, error: result.error ?? 'アップロードに失敗しました' }

      const rawUrl = `https://raw.githubusercontent.com/${parsed.owner}/${parsed.repo}/main/${path}`
      return { success: true, url: rawUrl }
    }
  )
