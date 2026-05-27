import type { ReactNode } from 'react'
import { StudioSidebar, type StudioRoute } from './StudioSidebar'

type StudioLayoutProps = {
  activeRoute: StudioRoute
  children: ReactNode
  navigate: (route: StudioRoute) => void
}

export function StudioLayout({ activeRoute, children, navigate }: StudioLayoutProps) {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="grid min-h-screen grid-cols-1 md:grid-cols-[250px_1fr]">
        <StudioSidebar activeRoute={activeRoute} navigate={navigate} />
        <main className="min-w-0 border-white/20 md:border-l">{children}</main>
      </div>
    </div>
  )
}
