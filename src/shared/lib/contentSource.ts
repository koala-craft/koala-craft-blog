/**
 * コンテンツ取得元の判定（サーバー用）
 * config.json から GitHub URL を取得し、使用するかローカルにフォールバックするか判定
 * config は動的 import で、クライアントバンドルに config（node:fs 等）を含めない
 */

export async function getGithubRepoUrlForServer(): Promise<string> {
  const { getGithubRepoUrlForServer } = await import('./config')
  return getGithubRepoUrlForServer()
}

export async function getZennUsernameForServer(): Promise<string> {
  const { getZennUsernameForServer } = await import('./config')
  return getZennUsernameForServer()
}

export async function getAuthorIconForServer(): Promise<string> {
  const { getAuthorIconForServer } = await import('./config')
  return getAuthorIconForServer()
}
