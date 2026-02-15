/**
 * ブログ画像の仮保存（プレビュー用）
 * 貼り付け時→仮保存→プレビュー表示、保存時→GitHub push→仮ディレクトリ削除
 */

import { join } from 'path'
import { tmpdir } from 'os'
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'fs'

/** サーバーレス（Vercel 等）では /tmp、ローカルでは .blog-assets-temp */
const TEMP_DIR = join(tmpdir(), 'obsidian-log-blog-assets')

function ensureTempDir(): string {
  if (!existsSync(TEMP_DIR)) {
    mkdirSync(TEMP_DIR, { recursive: true })
  }
  return TEMP_DIR
}

/** 仮保存して返す URL パス（例: /api/blog-assets/temp/xxx.png） */
export function saveTempImage(key: string, contentBase64: string, ext: string): string {
  const dir = ensureTempDir()
  const safeKey = key.replace(/[^a-zA-Z0-9_-]/g, '_')
  const filename = `${safeKey}.${ext}`
  const filepath = join(dir, filename)
  const buffer = Buffer.from(contentBase64, 'base64')
  writeFileSync(filepath, buffer)
  return `/api/blog-assets/temp/${filename}`
}

/** 仮保存ファイルを読み込み */
export function readTempImage(keyWithExt: string): Buffer | null {
  const dir = ensureTempDir()
  const safe = keyWithExt.replace(/\.\./g, '').replace(/[/\\]/g, '')
  const filepath = join(dir, safe)
  if (!existsSync(filepath)) return null
  return readFileSync(filepath)
}

/** 仮ディレクトリの全ファイルを削除 */
export function clearTempAssets(): void {
  if (existsSync(TEMP_DIR)) {
    rmSync(TEMP_DIR, { recursive: true })
  }
}
