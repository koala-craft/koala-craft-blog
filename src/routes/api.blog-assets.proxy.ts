/**
 * ブログ画像のプロキシ（ローカル優先、なければ GitHub から取得）
 * GET /api/blog-assets/proxy?url=...  （raw.githubusercontent.com の URL）
 * GET /api/blog-assets/proxy?path=... （相対パス例: blog/assets/slug/image.png）
 * - ローカル content/ にファイルがあればそれを返す
 * - なければ GitHub から取得（プライベートリポジトリ対応）
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import { createFileRoute } from '@tanstack/react-router'
import {
  fetchRawFileBinary,
  fetchRawFileBinaryWithBranchFallback,
  parseRepoUrl,
} from '~/shared/lib/github'
import { getGithubRepoUrlForServer } from '~/shared/lib/contentSource'

const RAW_PREFIX = 'https://raw.githubusercontent.com/'
const CONTENT_DIR = path.join(process.cwd(), 'content')
const BLOG_ASSETS_PREFIX = 'blog/assets/'
const ARTICLES_ASSETS_PREFIX = 'articles/assets/'
const SCRAPS_ASSETS_PREFIX = 'scraps/assets/'
const AUTHOR_ICON_PREFIX = '.obsidian-log/author-icon'
const WORKS_PREFIX = '.obsidian-log/works/'

const ASSET_PREFIXES = [BLOG_ASSETS_PREFIX, ARTICLES_ASSETS_PREFIX, SCRAPS_ASSETS_PREFIX, AUTHOR_ICON_PREFIX, WORKS_PREFIX]

/** owner/repo が一致し、かつ許可されたパス配下の画像のみ許可 */
function isAllowedUrl(url: string, allowedOwner: string, allowedRepo: string): boolean {
  if (!url.startsWith(RAW_PREFIX)) return false
  const pathStr = url.slice(RAW_PREFIX.length)
  const parts = pathStr.split('/')
  if (parts.length < 4) return false
  const [owner, repo, , ...rest] = parts
  const filePath = rest.join('/')
  if (filePath.includes('..')) return false
  const allowedExt = /\.(png|jpg|jpeg|gif|webp)$/i
  const isAllowed =
    owner === allowedOwner &&
    repo === allowedRepo &&
    ASSET_PREFIXES.some((p) => filePath.startsWith(p)) &&
    allowedExt.test(filePath)
  return isAllowed
}

/** raw URL から content 内の相対パスを取得 */
function getLocalPathFromRawUrl(rawUrl: string): string | null {
  if (!rawUrl.startsWith(RAW_PREFIX)) return null
  const pathStr = rawUrl.slice(RAW_PREFIX.length)
  const parts = pathStr.split('/')
  if (parts.length < 4) return null
  const [, , , ...rest] = parts
  const filePath = rest.join('/')
  if (!ASSET_PREFIXES.some((p) => filePath.startsWith(p)) || filePath.includes('..')) return null
  return filePath
}

/** path パラメータが許可されたパス配下の有効な画像パスか検証 */
function isValidAssetPath(p: string): boolean {
  const normalized = p.replace(/^\/+/, '').replace(/\\/g, '/')
  if (normalized.includes('..')) return false
  const hasValidPrefix =
    normalized.startsWith(BLOG_ASSETS_PREFIX) ||
    normalized.startsWith(ARTICLES_ASSETS_PREFIX) ||
    normalized.startsWith(SCRAPS_ASSETS_PREFIX) ||
    (normalized.startsWith(AUTHOR_ICON_PREFIX) && /author-icon\.(png|jpg|jpeg|gif|webp)$/i.test(normalized)) ||
    (normalized.startsWith(WORKS_PREFIX) && /\/thumbnail\.(png|jpg|jpeg|gif|webp)$/i.test(normalized))
  return hasValidPrefix && /\.(png|jpg|jpeg|gif|webp)$/i.test(normalized)
}

function getContentType(ext: string): string {
  const mime: Record<string, string> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
  }
  return mime[ext] ?? 'image/png'
}

