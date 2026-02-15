# koala-craft-blog

ブログ × ポートフォリオの可視化アプリケーション。技術記事（Zenn 連携）・オリジナルブログ・スクラップ・作品（Work）を公開する。

## 技術スタック

- **フロントエンド**: TanStack Start (React)
- **データベース**: Supabase (PostgreSQL)
- **認証**: Supabase Auth (GitHub OAuth)
- **ホスティング**: Vercel

## セットアップ

### 1. 依存関係のインストール

```bash
pnpm install
```

### 2. 環境変数

`.env.example` を `.env` にコピーし、値を設定する。

```bash
# Linux / macOS
cp .env.example .env

# Windows (PowerShell)
Copy-Item .env.example .env
```

| 変数 | 説明 |
|------|------|
| VITE_SUPABASE_URL | Supabase プロジェクトの URL |
| VITE_SUPABASE_ANON_KEY | Supabase の anon (public) key |
| GITHUB_REPO_URL | 本番用。config.json の取得元（未設定時は content/.obsidian-log/config.json） |
| GITHUB_TOKEN | GitHub API 認証（任意。60回/時→5000回/時に増加） |
| SMTP_* | お問い合わせフォーム送信用（SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS） |

### 3. Supabase のセットアップ

1. [Supabase](https://supabase.com) でプロジェクトを作成
2. `supabase/migrations/001_initial.sql` を SQL Editor で実行
3. Authentication → Providers で GitHub OAuth を有効化
4. 初回管理者登録は [運用手順書](./docs/運用手順書.md) を参照

### 4. 開発サーバー起動

```bash
pnpm dev
```

http://localhost:3000 でアクセス可能。

### 5. 開発時のコンテンツ

`content/` ディレクトリにモックデータを配置する。

- `content/articles/*.md` - 技術記事（Zenn 連携）
- `content/blog/*.md` - オリジナルブログ
- `content/scraps/*.json` - スクラップ
- `content/.obsidian-log/config.json` - サイト設定

本番では管理画面から設定した GitHub リポジトリから取得する。

## プロジェクト構成

**ディレクトリ設計**: ハイブリッド feature-based。ルートは `routes/` に維持し、ロジック・コンポーネントを feature 単位で分離する。

```
koala-craft-blog/
├── content/              # 開発用モック（articles, blog, scraps, .obsidian-log）
├── docs/                 # 要件定義書・運用手順書
├── src/
│   ├── features/        # 機能単位のモジュール
│   │   ├── articles/    # 技術記事（Zenn）関連
│   │   ├── blog/        # オリジナルブログ関連
│   │   ├── scraps/      # スクラップ関連
│   │   ├── works/       # 作品（Work）関連
│   │   ├── contact/     # お問い合わせフォーム
│   │   └── admin/       # 管理画面関連
│   ├── shared/          # 共通
│   │   ├── lib/         # Supabase クライアント等
│   │   └── components/  # 共通コンポーネント
│   └── routes/          # ルート定義（ファイルベースルーティング）
├── supabase/
│   └── migrations/     # DB マイグレーション
└── vercel.json          # セキュリティヘッダー等
```

## ルーティング

| パス | 説明 |
|------|------|
| / | トップ（ブログ＋技術記事＋スクラップ） |
| /blog | オリジナルブログ一覧 |
| /blog/:slug | ブログ記事詳細 |
| /tech | 技術コンテンツ（記事＋スクラップのタブ表示） |
| /articles | 技術記事（Zenn）一覧 |
| /articles/:slug | 技術記事詳細 |
| /scraps | スクラップ一覧 |
| /scraps/:slug | スクラップ詳細 |
| /work | 作品一覧 |
| /work/:id | 作品詳細 |
| /author | 作者ページ（Work タブ表示） |
| /about | このサイトについて |
| /contact | お問い合わせフォーム |
| /admin | 管理ダッシュボード |
| /admin/blog | ブログ管理（CRUD） |
| /admin/works | 作品管理 |
| /admin/settings | サイト設定 |

## ドキュメント

- [要件定義書](./docs/要件定義書.md)
- [運用手順書](./docs/運用手順書.md)
- [開発ガイド](./docs/開発ガイド.md)
