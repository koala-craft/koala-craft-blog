/**
 * トップページ（/）の背景アクセント
 * index ルートでのみレンダリングされる
 */
export function HomePageBackground() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0"
      aria-hidden
    >
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgb(113 113 122) 1px, transparent 0)',
          backgroundSize: '32px 32px',
        }}
      />
    </div>
  )
}
