import type { User, Session } from '@supabase/supabase-js'
import { getSupabase } from '~/shared/lib/supabase'
import { verifyAdminServer } from './verifyAdmin'

export async function signInWithGitHub(redirectTo?: string): Promise<void> {
  const supabase = getSupabase()
  if (!supabase) {
    console.error('Supabase is not configured')
    return
  }
  const url = typeof window !== 'undefined' ? window.location.origin : ''
  await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo: redirectTo ?? `${url}/admin`,
    },
  })
}

export async function signOut(): Promise<void> {
  const supabase = getSupabase()
  if (!supabase) return
  await supabase.auth.signOut()
}

export async function getSession(): Promise<{ user: User; session: Session } | null> {
  const supabase = getSupabase()
  if (!supabase) return null
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) return null
  return { user: session.user, session }
}

export type CheckAdminResult = { ok: true; isAdmin: boolean } | { ok: false }

/** config.json の admins で管理者判定。サーバー関数を呼ぶ */
export async function checkIsAdmin(accessToken: string): Promise<CheckAdminResult> {
  if (!accessToken) return { ok: false }
  try {
    const result = await verifyAdminServer({ data: { accessToken } })
    return result.ok ? { ok: true, isAdmin: result.isAdmin } : { ok: false }
  } catch {
    return { ok: false }
  }
}

const ADMIN_CACHE_KEY = 'obsidian-log-admin-cache'
const ADMIN_CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24時間

function parseCache(raw: string | null, userId: string): boolean {
  if (!raw) return false
  try {
    const { uid, isAdmin, at } = JSON.parse(raw) as {
      uid: string
      isAdmin: boolean
      at: number
    }
    if (uid !== userId || !isAdmin) return false
    if (Date.now() - at > ADMIN_CACHE_TTL_MS) return false
    return true
  } catch {
    return false
  }
}

export function getAdminCache(userId: string): boolean {
  if (typeof window === 'undefined') return false
  return parseCache(sessionStorage.getItem(ADMIN_CACHE_KEY), userId)
}

export function setAdminCache(userId: string, isAdmin: boolean): void {
  if (typeof window === 'undefined' || !isAdmin) return
  try {
    sessionStorage.setItem(
      ADMIN_CACHE_KEY,
      JSON.stringify({ uid: userId, isAdmin: true, at: Date.now() })
    )
  } catch {
    // ignore
  }
}

export function clearAdminCache(): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.removeItem(ADMIN_CACHE_KEY)
  } catch {
    // ignore
  }
}

