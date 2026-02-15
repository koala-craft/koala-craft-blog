# Obsidian Log

ブログ × タスク管理の可視化アプリケーション。ポートフォリオサイトの延長として、記事・スクラップ・タスク進捗を公開する。

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
cp .env.example .env
```

| 変数 | 説明 |
|------|------|
| VITE_SUPABASE_URL | Supabase プロジェクトの URL |
| VITE_SUPABASE_ANON_KEY | Supabase の anon (public) key |

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

- `content/articles/*.md` - 記事
- `content/scraps/*.json` - スクラップ

本番では管理画面から設定した GitHub リポジトリから取得する。

## プロジェクト構成

**ディレクトリ設計**: ハイブリッド feature-based。ルートは `routes/` に維持し、ロジック・コンポーネントを feature 単位で分離する。

```
obsidian-log/
├── content/              # 開発用モック（articles, scraps）
├── docs/                 # 要件定義書・運用手順書
├── src/
│   ├── features/        # 機能単位のモジュール
│   │   ├── articles/    # 記事関連（API、型、コンポーネント）
│   │   ├── scraps/      # スクラップ関連
│   │   ├── tasks/       # タスク関連
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
| / | トップ（ブログ＋タスクサマリ） |
| /articles | 記事一覧 |
| /articles/:slug | 記事詳細 |
| /scraps | スクラップ一覧 |
| /scraps/:slug | スクラップ詳細 |
| /tasks | タスク一覧・消化率 |
| /admin | 管理ダッシュボード |
| /admin/tasks | タスク管理（Todo） |
| /admin/settings | サイト設定 |

## ドキュメント

- [要件定義書](./docs/要件定義書.md)
- [運用手順書](./docs/運用手順書.md)
