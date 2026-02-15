/**
 * お問い合わせ送信 API
 * POST /api/contact
 * IP ベース + メールアドレスベースのレート制限
 */

import { createFileRoute } from '@tanstack/react-router'
import nodemailer from 'nodemailer'
import { escapeHtml } from '~/shared/lib/escapeHtml'

const RATE_LIMIT_MS = 5 * 60 * 1000 // 5分
const ipRateLimitMap = new Map<string, number>()
const emailRateLimitMap = new Map<string, number>()

function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() ?? 'unknown'
  }
  const realIp = request.headers.get('x-real-ip')
  if (realIp) return realIp.trim()
  return 'unknown'
}

function isRateLimitedByIp(ip: string): boolean {
  const now = Date.now()
  const last = ipRateLimitMap.get(ip)
  const limited = !!(last && now - last < RATE_LIMIT_MS)
  return limited
}

function isRateLimitedByEmail(email: string): boolean {
  const key = email.trim().toLowerCase()
  const now = Date.now()
  const last = emailRateLimitMap.get(key)
  return !!(last && now - last < RATE_LIMIT_MS)
}

function recordSend(ip: string, email: string): void {
  const now = Date.now()
  ipRateLimitMap.set(ip, now)
  emailRateLimitMap.set(email.trim().toLowerCase(), now)
  // 簡易GC
  if (ipRateLimitMap.size > 2000) {
    for (const [k, v] of ipRateLimitMap) {
      if (now - v > RATE_LIMIT_MS) ipRateLimitMap.delete(k)
    }
  }
  if (emailRateLimitMap.size > 2000) {
    for (const [k, v] of emailRateLimitMap) {
      if (now - v > RATE_LIMIT_MS) emailRateLimitMap.delete(k)
    }
  }
}

function createTransporter() {
  const host = process.env.SMTP_HOST?.trim()
  const port = process.env.SMTP_PORT?.trim()
  const user = process.env.SMTP_USER?.trim()
  const pass = process.env.SMTP_PASS?.trim()

  if (!host || !user || !pass) return null

  return nodemailer.createTransport({
    host,
    port: port ? parseInt(port, 10) : 587,
    secure: false,
    auth: { user, pass },
  })
}

export const Route = createFileRoute('/api/contact')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const ip = getClientIp(request)

        if (isRateLimitedByIp(ip)) {
          return Response.json(
            { success: false, error: '送信が多すぎます。5分ほど経ってから再度お試しください。' },
            { status: 429 }
          )
        }

        const transporter = createTransporter()
        if (!transporter) {
          return Response.json(
            { success: false, error: 'メール送信の設定が完了していません。（SMTP_HOST, SMTP_USER, SMTP_PASS を確認）' },
            { status: 503 }
          )
        }

        let body: { name?: string; email?: string; message?: string }
        try {
          body = (await request.json()) as typeof body
        } catch {
          return Response.json({ success: false, error: 'リクエスト形式が不正です。' }, { status: 400 })
        }

        const name = (body.name ?? '').trim().slice(0, 100)
        const email = (body.email ?? '').trim().slice(0, 254)
        const message = (body.message ?? '').trim().slice(0, 5000)

        if (!name) {
          return Response.json({ success: false, error: 'お名前を入力してください。' }, { status: 400 })
        }
        if (!email) {
          return Response.json({ success: false, error: 'メールアドレスを入力してください。' }, { status: 400 })
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          return Response.json({ success: false, error: '有効なメールアドレスを入力してください。' }, { status: 400 })
        }
        if (!message) {
          return Response.json({ success: false, error: 'お問い合わせ内容を入力してください。' }, { status: 400 })
        }

        if (isRateLimitedByEmail(email)) {
          return Response.json(
            { success: false, error: '送信が多すぎます。5分ほど経ってから再度お試しください。' },
            { status: 429 }
          )
        }

        const toEmail = process.env.SMTP_USER?.trim()!
        try {
          await transporter.sendMail({
            from: toEmail,
            to: toEmail,
            replyTo: email,
            subject: `[お問い合わせ] ${name} 様より`,
            html: `
          <p><strong>お名前:</strong> ${escapeHtml(name)}</p>
          <p><strong>メールアドレス:</strong> ${escapeHtml(email)}</p>
          <p><strong>お問い合わせ内容:</strong></p>
          <pre style="white-space: pre-wrap; font-family: sans-serif; background: #f5f5f5; padding: 1rem; border-radius: 4px;">${escapeHtml(message)}</pre>
        `,
          })
          recordSend(ip, email)
          return Response.json({ success: true })
        } catch (err) {
          if (import.meta.env.DEV) {
            console.error('Nodemailer error:', err)
          }
          return Response.json(
            { success: false, error: '送信に失敗しました。しばらく経ってからお試しください。' },
            { status: 500 }
          )
        }
      },
    },
  },
})