async function serveImage(
  decodedUrl: string,
  parsed: { owner: string; repo: string }
): Promise<Response> {
  const ext = decodedUrl.split('.').pop()?.toLowerCase() ?? 'png'
  const contentType = getContentType(ext)

  try {
    const localPath = getLocalPathFromRawUrl(decodedUrl)
    if (localPath) {
      const fullPath = path.join(CONTENT_DIR, localPath)
      if (fs.existsSync(fullPath)) {
        const buffer = fs.readFileSync(fullPath)
        return new Response(buffer, {
          headers: {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=3600',
          },
        })
      }
    }
  } catch {
    // ローカル参照で例外が出ても GitHub を試す
  }

  let buffer = await fetchRawFileBinary(decodedUrl)
  if (!buffer && decodedUrl.startsWith(RAW_PREFIX)) {
    const pathStr = decodedUrl.slice(RAW_PREFIX.length)
    const parts = pathStr.split('/')
    if (parts.length >= 4) {
      const [owner, repo, branch, ...rest] = parts
      const filePath = rest.join('/')
      const otherBranch = branch === 'main' ? 'master' : 'main'
      const altUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${otherBranch}/${filePath}`
      buffer = await fetchRawFileBinary(altUrl)
    }
  }
  if (!buffer) return new Response('Not Found', { status: 404 })

  return new Response(buffer, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=3600',
    },
  })
}

export const Route = createFileRoute('/api/blog-assets/proxy')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const targetUrl = url.searchParams.get('url')
        let targetPath = url.searchParams.get('path')
        if (targetPath != null && targetPath) {
          try {
            targetPath = decodeURIComponent(targetPath)
          } catch {
            // そのまま使用
          }
        }

        // 本番では content/ が無く config が読めないことがあるため、env を直接フォールバック
        let githubUrl = await getGithubRepoUrlForServer()
        if (!githubUrl && typeof process !== 'undefined' && process.env?.GITHUB_REPO_URL) {
          githubUrl = process.env.GITHUB_REPO_URL
        }
        const parsed = parseRepoUrl(githubUrl ?? '')
        if (!parsed) {
          return new Response('Forbidden', { status: 403 })
        }

        let decodedUrl: string | null = null

        if (targetUrl) {
          try {
            decodedUrl = decodeURIComponent(targetUrl)
          } catch {
            return new Response('Invalid url', { status: 400 })
          }
          if (!isAllowedUrl(decodedUrl, parsed.owner, parsed.repo)) {
            return new Response('Forbidden', { status: 403 })
          }
        } else if (targetPath && isValidAssetPath(targetPath)) {
          const normalizedPath = targetPath.replace(/^\/+/, '').replace(/\\/g, '/')

          // ローカル優先（存在しなければ・読み込み失敗・例外時は必ず GitHub へフォールバック）
          try {
            const fullPath = path.join(CONTENT_DIR, normalizedPath)
            if (fs.existsSync(fullPath)) {
              const buffer = fs.readFileSync(fullPath)
              const ext = normalizedPath.split('.').pop()?.toLowerCase() ?? 'png'
              return new Response(buffer, {
                headers: {
                  'Content-Type': getContentType(ext),
                  'Cache-Control': 'public, max-age=3600',
                },
              })
            }
          } catch {
            // ローカル参照で例外が出ても GitHub を試す
          }

          // ローカルにない／読めない場合は必ず GitHub から取得（本番で content/ が無い場合のメインパス）
          // プライベートリポジトリの場合は GITHUB_TOKEN の設定が必要
          const buffer = await fetchRawFileBinaryWithBranchFallback(
            parsed.owner,
            parsed.repo,
            normalizedPath
          )
          if (buffer) {
            const ext = normalizedPath.split('.').pop()?.toLowerCase() ?? 'png'
            return new Response(buffer, {
              headers: {
                'Content-Type': getContentType(ext),
                'Cache-Control': 'public, max-age=3600',
              },
            })
          }
          return new Response('Not Found', { status: 404 })
        } else {
          return new Response('Missing url or path', { status: 400 })
        }

        if (!decodedUrl) return new Response('Bad Request', { status: 400 })
        return serveImage(decodedUrl, parsed)
      },
    },
  },
})
