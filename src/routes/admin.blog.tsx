import { Outlet, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/admin/blog')({
  component: AdminBlogLayout,
})

function AdminBlogLayout() {
  return <Outlet />
}
