/**
 * GitHub API によるコンテンツ取得
 * SSRF 対策: URL は呼び出し元で検証済みであること
 */

const GITHUB_API = 'https://api.github.com'
const FETCH_TIMEOUT_MS = 20_000

async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeout?: number } = {}
): Promise<Response> {
  const { timeout = FETCH_TIMEOUT_MS, ...init } = options
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  try {
    const res = await fetch(url, { ...init, signal: controller.signal })
    return res
  } finally {
    clearTimeout(timer)
  }
}
const GITHUB_REPO_URL_REGEX = /^https:\/\/github\.com\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+\/?$/

export function isValidGithubRepoUrl(url: string): boolean {
  return url !== '' && GITHUB_REPO_URL_REGEX.test(url)
}

export function parseRepoUrl(url: string): { owner: string; repo: string } | null {
  const match = url.match(/^https:\/\/github\.com\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_.-]+)\/?$/)
  if (!match) return null
  return { owner: match[1], repo: match[2] }
}

interface GitHubFile {
  name: string
  path: string
  type: string
  sha?: string
  download_url: string | null
  content?: string
  encoding?: string
}

const GITHUB_HEADERS: Record<string, string> = {
  Accept: 'application/vnd.github.v3+json',
  'User-Agent': 'Obsidian-Log (https://github.com)',
}

export async function fetchDirectory(
  owner: string,
  repo: string,
  path: string
): Promise<{ name: string; download_url: string }[]> {
  const token = typeof process !== 'undefined' ? process.env.GITHUB_TOKEN : undefined
  const headers: Record<string, string> = { ...GITHUB_HEADERS }
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetchWithTimeout(
    `${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`,
    { headers }
  )
  if (!res.ok) return []

  const data = (await res.json()) as GitHubFile | GitHubFile[]
  const items = Array.isArray(data) ? data : [data]
  return items
    .filter((f) => f.type === 'file' && f.download_url)
    .map((f) => ({ name: f.name, download_url: f.download_url! }))
}

/** ディレクトリ内のファイル一覧（sha, download_url 含む。リネーム時に使用） */
export async function fetchDirectoryWithSha(
  owner: string,
  repo: string,
  path: string,
  token: string
): Promise<{ name: string; path: string; sha: string; download_url: string }[]> {
  const headers: Record<string, string> = {
    ...GITHUB_HEADERS,
    Authorization: `Bearer ${token}`,
  }
  const res = await fetchWithTimeout(
    `${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`,
    { headers }
  )
  if (!res.ok) return []

  const data = (await res.json()) as GitHubFile | GitHubFile[]
  const items = Array.isArray(data) ? data : [data]
  return items
    .filter((f) => f.type === 'file' && f.sha && f.download_url)
    .map((f) => ({
      name: f.name,
      path: f.path,
      sha: f.sha!,
      download_url: f.download_url!,
    }))
}

export async function fetchFileContent(
  owner: string,
  repo: string,
  path: string
): Promise<string | null> {
  const token = typeof process !== 'undefined' ? process.env.GITHUB_TOKEN : undefined
  const headers: Record<string, string> = { ...GITHUB_HEADERS }
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetchWithTimeout(
    `${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`,
    { headers }
  )
  if (!res.ok) return null

  const data = (await res.json()) as GitHubFile
  if (data.encoding === 'base64' && data.content) {
    return Buffer.from(data.content, 'base64').toString('utf-8')
  }
  if (data.download_url) {
    const raw = await fetchWithTimeout(data.download_url, { headers })
    if (raw.ok) return raw.text()
  }
  return null
}

async function getFileShaWithRef(
  owner: string,
  repo: string,
  path: string,
  token: string,
  ref?: string
): Promise<string | null> {
  const headers: Record<string, string> = {
    ...GITHUB_HEADERS,
    Authorization: `Bearer ${token}`,
  }
  const url = ref
    ? `${GITHUB_API}/repos/${owner}/${repo}/contents/${path}?ref=${encodeURIComponent(ref)}`
    : `${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`
  const res = await fetchWithTimeout(url, { headers })
  if (!res.ok) return null
  const data = (await res.json()) as { sha?: string } | { sha?: string }[]
  const file = Array.isArray(data) ? data[0] : data
  return file?.sha ?? null
}

export async function getFileSha(
  owner: string,
  repo: string,
  path: string,
  token: string
): Promise<string | null> {
  let sha = await getFileShaWithRef(owner, repo, path, token)
  if (sha) return sha
  sha = await getFileShaWithRef(owner, repo, path, token, 'main')
  if (sha) return sha
  return getFileShaWithRef(owner, repo, path, token, 'master')
}

export async function updateFileOnGitHub(
  owner: string,
  repo: string,
  path: string,
  content: string,
  message: string,
  token: string,
  sha?: string | null,
  /** true: content が既に base64（画像等）。false: UTF-8 として base64 エンコード */
  contentAlreadyBase64 = false
): Promise<{ success: boolean; error?: string }> {
  const headers: Record<string, string> = {
    ...GITHUB_HEADERS,
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
  const body: Record<string, unknown> = {
    message,
    content: contentAlreadyBase64 ? content : Buffer.from(content, 'utf-8').toString('base64'),
  }
  if (sha) body.sha = sha

  const res = await fetchWithTimeout(
    `${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`,
    { method: 'PUT', headers, body: JSON.stringify(body) }
  )

  if (!res.ok) {
    const err = (await res.json()) as { message?: string }
    return { success: false, error: err.message ?? res.statusText }
  }
  return { success: true }
}

export async function deleteFileOnGitHub(
  owner: string,
  repo: string,
  path: string,
  message: string,
  token: string,
  sha: string
): Promise<{ success: boolean; error?: string }> {
  const headers: Record<string, string> = {
    ...GITHUB_HEADERS,
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
  const body = { message, sha }

  const res = await fetchWithTimeout(
    `${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`,
    { method: 'DELETE', headers, body: JSON.stringify(body) }
  )

  if (!res.ok) {
    const err = (await res.json()) as { message?: string }
    return { success: false, error: err.message ?? res.statusText }
  }
  return { success: true }
}

export async function fetchRawFile(downloadUrl: string): Promise<string | null> {
  // SSRF 対策: raw.githubusercontent.com のみ許可
  if (!downloadUrl.startsWith('https://raw.githubusercontent.com/')) return null

  const token = typeof process !== 'undefined' ? process.env.GITHUB_TOKEN : undefined
  const headers: Record<string, string> = { ...GITHUB_HEADERS }
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetchWithTimeout(downloadUrl, { headers })
  if (!res.ok) return null
  return res.text()
}

/** raw.githubusercontent.com の画像をバイナリで取得（プロキシ用） */
export async function fetchRawFileBinary(downloadUrl: string): Promise<ArrayBuffer | null> {
  if (!downloadUrl.startsWith('https://raw.githubusercontent.com/')) return null

  const token = typeof process !== 'undefined' ? process.env.GITHUB_TOKEN : undefined
  const headers: Record<string, string> = { ...GITHUB_HEADERS }
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetchWithTimeout(downloadUrl, { headers })
  if (!res.ok) return null
  return res.arrayBuffer()
}

/**
 * owner/repo/path から画像を取得。main → master の順でブランチを試行
 * （リポジトリのデフォルトブランチが master の場合に対応）
 */
export async function fetchRawFileBinaryWithBranchFallback(
  owner: string,
  repo: string,
  filePath: string
): Promise<ArrayBuffer | null> {
  for (const branch of ['main', 'master']) {
    const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`
    const buf = await fetchRawFileBinary(url)
    if (buf) return buf
  }
  return null
}
