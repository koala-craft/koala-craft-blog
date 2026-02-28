/**
 * スクラップコメントツリーの操作ユーティリティ
 * path = [0, 1, 2] で comments[0].children[1].children[2] を指す
 */

import type { ScrapComment } from './types'

function cloneComment(c: ScrapComment): ScrapComment {
  return {
    ...c,
    children: c.children?.map(cloneComment),
  }
}

/** path で指定した位置に新しいコメントを追加 */
export function addCommentAtPath(
  comments: ScrapComment[],
  path: number[],
  newComment: ScrapComment
): ScrapComment[] {
  if (path.length === 0) {
    return [...comments.map(cloneComment), { ...newComment, children: [] }]
  }
  const [idx, ...rest] = path
  return comments.map((c, i) => {
    if (i !== idx) return cloneComment(c)
    if (rest.length === 0) {
      return {
        ...cloneComment(c),
        children: [...(c.children ?? []).map(cloneComment), { ...newComment, children: [] }],
      }
    }
    return {
      ...cloneComment(c),
      children: addCommentAtPath(c.children ?? [], rest, newComment),
    }
  })
}

/** path で指定したコメントを更新 */
export function updateCommentAtPath(
  comments: ScrapComment[],
  path: number[],
  updater: (c: ScrapComment) => ScrapComment
): ScrapComment[] {
  if (path.length === 0) return comments
  const [idx, ...rest] = path
  return comments.map((c, i) => {
    if (i !== idx) return cloneComment(c)
    if (rest.length === 0) {
      return updater(cloneComment(c))
    }
    return {
      ...cloneComment(c),
      children: updateCommentAtPath(c.children ?? [], rest, updater),
    }
  })
}

/** path で指定したコメントを削除 */
export function deleteCommentAtPath(
  comments: ScrapComment[],
  path: number[]
): ScrapComment[] {
  if (path.length === 0) return comments
  const [idx, ...rest] = path
  if (rest.length === 0) {
    return comments.filter((_, i) => i !== idx).map(cloneComment)
  }
  return comments.map((c, i) => {
    if (i !== idx) return cloneComment(c)
    return {
      ...cloneComment(c),
      children: deleteCommentAtPath(c.children ?? [], rest),
    }
  })
}
