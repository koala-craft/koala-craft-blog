import { createFileRoute, useRouter, useLoaderData } from '@tanstack/react-router'
import { useState, useCallback } from 'react'
import type { RootLoaderData } from '~/shared/types/rootLoader'
import {
  setSiteConfigAll,
  validateGithubRepoUrl,
  validateZennUsername,
  validateAuthorName,
  validateSiteHeader,
} from '~/features/admin/siteConfig'
import { uploadAuthorIcon } from '~/features/admin/configApi'
import { getSession } from '~/features/admin/auth'
import { getBlogImageSrc } from '~/shared/lib/blogImageUrl'

export const Route = createFileRoute('/admin/settings')({
  component: AdminSettings,
})

function AdminSettings() {
  const router = useRouter()
  const rootData = useLoaderData({ from: '__root__' as const }) as RootLoaderData
  const [url, setUrl] = useState(rootData.githubRepoUrl)
  const [zennUsername, setZennUsernameState] = useState(rootData.zennUsername)
  const [authorName, setAuthorNameState] = useState(rootData.authorName)
  const [siteTitle, setSiteTitle] = useState(rootData.siteTitle)
  const [siteSubtitle, setSiteSubtitle] = useState(rootData.siteSubtitle)
  const [authorIcon, setAuthorIcon] = useState(rootData.authorIcon)
  const [authorOneLiner, setAuthorOneLiner] = useState(rootData.authorOneLiner)
  const [authorIconUploading, setAuthorIconUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleAuthorIconDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (!file?.type.startsWith('image/')) return
    setAuthorIconUploading(true)
    setMessage(null)
    try {
      const buf = await file.arrayBuffer()
      const base64 = btoa(
        new Uint8Array(buf).reduce((acc, b) => acc + String.fromCharCode(b), '')
      )
      const session = await getSession()
      if (!session) {
        setMessage({ type: 'error', text: 'ログインが必要です' })
        return
      }
      const result = await uploadAuthorIcon({
        data: {
          accessToken: session.session.access_token,
          providerToken: session.session.provider_token ?? undefined,
          contentBase64: base64,
          filename: file.name,
        },
      })
      if (result.success) {
        setAuthorIcon(result.url)
        setMessage({ type: 'success', text: '作者アイコンをアップロードしました。保存ボタンで反映されます。' })
      } else {
        setMessage({ type: 'error', text: result.error ?? 'アップロードに失敗しました' })
      }
    } finally {
      setAuthorIconUploading(false)
    }
  }, [])

  const handleAuthorIconPaste = useCallback(async (e: React.ClipboardEvent) => {
    const file = e.clipboardData.files[0]
    if (!file?.type.startsWith('image/')) return
    e.preventDefault()
    setAuthorIconUploading(true)
    setMessage(null)
    try {
      const buf = await file.arrayBuffer()
      const base64 = btoa(
        new Uint8Array(buf).reduce((acc, b) => acc + String.fromCharCode(b), '')
      )
      const session = await getSession()
      if (!session) {
        setMessage({ type: 'error', text: 'ログインが必要です' })
        return
      }
      const result = await uploadAuthorIcon({
        data: {
          accessToken: session.session.access_token,
          providerToken: session.session.provider_token ?? undefined,
          contentBase64: base64,
          filename: file.name,
        },
      })
      if (result.success) {
        setAuthorIcon(result.url)
        setMessage({ type: 'success', text: '作者アイコンをアップロードしました。保存ボタンで反映されます。' })
      } else {
        setMessage({ type: 'error', text: result.error ?? 'アップロードに失敗しました' })
      }
    } finally {
      setAuthorIconUploading(false)
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)
    const urlValidation = validateGithubRepoUrl(url)
    if (!urlValidation.valid) {
      setMessage({ type: 'error', text: urlValidation.error ?? '入力が不正です' })
      return
    }
    const zennValidation = validateZennUsername(zennUsername)
    if (!zennValidation.valid) {
      setMessage({ type: 'error', text: zennValidation.error ?? 'Zenn ユーザー名が不正です' })
      return
    }
    const authorNameValidation = validateAuthorName(authorName)
    if (!authorNameValidation.valid) {
      setMessage({ type: 'error', text: authorNameValidation.error ?? '作者名が不正です' })
      return
    }
    const headerValidation = validateSiteHeader(siteTitle, siteSubtitle)
    if (!headerValidation.valid) {
      setMessage({ type: 'error', text: headerValidation.error ?? 'トップページの入力が不正です' })
      return
    }
    setSaving(true)
    const result = await setSiteConfigAll({
      github_repo_url: url,
      zenn_username: zennUsername,
      author_name: authorName,
      site_title: siteTitle,
      site_subtitle: siteSubtitle,
      author_icon: authorIcon,
      author_one_liner: authorOneLiner,
    })
    setSaving(false)
    if (result.success) {
      router.invalidate()
      setMessage({ type: 'success', text: '保存しました。トップページに反映されます。' })
    } else {
      setMessage({
        type: 'error',
        text: result.error ?? '保存に失敗しました',
      })
    }
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">サイト設定</h1>

      <form onSubmit={handleSubmit} className="space-y-4 max-w-xl">
        <div>
          <label htmlFor="site_title" className="block text-sm font-medium text-zinc-300 mb-2">
            トップページ タイトル
          </label>
          <input
            id="site_title"
            type="text"
            value={siteTitle}
            onChange={(e) => setSiteTitle(e.target.value)}
            placeholder="気楽に誠実に"
            className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            disabled={saving}
          />
          <p className="text-xs text-zinc-500 mt-1">トップページの h1 に表示されます。</p>
        </div>

        <div>
          <label htmlFor="site_subtitle" className="block text-sm font-medium text-zinc-300 mb-2">
            トップページ 説明文
          </label>
          <input
            id="site_subtitle"
            type="text"
            value={siteSubtitle}
            onChange={(e) => setSiteSubtitle(e.target.value)}
            placeholder="ブログアプリ"
            className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            disabled={saving}
          />
          <p className="text-xs text-zinc-500 mt-1">タイトル直下に表示されます。</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            作者アイコン
          </label>
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleAuthorIconDrop}
            onPaste={handleAuthorIconPaste}
            className={`flex items-center justify-center gap-2 rounded border border-dashed transition min-h-[120px] max-w-[200px] ${
              authorIconUploading
                ? 'border-cyan-500/50 bg-cyan-900/20'
                : 'border-zinc-700/80 bg-zinc-800/50 hover:border-zinc-600/80'
            }`}
          >
            {authorIcon && !authorIconUploading ? (
              <>
                <img
                  src={getBlogImageSrc(authorIcon)}
                  alt=""
                  className="w-20 h-20 rounded-full object-cover shrink-0"
                />
                <button
                  type="button"
                  onClick={() => setAuthorIcon('')}
                  className="text-xs text-zinc-500 hover:text-red-400 transition"
                >
                  削除
                </button>
              </>
            ) : authorIconUploading ? (
              <span className="text-sm text-cyan-400">アップロード中...</span>
            ) : (
              <span className="text-sm text-zinc-500">画像をドロップまたは貼り付け</span>
            )}
          </div>
          <p className="text-xs text-zinc-500 mt-1">Author ページに表示。Blog-Repo の .obsidian-log/ に保存。png, jpg, gif, webp 対応。</p>
        </div>

        <div>
          <label htmlFor="github_repo_url" className="block text-sm font-medium text-zinc-300 mb-2">
            GitHub リポジトリ URL
          </label>
          <input
            id="github_repo_url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://github.com/owner/repo"
            className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            disabled={saving}
          />
          <p className="text-xs text-zinc-500 mt-1">
            記事・スクラップの取得元。空の場合はローカル content/ を参照します。
          </p>
        </div>

        <div>
          <label htmlFor="zenn_username" className="block text-sm font-medium text-zinc-300 mb-2">
            Zenn ユーザー名
          </label>
          <input
            id="zenn_username"
            type="text"
            value={zennUsername}
            onChange={(e) => setZennUsernameState(e.target.value)}
            placeholder="username"
            className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            disabled={saving}
          />
          <p className="text-xs text-zinc-500 mt-1">
            記事・スクラップ詳細ページの「Zenn で見る」リンク生成に使用。空の場合は非表示。
          </p>
        </div>

        <div>
          <label htmlFor="author_name" className="block text-sm font-medium text-zinc-300 mb-2">
            作者名
          </label>
          <input
            id="author_name"
            type="text"
            value={authorName}
            onChange={(e) => setAuthorNameState(e.target.value)}
            placeholder="表示用の作者名"
            className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            disabled={saving}
          />
          <p className="text-xs text-zinc-500 mt-1">
            Author ページ・記事フッターなどで表示する作者名。Zenn ユーザー名とは別に管理します。
          </p>
        </div>

        <div>
          <label htmlFor="author_one_liner" className="block text-sm font-medium text-zinc-300 mb-2">
            ひとこと
          </label>
          <input
            id="author_one_liner"
            type="text"
            value={authorOneLiner}
            onChange={(e) => setAuthorOneLiner(e.target.value)}
            placeholder="Author ページの作者名下に表示する一言"
            maxLength={200}
            className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            disabled={saving}
          />
          <p className="text-xs text-zinc-500 mt-1">
            Author ページの作者名（{authorName || '表示名'}）の下に表示されます。200文字以内。
          </p>
        </div>

        {message && (
          <p
            className={`text-sm ${
              message.type === 'success' ? 'text-green-400' : 'text-amber-400'
            }`}
          >
            {message.text}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-zinc-600 disabled:cursor-not-allowed text-white font-medium rounded transition"
        >
          {saving ? '保存中...' : '保存'}
        </button>
      </form>
    </div>
  )
}
