/**
 * config.json（.obsidian-log/config.json）の読み書き
 * 環境変数 GITHUB_REPO_URL で指定したリポジトリから取得
 * 未設定時はローカル content/.obsidian-log/config.json を参照
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import { getOrSet } from './cache'
import {
  parseRepoUrl,
  fetchFileContent,
  isValidGithubRepoUrl,
} from './github'

export interface AppConfig {
  github_repo_url: string
  zenn_username: string
  /** サイト上で表示する作者名（Zenn ユーザー名とは別） */
  author_name?: string
  admins: string[]
  /** トップページの h1 */
  site_title?: string
  /** トップページの h1 直下の説明文 */
  site_subtitle?: string
  /** 作者アイコン URL（raw.githubusercontent.com） */
  author_icon?: string
  /** Author ページの作者名下に表示するひとこと */
  author_one_liner?: string
}

const CONFIG_PATHS = ['.obsidian-log/config.json', 'content/.obsidian-log/config.json']

/** サーバー専用。ブラウザでは空文字を返す（process.cwd が存在しないため） */
function getContentDir(): string {
  if (typeof process === 'undefined' || typeof process.cwd !== 'function') {
    return ''
  }
  return path.join(process.cwd(), 'content')
}

function getLocalConfigPath(): string {
  const contentDir = getContentDir()
  return contentDir ? path.join(contentDir, '.obsidian-log', 'config.json') : ''
}

const DEFAULT_CONFIG: AppConfig = {
  github_repo_url: '',
  zenn_username: '',
  admins: [],
}

function getRepoUrlFromEnv(): string {
  const url =
    (typeof process !== 'undefined' ? process.env?.GITHUB_REPO_URL : undefined) ?? ''
  return typeof url === 'string' && isValidGithubRepoUrl(url) ? url : ''
}

function parseConfigJson(raw: string): AppConfig {
  try {
    const parsed = JSON.parse(raw) as Partial<AppConfig>
    return {
      github_repo_url: typeof parsed.github_repo_url === 'string' ? parsed.github_repo_url : '',
      zenn_username: typeof parsed.zenn_username === 'string' ? parsed.zenn_username : '',
      author_name: typeof parsed.author_name === 'string' ? parsed.author_name.trim() : '',
      admins: Array.isArray(parsed.admins)
        ? parsed.admins.filter((a): a is string => typeof a === 'string')
        : [],
      site_title: typeof parsed.site_title === 'string' ? parsed.site_title : '',
      site_subtitle: typeof parsed.site_subtitle === 'string' ? parsed.site_subtitle : '',
      author_icon: typeof parsed.author_icon === 'string' ? parsed.author_icon.trim() : '',
      author_one_liner: typeof parsed.author_one_liner === 'string' ? parsed.author_one_liner.trim() : '',
    }
  } catch {
    return { ...DEFAULT_CONFIG }
  }
}

function readLocalConfig(): AppConfig | null {
  const localPath = getLocalConfigPath()
  if (!localPath || !fs.existsSync(localPath)) return null
  try {
    const raw = fs.readFileSync(localPath, 'utf-8')
    return parseConfigJson(raw)
  } catch {
    return null
  }
}

/**
 * サーバー用: ローカル config を書き込み
 * GitHub 保存成功時に呼び、読み込み時のフォールバックを最新に保つ
 */
export function writeLocalConfig(config: AppConfig): void {
  const localPath = getLocalConfigPath()
  if (!localPath) return
  try {
    const dir = path.dirname(localPath)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(localPath, JSON.stringify(config, null, 2), 'utf-8')
  } catch {
    // 書き込み失敗は無視（GitHub が正とする）
  }
}

/**
 * サーバー用: config.json を取得
 * 1. ローカル content/.obsidian-log/config.json を優先（保存時に常に更新されるため最新）
 * 2. ローカルがなければ env / config の github_repo_url から GitHub を取得
 */
export async function getConfigForServer(): Promise<AppConfig> {
  return getOrSet('config', async () => {
    const local = readLocalConfig()
    if (local) return local

    const envUrl = getRepoUrlFromEnv()
    const urlsToTry: string[] = []
    if (envUrl) urlsToTry.push(envUrl)

    for (const repoUrl of urlsToTry) {
      const parsed = parseRepoUrl(repoUrl)
      if (!parsed) continue
      for (const configPath of CONFIG_PATHS) {
        try {
          const content = await fetchFileContent(
            parsed.owner,
            parsed.repo,
            configPath
          )
          if (content) return parseConfigJson(content)
        } catch {
          continue
        }
      }
    }

    return { ...DEFAULT_CONFIG }
  })
}

/**
 * サーバー用: GitHub リポジトリ URL を取得
 * config または env から
 */
export async function getGithubRepoUrlForServer(): Promise<string> {
  const config = await getConfigForServer()
  if (config.github_repo_url && isValidGithubRepoUrl(config.github_repo_url)) {
    return config.github_repo_url
  }
  return getRepoUrlFromEnv()
}

/**
 * サーバー用: Zenn ユーザー名を取得
 */
export async function getZennUsernameForServer(): Promise<string> {
  const config = await getConfigForServer()
  return config.zenn_username.trim()
}

/**
 * サーバー用: 作者名を取得
 */
export async function getAuthorNameForServer(): Promise<string> {
  const config = await getConfigForServer()
  return config.author_name?.trim() ?? ''
}

export async function getAuthorIconForServer(): Promise<string> {
  const config = await getConfigForServer()
  return config.author_icon?.trim() ?? ''
}

/**
 * サーバー用: GitHub ユーザー名が管理者かチェック
 */
export async function isAdminByUsername(username: string): Promise<boolean> {
  if (!username || typeof username !== 'string') return false
  const config = await getConfigForServer()
  if (config.admins.length === 0) return false
  const normalized = username.trim().toLowerCase()
  return config.admins.some((a) => a.trim().toLowerCase() === normalized)
}
