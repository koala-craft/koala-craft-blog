import * as fs from 'node:fs'
import * as path from 'node:path'
import { createServerFn } from '@tanstack/react-start'
import { validateSlug } from '~/shared/lib/slug'
import { getGithubRepoUrlForServer } from '~/shared/lib/contentSource'
import { parseRepoUrl, fetchDirectory, fetchRawFile, fetchFileContent } from '~/shared/lib/github'
import type { Article } from './types'

const CONTENT_DIR = path.join(process.cwd(), 'content')

/**
 * frontmatter から topics をパース（Zenn 形式）
 * - topics: ["a", "b"] のインライン配列
 * - topics:\n  - a\n  - b の YAML リスト形式
 */
function parseTopicsFromFrontmatter(frontmatter: string): string[] {
  const tags: string[] = []

  // 形式1: topics: ["a", "b"] または topics: [a, b]
  const inlineMatch = frontmatter.match(/topics:\s*\[([^\]]*)\]/)
  if (inlineMatch) {
    const raw = inlineMatch[1]
    if (raw.trim()) {
      tags.push(
        ...raw.split(',').map((t) => t.trim().replace(/^['"]|['"]$/g, ''))
      )
    }
    return tags.filter(Boolean)
  }

  // 形式2: topics:\n  - a\n  - b
  const listMatch = frontmatter.match(/topics:\s*\n((?:\s+-\s*.+\n?)+)/)
  if (listMatch) {
    const lines = listMatch[1].split('\n')
    for (const line of lines) {
      const itemMatch = line.match(/^\s+-\s+(.+)$/)
      if (itemMatch) {
        const val = itemMatch[1].trim().replace(/^['"]|['"]$/g, '')
        if (val) tags.push(val)
      }
    }
  }

  return tags
}

function parseArticle(content: string, slug: string): Article | null {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  if (!frontmatterMatch) return null

  const [, frontmatter, body] = frontmatterMatch
  const title = frontmatter.match(/title:\s*(.+)/)?.[1]?.trim() ?? slug
  const rawCreatedAt =
    frontmatter.match(/createdAt:\s*(.+)/)?.[1]?.trim() ??
    frontmatter.match(/published_at:\s*(.+)/)?.[1]?.trim() ??
    ''
  const createdAt = rawCreatedAt.replace(/^["'\s\u201C\u201D]+|["'\s\u201C\u201D]+$/g, '')
  // タグは topics から取得（Zenn 形式）
  const tags = parseTopicsFromFrontmatter(frontmatter)
  // visibility: 明示指定 > Zenn の published > デフォルト public
  let visibility: 'public' | 'private' = 'public'
  const visibilityVal = frontmatter.match(/visibility:\s*(.+)/)?.[1]?.trim()
  const publishedVal = frontmatter.match(/published:\s*(.+)/)?.[1]?.trim()
  if (visibilityVal) {
    visibility = visibilityVal.toLowerCase() === 'private' ? 'private' : 'public'
  } else if (publishedVal?.toLowerCase() === 'false') {
    visibility = 'private'
  }

  return { slug, title, content: body, createdAt, tags, visibility }
}

async function fetchArticlesFromGitHub(owner: string, repo: string): Promise<Article[]> {
  const files = await fetchDirectory(owner, repo, 'articles')
  const articles: Article[] = []

  for (const file of files) {
    if (!file.name.endsWith('.md')) continue
    const slug = file.name.replace(/\.md$/, '')
    if (!validateSlug(slug)) continue

    const content = await fetchRawFile(file.download_url)
    if (!content) continue

    const article = parseArticle(content, slug)
    if (article && article.visibility === 'public') {
      articles.push(article)
    }
  }

  return articles.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

function fetchArticlesFromLocal(): Article[] {
  const articlesDir = path.join(CONTENT_DIR, 'articles')
  if (!fs.existsSync(articlesDir)) return []

  const files = fs.readdirSync(articlesDir)
  const articles: Article[] = []

  for (const file of files) {
    if (!file.endsWith('.md')) continue
    const slug = file.replace(/\.md$/, '')
    if (!validateSlug(slug)) continue

    const content = fs.readFileSync(path.join(articlesDir, file), 'utf-8')
    const article = parseArticle(content, slug)
    if (article && article.visibility === 'public') {
      articles.push(article)
    }
  }

  return articles.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export const getArticles = createServerFn({ method: 'GET' }).handler(async (): Promise<Article[]> => {
  try {
    const githubUrl = await getGithubRepoUrlForServer()
    const parsed = githubUrl ? parseRepoUrl(githubUrl) : null

    if (parsed) {
      try {
        return await fetchArticlesFromGitHub(parsed.owner, parsed.repo)
      } catch {
        // GitHub 取得失敗時はフォールバック
      }
    }
  } catch {
    // site_config 取得失敗時もフォールバック
  }
  return fetchArticlesFromLocal()
})

export const getArticle = createServerFn({ method: 'GET' })
  .inputValidator((data: { slug: string }) => data)
  .handler(async ({ data }): Promise<Article | null> => {
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
            `articles/${slug}.md`
          )
          if (content) {
            const article = parseArticle(content, slug)
            if (article) return article
          }
        } catch {
          // フォールバック
        }
      }
    } catch {
      // site_config 取得失敗時もフォールバック
    }

    const filePath = path.join(CONTENT_DIR, 'articles', `${slug}.md`)
    if (!fs.existsSync(filePath)) return null
    const content = fs.readFileSync(filePath, 'utf-8')
    return parseArticle(content, slug)
  })
