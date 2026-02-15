# Admin 認証・読み込み 解析レポート

## 現象
- `/admin` にアクセスすると「読み込み中...」のまま動かない
- localStorage/sessionStorage を削除してログイン試行しても同様
- 「GitHubでログイン」ボタンが表示されない

---

## 解析結果

### 1. 「読み込み中...」の表示元

| 表示元 | ファイル | 表示条件 |
|--------|----------|----------|
| **ルーターの PendingComponent** | `src/router.tsx` | ルートが pending 状態のとき（defaultPendingMs: 500 経過後） |
| 管理画面の loading | `src/routes/admin.tsx` | `useAuth().loading === true` のとき（「認証を確認しています...」） |
| サイト設定 | `src/routes/admin.settings.tsx` | 設定読み込み中 |

**結論**: ユーザーが見ている「読み込み中...」は **router.tsx の PendingComponent** である可能性が高い（「認証を確認しています...」ではない）。

---

### 2. ssr: false の挙動（TanStack Start 公式ドキュメントより）

> For the first route with `ssr: false` or `ssr: 'data-only'`, **the server will render the route's `pendingComponent` as a fallback**. If `pendingComponent` isn't configured, the **`defaultPendingComponent`** will be rendered.

> On the client during hydration, this fallback will be displayed for at least `minPendingMs`, **even if the route doesn't have `beforeLoad` or `loader` defined**.

**admin ルートは `ssr: false` を指定している**ため:

1. **サーバー**: admin のコンポーネントは描画されず、`defaultPendingComponent`（「読み込み中...」）が HTML として返る
2. **クライアント**: ハイドレーション時にルートコンポーネントを描画するが、最低 `minPendingMs` の間はフォールバックを表示
3. **問題**: クライアント側で AdminLayout が描画されない・ハイドレーションが完了しないと、フォールバックのままになる

---

### 3. 認証フロー（useAuth）の流れ

```
初期状態: user=null, loading=false, adminChecked=false
         → effectiveLoading = false || (null && !false) = false
         → ログイン画面を表示する想定

useEffect 内:
  1. getSupabase() → null なら何もしない（loading は false のまま）
  2. init() 開始
     - INIT_DELAY_MS (400ms) 待機
     - getSession() を 3 秒タイムアウトで実行
     - セッションなし → user=null, adminChecked=true
     - セッションあり → resolveAdminState() → isAdmin 判定
```

**注意**: 上記は **AdminLayout がマウントされた後** の話。  
`ssr: false` により AdminLayout がサーバーで描画されず、クライアントでマウントされないと useAuth は動かない。

---

### 4. 想定される原因

| 原因 | 説明 |
|------|------|
| **ssr: false によるフォールバック** | サーバーが PendingComponent を返し、クライアントで AdminLayout が描画されない |
| **ハイドレーションの失敗** | クライアント側でエラーやブロックがあり、ルートコンポーネントがマウントされない |
| **Supabase の初期化** | `createClient` がサーバー/クライアントで失敗している可能性 |

---

## 改善方針

### 方針 A: ssr: false を削除（推奨）

**根拠**:
- useAuth は `useEffect` 内で `getSession` を呼ぶため、初回レンダー時にはブラウザ API に依存しない
- `getAdminCache` は `typeof window === 'undefined'` でガード済み
- サーバーでは `user=null` でログイン画面を描画すればよい

**期待効果**:
- サーバーで AdminLayout とログイン画面を描画
- PendingComponent ではなくログイン画面が最初から表示される
- クライアントのハイドレーション後も同じ UI のまま

### 方針 B: admin 専用の pendingComponent を設定

- admin ルートに `pendingComponent` を指定し、ログイン画面のスケルトンや「GitHubでログイン」を即時表示
- 根本原因（ssr: false によるフォールバック）は残るが、UX は改善可能

### 方針 C: デバッグの追加

- `console.log` で AdminLayout のマウント有無を確認
- エラーバウンダリでクライアントエラーを捕捉
- ネットワークタブで Supabase へのリクエストを確認

---

## 推奨アクション

1. **方針 A を実施**: admin ルートの `ssr: false` を削除
2. 動作確認後、問題が続く場合は方針 C でデバッグ
