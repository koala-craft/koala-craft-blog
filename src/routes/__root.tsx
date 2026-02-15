/// <reference types="vite/client" />
import {
  HeadContent,
  Scripts,
  createRootRoute,
} from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import * as React from 'react'
import { AuthProvider } from '~/features/admin/AuthProvider'
import { HomePageBackground } from '~/shared/components/HomePageBackground'
import { DefaultCatchBoundary } from '~/shared/components/DefaultCatchBoundary'
import { HeaderNav } from '~/shared/components/HeaderNav'
import { Footer } from '~/shared/components/Footer'
import { NotFound } from '~/shared/components/NotFound'
import { getConfig } from '~/features/admin/configApi'
import appCss from '~/styles/app.css?url'

export const Route = createRootRoute({
  loader: async () => {
    const config = await getConfig()
    return {
      zennUsername: config.zenn_username?.trim() ?? '',
      authorName: config.author_name?.trim() ?? '',
      authorIcon: config.author_icon?.trim() ?? '',
      siteTitle: config.site_title?.trim() ?? '',
    }
  },
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: '気楽に誠実に' },
      {
        name: 'description',
        content: 'ブログ × タスク管理の可視化',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Zen+Kaku+Gothic+New:wght@300;400;500;700&family=Space+Grotesk:wght@300;400;500;600;700&display=swap',
      },
      { rel: 'stylesheet', href: appCss },
    ],
  }),
  errorComponent: DefaultCatchBoundary,
  notFoundComponent: () => <NotFound />,
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html className="dark">
      <head>
        <HeadContent />
      </head>
      <body className="relative text-zinc-100 min-h-screen bg-zinc-950 flex flex-col">
        <HomePageBackground />
        <AuthProvider>
          <header className="relative z-10 border-b border-zinc-800">
            <HeaderNav />
          </header>
          <main className="relative z-10 flex-1">{children}</main>
          <Footer />
        </AuthProvider>
        <TanStackRouterDevtools position="bottom-right" />
        <Scripts />
      </body>
    </html>
  )
}
