/**
 * ブログ画像の仮保存ファイルを配信（プレビュー用）
 * GET /api/blog-assets/temp/:filename
 */

import { createFileRoute } from '@tanstack/react-router'
import { readTempImage } from '~/shared/lib/blogTempAssets'

const MIME: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
}

export const Route = createFileRoute('/api/blog-assets/temp/$')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const pathname = new URL(request.url).pathname
        const filename = pathname.split('/api/blog-assets/temp/')[1] ?? ''
        if (!filename) {
          return new Response('Not Found', { status: 404 })
        }
        if (/\.\.|[\/\\]/.test(filename)) {
          return new Response('Bad Request', { status: 400 })
        }
        const buffer = readTempImage(filename)
        if (!buffer) {
          return new Response('Not Found', { status: 404 })
        }
        const ext = filename.split('.').pop()?.toLowerCase() ?? 'png'
        const contentType = MIME[ext] ?? 'image/png'
        return new Response(new Uint8Array(buffer), {
          headers: {
            'Content-Type': contentType,
            'Cache-Control': 'private, max-age=60',
          },
        })
      },
    },
  },
})
