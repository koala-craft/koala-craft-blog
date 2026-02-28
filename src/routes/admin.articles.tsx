import { Outlet, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/admin/articles')({
  component: AdminArticlesLayout,
})

function AdminArticlesLayout() {
  return <Outlet />
}
