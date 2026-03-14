/**
 * ルート直下でドロップを捕捉し、ブログ／記事エディタ用にカスタムイベントを発火する。
 * body の直下にマウントされるため、React の子ツリーより先に存在し、
 * ドロップが document に届く限り確実に preventDefault できる。
 */

import { useLayoutEffect } from 'react'

const BLOG_EDITOR_PATH = /^\/admin\/blog\/(new|[^/]+)$/
const ARTICLE_EDITOR_PATH = /^\/admin\/articles\/(new|[^/]+)$/

export const BLOG_EDITOR_FILE_DROP = 'blog-editor-file-drop'
export const ARTICLE_EDITOR_FILE_DROP = 'article-editor-file-drop'

export type BlogEditorFileDropDetail = {
  files: File[]
  clientX: number
  clientY: number
}

export type ArticleEditorFileDropDetail = BlogEditorFileDropDetail

function isBlogEditorPage(): boolean {
  if (typeof window === 'undefined') return false
  return BLOG_EDITOR_PATH.test(window.location.pathname)
}

function isArticleEditorPage(): boolean {
  if (typeof window === 'undefined') return false
  return ARTICLE_EDITOR_PATH.test(window.location.pathname)
}

function isMdEditorPage(): boolean {
  return isBlogEditorPage() || isArticleEditorPage()
}

export function GlobalDropCapture() {
  useLayoutEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      if (!isMdEditorPage()) return
      if (!e.dataTransfer) return
      e.preventDefault()
      e.stopPropagation()
      if (e.dataTransfer.types?.includes('Files')) {
        e.dataTransfer.dropEffect = 'copy'
      }
    }

    const handleDrop = (e: DragEvent) => {
      const files = e.dataTransfer?.files
      if (!files?.length) return
      if (!isMdEditorPage()) return
      e.preventDefault()
      e.stopPropagation()
      const detail: BlogEditorFileDropDetail = {
        files: Array.from(files),
        clientX: e.clientX,
        clientY: e.clientY,
      }
      if (isBlogEditorPage()) {
        window.dispatchEvent(
          new CustomEvent(BLOG_EDITOR_FILE_DROP, { detail, bubbles: true })
        )
      }
      if (isArticleEditorPage()) {
        window.dispatchEvent(
          new CustomEvent(ARTICLE_EDITOR_FILE_DROP, { detail, bubbles: true })
        )
      }
    }

    const opts: AddEventListenerOptions = { capture: true, passive: false }
    const targets: (Window | Document | HTMLElement)[] = [window, document]
    if (document.body) targets.push(document.body)
    if (document.documentElement) targets.push(document.documentElement)
    try {
      if (window.parent && window.parent !== window) {
        targets.push(window.parent)
        targets.push(window.parent.document)
        if (window.parent.document.body) targets.push(window.parent.document.body)
        if (window.parent.document.documentElement) targets.push(window.parent.document.documentElement)
      }
      if (window.top && window.top !== window && window.top !== window.parent) {
        targets.push(window.top)
        targets.push(window.top.document)
        if (window.top.document.body) targets.push(window.top.document.body)
        if (window.top.document.documentElement) targets.push(window.top.document.documentElement)
      }
    } catch {
      // cross-origin
    }

    targets.forEach((target) => {
      target.addEventListener('dragover', handleDragOver, opts)
      target.addEventListener('drop', handleDrop, opts)
    })
    return () => {
      targets.forEach((target) => {
        target.removeEventListener('dragover', handleDragOver, opts)
        target.removeEventListener('drop', handleDrop, opts)
      })
    }
  }, [])

  return null
}
