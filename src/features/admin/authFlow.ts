/**
 * 認証フローの共通ロジック
 * useAuth から抽出。セキュリティ・保守性のため重複を排除
 */

import type { Session, User } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import { checkIsAdmin, getAdminCache, setAdminCache } from './auth'

const INIT_DELAY_MS = 400
const VISIBILITY_DELAY_MS = 0
const RETRY_DELAY_BASE_MS = 800
const RETRY_INNER_DELAY_MS = 1000
const MAX_ATTEMPTS = 2
const INNER_RETRIES = 2
export const AUTH_TIMEOUT_MS = 30_000
const OAUTH_CALLBACK_RETRY_COUNT = 5
const OAUTH_CALLBACK_DELAY_MS = 200

export type VerifyAdminResult =
  | { ok: true; isAdmin: boolean }
  | { ok: false; session: Session }

/**
 * refreshSession + checkIsAdmin をリトライ付きで実行
 */
export async function verifyAdminWithRetry(
  supabase: SupabaseClient,
  session: Session
): Promise<VerifyAdminResult> {
  let activeSession = session
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (attempt > 0) {
      await sleep(RETRY_DELAY_BASE_MS * attempt)
    }
    const { data: { session: refreshed } } = await supabase.auth.refreshSession()
    activeSession = refreshed ?? activeSession
    let result = await checkIsAdmin(activeSession.access_token ?? '')
    if (result.ok) {
      if (result.isAdmin) setAdminCache(activeSession.user.id, true)
      return { ok: true, isAdmin: result.isAdmin }
    }
    for (let i = 0; i < INNER_RETRIES; i++) {
      await sleep(RETRY_INNER_DELAY_MS * (i + 1))
      result = await checkIsAdmin(activeSession.access_token ?? '')
      if (result.ok) {
        if (result.isAdmin) setAdminCache(activeSession.user.id, true)
        return { ok: true, isAdmin: result.isAdmin }
      }
    }
  }
  return { ok: false, session: activeSession }
}

/**
 * セッションから管理者状態を解決（キャッシュ優先 → ネットワーク検証）
 */
export async function resolveAdminState(
  supabase: SupabaseClient,
  session: Session,
  options: { useCache: boolean; initialDelayMs?: number }
): Promise<{ user: User; isAdmin: boolean }> {
  const { useCache, initialDelayMs = 0 } = options
  if (initialDelayMs > 0) await sleep(initialDelayMs)

  const cached = useCache && getAdminCache(session.user.id)
  if (cached) {
    return { user: session.user, isAdmin: true }
  }

  const result = await verifyAdminWithRetry(supabase, session)
  if (result.ok) {
    return { user: session.user, isAdmin: result.isAdmin }
  }
  const fallback = getAdminCache(result.session.user.id)
  return { user: result.session.user, isAdmin: fallback }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

export {
  INIT_DELAY_MS,
  OAUTH_CALLBACK_DELAY_MS,
  OAUTH_CALLBACK_RETRY_COUNT,
  VISIBILITY_DELAY_MS,
}
