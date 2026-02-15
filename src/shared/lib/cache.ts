/**
 * サーバー側のインメモリキャッシュ（TTL 付き）
 * GitHub API のレート制限対策。Vercel サーバーレスではインスタンスごとにキャッシュが分かれる
 */

const DEFAULT_TTL_MS = 30 * 60 * 1000 // 30分

interface CacheEntry<T> {
  value: T
  expiresAt: number
}

const store = new Map<string, CacheEntry<unknown>>()

/**
 * キャッシュから取得。期限切れなら undefined
 */
export function get<T>(key: string): T | undefined {
  const entry = store.get(key) as CacheEntry<T> | undefined
  if (!entry) return undefined
  if (Date.now() > entry.expiresAt) {
    store.delete(key)
    return undefined
  }
  return entry.value
}

/**
 * キャッシュに保存
 */
export function set<T>(key: string, value: T, ttlMs = DEFAULT_TTL_MS): void {
  store.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
  })
}

/**
 * キャッシュキーを削除（管理画面で更新した際など）
 */
export function invalidate(key: string): void {
  store.delete(key)
}

/**
 * コンテンツ関連のキャッシュを一括削除
 */
export function invalidateContent(): void {
  for (const key of [
    'articles',
    'scraps',
    'blog',
    'config',
    'page:home',
    'page:tech',
    'page:author',
  ]) {
    store.delete(key)
  }
}

/**
 * キャッシュがあれば返し、なければ fetcher を実行してキャッシュ
 */
export async function getOrSet<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs = DEFAULT_TTL_MS
): Promise<T> {
  const cached = get<T>(key)
  if (cached !== undefined) return cached

  const value = await fetcher()
  set(key, value, ttlMs)
  return value
}
