/**
 * お問い合わせ API
 * 送信は /api/contact (api.contact.ts) で行う。IP + メールのレート制限あり。
 * このモジュールは getContactAvailable（フォーム表示可否）のみ提供。
 */

import { createServerFn } from '@tanstack/react-start'
import nodemailer from 'nodemailer'

function createTransporter() {
  const host = process.env.SMTP_HOST?.trim()
  const user = process.env.SMTP_USER?.trim()
  const pass = process.env.SMTP_PASS?.trim()
  if (!host || !user || !pass) return null
  return nodemailer.createTransport({
    host,
    port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587,
    secure: false,
    auth: { user, pass },
  })
}

/** お問い合わせフォームを表示するか（SMTP が設定されているか） */
export const getContactAvailable = createServerFn({ method: 'GET' }).handler(
  async (): Promise<boolean> => !!createTransporter()
)
