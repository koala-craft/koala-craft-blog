import * as fs from 'node:fs'
import * as path from 'node:path'
import { createServerFn } from '@tanstack/react-start'
import { validateSlug } from '~/shared/lib/slug'
import { getGithubRepoUrlForServer } from '~/shared/lib/contentSource'
import { parseRepoUrl, fetchDirectory, fetchRawFile, fetchFileContent } from '~/shared/lib/github'
import type { BlogPost } from './types'

const CONTENT_DIR = path.join(process.cwd(), 'content')
const BLOG_DIR = 'blog'

function parseTagsFromFrontmatter(frontmatter: string): string[] {
  const tags: string[] = []
  const inlineMatch = frontmatter.match(/tags:\s*\[([^\]]*)\]/)
  if (inlineMatch) {
    const raw = inlineMatch[1]
    if (raw.trim()) {
      tags.push(...raw.split(',').map((t) => t.trim().replace(/^['"]|['"]$/g, '')))
    }
    return tags.filter(Boolean)
  }
  const listMatch = frontmatter.match(/tags:\s*\n((?:\s+-\s*.+\n?)+)/)
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

function parseBlogPost(content: string, slug: string): BlogPost | null {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  if (!frontmatterMatch) return null

  const [, frontmatter, body] = frontmatterMatch
  const title = frontmatter.match(/title:\s*(.+)/)?.[1]?.trim() ?? slug
  const createdAt =
    frontmatter.match(/createdAt:\s*(.+)/)?.[1]?.trim() ??
    frontmatter.match(/created_at:\s*(.+)/)?.[1]?.trim() ??
    ''
  const updatedAt = frontmatter.match(/updatedAt:\s*(.+)/)?.[1]?.trim() ?? createdAt
  const tags = parseTagsFromFrontmatter(frontmatter)
  let visibility: 'public' | 'private' = 'public'
  const visibilityVal = frontmatter.match(/visibility:\s*(.+)/)?.[1]?.trim()
  if (visibilityVal) {
    visibility = visibilityVal.toLowerCase() === 'private' ? 'private' : 'public'
  }

  const firstView = frontmatter.match(/firstView:\s*(.+)/)?.[1]?.trim()

  return {
    slug,
    title,
    content: body,
    createdAt,
    updatedAt,
    tags,
    visibility,
    firstView: firstView || undefined,
  }
}

async function fetchBlogPostsFromGitHub(
  owner: string,
  repo: string,
  includePrivate = false
): Promise<BlogPost[]> {
  const files = await fetchDirectory(owner, repo, BLOG_DIR)
  const posts: BlogPost[] = []

  for (const file of files) {
    if (!file.name.endsWith('.md')) continue
    const slug = file.name.replace(/\.md$/, '')
    if (!validateSlug(slug)) continue

    const content = await fetchRawFile(file.download_url)
    if (!content) continue

    const post = parseBlogPost(content, slug)
    if (post && (includePrivate || post.visibility === 'public')) {
      posts.push(post)
    }
  }

  return posts.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

function fetchBlogPostsFromLocal(includePrivate = false): BlogPost[] {
  const blogDir = path.join(CONTENT_DIR, BLOG_DIR)
  if (!fs.existsSync(blogDir)) return []

  const files = fs.readdirSync(blogDir)
  const posts: BlogPost[] = []

  for (const file of files) {
    if (!file.endsWith('.md')) continue
    const slug = file.replace(/\.md$/, '')
    if (!validateSlug(slug)) continue

    const content = fs.readFileSync(path.join(blogDir, file), 'utf-8')
    const post = parseBlogPost(content, slug)
    if (post && (includePrivate || post.visibility === 'public')) {
      posts.push(post)
    }
  }

  return posts.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export const getBlogPosts = createServerFn({ method: 'GET' }).handler(async (): Promise<BlogPost[]> => {
  try {
    const githubUrl = await getGithubRepoUrlForServer()
    const parsed = githubUrl ? parseRepoUrl(githubUrl) : null

    if (parsed) {
      try {
        return await fetchBlogPostsFromGitHub(parsed.owner, parsed.repo, false)
      } catch {
        // fallback
      }
    }
  } catch {
    // fallback
  }
  return fetchBlogPostsFromLocal(false)
})

export const getAdminBlogPosts = createServerFn({ method: 'GET' }).handler(
  async (): Promise<BlogPost[]> => {
    try {
      const githubUrl = await getGithubRepoUrlForServer()
      const parsed = githubUrl ? parseRepoUrl(githubUrl) : null

      if (parsed) {
        try {
          return await fetchBlogPostsFromGitHub(parsed.owner, parsed.repo, true)
        } catch {
          // fallback
        }
      }
    } catch {
      // fallback
    }
    return fetchBlogPostsFromLocal(true)
  }
)

export const getBlogPost = createServerFn({ method: 'GET' })
  .inputValidator((data: { slug: string }) => data)
  .handler(async ({ data }): Promise<BlogPost | null> => {
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
            `${BLOG_DIR}/${slug}.md`
          )
          if (content) {
            const post = parseBlogPost(content, slug)
            if (post) return post
          }
        } catch {
          // fallback
        }
      }
    } catch {
      // fallback
    }

    const filePath = path.join(CONTENT_DIR, BLOG_DIR, `${slug}.md`)
    if (!fs.existsSync(filePath)) return null
    const content = fs.readFileSync(filePath, 'utf-8')
    return parseBlogPost(content, slug)
  })
