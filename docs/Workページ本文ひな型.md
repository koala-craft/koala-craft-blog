# Obsidian Log（本サイト）本文ひな型

管理画面の Work 編集で「説明」欄に貼り付けて使える Markdown ひな型です。

---

## 主な機能

### ブログ × コンテンツ統合
- **Obsidian Log ブログ**: 技術に限らず、日記・メモ・思いつきを気軽に書けるブログ。管理画面から Markdown で執筆し、GitHub に直接保存
- **Zenn インポート**: Zenn の記事・スクラップを GitHub 経由で取得・表示。技術ブログとして Zenn と連携しつつ、表示は自サイトで完結

### 管理画面
- **GitHub OAuth 認証**: パスワード不要。コンテンツ管理とアカウントを統一
- **ブログ CRUD**: ライブプレビュー付きエディタで執筆。画像は貼り付けで GitHub にアップロード
- **サイト設定**: リポジトリ URL・管理者リストを config.json で管理（DB 不要）

### その他
- **お問い合わせフォーム**: SMTP でメール送信（レート制限あり）
- **Author ページ**: 実務・個人開発・副業の Work 一覧をタブで表示

---

## 工夫した点

### 1. Zenn 依存を減らした設計
記事・スクラップの取得を **GitHub リポジトリ** から行うことで、表示時に Zenn API に依存しない。Zenn からエクスポートして GitHub に同期すれば、自サイトで完結して表示できる。

### 2. ブログと技術ブログの分離
- **Zenn インポート**: 技術系に特化した記事・スクラップ
- **Obsidian Log ブログ**: 形式に縛られず自由に書ける

用途に応じて書き分けられる構成にした。

### 3. コストゼロ運用
Vercel・Supabase・GitHub の無料枠で運用。DB は使わず、認証は Supabase Auth、設定・コンテンツは GitHub に集約。

### 4. セキュリティ
- config.json の SSRF 対策（GitHub URL 形式のみ許可）
- slug のパストラバーサル対策
- Markdown 表示の XSS 対策

---

## 技術スタック

| 項目 | 技術 |
|------|------|
| フロントエンド | TanStack Start (React), TypeScript |
| 認証 | Supabase Auth (GitHub OAuth) |
| コンテンツ | GitHub (Markdown / JSON) |
| ホスティング | Vercel |
