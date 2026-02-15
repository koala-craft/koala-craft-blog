/**
 * 管理者判定（config.json ベース）
 * サーバーで実行。GitHub ユーザー名を config.json の admins と照合
 */

import { createServerFn } from '@tanstack/react-start'
import { getSupabase } from '~/shared/lib/supabase'

function getGitHubUsername(user: { user_metadata?: Record<string, unknown> }): string | null {
  const meta = user.user_metadata
  if (!meta) return null
  // GitHub OAuth の user_name または user_login
  const name = (meta.user_name ?? meta.user_login ?? meta.login) as string | undefined
  return typeof name === 'string' ? name : null
}

export const verifyAdminServer = createServerFn({ method: 'POST' })
  .inputValidator((data: { accessToken: string }) => data)
  .handler(async ({ data }): Promise<{ ok: boolean; isAdmin: boolean }> => {
    const supabase = getSupabase()
    if (!supabase) return { ok: false, isAdmin: false }

    try {
      const { data: { user }, error } = await supabase.auth.getUser(data.accessToken)
      if (error || !user) return { ok: false, isAdmin: false }

      const username = getGitHubUsername(user)
      if (!username) return { ok: true, isAdmin: false }

      const { isAdminByUsername } = await import('~/shared/lib/config')
      const isAdmin = await isAdminByUsername(username)
      return { ok: true, isAdmin }
    } catch {
      return { ok: false, isAdmin: false }
    }
  })
