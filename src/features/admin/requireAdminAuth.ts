/**
 * 管理者 API 用の認証・権限チェック共通化
 */

import { getSupabase } from '~/shared/lib/supabase'

function getGitHubUsername(user: { user_metadata?: Record<string, unknown> }): string | null {
  const meta = user.user_metadata
  if (!meta) return null
  const name = (meta.user_name ?? meta.user_login ?? meta.login) as string | undefined
  return typeof name === 'string' ? name : null
}

export type AdminAuthResult =
  | { ok: true }
  | { ok: false; error: string }

/**
 * accessToken で認証し、管理者権限を検証する。
 * 成功時は { ok: true }、失敗時は { ok: false, error } を返す。
 */
export async function requireAdminAuth(accessToken: string): Promise<AdminAuthResult> {
  const supabase = getSupabase()
  if (!supabase) return { ok: false, error: 'Supabase が設定されていません' }

  const { data: { user }, error } = await supabase.auth.getUser(accessToken)
  if (error || !user) return { ok: false, error: '認証が必要です' }

  const username = getGitHubUsername(user)
  if (!username) return { ok: false, error: 'GitHub ユーザー名を取得できません' }

  const { isAdminByUsername } = await import('~/shared/lib/config')
  const isAdmin = await isAdminByUsername(username)
  if (!isAdmin) return { ok: false, error: '管理者権限がありません' }

  return { ok: true }
}
