/**
 * 一般ユーザー向けコメント API
 * Supabase に保存。Blog / Article / Stream 共通
 */

import { createServerFn } from '@tanstack/react-start'
import { getSupabase, getSupabaseWithToken } from '~/shared/lib/supabase'
import { requireAdminAuth } from '~/features/admin/requireAdminAuth'
import type { Comment, ContentType } from './types'

function buildCommentTree(comments: Comment[]): Comment[] {
  const byId = new Map<string, Comment>()
  for (const c of comments) {
    byId.set(c.id, { ...c, children: [] })
  }
  const roots: Comment[] = []
  for (const c of comments) {
    const node = byId.get(c.id)!
    if (!c.parent_id) {
      roots.push(node)
    } else {
      const parent = byId.get(c.parent_id)
      if (parent) {
        parent.children!.push(node)
      } else {
        roots.push(node)
      }
    }
  }
  roots.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  for (const node of byId.values()) {
    if (node.children!.length) {
      node.children!.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    }
  }
  return roots
}

export const getComments = createServerFn({ method: 'GET' })
  .inputValidator((data: { contentType: ContentType; contentSlug: string }) => data)
  .handler(async ({ data }): Promise<Comment[]> => {
    const supabase = getSupabase()
    if (!supabase) return []

    const { data: rows, error } = await supabase
      .from('comments')
      .select('*')
      .eq('content_type', data.contentType)
      .eq('content_slug', data.contentSlug)
      .order('created_at', { ascending: true })

    if (error) return []
    const comments = (rows ?? []) as Comment[]
    return buildCommentTree(comments)
  })

export const createComment = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      contentType: ContentType
      contentSlug: string
      body: string
      authorName: string
      authorEmail?: string
      parentId?: string
    }) => data
  )
  .handler(
    async ({
      data,
    }): Promise<{ success: true; comment: Comment } | { success: false; error: string }> => {
      const supabase = getSupabase()
      if (!supabase) return { success: false, error: 'コメント機能が利用できません' }

      const body = (data.body ?? '').trim()
      const authorName = (data.authorName ?? '').trim()
      if (!body || body.length > 5000) {
        return { success: false, error: '本文は 1〜5000 文字で入力してください' }
      }
      if (!authorName || authorName.length > 100) {
        return { success: false, error: '名前は 1〜100 文字で入力してください' }
      }

      const authorEmail = data.authorEmail?.trim() || null
      if (authorEmail && authorEmail.length > 255) {
        return { success: false, error: 'メールアドレスが長すぎます' }
      }

      const { data: row, error } = await supabase
        .from('comments')
        .insert({
          content_type: data.contentType,
          content_slug: data.contentSlug,
          parent_id: data.parentId || null,
          body,
          author_name: authorName,
          author_email: authorEmail,
        })
        .select()
        .single()

      if (error) return { success: false, error: error.message ?? '投稿に失敗しました' }
      return { success: true, comment: row as Comment }
    }
  )

export const deleteComment = createServerFn({ method: 'POST' })
  .inputValidator((data: { accessToken: string; commentId: string }) => data)
  .handler(
    async ({
      data,
    }): Promise<{ success: boolean; error?: string }> => {
      const auth = await requireAdminAuth(data.accessToken)
      if (!auth.ok) return { success: false, error: auth.error }

      const supabase = getSupabaseWithToken(data.accessToken)
      if (!supabase) return { success: false, error: 'コメント機能が利用できません' }

      const { error } = await supabase.from('comments').delete().eq('id', data.commentId)

      if (error) return { success: false, error: error.message ?? '削除に失敗しました' }
      return { success: true }
    }
  )

/** 管理者用: 全コンテンツ（blog/article/stream）の最新コメントを取得 */
export const getRecentComments = createServerFn({ method: 'GET' })
  .inputValidator((data: { accessToken: string; limit?: number }) => data)
  .handler(async ({ data }): Promise<Comment[]> => {
    const auth = await requireAdminAuth(data.accessToken)
    if (!auth.ok) return []

    const supabase = getSupabaseWithToken(data.accessToken)
    if (!supabase) return []

    const limit = data.limit && data.limit > 0 && data.limit <= 200 ? data.limit : 50

    const { data: rows, error } = await supabase
      .from('comments')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error || !rows) return []
    return rows as Comment[]
  })
