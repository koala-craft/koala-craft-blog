import * as fs from 'node:fs'
import * as path from 'node:path'
import { createServerFn } from '@tanstack/react-start'
import { validateSlug } from '~/shared/lib/slug'
import { getGithubRepoUrlForServer } from '~/shared/lib/contentSource'
import { getOrSet, invalidate } from '~/shared/lib/cache'
import { parseRepoUrl, fetchDirectory, fetchRawFile, fetchFileContent } from '~/shared/lib/github'
import type { Scrap, ScrapWithSlug } from './types'

const CONTENT_DIR = path.join(process.cwd(), 'content')

function normalizeScrap(scrap: Scrap): Scrap {
  return {
    ...scrap,
    closed: typeof scrap.closed === 'boolean' ? scrap.closed : false,
    closed_reason: scrap.closed ? (scrap.closed_reason?.trim() || undefined) : undefined,
  }
}

async function fetchScrapsFromGitHub(owner: string, repo: string): Promise<ScrapWithSlug[]> {
  const files = await fetchDirectory(owner, repo, 'scraps')
  const scraps: ScrapWithSlug[] = []

  for (const file of files) {
    if (!file.name.endsWith('.json')) continue
    const slug = file.name.replace(/\.json$/, '')
    if (!validateSlug(slug)) continue

    const content = await fetchRawFile(file.download_url)
    if (!content) continue

    try {
      const scrap = normalizeScrap(JSON.parse(content) as Scrap)
      scraps.push({ ...scrap, slug })
    } catch {
      // invalid json, skip
    }
  }

  return scraps.sort((a, b) => b.created_at.localeCompare(a.created_at))
}

function fetchScrapsFromLocal(): ScrapWithSlug[] {
  const scrapsDir = path.join(CONTENT_DIR, 'scraps')
  if (!fs.existsSync(scrapsDir)) return []

  const files = fs.readdirSync(scrapsDir)
  const scraps: ScrapWithSlug[] = []

  for (const file of files) {
    if (!file.endsWith('.json')) continue
    const slug = file.replace(/\.json$/, '')
    if (!validateSlug(slug)) continue

    const content = fs.readFileSync(path.join(scrapsDir, file), 'utf-8')
    try {
      const scrap = normalizeScrap(JSON.parse(content) as Scrap)
      scraps.push({ ...scrap, slug })
    } catch {
      // invalid json, skip
    }
  }

  return scraps.sort((a, b) => b.created_at.localeCompare(a.created_at))
}

export const getScraps = createServerFn({ method: 'GET' })
  .inputValidator((data: { bypassCache?: boolean }) => data ?? {})
  .handler(async ({ data }): Promise<ScrapWithSlug[]> => {
    if (data?.bypassCache) invalidate('scraps')
    return getOrSet('scraps', async () => {
    try {
      const githubUrl = await getGithubRepoUrlForServer()
      const parsed = githubUrl ? parseRepoUrl(githubUrl) : null

      if (parsed) {
        try {
          return await fetchScrapsFromGitHub(parsed.owner, parsed.repo)
        } catch {
          // GitHub 取得失敗時はフォールバック
        }
      }
    } catch {
      // site_config 取得失敗時もフォールバック
    }
    return fetchScrapsFromLocal()
  })
})

export const getScrap = createServerFn({ method: 'GET' })
  .inputValidator((data: { slug: string }) => data)
  .handler(async ({ data }): Promise<ScrapWithSlug | null> => {
    const slug = data.slug
    if (!validateSlug(slug)) return null

    try {
      const githubUrl = await getGithubRepoUrlForServer()
      const parsed = githubUrl ? parseRepoUrl(githubUrl) : null

      if (parsed) {
        try {
          const content = await fetchFileContent(
            parsed.owner,
            parsed.repo,
            `scraps/${slug}.json`
          )
          if (content) {
            const scrap = normalizeScrap(JSON.parse(content) as Scrap)
            return { ...scrap, slug }
          }
        } catch {
          // フォールバック
        }
      }
    } catch {
      // site_config 取得失敗時もフォールバック
    }

    const filePath = path.join(CONTENT_DIR, 'scraps', `${slug}.json`)
    if (!fs.existsSync(filePath)) return null
    const content = fs.readFileSync(filePath, 'utf-8')
    try {
      const scrap = normalizeScrap(JSON.parse(content) as Scrap)
      return { ...scrap, slug }
    } catch {
      return null
    }
  })
