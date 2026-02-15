export function ForbiddenMessage({ onSignOut }: { onSignOut: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] gap-6">
      <h2 className="text-xl font-semibold text-amber-400">管理者権限がありません</h2>
      <p className="text-zinc-500 text-sm text-center max-w-md">
        このアカウントは管理者として登録されていません。
        管理者の追加は運用手順書を参照してください。
      </p>
      <button
        type="button"
        onClick={onSignOut}
        className="px-6 py-3 bg-zinc-700 hover:bg-zinc-600 text-white font-medium rounded-lg transition"
      >
        ログアウト
      </button>
    </div>
  )
}
