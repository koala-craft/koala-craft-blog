import { Outlet, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/admin/scraps')({
  component: AdminScrapsLayout,
})

function AdminScrapsLayout() {
  return <Outlet />
}
