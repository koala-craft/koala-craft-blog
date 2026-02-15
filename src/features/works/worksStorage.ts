/**
 * works.json（.obsidian-log/works.json）の読み書き
 * ローカル優先、なければ GitHub から取得
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import {
  parseRepoUrl,
  fetchFileContent,
  isValidGithubRepoUrl,
} from '~/shared/lib/github'
import type { WorksData, WorkItem } from './types'

const WORKS_PATH = '.obsidian-log/works.json'
const WORKS_PATHS = [WORKS_PATH, `content/${WORKS_PATH}`]

function getContentDir(): string {
  if (typeof process === 'undefined' || typeof process.cwd !== 'function') return ''
  return path.join(process.cwd(), 'content')
}

function getLocalWorksPath(): string {
  const contentDir = getContentDir()
  return contentDir ? path.join(contentDir, WORKS_PATH) : ''
}

function parseWorksJson(raw: string): WorksData {
  try {
    const parsed = JSON.parse(raw) as { items?: unknown[] }
    if (!Array.isArray(parsed.items)) return { items: [] }
    const validCategories = ['personal', 'professional', 'sidejob']
    const items: WorkItem[] = parsed.items
      .filter((x): x is Record<string, unknown> => {
        if (x == null || typeof x !== 'object') return false
        const o = x as Record<string, unknown>
        return (
          typeof o.id === 'string' &&
          typeof o.title === 'string' &&
          validCategories.includes(String(o.category))
        )
      })
      .map((x: Record<string, unknown>) => {
        const startDate = typeof x.startDate === 'string' ? x.startDate : undefined
        const endDate = typeof x.endDate === 'string' ? x.endDate : undefined
        const isCurrent = x.isCurrent === true
        const period = typeof x.period === 'string' ? x.period : undefined
        return {
          id: String(x.id),
          title: String(x.title),
          startDate,
          endDate,
          isCurrent,
          comingSoon: x.comingSoon === true,
          description: typeof x.description === 'string' ? x.description : undefined,
          href: typeof x.href === 'string' ? x.href : undefined,
          tags: Array.isArray(x.tags)
            ? (x.tags as unknown[]).filter((t): t is string => typeof t === 'string')
            : undefined,
          thumbnail: typeof x.thumbnail === 'string' ? x.thumbnail : undefined,
          category: (validCategories.includes(String(x.category)) ? x.category : 'personal') as WorkItem['category'],
          period: startDate || endDate || isCurrent ? undefined : period,
        }
      })
    return { items }
  } catch {
    return { items: [] }
  }
}

function readLocalWorks(): WorksData | null {
  const localPath = getLocalWorksPath()
  if (!localPath || !fs.existsSync(localPath)) return null
  try {
    const raw = fs.readFileSync(localPath, 'utf-8')
    return parseWorksJson(raw)
  } catch {
    return null
  }
}

export async function getWorksForServer(): Promise<WorksData> {
  const local = readLocalWorks()
  if (local) return local

  const { getConfigForServer } = await import('~/shared/lib/config')
  const config = await getConfigForServer()
  const repoUrl = config.github_repo_url
  if (!repoUrl || !isValidGithubRepoUrl(repoUrl)) return { items: [] }

  const parsed = parseRepoUrl(repoUrl)
  if (!parsed) return { items: [] }

  for (const p of WORKS_PATHS) {
    try {
      const content = await fetchFileContent(parsed.owner, parsed.repo, p)
      if (content) return parseWorksJson(content)
    } catch {
      continue
    }
  }
  return { items: [] }
}

export function writeLocalWorks(data: WorksData): void {
  const localPath = getLocalWorksPath()
  if (!localPath) return
  try {
    const dir = path.dirname(localPath)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(localPath, JSON.stringify(data, null, 2), 'utf-8')
  } catch {
    // ignore
  }
}
