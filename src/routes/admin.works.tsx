import { Outlet, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/admin/works')({
  component: AdminWorksLayout,
})

function AdminWorksLayout() {
  return <Outlet />
}
